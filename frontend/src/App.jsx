import { useState, useEffect, useCallback } from "react";
import BunkMeter from "./components/BunkMeter";
import Auth from "./components/Auth";
import LandingPage from "./components/LandingPage";
import SetupView from "./components/SetupView";
import TodaySchedule from "./components/TodaySchedule";
import { calculateTotalClassesPerSubject } from "./utils/calculateTotalClassesPerSubject";
import supabase from "./lib/supabaseClient";

// Supabase client is centralized in `src/lib/supabaseClient.js`

// Added dynamic API URL
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function App() {
  const [session, setSession] = useState(null);
  const [apiStatus, setApiStatus] = useState("Connecting...");
  const [subjects, setSubjects] = useState([]);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [targetAttendance, setTargetAttendance] = useState(75); 
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newConducted, setNewConducted] = useState(0);
  const [newAttended, setNewAttended] = useState(0);
  const [showLogin, setShowLogin] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [unmarkedDates, setUnmarkedDates] = useState({});
  const [editingSubject, setEditingSubject] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchSubjects = useCallback(() => {
    if (!session) return;
    // Updated fetch URL
    fetch(`${API_BASE_URL}/api/subjects?user_id=${session.user.id}`)
      .then((res) => res.json())
      .then((data) => setSubjects(data));
  }, [session]);

  const fetchUserSettings = useCallback(() => {
    if (!session) return;
    // Updated fetch URL
    fetch(`${API_BASE_URL}/api/setup/${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.has_setup && data.profile?.target_percentage !== undefined && data.profile?.target_percentage !== null) {
          const parsedTarget = Number(data.profile.target_percentage);
          setTargetAttendance(Number.isFinite(parsedTarget) ? parsedTarget : 75);
        }

        if (data.has_setup) {
          const holidays = (data.events || [])
            .filter((e) => e.type === "Holiday" && e.title)
            .map((e) => ({
              title: e.title,
              start_date: e.start_date,
              end_date: e.end_date,
            }));

          const exams = (data.events || [])
            .filter((e) => e.type === "Exam" && e.title)
            .map((e) => ({
              title: e.title,
              exam_type: e.exam_type,
              dates: e.dates || [],
              exam_day_rule: e.exam_day_rule || "Auto-Present",
              gap_rule: e.gap_rule || "Ignore",
            }));

          setSetupData({
            profile: data.profile || {},
            timetable: data.timetable || {},
            holidays,
            exams,
          });
        }
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, [session]);

  const fetchUnmarkedDates = useCallback(() => {
    if (!session) return;
    fetch(`${API_BASE_URL}/api/unmarked-dates/${session.user.id}`)
      .then((res) => res.json())
      .then((data) => setUnmarkedDates(data))
      .catch((err) => console.error("Error fetching unmarked dates:", err));
  }, [session]);

  const handleMarkPastUnmarked = useCallback(
    async (subjectId, periodNumber, dateStr, status) => {
      if (!session?.user?.id) return;

      const sidKey = String(subjectId);
      const periodNum = Number(periodNumber);

      // Optimistic UI: immediately remove the clicked row from the list.
      setUnmarkedDates((prev) => {
        const next = { ...prev };
        const raw = next[sidKey] ?? next[subjectId] ?? [];
        next[sidKey] = raw.filter(
          (u) => !(u.date === dateStr && Number(u.period) === periodNum)
        );
        return next;
      });

      try {
        const res = await fetch(`${API_BASE_URL}/api/mark-attendance`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            user_id: session.user.id,
            subject_id: Number(subjectId),
            period_number: periodNum,
            status,
            date: dateStr, // important: mark the provided past date
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          const detail = errData.detail;
          throw new Error(
            typeof detail === "string"
              ? detail
              : JSON.stringify(detail) || "Unable to mark attendance."
          );
        }

        // Refresh data to guarantee correctness.
        fetchSubjects();
        fetchUnmarkedDates();
      } catch (err) {
        console.error("Mark past attendance error:", err);
        alert(err.message || "Failed to mark attendance");
        // Roll back by reloading.
        fetchUnmarkedDates();
        fetchSubjects();
      }
    },
    [session, fetchSubjects, fetchUnmarkedDates]
  );

  useEffect(() => {
    if (session) {
      // Updated fetch URL
      fetch(`${API_BASE_URL}/api/status`)
        .then((res) => res.json())
        .then((data) => setApiStatus(data.status))
        .catch(() => setApiStatus("Disconnected 🔴"));
      
      fetchSubjects();
      fetchUserSettings(); 
      fetchUnmarkedDates();
    }
  }, [session, fetchSubjects, fetchUserSettings, fetchUnmarkedDates]);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    if (editingSubject) {
      const res = await fetch(`${API_BASE_URL}/api/subjects/${editingSubject.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          conducted: Number(newConducted),
          attended: Number(newAttended),
          user_id: session.user.id,
        }),
      });
      if (res.ok) {
        fetchSubjects();
        setIsModalOpen(false);
        setEditingSubject(null);
        setNewName("");
      }
    } else {
      const res = await fetch(`${API_BASE_URL}/api/subjects`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newName,
          conducted: Number(newConducted),
          attended: Number(newAttended),
          user_id: session.user.id,
        }),
      });
      if (res.ok) {
        fetchSubjects();
        setIsModalOpen(false);
        setNewName("");
      }
    }
  };

  const handleDeleteSubject = async (id) => {
    if (!window.confirm("Are you sure you want to delete this subject?")) return;
    const res = await fetch(`${API_BASE_URL}/api/subjects/${id}`, { method: 'DELETE' });
    if (res.ok) fetchSubjects();
  };

  const openEditModal = (sub) => {
    setEditingSubject(sub);
    setNewName(sub.name);
    setNewConducted(sub.conducted);
    setNewAttended(sub.attended);
    setIsModalOpen(true);
  };
  
  const openAddModal = () => {
    setEditingSubject(null);
    setNewName("");
    setNewConducted(0);
    setNewAttended(0);
    setIsModalOpen(true);
  };

  if (!session) {
    return showLogin ? <Auth /> : <LandingPage onGetStarted={() => setShowLogin(true)} />;
  }

  const semesterTotals = setupData
    ? calculateTotalClassesPerSubject({
        timetable: setupData.timetable,
        semester_start_date: setupData.profile?.semester_start_date,
        last_working_day: setupData.profile?.last_working_day,
        holidays: setupData.holidays,
        leaves: [],
        exams: setupData.exams,
      })
    : { totalClassesBySubjectId: {} };

  return (
    <div className="flex h-screen bg-gray-50 font-sans relative">
      <aside className="w-64 bg-gray-900 text-white flex flex-col shadow-xl z-10">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-2xl font-bold tracking-wider text-blue-400">CogniCampus</h1>
          <p className="text-xs text-gray-400 mt-1">Status: {apiStatus}</p>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <button onClick={() => setActiveTab("dashboard")} className={`w-full text-left px-4 py-2 rounded-lg font-medium transition ${activeTab === "dashboard" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
            Dashboard
          </button>
          <button onClick={() => setActiveTab("setup")} className={`w-full text-left px-4 py-2 rounded-lg font-medium transition ${activeTab === "setup" ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-gray-800"}`}>
            Profile & Setup ⚙️
          </button>
          <div className="pt-10">
            <button onClick={() => supabase.auth.signOut()} className="w-full text-left px-4 py-2 text-red-400 hover:bg-red-900/20 rounded-lg transition">Logout 🚪</button>
          </div>
        </nav>
      </aside>

      <main className="flex-1 p-8 overflow-y-auto">
        {activeTab === "dashboard" ? (
          <>
            <header className="mb-8 flex justify-between items-center">
              <div>
                <h2 className="text-3xl font-bold text-gray-800">Overview</h2>
                <p className="text-gray-500 mt-1">Goal: {targetAttendance}% Attendance Strategy</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TodaySchedule session={session} onUpdate={fetchSubjects} />

              <BunkMeter
                key={`${subjects.reduce((sum, sub) => sum + sub.conducted, 0)}-${subjects.reduce((sum, sub) => sum + sub.attended, 0)}`}
                defaultConducted={subjects.reduce((sum, sub) => sum + sub.conducted, 0)}
                defaultAttended={subjects.reduce((sum, sub) => sum + sub.attended, 0)}
                targetAttendance={targetAttendance} 
              />

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1 lg:col-span-3 position-relative">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Your Subjects Database</h3>
                <button onClick={openAddModal} className="bg-blue-600 text-white px-6 py-2 m-5 rounded-lg font-bold shadow-lg shadow-blue-200">
                  + Add Subject
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subjects.map((sub) => {
                    const pct = sub.conducted > 0 ? ((sub.attended / sub.conducted) * 100).toFixed(1) : 0;
                    const totalSemester = Number(semesterTotals?.totalClassesBySubjectId?.[String(sub.id)] || 0);
                    const remainingSemester = Math.max(0, totalSemester - Number(sub.conducted || 0));
                    
                    const targetDec = (targetAttendance || 75) / 100;
                    let predictionText = "";
                    let predictionColor = "";
                    if (sub.conducted > 0) {
                      if (Number(pct) >= (targetAttendance || 75)) {
                        if (targetDec >= 1) {
                          predictionText = `Cannot leave any classes`;
                          predictionColor = "text-green-600";
                        } else if (targetDec <= 0) {
                          predictionText = `Can leave any amount of classes`;
                          predictionColor = "text-green-600";
                        } else {
                          const canMiss = Math.floor((sub.attended / targetDec) - sub.conducted);
                          const maxMiss = Math.max(0, canMiss);
                          predictionText = `Can leave: ${maxMiss} class${maxMiss !== 1 ? 'es' : ''}`;
                          predictionColor = "text-green-600";
                        }
                      } else {
                        if (targetDec >= 1) {
                          predictionText = `Cannot reach 100% target`;
                          predictionColor = "text-red-500";
                        } else {
                          const needed = Math.ceil((targetDec * sub.conducted - sub.attended) / (1 - targetDec));
                          const neededClasses = Math.max(0, needed);
                          predictionText = `Need to attend: ${neededClasses} class${neededClasses !== 1 ? 'es' : ''}`;
                          predictionColor = "text-red-500";
                        }
                      }
                    } else {
                      predictionText = "No classes conducted";
                      predictionColor = "text-gray-500";
                    }

                    return (
                      <div key={sub.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex flex-col group relative">
                        <div className="flex justify-between items-start w-full">
                          <div>
                            <p className="font-semibold text-gray-800">{sub.name}</p>
                            <p className="text-xs text-gray-500">{sub.attended} / {sub.conducted} Attended</p>
                            {setupData && (
                              <>
                                <p className="text-[11px] text-gray-600 mt-2">
                                  Total semester classes: <span className="font-bold">{totalSemester}</span>
                                </p>
                                <p className="text-[11px] text-gray-600">
                                  Remaining semester classes: <span className="font-bold">{remainingSemester}</span>
                                </p>
                              </>
                            )}
                            <p className={`text-[11px] font-semibold mt-1 ${predictionColor}`}>
                              {predictionText}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <span className={`font-bold ${pct >= targetAttendance ? "text-green-600" : "text-red-600"}`}>
                              {pct}%
                            </span>
                            <div className="flex gap-2 mt-2">
                              <button onClick={() => openEditModal(sub)} title="Edit Subject" className="text-blue-500 hover:text-blue-700 bg-blue-100 p-1 rounded-md text-xs">✏️ Edit</button>
                              <button onClick={() => handleDeleteSubject(sub.id)} title="Delete Subject" className="text-red-500 hover:text-red-700 bg-red-100 p-1 rounded-md text-xs">🗑️ Del</button>
                            </div>
                          </div>
                        </div>
                        <div className="w-full mt-3 pt-3 border-t border-gray-200">
                          <p className="text-xs font-bold text-gray-700 mb-1">Unmarked Classes:</p>
                          <div className="max-h-24 overflow-y-auto space-y-1 pr-1" style={{ scrollbarWidth: 'thin' }}>
                            {unmarkedDates[sub.id]?.length > 0 ? (
                              unmarkedDates[sub.id].map((u) => (
                                <div
                                  key={`${u.date}-${u.period}`}
                                  className="text-[10px] bg-red-50 text-red-600 px-2 py-1.5 rounded border border-red-100 flex items-center justify-between gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className="truncate">{u.date}</span>
                                    <span className="shrink-0">Period {u.period}</span>
                                  </div>
                                  <div className="flex shrink-0 gap-1">
                                    <button
                                      type="button"
                                      title="Present"
                                      onClick={() =>
                                        handleMarkPastUnmarked(
                                          sub.id,
                                          u.period,
                                          u.date,
                                          "Present"
                                        )
                                      }
                                      className="bg-white border-2 border-green-500 text-green-600 hover:bg-green-500 hover:text-white w-7 h-7 rounded-full font-bold transition flex items-center justify-center"
                                    >
                                      ✓
                                    </button>
                                    <button
                                      type="button"
                                      title="Absent"
                                      onClick={() =>
                                        handleMarkPastUnmarked(
                                          sub.id,
                                          u.period,
                                          u.date,
                                          "Absent"
                                        )
                                      }
                                      className="bg-white border-2 border-red-500 text-red-600 hover:bg-red-500 hover:text-white w-7 h-7 rounded-full font-bold transition flex items-center justify-center"
                                    >
                                      ✖
                                    </button>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-[10px] text-gray-400 italic">No unmarked classes</p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          <SetupView session={session} subjects={subjects} onSaveComplete={fetchUserSettings} />
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
            <h3 className="text-xl font-bold mb-4">{editingSubject ? "Edit Subject" : "Add New Subject"}</h3>
            <form onSubmit={handleAddSubject} className="space-y-4">
              <input
                required
                placeholder="Subject Name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex gap-4">
                <input
                  required
                  placeholder="Conducted"
                  type="number"
                  value={newConducted}
                  onChange={(e) => setNewConducted(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <input
                  required
                  placeholder="Attended"
                  type="number"
                  value={newAttended}
                  onChange={(e) => setNewAttended(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg"
                >
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;