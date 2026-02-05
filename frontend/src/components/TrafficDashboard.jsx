import React, { useEffect, useState } from 'react';
import io from 'socket.io-client';
import { motion, AnimatePresence } from 'framer-motion';
// ADDED: Imports for the Alert Icons
import { Upload, Video, Activity, Car, Truck, Bus, Bike, User, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react';

/* ---------------- SOCKET ---------------- */
const socket = io('https://ai-traffic-system.onrender.com', {
  reconnectionAttempts: 5,
});
/* ---------------- INITIAL STATE ---------------- */
const initialCounts = {
  Car: 0, Bus: 0, Truck: 0, Motorcycle: 0, Bicycle: 0, Person: 0,
};

/* ---------------- ANIMATED COMPONENTS ---------------- */
const CountUp = ({ value }) => (
  <motion.span
    key={value}
    initial={{ y: 10, opacity: 0 }}
    animate={{ y: 0, opacity: 1 }}
    className="inline-block"
  >
    {value}
  </motion.span>
);

/* ---------------- NEW: TRAFFIC STATUS CARD ---------------- */
const TrafficStatusCard = ({ status }) => {
  const isHigh = status.level === 'HIGH';
  const isMed = status.level === 'MEDIUM';
  
  // Dynamic Styling based on Traffic Level
  let bgColor = "bg-green-500/10 border-green-500/50";
  let textColor = "text-green-400";
  let Icon = CheckCircle;

  if (isHigh) {
    bgColor = "bg-red-500/20 border-red-500";
    textColor = "text-red-500";
    Icon = AlertTriangle;
  } else if (isMed) {
    bgColor = "bg-orange-500/10 border-orange-500/50";
    textColor = "text-orange-400";
    Icon = MinusCircle;
  }

  return (
    <motion.div
      // Pulse animation only if High Traffic
      animate={
        isHigh
          ? { scale: [1, 1.05, 1], boxShadow: ["0 0 0px red", "0 0 30px red", "0 0 0px red"] }
          : {}
      }

      transition={{ duration: 0.8, repeat: isHigh ? Infinity : 0 }}
      className={`rounded-2xl border-2 ${bgColor} p-6 flex items-center justify-between shadow-lg mb-6 backdrop-blur-md`}
    >
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${isHigh ? 'bg-red-500 text-white' : 'bg-gray-800 ' + textColor}`}>
          <Icon size={32} />
        </div>
        <div>
          <h2 className={`text-2xl font-black uppercase tracking-tighter ${textColor}`}>
            {status.level} TRAFFIC
          </h2>
          <p className="text-gray-400 font-medium text-sm">{status.message}</p>
        </div>
      </div>
      
      {/* Density Number (Vehicles currently on screen) */}
      <div className="text-right hidden sm:block">
        <span className={`text-4xl font-mono font-bold ${textColor}`}>
           {/* {status.total || 0} */}
        </span>
        {/* <p className="text-[10px] text-gray-500 uppercase tracking-widest">Active</p> */}
      </div>
    </motion.div>
  );
};

/* ---------------- STAT CARD ---------------- */
const StatCard = ({ title, count, icon: Icon, color }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.05 }}
    className="bg-gray-800/50 backdrop-blur-md p-4 rounded-2xl border border-gray-700/50 shadow-xl flex items-center justify-between relative overflow-hidden"
  >
    <div className={`absolute -right-6 -top-6 opacity-10 ${color}`}>
      <Icon size={100} />
    </div>

    <div>
      <h3 className="text-gray-400 text-sm font-medium uppercase tracking-wider">
        {title}
      </h3>
      <div className="text-4xl font-black text-white mt-1 font-mono">
        <CountUp value={count ?? 0} />
      </div>
    </div>

    <div className={`p-3 rounded-xl ${color} bg-opacity-20 text-white`}>
      <Icon size={24} />
    </div>
  </motion.div>
);

/* ---------------- MAIN DASHBOARD ---------------- */
const TrafficDashboard = () => {
  const [image, setImage] = useState(null);
  const [counts, setCounts] = useState(initialCounts);
  
  // NEW: State for Traffic Alert Status
  const [status, setStatus] = useState({ 
    level: 'LOW', 
    message: 'System Ready', 
    total : 0 
  });
  
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');

  /* -------- SOCKET LISTENER -------- */
  useEffect(() => {
    const handler = (data) => {
      setImage(`data:image/jpeg;base64,${data.image}`);
      setCounts({ ...initialCounts, ...data.counts }); 
      
      // NEW: Update status if backend sends it
      if (data.status && data.status.level) {
        setStatus(data.status);
      }
    };

    socket.on('video_data', handler);
    return () => socket.off('video_data', handler);
  }, []);

  /* -------- UPLOAD HANDLER -------- */
  const handleFileChange = (e) => setSelectedFile(e.target.files[0]);

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploadStatus('Uploading...');
    const formData = new FormData();
    formData.append('video', selectedFile);

    try {
      const res = await fetch('https://ai-traffic-system.onrender.com/upload', {
        method: 'POST',
        body: formData,
      });

      if (res.ok) {
        setUploadStatus('Success! Analysis restarted.');
      } else {
        setUploadStatus('Upload failed.');
      }
    } catch {
      setUploadStatus('Upload failed.');
    }
  };

  /* -------- TOTALS -------- */
  const totalVehicles =
    counts.Car + counts.Bus + counts.Truck + counts.Person + counts.Bicycle;

  return (
    <div className="min-h-screen bg-[#0f172a] text-white p-6 font-sans selection:bg-blue-500 selection:text-white">

      {/* HEADER */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-4xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
            TRAFFIC.AI
          </h1>
          <p className="text-gray-400 mt-1 text-sm font-medium">
            REAL-TIME MONITORING SYSTEM
          </p>
        </div>

        <div className="flex items-center gap-2 bg-gray-900 px-4 py-2 rounded-full border border-gray-800">
           <span className="relative flex h-3 w-3">
             <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
             <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
           </span>
           <span className="text-xs font-bold text-gray-400">LIVE FEED</span>
        </div>
      </header>

      {/* MAIN GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* LEFT COLUMN (Span 2): VIDEO PLAYER */}
        <div className="lg:col-span-2 space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-black/40 rounded-3xl overflow-hidden border border-gray-700 shadow-2xl relative h-[650px] group"
          >
             {image ? (
               <>
                 <img 
                   src={image} 
                   alt="Stream" 
                   className="w-full h-full object-cover" 
                 />
                 <div className="absolute top-4 left-4 bg-black/60 backdrop-blur px-3 py-1 rounded-full text-xs text-white flex items-center gap-2">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" /> REC
                 </div>
               </>
             ) : (
               <div className="flex flex-col items-center justify-center h-full text-gray-500">
                 <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4" />
                 <p>Initializing Neural Network...</p>
               </div>
             )}
          </motion.div>

          {/* UPLOAD CONTROLS */}
          <div className="bg-gray-800/40 p-6 rounded-2xl border border-gray-700/50 flex items-center gap-4 flex-wrap">
            <label className="relative flex-1 cursor-pointer group">
              <input type="file" onChange={handleFileChange} className="hidden" />
              <div className="bg-gray-900 border border-gray-600 text-gray-300 py-3 px-4 rounded-xl flex items-center gap-2 group-hover:border-blue-500 transition-colors">
                <Video size={18} />
                <span className="truncate text-sm font-medium">
                  {selectedFile ? selectedFile.name : 'Select Video File'}
                </span>
              </div>
            </label>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleUpload}
              className="bg-blue-600 hover:bg-blue-500 px-8 py-3 rounded-xl font-bold flex items-center gap-2 transition-colors"
            >
              <Upload size={18} /> Upload
            </motion.button>

            {uploadStatus && (
              <span className="text-sm text-blue-400 font-medium animate-pulse">
                {uploadStatus}
              </span>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (Span 1): ALERTS & STATS */}
        <div className="space-y-4">
          
          {/* NEW: Traffic Alert Banner sits at the top */}
          <TrafficStatusCard status={status} />

          <div className="grid grid-cols-2 gap-4">
            <StatCard title="Cars" count={counts.Car} icon={Car} color="bg-blue-500" />
            <StatCard title="Buses" count={counts.Bus} icon={Bus} color="bg-yellow-500" />
            <StatCard title="Trucks" count={counts.Truck} icon={Truck} color="bg-orange-500" />
            <StatCard title="Bikes" count={counts.Person} icon={Bike} color="bg-red-500" />
            <StatCard title="Cycles" count={counts.Bicycle} icon={Activity} color="bg-teal-500" />
          </div>

          {/* TOTAL */}
          <div className="bg-gray-800 p-6 rounded-2xl border border-gray-700 shadow-xl mt-4">
            <h3 className="text-gray-400 text-xs font-bold uppercase mb-2">
              Total Cumulative Volume
            </h3>
            <div className="text-6xl font-black tracking-tight">{totalVehicles}</div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default TrafficDashboard;



