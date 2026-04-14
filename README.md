# 🚦 Traffic Object Detection Web Dashboard

## 📌 Project Overview

This project implements a **real-time traffic monitoring system** using deep learning and computer vision. It detects and classifies multiple objects such as cars, buses, motorcycles, and pedestrians from a live camera feed.

The system uses **YOLO (You Only Look Once)** for object detection and **Flask** to stream processed video frames to a web-based dashboard for visualization and analytics.

---

## 🎯 Objectives

* Detect vehicles and pedestrians in real-time
* Display live video feed with bounding boxes
* Count objects dynamically per category
* Provide traffic analytics via dashboard
* Enable monitoring and basic alerting

---

## 🧠 Technologies Used

* **Backend:** Python, Flask
* **Computer Vision:** OpenCV
* **Deep Learning Model:** YOLOv8 (Ultralytics)
* **Frontend:** HTML, CSS, JavaScript, Bootstrap
* **Data Handling:** NumPy, Pandas
* **Visualization:** Matplotlib

---

## ⚙️ Features

### 🔹 Core Detection

* Real-time object detection (video/webcam)
* Detects:

  * 🚗 Cars
  * 🚌 Buses
  * 🏍 Bikes
  * 🚶 Pedestrians
* Bounding boxes with labels
* Confidence scores for each detection

---

### 📊 Dashboard & Analytics

* Live video streaming on web interface
* Real-time object count display
* Traffic trend visualization
* Supports future analytics integration

---

### 🛠 Admin Controls

* Start / Stop detection
* Switch input (camera or video file)
* Reset counters
* Capture snapshots

---

### 💡 Bonus Features

* Export detection data to CSV
* Frame snapshot saving
* Extendable for:

  * Speed detection
  * Lane violation detection

---
<img width="1900" height="897" alt="Screenshot 2026-04-14 220519" src="https://github.com/user-attachments/assets/f130f031-6f48-4203-96e8-80c0a22c0596" />


## 🚀 Installation & Setup

### 1️⃣ Clone the Repository

```
git clone https://github.com/your-username/traffic-object-detection.git
cd traffic-object-detection
```

### 2️⃣ Create Virtual Environment (Python 3.11 Recommended)

```
py -3.11 -m venv venv
venv\Scripts\activate
```

### 3️⃣ Install Dependencies

```
pip install -r requirements.txt
```

If required:

```
pip install scipy
```

---

## ▶️ Running the Project

```
python app.py
```

Open browser:

```
http://127.0.0.1:5000
```

---

## 🎥 Input Options

* Webcam:

  ```
  cv2.VideoCapture(0)
  ```
* Video file:

  ```
  cv2.VideoCapture("videos/traffic.mp4")
  ```

---

## 📌 Expected Output

* Live video with detected objects
* Bounding boxes with labels and confidence scores
* Real-time count of:

  * Cars
  * Buses
  * Bikes
  * Pedestrians
* Responsive web dashboard

---

## ⚠️ Known Limitations

* Performance depends on CPU/GPU capability
* Accuracy depends on lighting and camera angle
* Python 3.10 / 3.11 required (not compatible with 3.13+ for YOLO)

---

## 🔮 Future Enhancements

* Vehicle speed estimation
* Traffic violation detection
* Multi-camera integration
* Cloud deployment
* AI-based traffic prediction

---

**output**
<img width="1900" height="897" alt="Screenshot 2026-04-14 220519" src="https://github.com/user-attachments/assets/2edb4d93-b46a-490f-9411-8400cf59ad60" />
