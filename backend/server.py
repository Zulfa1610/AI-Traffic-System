import os
import cv2
import base64
from threading import Lock
from collections import defaultdict

from flask import Flask, request, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
from ultralytics import YOLO
from werkzeug.utils import secure_filename

# -------------------------------------------------
# App & Socket.IO setup
# -------------------------------------------------
app = Flask(__name__, static_folder='dist')

# --- STEP 1: Define your allowed websites ---
# (This list includes your live site AND your local testing site)
allowed_origins = [
    "https://ai-traffic-system.netlify.app",
    "http://localhost:5173" 
]

# --- STEP 2: Configure CORS (For Uploads/Fetch) ---
# We use the list here instead of "*"
CORS(app, resources={r"/*": {"origins": allowed_origins}})

socketio = SocketIO(
    app,
    cors_allowed_origins=allowed_origins,
    async_mode="eventlet"   # safest on Windows
)

# -------------------------------------------------
# Configuration
# -------------------------------------------------
UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

MODEL_PATH = "yolov8n.pt"
model = YOLO(MODEL_PATH)

# COCO class indices → names
TARGET_CLASSES = {
    0: "Person",
    1: "Bicycle",
    2: "Car",
    3: "Motorcycle",
    5: "Bus",
    7: "Truck"
}

# -------------------------------------------------
# Shared state (protected by lock)
# -------------------------------------------------
current_video_source = "traffic_video.mp4"
video_needs_reset = False

track_history = defaultdict(list)
cumulative_counts = {name: 0 for name in TARGET_CLASSES.values()}
counted_ids = set()

state_lock = Lock()

# Background task control
video_task_started = False
task_lock = Lock()

# --- NEW: Simple Route to check if server is alive ---
@app.route('/')
def index():
    return "AI Traffic Backend is Running!", 200

# -------------------------------------------------
# Upload endpoint
# -------------------------------------------------
@app.route("/upload", methods=["POST"])
def upload_video():
    global current_video_source, video_needs_reset
    global cumulative_counts, counted_ids, track_history

    if "video" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["video"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    filename = secure_filename(file.filename)
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    with state_lock:
        current_video_source = filepath
        video_needs_reset = True
        cumulative_counts = {name: 0 for name in TARGET_CLASSES.values()}
        counted_ids = set()
        track_history = defaultdict(list)

    print(f"[INFO] Switched to new video: {filepath}")
    return jsonify({"message": "Upload successful"}), 200

# -------------------------------------------------
# Video processing loop (runs ONCE)
# -------------------------------------------------
def process_video():
    global video_needs_reset

    cap = cv2.VideoCapture(current_video_source)
    line_y = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) // 1.5)

    while True:
        socketio.sleep(0.02)
        # Handle video reset safely
        with state_lock:
            if video_needs_reset:
                cap.release()
                cap = cv2.VideoCapture(current_video_source)
                line_y = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT) // 1.5)
                video_needs_reset = False

        success, frame = cap.read()
        if not success:
            cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
            continue

        # YOLOv8 tracking
        results = model.track(
            frame,
            persist=True,
            tracker="bytetrack.yaml",
            verbose=False
        )

        # Draw counting line
        cv2.line(
            frame,
            (0, line_y),
            (frame.shape[1], line_y),
            (0, 0, 255),
            2
        )
        current_density=0
        active_ids = set()

        if results and results[0].boxes.id is not None:
            boxes = results[0].boxes.xywh.cpu()
            track_ids = results[0].boxes.id.int().cpu().tolist()
            clss = results[0].boxes.cls.int().cpu().tolist()
            current_density = sum(1 for c in clss if c in [2,3,5,7])
            for box, track_id, cls in zip(boxes, track_ids, clss):
                if cls not in TARGET_CLASSES:
                    continue

                active_ids.add(track_id)
                class_name = TARGET_CLASSES[cls]

                x, y, w, h = box
                cx, cy = float(x), float(y)

                with state_lock:
                    track = track_history[track_id]
                    track.append((cx, cy))
                    if len(track) > 30:
                        track.pop(0)

                    if len(track) > 1:
                        prev_y = track[-2][1]
                        curr_y = track[-1][1]

                        # Count downward crossing only
                        if prev_y < line_y <= curr_y:
                            if track_id not in counted_ids:
                                cumulative_counts[class_name] += 1
                                counted_ids.add(track_id)
                                cv2.line(
                                    frame,
                                    (0, line_y),
                                    (frame.shape[1], line_y),
                                    (0, 255, 0),
                                    4
                                )

                # Draw bounding box
                x1, y1 = int(x - w / 2), int(y - h / 2)
                x2, y2 = int(x + w / 2), int(y + h / 2)
                color = (0, 255, 255) if track_id in counted_ids else (255, 0, 0)

                cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                cv2.putText(
                    frame,
                    f"ID:{track_id} {class_name}",
                    (x1, y1 - 10),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.5,
                    color,
                    2
                )

        # Cleanup inactive tracks (prevents memory leak)
        with state_lock:
            for tid in list(track_history.keys()):
                if tid not in active_ids:
                    del track_history[tid]
        total_cumulative = (
            cumulative_counts["Car"]
            + cumulative_counts["Bus"]
            + cumulative_counts["Truck"]
            + cumulative_counts["Person"]
            + cumulative_counts["Bicycle"]
        )

        # ---- ALERT LOGIC BASED ON TOTAL CUMULATIVE COUNT ----
        if total_cumulative <= 10:
            traffic_status = "LOW"
            status_color = "green"
            message = "Smooth Traffic Flow"
        elif total_cumulative > 10 and total_cumulative <= 20:
            traffic_status = "MEDIUM"
            status_color = "orange"
            message = "Moderate Traffic Volume"
        else:
            traffic_status = "HIGH"
            status_color = "red"
            message = "🚨 Heavy Traffic Volume"


        # Encode and emit
        _, buffer = cv2.imencode(".jpg", frame)
        frame_base64 = base64.b64encode(buffer).decode("utf-8")

        socketio.emit(
            "video_data",
            {
                "image": frame_base64,
                "counts": cumulative_counts,
                "status": {
                "level": traffic_status,
                "color": status_color,
                "message": message,
                "density": total_cumulative
                }
            }
        )


# -------------------------------------------------
# Socket.IO events
# -------------------------------------------------
@socketio.on("connect")
def handle_connect():
    global video_task_started

    print("[INFO] Client connected")

    with task_lock:
        if not video_task_started:
            socketio.start_background_task(process_video)
            video_task_started = True
            print("[INFO] Video processing task started")

# -------------------------------------------------
# Main
# -------------------------------------------------
if __name__ == "__main__":
    print("AI Tracker Running on Port 5050...")
    socketio.run(app, host="0.0.0.0", port=5050)



