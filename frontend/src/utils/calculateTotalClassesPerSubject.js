/**
 * Calculate total number of class periods per subject over a semester.
 *
 * Rules (mirrors backend behavior):
 * - `Holiday` and `Leave` dates are excluded (no classes counted).
 * - For exams:
 *   - If `date` matches an item in `exam.dates`, it's an "Exam Day".
 *   - If `date` is within the span from first..last exam date but not explicitly listed, it's a "Gap Day".
 *   - Exam/gap days are counted unless the corresponding rule equals `"Ignore"`.
 *     (So `"Auto-Present"` and `"Normal"` both count.)
 *
 * @param {Object} params
 * @param {Record<string, string|number>} params.timetable - e.g. { "Monday-1": 3, "Monday-2": 7 }
 * @param {string} params.semester_start_date - "YYYY-MM-DD"
 * @param {string} params.last_working_day - "YYYY-MM-DD"
 * @param {Array<{start_date?:string,startDate?:string,end_date?:string,endDate?:string}>} [params.holidays]
 * @param {Array<{start_date?:string,startDate?:string,end_date?:string,endDate?:string}>} [params.leaves]
 * @param {Array<{dates?:string[],exam_day_rule?:string,gap_rule?:string}>} [params.exams]
 * @returns {{ totalClasses: number, totalClassesBySubjectId: Record<string, number> }}
 */
export function calculateTotalClassesPerSubject({
  timetable,
  semester_start_date,
  last_working_day,
  holidays = [],
  leaves = [],
  exams = [],
}) {
  const WEEKDAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

  const startDate = parseISODate(semester_start_date);
  const endDate = parseISODate(last_working_day);

  const totalClassesBySubjectId = {};

  if (!startDate || !endDate) {
    return { totalClasses: 0, totalClassesBySubjectId };
  }

  // Precompute how many times each subject occurs per weekday in the timetable.
  const weekdaySubjectCounts = {}; // { [weekdayName]: { [subjectId]: count } }
  for (const [key, sid] of Object.entries(timetable || {})) {
    if (sid === "" || sid === null || sid === undefined) continue;
    const parts = String(key).split("-");
    if (parts.length < 2) continue;

    const dayOfWeek = parts.slice(0, -1).join("-"); // defensive; normally just "Monday"
    const subjectId = String(sid);

    weekdaySubjectCounts[dayOfWeek] ||= {};
    weekdaySubjectCounts[dayOfWeek][subjectId] = (weekdaySubjectCounts[dayOfWeek][subjectId] || 0) + 1;
  }

  const isInAnyRange = (dateStr, ranges) => {
    for (const r of ranges || []) {
      const start = r?.start_date ?? r?.startDate;
      const end = r?.end_date ?? r?.endDate;
      if (!start) continue;
      const startISO = normalizeISODate(start);
      const endISO = end ? normalizeISODate(end) : startISO;
      if (!startISO || !endISO) continue;
      if (dateStr >= startISO && dateStr <= endISO) return true;
    }
    return false;
  };

  const getExamEventForDate = (dateStr) => {
    // Match backend: first matching exam event "wins" (due to `break`).
    for (const exam of exams || []) {
      const examDates = Array.isArray(exam?.dates) ? exam.dates.filter(Boolean) : [];
      if (examDates.length === 0) continue;
      const sorted = [...examDates].sort();

      if (sorted.includes(dateStr)) {
        return { rule: exam?.exam_day_rule ?? "Auto-Present" };
      }

      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      if (dateStr >= first && dateStr <= last) {
        return { rule: exam?.gap_rule ?? "Ignore" };
      }
    }
    return null;
  };

  const shouldCountExamDay = (rule) => {
    const normalized = String(rule || "").trim();
    if (!normalized) return true;
    return normalized !== "Ignore";
  };

  // Iterate inclusive date range (UTC-based so weekday is stable for ISO dates).
  const cur = new Date(startDate.getTime());
  while (cur.getTime() <= endDate.getTime()) {
    const dateStr = cur.toISOString().slice(0, 10);

    // 1) Holidays/Leaves exclude the day entirely.
    if (isInAnyRange(dateStr, holidays) || isInAnyRange(dateStr, leaves)) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      continue;
    }

    // 2) Exam/gap rules decide whether we count classes for that date.
    const examEvent = getExamEventForDate(dateStr);
    if (examEvent && !shouldCountExamDay(examEvent.rule)) {
      cur.setUTCDate(cur.getUTCDate() + 1);
      continue;
    }

    // 3) Count all timetable slots that match this weekday.
    const weekdayName = WEEKDAY_NAMES[cur.getUTCDay()];
    const countsForDay = weekdaySubjectCounts[weekdayName];
    if (countsForDay) {
      for (const [subjectId, count] of Object.entries(countsForDay)) {
        totalClassesBySubjectId[subjectId] = (totalClassesBySubjectId[subjectId] || 0) + count;
      }
    }

    cur.setUTCDate(cur.getUTCDate() + 1);
  }

  const totalClasses = Object.values(totalClassesBySubjectId).reduce((a, b) => a + b, 0);
  return { totalClasses, totalClassesBySubjectId };
}

function normalizeISODate(dateStr) {
  // Accepts "YYYY-MM-DD" (recommended) and coerces if possible.
  if (typeof dateStr !== "string") return null;
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

function parseISODate(dateStr) {
  const iso = normalizeISODate(dateStr);
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  // Guard against invalid dates.
  if (Number.isNaN(d.getTime())) return null;
  return d;
}

