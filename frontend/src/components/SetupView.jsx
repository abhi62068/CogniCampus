import { useState, useEffect } from 'react';

export default function SetupView({ session, subjects, onSaveComplete }) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [hasData, setHasData] = useState(false);

  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState({
    student_name: '',
    attendance_mode: 'Subject-Wise',
    target_percentage: 75,
    semester_start_date: '',
    last_working_day: ''
  });
  const [holidays, setHolidays] = useState([]);
  const [exams, setExams] = useState([]);

  // --- UPGRADED TIMETABLE STATE ---
  const [days, setDays] = useState(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']);
  const [periods, setPeriods] = useState([1, 2, 3, 4, 5, 6, 7]);
  const [timetable, setTimetable] = useState({});

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // 1. Fetch existing data on load
  useEffect(() => {
    fetch(`http://127.0.0.1:8000/api/setup/${session.user.id}`)
      .then(res => res.json())
      .then(data => {
        if (data.has_setup) {
          setHasData(true);
          setProfile({
            student_name: data.profile.student_name || '',
            attendance_mode: data.profile.attendance_mode,
            target_percentage: data.profile.target_percentage,
            semester_start_date: data.profile.semester_start_date || '',
            last_working_day: data.profile.last_working_day || ''
          });
          setHolidays(data.events.filter(e => e.type === 'Holiday'));
          setExams(
            data.events
              .filter((e) => e.type === 'Exam')
              .map((e) => ({
                ...e,
                exam_day_rule: e.exam_day_rule || "Auto-Present",
                gap_rule: e.gap_rule || "Ignore"
              }))
          );
          setTimetable(data.timetable);
          setIsEditing(false); // Show Preview mode
        } else {
          setIsEditing(true); // First time user, show form
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to fetch setup", err);
        setLoading(false);
        setIsEditing(true);
      });
  }, [session.user.id]);

  // --- GENERAL HANDLERS ---
  const addHoliday = () => setHolidays([...holidays, { title: '', start_date: '', end_date: '' }]);
  const addExam = () => setExams([...exams, {
    title: '',
    exam_type: 'Internal',
    dates: [''],
    exam_day_rule: 'Auto-Present',
    gap_rule: 'Ignore'
  }]);
  const addDateToExam = (examIndex) => {
    const updatedExams = [...exams];
    updatedExams[examIndex].dates.push('');
    setExams(updatedExams);
  };
  const updateExamDate = (examIndex, dateIndex, value) => {
    const updatedExams = [...exams];
    updatedExams[examIndex].dates[dateIndex] = value;
    setExams(updatedExams);
  };

  // --- UPGRADED TIMETABLE HANDLERS ---
  const handleAddDay = () => {
    const missingDay = allDays.find(d => !days.includes(d));
    if (missingDay) setDays([...days, missingDay]);
  };

  const handleRemoveDay = (dayToRemove) => {
    setDays(days.filter(d => d !== dayToRemove));
  };

  const handleAddPeriod = () => {
    const nextPeriod = periods.length > 0 ? Math.max(...periods) + 1 : 1;
    setPeriods([...periods, nextPeriod]);
  };

  const handleRemovePeriod = (periodToRemove) => {
    setPeriods(periods.filter(p => p !== periodToRemove));
  };

  const handleTimetableChange = (day, period, subjectId) => {
    setTimetable({ ...timetable, [`${day}-${period}`]: subjectId });
  };

  // --- SAVE LOGIC ---
  const handleSaveAll = async () => {
    const payload = {
      user_id: session.user.id,
      profile: {
        ...profile,
        target_percentage: Number(profile.target_percentage)
      },
      holidays: holidays,
      exams: exams,
      timetable: timetable
    };

    try {
      const response = await fetch('http://127.0.0.1:8000/api/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setHasData(true);
        setIsEditing(false); // Switch back to preview!
        setStep(1);
        if (typeof onSaveComplete === "function") {
          onSaveComplete();
        }
      } else {
        const errorData = await response.json();
        alert("Failed to save setup: " + JSON.stringify(errorData.detail));
      }
    } catch (err) {
      console.error("Save setup error:", err);
      alert("Server is offline. Make sure your Python backend is running!");
    }
  };

  if (loading) return <div className="p-8 text-gray-500 animate-pulse">Loading your profile...</div>;

  // ==========================================
  // VIEW MODE: THE READ-ONLY PREVIEW
  // ==========================================
  if (!isEditing && hasData) {
    return (
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex justify-between items-center mb-6 pb-4 border-b">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{profile.student_name || "Student"}'s Profile</h2>
            <p className="text-gray-500 mt-1">Academic Configuration</p>
          </div>
          <button onClick={() => setIsEditing(true)} className="bg-gray-900 text-white px-6 py-2 rounded-lg hover:bg-gray-800 transition">
            Edit Setup ✏️
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-700 border-b pb-2">Global Rules</h3>
            <p><strong>Mode:</strong> <span className="text-blue-600 font-medium">{profile.attendance_mode}</span></p>
            <p><strong>Target:</strong> <span className="text-green-600 font-bold">{profile.target_percentage}%</span></p>
            <p><strong>Semester Start:</strong> {profile.semester_start_date || 'Not set'}</p>
            <p><strong>Last Working Day:</strong> {profile.last_working_day || 'Not set'}</p>
          </div>
          <div className="space-y-4">
            <h3 className="text-xl font-bold text-gray-700 border-b pb-2">Holidays & Exams</h3>
            {holidays.length === 0 && exams.length === 0 ? (
              <p className="text-gray-500 italic">No events scheduled.</p>
            ) : (
              <ul className="list-disc pl-5 space-y-2">
                {holidays.map((h, i) => <li key={`h-${i}`} className="text-green-700 font-medium">{h.title} (Holiday)</li>)}
                {exams.map((e, i) => <li key={`e-${i}`} className="text-blue-700 font-medium">{e.title} ({e.exam_type} Exam)</li>)}
              </ul>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // EDIT MODE: THE WIZARD
  // ==========================================
  return (
    <div className="bg-white p-8 rounded-2xl shadow-xl w-full border border-gray-200">
      
      {/* Header & Progress Bar */}
      <div className="flex justify-between items-center mb-8 border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-800">College Setup</h2>
          <p className="text-gray-500">Step {step} of 3: {step === 1 ? 'Global Rules' : step === 2 ? 'Holidays & Exams' : 'Dynamic Timetable'}</p>
        </div>
        {hasData && (
          <button onClick={() => setIsEditing(false)} className="text-gray-500 hover:text-gray-800 font-medium">Cancel Edit</button>
        )}
      </div>

      <div className="flex gap-2 mb-8">
        <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
        <div className={`h-2 flex-1 rounded-full transition-colors ${step >= 3 ? 'bg-blue-600' : 'bg-gray-200'}`}></div>
      </div>

      {/* STEP 1: GLOBAL RULES */}
      {step === 1 && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="col-span-1 md:col-span-2">
              <label className="block text-sm font-medium mb-1">Student Name</label>
              <input type="text" placeholder="e.g. Abhishek" value={profile.student_name} onChange={e => setProfile({...profile, student_name: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Attendance Mode</label>
              <select value={profile.attendance_mode} onChange={e => setProfile({...profile, attendance_mode: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="Subject-Wise">Subject-Wise</option>
                <option value="Overall">Overall</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Target Percentage (%)</label>
              <input type="number" value={profile.target_percentage} onChange={e => setProfile({...profile, target_percentage: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Semester Start Date</label>
              <input type="date" value={profile.semester_start_date} onChange={e => setProfile({...profile, semester_start_date: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Last Working Day</label>
              <input type="date" value={profile.last_working_day} onChange={e => setProfile({...profile, last_working_day: e.target.value})} className="w-full p-3 border rounded-lg bg-gray-50 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: HOLIDAYS & EXAMS */}
      {step === 2 && (
        <div className="space-y-8">
          <div className="bg-green-50/50 p-6 rounded-xl border border-green-100">
            <h3 className="text-lg font-bold text-green-800 mb-2">Vacations & Holidays</h3>
            {holidays.map((hol, index) => (
              <div key={index} className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-lg shadow-sm border mb-3">
                <input type="text" placeholder="e.g. Diwali Break" value={hol.title} onChange={e => { const newHols = [...holidays]; newHols[index].title = e.target.value; setHolidays(newHols); }} className="flex-1 p-2 border rounded" />
                <input type="date" value={hol.start_date} onChange={e => { const newHols = [...holidays]; newHols[index].start_date = e.target.value; setHolidays(newHols); }} className="p-2 border rounded" />
                <span className="text-gray-500">to</span>
                <input type="date" value={hol.end_date} onChange={e => { const newHols = [...holidays]; newHols[index].end_date = e.target.value; setHolidays(newHols); }} className="p-2 border rounded" />
              </div>
            ))}
            <button onClick={addHoliday} className="text-green-600 font-bold hover:underline">+ Add Holiday</button>
          </div>

          <div className="bg-blue-50/50 p-6 rounded-xl border border-blue-100">
            <h3 className="text-lg font-bold text-blue-800 mb-2">Examination Schedules</h3>
            {exams.map((exam, index) => (
              <div key={index} className="bg-white p-5 rounded-lg shadow-sm border mb-4 space-y-4">
                <div className="flex gap-4">
                  <input type="text" placeholder="e.g. Mid-Terms" value={exam.title} onChange={e => { const newExams = [...exams]; newExams[index].title = e.target.value; setExams(newExams); }} className="flex-1 p-2 border rounded" />
                  <select value={exam.exam_type} onChange={e => { const newExams = [...exams]; newExams[index].exam_type = e.target.value; setExams(newExams); }} className="p-2 border rounded bg-gray-50">
                    <option value="Internal">Internal Exam</option>
                    <option value="Semester">Semester Exam</option>
                  </select>
                </div>
                <div className="p-4 bg-gray-50 rounded border border-gray-100">
                  <p className="text-sm font-medium mb-2">Specific Exam Dates:</p>
                  <div className="flex flex-wrap gap-2 mb-3">
                    {exam.dates.map((date, dIndex) => (
                      <input key={dIndex} type="date" value={date} onChange={e => updateExamDate(index, dIndex, e.target.value)} className="p-2 border rounded text-sm" />
                    ))}
                    <button onClick={() => addDateToExam(index)} className="px-3 py-2 bg-blue-100 text-blue-700 rounded text-sm font-bold hover:bg-blue-200">+ Date</button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Exam Day Attendance Rule</label>
                  <select value={exam.exam_day_rule || "Auto-Present"} onChange={e => { const newExams = [...exams]; newExams[index].exam_day_rule = e.target.value; setExams(newExams); }} className="w-full p-2 border rounded bg-gray-50">
                    <option value="Auto-Present">Auto-Present (Get attendance on exam day)</option>
                    <option value="Ignore">No Attendance (Do not mark exam day)</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Gap Day Attendance Rule</label>
                  <select value={exam.gap_rule || "Ignore"} onChange={e => { const newExams = [...exams]; newExams[index].gap_rule = e.target.value; setExams(newExams); }} className="w-full p-2 border rounded bg-gray-50">
                    <option value="Auto-Present">Auto-Present (Get attendance on gap days)</option>
                    <option value="Ignore">No Attendance (Do not mark gap days)</option>
                    <option value="Normal">Normal</option>
                  </select>
                </div>
              </div>
            ))}
            <button onClick={addExam} className="text-blue-600 font-bold hover:underline">+ Add Exam Schedule</button>
          </div>
        </div>
      )}

      {/* STEP 3: DYNAMIC TIMETABLE (UPGRADED) */}
      {step === 3 && (
        <div className="space-y-6 overflow-x-auto">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600">Map your subjects to your weekly schedule.</p>
            <div className="flex gap-4">
              <button onClick={handleAddPeriod} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 font-medium shadow-sm">+ Add Period</button>
              <button onClick={handleAddDay} className="text-sm bg-gray-200 px-3 py-1 rounded hover:bg-gray-300 font-medium shadow-sm">+ Add Day</button>
            </div>
          </div>
          
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-r p-3 bg-gray-100 text-gray-700">Day</th>
                  {periods.map(p => (
                    <th key={p} className="border-b p-3 bg-gray-100 text-center text-gray-700 group">
                      <div className="flex items-center justify-center gap-2">
                        <span>Period {p}</span>
                        <button onClick={() => handleRemovePeriod(p)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Period">✖</button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {days.map(day => (
                  <tr key={day} className="hover:bg-gray-50">
                    <td className="border-b border-r p-3 font-bold text-gray-800 bg-white group">
                      <div className="flex justify-between items-center">
                        <span>{day}</span>
                        <button onClick={() => handleRemoveDay(day)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity" title="Remove Day">✖</button>
                      </div>
                    </td>
                    {periods.map(period => (
                      <td key={period} className="border-b border-r p-1 bg-white">
                        <select 
                          className="w-full p-2 border-0 rounded text-sm outline-none cursor-pointer focus:ring-2 focus:ring-blue-500"
                          value={timetable[`${day}-${period}`] || ""}
                          onChange={(e) => handleTimetableChange(day, period, e.target.value)}
                        >
                          <option value="" className="text-gray-400">-- Free --</option>
                          {subjects.map(sub => (
                            <option key={sub.id} value={sub.id}>{sub.name}</option>
                          ))}
                        </select>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex justify-between mt-8 pt-6 border-t">
        {step > 1 ? (
          <button onClick={() => setStep(step - 1)} className="px-6 py-2 text-gray-600 border rounded-lg hover:bg-gray-50 font-medium">Back</button>
        ) : <div></div>}
        
        {step < 3 ? (
          <button onClick={() => setStep(step + 1)} className="px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 shadow-md">Next Step</button>
        ) : (
          <button onClick={handleSaveAll} className="px-8 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 shadow-md transform hover:scale-105 transition">Save & Finish Setup</button>
        )}
      </div>

    </div>
  );
}