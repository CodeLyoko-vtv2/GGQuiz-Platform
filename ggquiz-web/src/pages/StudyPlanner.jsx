import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import viLocale from "@fullcalendar/core/locales/vi";
import { ChevronLeft, ChevronRight, Play, Plus, Settings } from "lucide-react";
import EventEditorModal from "../components/planner/EventEditorModal";
import MiniMonthCalendar from "../components/planner/MiniMonthCalendar";
import { expandEvents } from "../utils/plannerRecurrence";
import {
  defaultCalendarName,
  defaultNotification,
  emptyRecurrence,
  loadPlannerState,
  updatePlannerState,
} from "../utils/plannerStore";

const VIEW_OPTIONS = [
  { id: "timeGridDay", label: "Ngày" },
  { id: "timeGridWeek", label: "Tuần" },
  { id: "dayGridMonth", label: "Tháng" },
];

function formatMonthTitle(date) {
  if (!date) return "";
  return `Tháng ${date.getMonth() + 1}, ${date.getFullYear()}`;
}

function calendarColor(state, calendarId) {
  return state.calendars.find((item) => item.id === calendarId)?.color || "#039BE5";
}

function StudyPlanner() {
  const navigate = useNavigate();
  const calendarRef = useRef(null);
  const [state, setState] = useState(() => loadPlannerState());
  const [currentView, setCurrentView] = useState("timeGridWeek");
  const [titleDate, setTitleDate] = useState(new Date());
  const [miniDate, setMiniDate] = useState(new Date());
  const [enabled, setEnabled] = useState(() =>
    Object.fromEntries(loadPlannerState().calendars.map((c) => [c.id, true]))
  );
  const [modal, setModal] = useState(null);
  const [range, setRange] = useState(() => {
    const start = new Date();
    start.setDate(start.getDate() - 7);
    const end = new Date();
    end.setDate(end.getDate() + 21);
    return { start, end };
  });

  useEffect(() => {
    const sync = () => {
      const next = loadPlannerState();
      setState(next);
      setEnabled((prev) => {
        const merged = { ...prev };
        next.calendars.forEach((cal) => {
          if (merged[cal.id] === undefined) merged[cal.id] = true;
        });
        return merged;
      });
    };
    window.addEventListener("ggquiz:planner-changed", sync);
    return () => window.removeEventListener("ggquiz:planner-changed", sync);
  }, []);

  const visibleEvents = useMemo(() => {
    const filtered = state.events.filter((item) => enabled[item.calendarId] !== false);
    return expandEvents(filtered, range.start, range.end).map((item) => ({
      id: item.id,
      title: item.title,
      start: item.start,
      end: item.end,
      allDay: Boolean(item.allDay),
      backgroundColor: calendarColor(state, item.calendarId),
      borderColor: calendarColor(state, item.calendarId),
      extendedProps: {
        sourceId: item.sourceId || item.id,
        calendarId: item.calendarId,
        note: item.note || "",
        attachment: item.attachment || null,
        recurrence: item.recurrence,
        notification: item.notification,
        allDay: Boolean(item.allDay),
      },
    }));
  }, [state, enabled, range]);

  const getApi = () => calendarRef.current?.getApi?.();

  const goToday = () => {
    const now = new Date();
    getApi()?.today();
    setMiniDate(now);
    setTitleDate(now);
  };

  const goPrev = () => getApi()?.prev();
  const goNext = () => getApi()?.next();
  const changeView = (view) => {
    setCurrentView(view);
    getApi()?.changeView(view);
  };

  const openCreateAt = (start, end, allDay = false) => {
    const calendar =
      state.calendars.find((item) => item.isDefault) || state.calendars[0];
    setModal({
      id: null,
      title: "",
      start: start.toISOString(),
      end: end.toISOString(),
      allDay,
      calendarId: calendar?.id,
      note: "",
      attachment: null,
      recurrence: emptyRecurrence(),
      notification: defaultNotification(),
    });
  };

  const openEdit = (event) => {
    const ext = event.extendedProps || {};
    const source = state.events.find((item) => item.id === ext.sourceId) || {
      id: ext.sourceId,
      title: event.title,
      start: event.start,
      end: event.end,
      calendarId: ext.calendarId,
      note: ext.note,
      attachment: ext.attachment,
      recurrence: ext.recurrence,
      notification: ext.notification,
      allDay: event.allDay,
    };
    setModal({
      ...source,
      sourceId: source.id,
      start: source.start,
      end: source.end,
    });
  };

  const upsertEvent = (payload) => {
    updatePlannerState((prev) => {
      if (!payload.id) {
        return {
          ...prev,
          events: [{ ...payload, id: `evt-${Date.now()}` }, ...prev.events],
        };
      }
      return {
        ...prev,
        events: prev.events.map((item) => (item.id === payload.id ? payload : item)),
      };
    });
    setModal(null);
    toast.success(payload.id ? "Đã cập nhật sự kiện" : "Đã tạo sự kiện");
  };

  const deleteEvent = (id) => {
    updatePlannerState((prev) => ({
      ...prev,
      events: prev.events.filter((item) => item.id !== id),
    }));
    setModal(null);
    toast.success("Đã xóa sự kiện");
  };

  const startStudy = useCallback(
    (attachment, event) => {
      event?.preventDefault?.();
      event?.stopPropagation?.();
      if (!attachment) return;
      if (attachment.type === "link" && attachment.url) {
        window.open(attachment.url, "_blank", "noopener,noreferrer");
        return;
      }
      if (attachment.type === "exam") {
        navigate(`/exams/${attachment.id}`);
        return;
      }
      toast.success(`Mở học phần: ${attachment.title}`);
      navigate("/library");
    },
    [navigate]
  );

  const renderEventContent = (arg) => {
    const attachment = arg.event.extendedProps?.attachment;
    const note = String(arg.event.extendedProps?.note || "").trim();
    const timeText = arg.timeText;
    return (
      <div className="fc-gg-event group/event relative" title={note || undefined}>
        {note ? (
          <div className="pointer-events-none absolute bottom-full left-0 z-20 mb-1 hidden w-52 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] leading-snug font-normal text-white shadow-lg group-hover/event:block">
            {note}
          </div>
        ) : null}
        <div className="fc-gg-event__title">{arg.event.title}</div>
        {timeText ? <div className="fc-gg-event__time">{timeText}</div> : null}
        {attachment ? (
          <button
            type="button"
            className="fc-gg-event__start"
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => startStudy(attachment, e)}
          >
            <Play className="h-3 w-3" />
            Bắt đầu học
          </button>
        ) : null}
      </div>
    );
  };

  const applyDelta = (event, oldEvent) => {
    const sourceId = event.extendedProps?.sourceId;
    if (!sourceId || !oldEvent?.start) return;
    const shift = event.start.getTime() - oldEvent.start.getTime();
    const endShift =
      event.end && oldEvent.end
        ? event.end.getTime() - oldEvent.end.getTime()
        : shift;
    updatePlannerState((prev) => ({
      ...prev,
      events: prev.events.map((item) =>
        item.id === sourceId
          ? {
              ...item,
              start: new Date(new Date(item.start).getTime() + shift).toISOString(),
              end: new Date(new Date(item.end).getTime() + endShift).toISOString(),
              allDay: Boolean(event.allDay),
            }
          : item
      ),
    }));
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-3 py-4 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-col gap-4 lg:flex-row">
        <aside className="w-full shrink-0 space-y-3 lg:w-[220px] lg:max-w-[220px]">
          <button
            type="button"
            onClick={() => {
              const start = new Date();
              start.setMinutes(0, 0, 0);
              const end = new Date(start);
              end.setHours(end.getHours() + 1);
              openCreateAt(start, end);
            }}
            className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Tạo sự kiện
          </button>

          <div className="rounded-xl border border-gray-200 bg-white px-2 py-1.5 shadow-sm">
            <MiniMonthCalendar
              value={miniDate}
              onChange={(date) => {
                setMiniDate(date);
                setTitleDate(date);
                getApi()?.gotoDate(date);
              }}
            />
          </div>

          <div className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <p className="mb-2 text-[11px] font-bold tracking-wide text-gray-400 uppercase">
              Lịch của tôi
            </p>
            <ul className="space-y-1">
              {state.calendars.map((cal) => (
                <li key={cal.id}>
                  <label
                    className="group relative flex cursor-pointer items-center gap-2 rounded-lg px-1.5 py-1 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                    title={cal.description?.trim() || undefined}
                  >
                    <input
                      type="checkbox"
                      checked={enabled[cal.id] !== false}
                      onChange={(e) =>
                        setEnabled((prev) => ({ ...prev, [cal.id]: e.target.checked }))
                      }
                      className="accent-blue-600"
                    />
                    <span
                      className="h-3 w-3 rounded-sm"
                      style={{ backgroundColor: cal.color }}
                    />
                    <span className="truncate">
                      {cal.isDefault ? cal.name || defaultCalendarName() : cal.name}
                    </span>
                    {cal.description?.trim() ? (
                      <span className="pointer-events-none absolute top-full left-2 z-30 mt-1 hidden w-52 rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] leading-snug font-normal text-white shadow-lg group-hover:block">
                        {cal.description.trim()}
                      </span>
                    ) : null}
                  </label>
                </li>
              ))}
            </ul>
          </div>
        </aside>

        <section className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-white p-3 shadow-sm sm:p-4">
          <div className="mb-3 flex flex-col gap-3 border-b border-gray-100 pb-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={goToday}
                className="rounded-xl border border-gray-200 px-3 py-2 text-sm font-bold text-gray-700 transition hover:bg-gray-50"
              >
                Hôm nay
              </button>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={goPrev}
                  className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                  aria-label="Trước"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  className="rounded-xl border border-gray-200 p-2 text-gray-600 hover:bg-gray-50"
                  aria-label="Sau"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
              <h1 className="text-lg font-extrabold text-gray-900 sm:text-xl">
                {formatMonthTitle(titleDate)}
              </h1>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={currentView}
                onChange={(e) => changeView(e.target.value)}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-700 outline-none focus:border-blue-500"
              >
                {VIEW_OPTIONS.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>
              <Link
                to="/schedule/settings"
                className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50"
              >
                <Settings className="h-4 w-4" />
                Cài đặt lịch
              </Link>
            </div>
          </div>

          <div className="gg-planner-calendar">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="timeGridWeek"
              headerToolbar={false}
              height="auto"
              expandRows
              stickyHeaderDates
              nowIndicator
              editable
              selectable
              selectMirror
              dayMaxEvents
              firstDay={1}
              slotMinTime="00:00:00"
              slotMaxTime="24:00:00"
              allDaySlot
              allDayText="Cả ngày"
              locale={viLocale}
              slotLabelFormat={{
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }}
              eventTimeFormat={{
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              }}
              events={visibleEvents}
              eventContent={renderEventContent}
              datesSet={(info) => {
                setTitleDate(info.view.currentStart);
                setMiniDate(info.view.currentStart);
                setRange({ start: info.start, end: info.end });
              }}
              select={(info) => {
                openCreateAt(info.start, info.end, info.allDay);
                info.view.calendar.unselect();
              }}
              eventClick={(info) => {
                if (info.jsEvent?.target?.closest?.(".fc-gg-event__start")) return;
                openEdit(info.event);
              }}
              eventDrop={(info) => applyDelta(info.event, info.oldEvent)}
              eventResize={(info) => applyDelta(info.event, info.oldEvent)}
            />
          </div>
        </section>
      </div>

      <EventEditorModal
        open={Boolean(modal)}
        initial={modal}
        calendars={state.calendars}
        onClose={() => setModal(null)}
        onSave={upsertEvent}
        onDelete={deleteEvent}
      />
    </div>
  );
}

export default StudyPlanner;
