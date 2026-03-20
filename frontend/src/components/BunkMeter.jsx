import { useState, useEffect } from 'react';

export default function BunkMeter({ defaultConducted = 0, defaultAttended = 0 }) {
  // 1. Initialize state with the props passed from App.jsx
  const [conducted, setConducted] = useState(defaultConducted);
  const [attended, setAttended] = useState(defaultAttended);
  const target = 75; // Standard college threshold

  // 2. Automatically update if the database data changes (like adding a new subject)
  useEffect(() => {
    setConducted(defaultConducted);
    setAttended(defaultAttended);
  }, [defaultConducted, defaultAttended]);

  // 3. Validation Handlers for predictive manual typing
  const handleConductedChange = (e) => {
    const val = Number(e.target.value);
    if (val < 0) return; // Prevent negative numbers
    
    setConducted(val);
    
    // If conducted drops below attended, auto-adjust attended down
    if (val < attended) {
      setAttended(val);
    }
  };

  const handleAttendedChange = (e) => {
    const val = Number(e.target.value);
    if (val < 0) return; // Prevent negative numbers
    
    // Prevent attended from exceeding conducted
    if (val > conducted) {
      setAttended(conducted);
    } else {
      setAttended(val);
    }
  };

  // 4. The Math
  const percentage = conducted > 0 ? ((attended / conducted) * 100).toFixed(1) : 0;
  
  let statusMessage = "";
  let statusColor = "";
  let suggestion = "";

  if (percentage >= target) {
    const classesCanMiss = Math.floor((attended / (target / 100)) - conducted);
    statusMessage = "Safe Zone 🟢";
    statusColor = "text-green-600";
    suggestion = `You can safely bunk ${classesCanMiss} upcoming class(es) and still stay at ${target}%.`;
  } else {
    // Math.ceil ensures we round up to the next whole class needed
    const classesNeeded = Math.ceil(((target / 100) * conducted - attended) / (1 - (target / 100)));
    statusMessage = "Danger Zone 🔴";
    statusColor = "text-red-600";
    suggestion = `You must attend the next ${classesNeeded} class(es) to get back to ${target}%. Do not bunk!`;
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
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Classes Attended</label>
          <input 
            type="number" 
            value={attended}
            onChange={handleAttendedChange}
            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex flex-col justify-center items-center bg-gray-50 rounded-lg p-2 border border-gray-100">
          <span className="text-sm text-gray-500">Overall Attendance</span>
          <span className={`text-3xl font-bold ${percentage >= target ? 'text-green-600' : 'text-red-600'}`}>
            {percentage}%
          </span>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${percentage >= target ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
        <p className={`text-lg font-medium ${percentage >= target ? 'text-green-800' : 'text-red-800'}`}>
          💡 Insight: {suggestion}
        </p>
      </div>
    </div>
  );
}