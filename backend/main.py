from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Any
from supabase import create_client, Client
import os
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Supabase
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

# --- DATA MODELS ---
class Subject(BaseModel):
    name: str
    conducted: int
    attended: int
    user_id: str  

class ProfileSetup(BaseModel):
    student_name: str
    attendance_mode: str
    target_percentage: int
    semester_start_date: Optional[str] = None
    last_working_day: Optional[str] = None

class HolidaySetup(BaseModel):
    title: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class ExamSetup(BaseModel):
    title: str
    exam_type: str
    dates: List[str]
    exam_day_rule: Optional[str] = "Auto-Present"
    gap_rule: str

class FullSetupPayload(BaseModel):
    user_id: str
    profile: ProfileSetup
    holidays: List[HolidaySetup]
    exams: List[ExamSetup]
    timetable: Dict[str, Any]

class AttendanceMark(BaseModel):
    user_id: str
    subject_id: int
    period_number: int
    status: str # "Present" or "Absent"

@app.get("/api/status")
def get_status():
    return {"status": "System Online 🟢"}

# --- SUBJECT ENDPOINTS ---
@app.get("/api/subjects")
def get_subjects(user_id: str):
    try:
        response = supabase.table("subjects").select("*").eq("user_id", user_id).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/subjects")
def add_subject(subject: Subject):
    try:
        response = supabase.table("subjects").insert(subject.dict()).execute()
        return response.data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/subjects/{subject_id}")
def delete_subject(subject_id: int):
    try:
        supabase.table("subjects").delete().eq("id", subject_id).execute()
        return {"message": "Success"}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# --- SETUP WIZARD ENDPOINTS ---
