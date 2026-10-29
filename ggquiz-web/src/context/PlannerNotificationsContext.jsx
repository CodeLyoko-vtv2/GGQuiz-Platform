import { createContext, useContext, useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import api from "../api/client";
import {
  loadPlannerState,
  playReminderChime,
  reminderOffsetMs,
  updatePlannerState,
} from "../utils/plannerStore";
import { expandEvents } from "../utils/plannerRecurrence";

const PlannerNotificationsContext = createContext(null);

function collectDueReminders(state, now = Date.now()) {
  const rangeStart = new Date(now - 2 * 24 * 60 * 60 * 1000);
  const rangeEnd = new Date(now + 14 * 24 * 60 * 60 * 1000);
  const occurrences = expandEvents(state.events, rangeStart, rangeEnd);
  const due = [];
  const fired = new Set(state.firedKeys || []);

  for (const occ of occurrences) {
    if (!occ.notification) continue;
    const start = new Date(occ.start).getTime();
    const remindAt = start - reminderOffsetMs(occ.notification);
    const key = `${occ.sourceId || occ.id}:${start}:${occ.notification.amount}${occ.notification.unit}`;
    if (fired.has(key)) continue;
    if (remindAt <= now && remindAt >= now - 24 * 60 * 60 * 1000) {
      due.push({
        key,
        eventId: occ.sourceId || occ.id.split("::")[0],
        title: occ.title,
        at: new Date(remindAt).toISOString(),
        start: occ.start,
      });
    }
  }
  return due;
}

export function PlannerNotificationsProvider({ children }) {
  const [state, setState] = useState(() => loadPlannerState());
  const [serverNotes, setServerNotes] = useState([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get("/notifications");
        if (!cancelled) setServerNotes(data.notifications || []);
      } catch {
        if (!cancelled) setServerNotes([]);
      }
    };
    load();
    const timer = window.setInterval(load, 20000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const sync = () => setState(loadPlannerState());
    window.addEventListener("ggquiz:planner-changed", sync);
    return () => window.removeEventListener("ggquiz:planner-changed", sync);
  }, []);

  useEffect(() => {
    const tick = () => {
      const current = loadPlannerState();
      const due = collectDueReminders(current);
      if (due.length === 0) {
        setState(current);
        return;
      }
      const next = updatePlannerState((prev) => ({
        ...prev,
        firedKeys: [...prev.firedKeys, ...due.map((item) => item.key)].slice(-400),
        notifications: [
          ...due.map((item) => ({
            id: item.key,
            eventId: item.eventId,
            title: item.title,
            body: `Sự kiện sắp diễn ra: ${item.title}`,
            at: item.at,
            start: item.start,
            read: false,
            createdAt: new Date().toISOString(),
          })),
          ...prev.notifications,
        ].slice(0, 80),
      }));
      setState(next);
      due.forEach((item) => {
        playReminderChime();
        toast(item.title, { icon: "🔔" });
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          try {
            new Notification(item.title, { body: "Sự kiện trên Thời khóa biểu sắp bắt đầu." });
          } catch {
            /* ignore */
          }
        }
      });
    };

    tick();
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, []);

  const merged = useMemo(() => {
    const planner = (state.notifications || []).map((item) => ({
      ...item,
      source: "planner",
      link: item.link || "/schedule",
    }));
    return [...serverNotes, ...planner].sort((a, b) => {
      const ta = new Date(a.createdAt || a.at || 0).getTime();
      const tb = new Date(b.createdAt || b.at || 0).getTime();
      return tb - ta;
    });
  }, [serverNotes, state.notifications]);

  const unreadCount = merged.filter((item) => !item.read).length;

  const value = useMemo(
    () => ({
      notifications: merged,
      unreadCount,
      markRead: (id, source) => {
        if (source === "server") {
          api.patch(`/notifications/${id}/read`).catch(() => {});
          setServerNotes((prev) =>
            prev.map((item) => (item.id === id ? { ...item, read: true } : item))
          );
          return;
        }
        updatePlannerState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((item) =>
            item.id === id ? { ...item, read: true } : item
          ),
        }));
      },
      markAllRead: () => {
        api.patch("/notifications/read-all").catch(() => {});
        setServerNotes((prev) => prev.map((item) => ({ ...item, read: true })));
        updatePlannerState((prev) => ({
          ...prev,
          notifications: prev.notifications.map((item) => ({ ...item, read: true })),
        }));
      },
    }),
    [merged, unreadCount]
  );

  return (
    <PlannerNotificationsContext.Provider value={value}>
      {children}
    </PlannerNotificationsContext.Provider>
  );
}

export function usePlannerNotifications() {
  return useContext(PlannerNotificationsContext);
}
