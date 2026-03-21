import { useState, useEffect, useCallback } from "react";
import { createClient } from "@supabase/supabase-js";
import BunkMeter from "./components/BunkMeter";
import Auth from "./components/Auth";
import SetupView from "./components/SetupView";
import TodaySchedule from "./components/TodaySchedule";

const supabase = createClient(
  "https://esojecwsoumsezwrplcl.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVzb2plY3dzb3Vtc2V6d3JwbGNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDk1MjQsImV4cCI6MjA4OTU4NTUyNH0.6ToR4xAjWtxSSAhnt5zkBEz6bXAq8InKVGCferp_HAk",
);
// --- UPDATED: Added targetAttendance state and fetchUserSettings function ---
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  const fetchSubjects = useCallback(() => {
    if (!session) return;
    fetch(`http://127.0.0.1:8000/api/subjects?user_id=${session.user.id}`)
      .then((res) => res.json())
      .then((data) => setSubjects(data));
  }, [session]);

  // --- UPDATED: Added fetchUserSettings to get target_percentage ---
  const fetchUserSettings = useCallback(() => {
    if (!session) return;
    fetch(`http://127.0.0.1:8000/api/setup/${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.has_setup && data.profile?.target_percentage !== undefined && data.profile?.target_percentage !== null) {
          const parsedTarget = Number(data.profile.target_percentage);
          setTargetAttendance(Number.isFinite(parsedTarget) ? parsedTarget : 75);
        }
      })
      .catch((err) => console.error("Error fetching settings:", err));
  }, [session]);

  // --- UPDATED: Added fetchUserSettings to get target_percentage ---
  const fetchUserSettings = () => {
    if (!session) return;
    fetch(`http://127.0.0.1:8000/api/setup/${session.user.id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.has_setup && data.profile.target_percentage) {
          setTargetAttendance(data.profile.target_percentage);
        }
      })
      .catch((err) => console.error("Error fetching settings:", err));
  };

  useEffect(() => {
    if (session) {
      fetch("http://127.0.0.1:8000/api/status")
        .then((res) => res.json())
        .then((data) => setApiStatus(data.status))
        .catch(() => setApiStatus("Disconnected 🔴"));
      
      fetchSubjects();
      fetchUserSettings(); // Fetch settings on load
    }
  }, [session, fetchSubjects, fetchUserSettings]);

  const handleAddSubject = async (e) => {
    e.preventDefault();
    const res = await fetch("http://127.0.0.1:8000/api/subjects", {
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
  };

  const handleDeleteSubject = async (id) => {
    await fetch(`http://127.0.0.1:8000/api/subjects/${id}`, { method: "DELETE" });
    fetchSubjects();
  };

  if (!session) return <Auth />;

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
                {/* --- UPDATED: Showing dynamic target --- */}
                <p className="text-gray-500 mt-1">Goal: {targetAttendance}% Attendance Strategy</p>
              </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <TodaySchedule session={session} onUpdate={fetchSubjects} />

              {/* --- UPDATED: Passing targetAttendance prop --- */}
              <BunkMeter
                defaultConducted={subjects.reduce((sum, sub) => sum + sub.conducted, 0)}
                defaultAttended={subjects.reduce((sum, sub) => sum + sub.attended, 0)}
                targetAttendance={targetAttendance} 
              />

              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 col-span-1 lg:col-span-3 position-relative">
                <h3 className="text-xl font-bold text-gray-800 mb-4">Your Subjects</h3>
                <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-6 py-2 m-5 rounded-lg font-bold shadow-lg shadow-blue-200">
                  + Add Subject
                </button>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {subjects.map((sub) => {
                    const pct = sub.conducted > 0 ? ((sub.attended / sub.conducted) * 100).toFixed(1) : 0;
                    return (
                      <div key={sub.id} className="p-4 border border-gray-100 rounded-lg bg-gray-50 flex justify-between items-center group relative">
                        <div>
                          <p className="font-semibold text-gray-800">{sub.name}</p>
                          <p className="text-xs text-gray-500">{sub.attended} / {sub.conducted} Attended</p>
                        </div>
                        {/* --- UPDATED: Dynamic color based on targetAttendance --- */}
                        <span className={`font-bold ${pct >= targetAttendance ? "text-green-600" : "text-red-600"}`}>
                          {pct}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </>
        ) : (
          /* --- UPDATED: Pass callback to refresh settings after setup save --- */
          <SetupView session={session} subjects={subjects} onSaveComplete={fetchUserSettings} />
        )}
      </main>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl shadow-2xl w-96">
            <h3 className="text-xl font-bold mb-4">Add New Subject</h3>
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
                  onChange={(e) => setNewConducted(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                />
                <input
                  required
                  placeholder="Attended"
                  type="number"
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
