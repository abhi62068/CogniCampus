import { useState } from 'react';

// Ensure targetAttendance is received as a prop here
export default function BunkMeter({ defaultConducted = 0, defaultAttended = 0, targetAttendance = 75 }) {
  const [conducted, setConducted] = useState(defaultConducted);
  const [attended, setAttended] = useState(defaultAttended);

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

  // Normalize values to avoid NaN/Infinity in dashboard calculations
  const safeConducted = Math.max(0, Number(conducted) || 0);
  const safeAttended = Math.min(Math.max(0, Number(attended) || 0), safeConducted);
  const normalizedTarget = Math.min(100, Math.max(0, Number(targetAttendance) || 75));

  const percentage = safeConducted > 0 ? ((safeAttended / safeConducted) * 100).toFixed(1) : "0.0";
  const isSafe = Number(percentage) >= normalizedTarget;
  const targetDecimal = normalizedTarget / 100;

  let statusMessage = isSafe ? "Safe Zone 🟢" : "Danger Zone 🔴";
  let statusColor = isSafe ? "text-green-600" : "text-red-600";
  let suggestion = "";

  if (isSafe) {
  if (normalizedTarget <= 0) {
    suggestion = "Any attendance stays above a 0% target.";
  } else if (normalizedTarget >= 100) {
    suggestion = safeAttended === safeConducted
      ? "You cannot bunk any class if your target is 100%."
      : "Attend every upcoming class to move toward a 100% target.";
  } else {
    const classesCanMiss = Math.floor((safeAttended / targetDecimal) - safeConducted);
    const finalMiss = Math.max(0, classesCanMiss);

    // Pluralization
    const unit = finalMiss === 1 ? "class" : "classes";

    suggestion = `You can safely bunk ${finalMiss} upcoming ${unit} and still stay at ${normalizedTarget}%.`;
  }
} else {
  if (normalizedTarget >= 100) {
    suggestion = "You must attend every upcoming class. A 100% target allows no absences.";
  } else {
    const classesNeeded = Math.ceil((targetDecimal * safeConducted - safeAttended) / (1 - targetDecimal));
    const finalNeeded = Math.max(0, classesNeeded);

    // Pluralization
    const unit = finalNeeded === 1 ? "class" : "classes";

    suggestion = `You must attend the next ${finalNeeded} ${unit} to get back to ${normalizedTarget}%. Do not bunk!`;
  }
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
          <span className="text-xs text-gray-400">Target: {normalizedTarget}%</span>
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