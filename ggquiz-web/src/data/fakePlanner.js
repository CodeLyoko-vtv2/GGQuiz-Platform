/** Fake data cho Thời khóa biểu — lưu localStorage để demo kéo thả */

export const PLANNER_CATEGORIES = [
  { id: "english", name: "Tiếng Anh", color: "#6366F1" },
  { id: "esports", name: "Esports", color: "#EC4899" },
  { id: "it", name: "IT", color: "#14B8A6" },
  { id: "other", name: "Khác", color: "#F59E0B" },
];

export const FAKE_ATTACHMENTS = {
  studySets: [
    { id: "set-1", title: "Valorant Vocabulary Pack", type: "studySet" },
    { id: "set-2", title: "IELTS Foundation Words", type: "studySet" },
    { id: "set-3", title: "TOEIC Listening Phrases", type: "studySet" },
  ],
  exams: [
    { id: "exam-1", title: "Đề thi Tiếng Anh giữa kỳ — Lớp 10", type: "exam" },
    { id: "exam-2", title: "Đề Reading & Writing — IELTS Foundation", type: "exam" },
    { id: "exam-3", title: "Đề Nghe hiểu cơ bản — Lớp 12", type: "exam" },
  ],
};

const STORAGE_KEY = "ggquiz_planner_events_v1";

function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay(); // 0 Sun
  const diff = day === 0 ? -6 : 1 - day; // Monday start
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function atTime(baseDate, dayOffset, hour, minute = 0) {
  const d = new Date(baseDate);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export function createDefaultEvents() {
  const week = startOfWeek(new Date());
  return [
    {
      id: "evt-1",
      title: "Ôn từ vựng Valorant",
      start: atTime(week, 0, 9, 0),
      end: atTime(week, 0, 11, 0),
      categoryId: "esports",
      color: "#EC4899",
      note: "Focus: agent abilities + callouts",
      attachment: { type: "studySet", id: "set-1", title: "Valorant Vocabulary Pack" },
    },
    {
      id: "evt-2",
      title: "Luyện đề IELTS Reading",
      start: atTime(week, 2, 14, 0),
      end: atTime(week, 2, 16, 0),
      categoryId: "english",
      color: "#6366F1",
      note: "Làm 1 passage + review lỗi",
      attachment: { type: "exam", id: "exam-2", title: "Đề Reading & Writing — IELTS Foundation" },
    },
    {
      id: "evt-3",
      title: "Học React Hooks",
      start: atTime(week, 3, 19, 0),
      end: atTime(week, 3, 21, 0),
      categoryId: "it",
      color: "#14B8A6",
      note: "useEffect + custom hooks",
      attachment: null,
    },
    {
      id: "evt-4",
      title: "Flashcards IELTS buổi sáng",
      start: atTime(week, 4, 7, 30),
      end: atTime(week, 4, 8, 30),
      categoryId: "english",
      color: "#6366F1",
      note: "",
      attachment: { type: "studySet", id: "set-2", title: "IELTS Foundation Words" },
    },
  ];
}

export function loadPlannerEvents() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const defaults = createDefaultEvents();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(defaults));
      return defaults;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : createDefaultEvents();
  } catch {
    return createDefaultEvents();
  }
}

export function savePlannerEvents(events) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
}

export function toCalendarEvent(item) {
  return {
    id: item.id,
    title: item.title,
    start: item.start,
    end: item.end,
    backgroundColor: item.color,
    borderColor: item.color,
    extendedProps: {
      categoryId: item.categoryId,
      note: item.note || "",
      attachment: item.attachment || null,
      color: item.color,
    },
  };
}
