import { useState, useEffect } from 'react';

// Ensure targetAttendance is received as a prop here
export default function BunkMeter({ defaultConducted = 0, defaultAttended = 0, targetAttendance = 75 }) {
  const [conducted, setConducted] = useState(defaultConducted);
  const [attended, setAttended] = useState(defaultAttended);

  useEffect(() => {
    setConducted(defaultConducted);
    setAttended(defaultAttended);
  }, [defaultConducted, defaultAttended]);

  const handleConductedChange = (e) => {
    const val = Number(e.target.value);
    setConducted(val);
    if (val < attended) setAttended(val);
  };

  const handleAttendedChange = (e) => {
    const val = Number(e.target.value);
    if (val > conducted) setAttended(conducted);
    else setAttended(val);
  };

  // --- THE LOGIC FIX ---
  const percentage = conducted > 0 ? ((attended / conducted) * 100).toFixed(1) : 0;
  
  // We use the prop 'targetAttendance' instead of a hardcoded 75
  const isSafe = Number(percentage) >= targetAttendance;
  const targetDecimal = targetAttendance / 100;

  let statusMessage = isSafe ? "Safe Zone 🟢" : "Danger Zone 🔴";
  let statusColor = isSafe ? "text-green-600" : "text-red-600";
  let suggestion = "";

  if (isSafe) {
    const classesCanMiss = Math.max(0, Math.floor((attended / targetDecimal) - conducted));
    
    // Pluralization check
    const unit = classesCanMiss <= 1 ? "class" : "classes";
    
    suggestion = `You can safely bunk ${classesCanMiss} upcoming ${unit} and still stay at ${targetAttendance}%.`;
} else {
    const classesNeeded = Math.ceil((targetDecimal * conducted - attended) / (1 - targetDecimal));
    
    // Pluralization check
    const unit = classesNeeded <= 1 ? "class" : "classes";
    
    suggestion = `You must attend the next ${classesNeeded} ${unit} to get back to ${targetAttendance}%. Do not bunk!`;
}

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1 md:col-span-2 lg:col-span-3">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-gray-800">Advanced Bunk Meter</h3>
        <span className={`font-bold ${statusColor}`}>{statusMessage}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Classes Conducted</label>
          <input 
            type="number" 
            value={conducted}
            onChange={handleConductedChange}
            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Classes Attended</label>
          <input 
            type="number" 
            value={attended}
            onChange={handleAttendedChange}
            className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-400"
          />
        </div>
        <div className="flex flex-col justify-center items-center bg-gray-50 rounded-lg p-2 border border-gray-100">
          <span className="text-sm text-gray-500">Current Attendance</span>
          <span className={`text-3xl font-bold ${statusColor}`}>
            {percentage}%
          </span>
          <span className="text-xs text-gray-400">Target: {targetAttendance}%</span>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${isSafe ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <p className={`text-lg font-medium ${isSafe ? 'text-green-800' : 'text-red-800'}`}>
          💡 Insight: {suggestion}
        </p>
      </div>
    </div>
  );
}