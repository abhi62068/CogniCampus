import { useState, useEffect } from 'react';

export default function TodaySchedule({ session, onUpdate }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchToday = async () => {
    try {
      setLoading(true);
      const res = await fetch(`http://127.0.0.1:8000/api/today-schedule/${session?.user?.id}`);
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Server Error");
      }
      const json = await res.json();
      setData(json);
      setError(null);
    } catch (err) {
      console.error("Fetch Today Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user?.id) fetchToday();
  }, [session?.user?.id]);

  const handleMark = async (subjectId, period, status) => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/mark-attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session.user.id,
          subject_id: subjectId,
          period_number: period,
          status: status
        })
      });
      if (res.ok) {
        await fetchToday();
        onUpdate(); // Updates the Bunk Meter in App.jsx
      }
    } catch (err) {
      alert("Error marking attendance");
    }
  };

  if (loading) return <div className="p-6 bg-white rounded-xl border animate-pulse text-gray-400">Loading today's classes...</div>;
  
  if (error) return (
    <div className="p-6 bg-red-50 rounded-xl border border-red-200">
      <h3 className="text-red-800 font-bold mb-1">Configuration Needed</h3>
      <p className="text-red-600 text-sm">Please complete the <strong>Setup Wizard</strong> for {new Date().toLocaleDateString('en-US', {weekday: 'long'})}.</p>
    </div>
  );

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">Today's Schedule</h3>
          <p className="text-xs text-gray-400">{data?.date}</p>
        </div>
        <span className="px-3 py-1 bg-blue-600 text-white rounded-full text-xs font-bold uppercase">
          {data?.day}
        </span>
      </div>

      <div className="space-y-4">
        {(!data?.slots || data.slots.length === 0) ? (
          <div className="text-center py-6">
            <p className="text-gray-400 italic">No classes scheduled for today.</p>
            <p className="text-xs text-gray-400 mt-1">Check your Timetable in Setup.</p>
          </div>
        ) : (
          data.slots.map((slot) => {
            const log = data.logs?.find(l => l.period_number === slot.period_number);
            const subjectName = slot.subjects?.name || "Unknown Subject";
            
            return (
              <div key={slot.period_number} className="flex justify-between items-center p-4 border rounded-xl bg-gray-50/50 hover:bg-gray-50 transition">
                <div>
                  <p className="text-[10px] font-bold text-blue-500 uppercase tracking-wider">Period {slot.period_number}</p>
                  <p className="font-bold text-gray-800">{subjectName}</p>
                </div>

                {log ? (
                  <div className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-black ${log.status === 'Present' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                    {log.status === 'Present' ? '✓ PRESENT' : '✖ ABSENT'}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleMark(slot.subject_id, slot.period_number, 'Present')} 
                      className="bg-white border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white w-10 h-10 rounded-full font-bold transition flex items-center justify-center shadow-sm"
                    >
                      ✓
                    </button>
                    <button 
                      onClick={() => handleMark(slot.subject_id, slot.period_number, 'Absent')} 
                      className="bg-white border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white w-10 h-10 rounded-full font-bold transition flex items-center justify-center shadow-sm"
                    >
                      ✖
                    </button>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}