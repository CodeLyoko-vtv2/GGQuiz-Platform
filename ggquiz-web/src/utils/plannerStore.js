import { getStoredUser } from "../api/client";
import { PLANNER_CATEGORIES, createDefaultEvents } from "../data/fakePlanner";

const V1_KEY = "ggquiz_planner_events_v1";
const V2_KEY = "ggquiz_planner_v2";

export const CALENDAR_COLORS = [
  "#039BE5",
  "#3F51B5",
  "#7986CB",
  "#8E24AA",
  "#D50000",
  "#E67C73",
  "#F4511E",
  "#F6BF26",
  "#33B679",
  "#0B8043",
  "#616161",
  "#795548",
];

export const NOTIFY_PRESETS = [
  { amount: 5, unit: "minutes", label: "5 phút trước" },
  { amount: 10, unit: "minutes", label: "10 phút trước" },
  { amount: 15, unit: "minutes", label: "15 phút trước" },
  { amount: 30, unit: "minutes", label: "30 phút trước" },
  { amount: 1, unit: "hours", label: "1 giờ trước" },
  { amount: 1, unit: "days", label: "1 ngày trước" },
];

const EMPTY_RECURRENCE = {
  preset: "none",
  freq: "week",
  interval: 1,
  weekdays: [],
  endType: "never",
  until: "",
  count: 13,
};

export function defaultNotification() {
  return { amount: 30, unit: "minutes" };
}

export function emptyRecurrence() {
  return { ...EMPTY_RECURRENCE, weekdays: [] };
}

function uid(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function defaultCalendarName() {
  return getStoredUser()?.name?.trim() || "Lịch của tôi";
}

function createDefaultState() {
  const defaultCal = {
    id: "cal-default",
    name: defaultCalendarName(),
    color: "#039BE5",
    description: "",
    isDefault: true,
  };
  const extras = PLANNER_CATEGORIES.map((cat, index) => ({
    id: `cal-${cat.id}`,
    name: cat.name,
    color: cat.color,
    description: "",
    isDefault: false,
  }));
  const events = createDefaultEvents().map((item) => ({
    ...item,
    calendarId: `cal-${item.categoryId}`,
    allDay: false,
    recurrence: emptyRecurrence(),
    notification: defaultNotification(),
  }));
  return {
    calendars: [defaultCal, ...extras],
    events,
    notifications: [],
    firedKeys: [],
  };
}

function migrateV1() {
  try {
    const raw = localStorage.getItem(V1_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const base = createDefaultState();
    const events = parsed.map((item) => ({
      id: item.id || uid("evt"),
      title: item.title || "Sự kiện",
      start: item.start,
      end: item.end,
      calendarId: item.calendarId || `cal-${item.categoryId || "other"}`,
      allDay: Boolean(item.allDay),
      note: item.note || "",
      attachment: item.attachment || null,
      recurrence: item.recurrence || emptyRecurrence(),
      notification: item.notification || defaultNotification(),
    }));
    return { ...base, events };
  } catch {
    return null;
  }
}

function normalizeState(raw) {
  const fallback = createDefaultState();
  if (!raw || typeof raw !== "object") return fallback;
  const calendars = Array.isArray(raw.calendars) ? raw.calendars : fallback.calendars;
  const hasDefault = calendars.some((item) => item.isDefault);
  const nextCals = hasDefault
    ? calendars
    : [
        {
          id: "cal-default",
          name: defaultCalendarName(),
          color: "#039BE5",
          description: "",
          isDefault: true,
        },
        ...calendars,
      ];
  return {
    calendars: nextCals.map((item) => ({
      id: item.id,
      name: item.name || "Lịch",
      color: item.color || "#039BE5",
      description: item.description || "",
      isDefault: Boolean(item.isDefault),
    })),
    events: Array.isArray(raw.events) ? raw.events : [],
    notifications: Array.isArray(raw.notifications) ? raw.notifications : [],
    firedKeys: Array.isArray(raw.firedKeys) ? raw.firedKeys.slice(-400) : [],
  };
}

export function loadPlannerState() {
  try {
    const raw = localStorage.getItem(V2_KEY);
    if (raw) return normalizeState(JSON.parse(raw));
    const migrated = migrateV1();
    const state = migrated || createDefaultState();
    savePlannerState(state);
    return state;
  } catch {
    return createDefaultState();
  }
}

export function savePlannerState(state) {
  localStorage.setItem(V2_KEY, JSON.stringify(state));
  window.dispatchEvent(new CustomEvent("ggquiz:planner-changed"));
}

export function updatePlannerState(mutator) {
  const next = mutator(loadPlannerState());
  savePlannerState(next);
  return next;
}

export function notifyLabel(notification) {
  if (!notification) return "Không thông báo";
  const found = NOTIFY_PRESETS.find(
    (item) => item.amount === notification.amount && item.unit === notification.unit
  );
  if (found) return found.label;
  const unitLabel =
    notification.unit === "days" ? "ngày" : notification.unit === "hours" ? "giờ" : "phút";
  return `${notification.amount} ${unitLabel} trước`;
}

export function reminderOffsetMs(notification) {
  if (!notification) return 0;
  const n = Number(notification.amount) || 0;
  if (notification.unit === "days") return n * 24 * 60 * 60 * 1000;
  if (notification.unit === "hours") return n * 60 * 60 * 1000;
  return n * 60 * 1000;
}

export function playReminderChime() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(620, ctx.currentTime + 0.22);
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.45);
  } catch {
    /* ignore */
  }
}