@app.get("/api/setup/{user_id}")
def get_setup(user_id: str):
    try:
        profile_res = supabase.table("profiles").select("*").eq("user_id", user_id).execute()
        events_res = supabase.table("holidays_and_exams").select("*").eq("user_id", user_id).execute()
        timetable_res = supabase.table("timetable_slots").select("*").eq("user_id", user_id).execute()

        if not profile_res.data:
            return {"has_setup": False}

        # Uses 'day_of_week' to match Supabase
        timetable_dict = {f"{s['day_of_week']}-{s['period_number']}": str(s['subject_id']) for s in timetable_res.data}

        return {
            "has_setup": True,
            "profile": profile_res.data[0],
            "events": events_res.data,
            "timetable": timetable_dict
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/setup")
def save_setup(payload: FullSetupPayload):
    try:
        uid = payload.user_id
        # 1. Clear and Update Profile
        supabase.table("profiles").delete().eq("user_id", uid).execute()
        supabase.table("profiles").insert({"user_id": uid, **payload.profile.dict()}).execute()
        
        # 2. Clear and Update Holidays/Exams
        supabase.table("holidays_and_exams").delete().eq("user_id", uid).execute()
        events = []
        for h in payload.holidays:
            if h.title: events.append({"user_id": uid, "type": "Holiday", **h.dict()})
        for e in payload.exams:
            if e.title: events.append({"user_id": uid, "type": "Exam", **e.dict()})
        if events: supabase.table("holidays_and_exams").insert(events).execute()

        # 3. Clear and Update Timetable Slots
        supabase.table("timetable_slots").delete().eq("user_id", uid).execute()
        slots = []
        for key, sid in payload.timetable.items():
            if sid and sid != "":
                day, period = key.split('-')
                slots.append({
                    "user_id": uid, 
                    "day_of_week": day, 
                    "period_number": int(period), 
                    "subject_id": int(sid)
                })
        if slots: supabase.table("timetable_slots").insert(slots).execute()
        return {"message": "Setup Saved"}
    except Exception as e:
        print(f"Setup Save Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

# --- DAILY ATTENDANCE ENDPOINTS ---
@app.get("/api/today-schedule/{user_id}")
def get_today_schedule(user_id: str):
    try:
        now = datetime.now()
        today_date = now.date().isoformat()
        today_name = now.strftime("%A")

        # 1. Fetch all events for this user
        events = supabase.table("holidays_and_exams").select("*").eq("user_id", user_id).execute()

        for event in events.data:
            # Check for Holiday Ranges
            if event['type'] == 'Holiday':
                if event['start_date'] <= today_date <= event['end_date']:
                    return {"is_event": True, "event_title": event['title'], "slots": []}
            
            # Check for Exams (Including the Gap Days)
            if event['type'] == 'Exam':
                # If today is one of the specific exam dates
                if today_date in (event.get('dates') or []):
                    return {"is_event": True, "event_title": f"{event['title']} (Exam Day)", "slots": []}
                
                # Logic for Gap Days: If today is between the first and last exam date
                if event.get('dates'):
                    sorted_dates = sorted(event['dates'])
                    if sorted_dates[0] <= today_date <= sorted_dates[-1]:
                        return {"is_event": True, "event_title": f"{event['title']} (Prep Leave)", "slots": []}

        # 2. If no events, show normal schedule
        slots = supabase.table("timetable_slots")\
            .select("period_number, subject_id, subjects(name)")\
            .eq("user_id", user_id)\
            .eq("day_of_week", today_name)\
            .order("period_number")\
            .execute()

        return {"is_event": False, "slots": slots.data, "day": today_name}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    try:
        now = datetime.now()
        today_name = now.strftime("%A")
        today_date = now.date().isoformat()

        # 1. Check if today is a Holiday or Exam day
        # We look for any event where today falls between start_date and end_date
        check_event = supabase.table("holidays_and_exams")\
            .select("*")\
            .eq("user_id", user_id)\
            .lte("start_date", today_date)\
            .gte("end_date", today_date)\
            .execute()

        if check_event.data:
            event = check_event.data[0]
            return {
                "day": today_name,
                "date": today_date,
                "is_event": True,
                "event_title": event.get("title", "Holiday"),
                "event_type": event.get("type"),
                "slots": [],
                "logs": []
            }

        # 2. If no holiday, proceed with normal schedule fetch
        slots = supabase.table("timetable_slots")\
            .select("period_number, subject_id, subjects(name)")\
            .eq("user_id", user_id)\
            .eq("day_of_week", today_name)\
            .order("period_number")\
            .execute()

        logs = supabase.table("attendance_logs")\
            .select("period_number, status")\
            .eq("user_id", user_id)\
            .eq("date", today_date)\
            .execute()

        return {
            "day": today_name,
            "date": today_date,
            "is_event": False,
            "slots": slots.data if slots.data else [],
            "logs": logs.data if logs.data else []
        }
    except Exception as e:
        print(f"Today Schedule Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    try:
        days_map = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        today_name = days_map[datetime.now().weekday()]
        today_date = datetime.now().date().isoformat()

        # 2. Holiday day: hide periods entirely
        if is_holiday:
            return {
                "day": today_name,
                "date": today_date,
                "is_event": True,
                "event_title": event_title,
                "event_type": "Holiday",
                "slots": [],
                "logs": []
            }

        # 3. Fetch today's scheduled periods (needed for normal and exam-day processing)
        slots = supabase.table("timetable_slots")\
            .select("period_number, subject_id, subjects(name)")\
            .eq("user_id", user_id)\
            .eq("day_of_week", today_name)\
            .order("period_number")\
            .execute()

        # 4. Exam/gap day: hide periods; optionally auto-mark attendance based on configured rule
        if (is_exam_day or is_gap_day) and day_rule == "Auto-Present":
            for slot in (slots.data or []):
                period_number = int(slot["period_number"])
                subject_id = int(slot["subject_id"])

                existing_log = supabase.table("attendance_logs")\
                    .select("id")\
                    .eq("user_id", user_id)\
                    .eq("date", today_date)\
                    .eq("period_number", period_number)\
                    .execute()

                if existing_log.data:
                    continue

                supabase.table("attendance_logs").insert({
                    "user_id": user_id,
                    "subject_id": subject_id,
                    "period_number": period_number,
                    "date": today_date,
                    "status": "Present"
                }).execute()

                sub = supabase.table("subjects").select("conducted, attended").eq("id", subject_id).single().execute()
                new_c = int(sub.data["conducted"]) + 1
                new_a = int(sub.data["attended"]) + 1
                supabase.table("subjects").update({
                    "conducted": new_c,
                    "attended": new_a
                }).eq("id", subject_id).execute()

        if is_exam_day or is_gap_day:
            return {
                "day": today_name,
                "date": today_date,
                "is_event": True,
                "event_title": event_title,
                "event_type": "Exam" if is_exam_day else "Gap Day",
                "slots": [],
                "logs": []
            }

        # 5. Normal day: show periods and today's logs
        logs = supabase.table("attendance_logs")\
            .select("period_number, status")\
            .eq("user_id", user_id)\
            .eq("date", today_date)\
            .execute()

        return {
            "day": today_name,
            "date": today_date,
            "is_event": False,
            "slots": slots.data if slots.data else [],
            "logs": logs.data if logs.data else []
        }
    except Exception as e:
        print(f"Today Schedule Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/api/mark-attendance")
def mark_attendance(data: AttendanceMark):
    try:
        today_date = datetime.now().date().isoformat()

        # Prevent duplicate marking for same user/day/period
        existing = (
            supabase.table("attendance_logs")
            .select("id, status, subject_id")
            .eq("user_id", data.user_id)
            .eq("date", today_date)
            .eq("period_number", data.period_number)
            .execute()
        )

        if existing.data:
            raise HTTPException(
                status_code=409,
                detail="Attendance already marked for this period today."
            )

        # 1. Log the history entry
        supabase.table("attendance_logs").insert({
            "user_id": data.user_id, 
            "subject_id": data.subject_id, 
            "period_number": data.period_number, 
            "date": today_date, 
            "status": data.status
        }).execute()
        
        # 2. Fetch current stats and update
        sub = supabase.table("subjects").select("conducted, attended").eq("id", data.subject_id).single().execute()
        
        # Increment conducted for every mark; increment attended only if 'Present'
        new_c = int(sub.data['conducted']) + 1
        new_a = int(sub.data['attended']) + (1 if data.status == "Present" else 0)
        
        supabase.table("subjects").update({
            "conducted": new_c, 
            "attended": new_a
        }).eq("id", data.subject_id).execute()

        return {"message": "Updated"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Marking Error: {e}")
        raise HTTPException(status_code=400, detail=str(e))