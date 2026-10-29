import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Bell, CalendarDays, Link2, Repeat, Trash2, X } from "lucide-react";
import {
  defaultNotification,
  emptyRecurrence,
  notifyLabel,
} from "../../utils/plannerStore";
import { recurrenceLabel, recurrencePresets } from "../../utils/plannerRecurrence";
import RecurrenceModal from "./RecurrenceModal";
import NotificationCustomModal from "./NotificationCustomModal";

function pad(n) {
  return String(n).padStart(2, "0");
}

function toDateInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function toDateTimeInput(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return `${toDateInput(iso)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDateTime(value) {
  return new Date(value).toISOString();
}

function fromDateOnly(value, endOfDay = false) {
  const d = new Date(`${value}T00:00:00`);
  if (endOfDay) d.setDate(d.getDate() + 1);
  return d.toISOString();
}

function EventEditorModal({ open, initial, calendars, onClose, onSave, onDelete }) {
  const [title, setTitle] = useState("");
  const [allDay, setAllDay] = useState(false);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [calendarId, setCalendarId] = useState("");
  const [note, setNote] = useState("");
  const [attachUrl, setAttachUrl] = useState("");
  const [recurrence, setRecurrence] = useState(emptyRecurrence());
  const [notification, setNotification] = useState(defaultNotification());
  const [recOpen, setRecOpen] = useState(false);
  const [notifyOpen, setNotifyOpen] = useState(false);

  useEffect(() => {
    if (!open || !initial) return;
    setTitle(initial.title || "");
    setAllDay(Boolean(initial.allDay));
    setStart(
      initial.allDay ? toDateInput(initial.start) : toDateTimeInput(initial.start)
    );
    if (initial.allDay) {
      const exclusive = new Date(initial.end || initial.start);
      exclusive.setDate(exclusive.getDate() - 1);
      setEnd(toDateInput(exclusive.toISOString()));
    } else {
      setEnd(toDateTimeInput(initial.end));
    }
    setCalendarId(initial.calendarId || calendars[0]?.id || "");
    setNote(initial.note || "");
    setRecurrence(initial.recurrence || emptyRecurrence());
    setNotification(initial.notification || defaultNotification());
    setAttachUrl(initial.attachment?.url || initial.attachment?.title || "");
  }, [open, initial, calendars]);

  const presets = useMemo(
    () => recurrencePresets(allDay ? `${start}T09:00:00` : start || initial?.start),
    [allDay, start, initial]
  );

  if (!open || !initial) return null;

  const handleAllDay = (checked) => {
    setAllDay(checked);
    if (checked) {
      setStart(start ? start.slice(0, 10) : toDateInput(new Date().toISOString()));
      setEnd(end ? end.slice(0, 10) : toDateInput(new Date().toISOString()));
    } else {
      const day = start?.slice(0, 10) || toDateInput(new Date().toISOString());
      setStart(`${day}T09:00`);
      setEnd(`${day}T10:00`);
    }
  };

  const handleRecurrenceChange = (preset) => {
    if (preset === "custom") {
      setRecOpen(true);
      return;
    }
    setRecurrence({ ...emptyRecurrence(), preset });
  };

  const handleNotifyChange = (value) => {
    if (value === "custom") {
      setNotifyOpen(true);
      return;
    }
    if (value === "none") {
      setNotification(null);
      return;
    }
    const [amount, unit] = value.split(":");
    setNotification({ amount: Number(amount), unit });
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên sự kiện.");
      return;
    }
    if (!start || !end) {
      toast.error("Vui lòng chọn thời gian.");
      return;
    }

    const startIso = allDay ? fromDateOnly(start) : fromDateTime(start);
    const endIso = allDay ? fromDateOnly(end, true) : fromDateTime(end);
    if (new Date(endIso) <= new Date(startIso)) {
      toast.error("Thời gian kết thúc phải sau thời gian bắt đầu.");
      return;
    }

    const link = attachUrl.trim();
    const calendar = calendars.find((item) => item.id === calendarId) || calendars[0];

    onSave({
      ...initial,
      id: initial.sourceId || initial.id,
      title: title.trim(),
      start: startIso,
      end: endIso,
      allDay,
      calendarId: calendar?.id,
      color: calendar?.color,
      note: note.trim(),
      recurrence,
      notification,
      attachment: link ? { type: "link", url: link, title: link } : null,
    });
  };

  const notifyValue = notification
    ? `${notification.amount}:${notification.unit}`
    : "none";
  const notifyPresets = new Set([
    "none",
    "5:minutes",
    "10:minutes",
    "15:minutes",
    "30:minutes",
    "1:hours",
    "1:days",
  ]);
  const notifySelectValue = notifyPresets.has(notifyValue) ? notifyValue : "custom";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/45"
        aria-label="Đóng"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-gray-200 bg-white p-5 shadow-2xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-gray-900">
            {initial.id ? "Sửa sự kiện" : "Tạo sự kiện"}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Thêm tiêu đề"
          className="w-full border-b border-slate-200 bg-transparent py-2 text-lg font-semibold outline-none focus:border-blue-500"
          autoFocus
        />

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Bắt đầu</span>
            <input
              type={allDay ? "date" : "datetime-local"}
              value={start}
              onChange={(e) => setStart(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">Kết thúc</span>
            <input
              type={allDay ? "date" : "datetime-local"}
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
            />
          </label>
        </div>

        <label className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-slate-700">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => handleAllDay(e.target.checked)}
            className="h-4 w-4 accent-blue-600"
          />
          Cả ngày
        </label>

        <label className="mt-4 block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Repeat className="h-4 w-4" />
            Tần suất lặp lại
          </span>
          <select
            value={recurrence.preset || "none"}
            onChange={(e) => handleRecurrenceChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
          >
            {presets.map((item) => (
              <option key={item.id} value={item.id}>
                {item.id === "custom" && recurrence.preset === "custom"
                  ? recurrenceLabel(recurrence, start)
                  : item.label}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <CalendarDays className="h-4 w-4" />
            Lịch
          </span>
          <select
            value={calendarId}
            onChange={(e) => setCalendarId(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
          >
            {calendars.map((cal) => (
              <option key={cal.id} value={cal.id}>
                {cal.name}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Bell className="h-4 w-4" />
            Thông báo
          </span>
          <select
            value={notifySelectValue}
            onChange={(e) => handleNotifyChange(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
          >
            <option value="none">Không thông báo</option>
            <option value="5:minutes">5 phút trước</option>
            <option value="10:minutes">10 phút trước</option>
            <option value="15:minutes">15 phút trước</option>
            <option value="30:minutes">30 phút trước</option>
            <option value="1:hours">1 giờ trước</option>
            <option value="1:days">1 ngày trước</option>
            <option value="custom">
              {notifySelectValue === "custom" && notification
                ? notifyLabel(notification)
                : "Tùy chỉnh..."}
            </option>
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700">
            <Link2 className="h-4 w-4" />
            Đính kèm bài học
          </span>
          <input
            type="text"
            value={attachUrl}
            onChange={(e) => setAttachUrl(e.target.value)}
            placeholder="Dán đường liên kết bài học (https://...)"
            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">Mô tả</span>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Thêm mô tả"
            className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:bg-white"
          />
        </label>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
          {initial.id ? (
            <button
              type="button"
              onClick={() => onDelete(initial.sourceId || initial.id)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2.5 text-sm font-bold text-red-600 hover:bg-red-100"
            >
              <Trash2 className="h-4 w-4" />
              Xóa
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-blue-700"
            >
              Lưu
            </button>
          </div>
        </div>
      </form>

      <RecurrenceModal
        open={recOpen}
        value={recurrence}
        startIso={allDay ? `${start}T09:00:00` : start}
        onClose={() => setRecOpen(false)}
        onConfirm={(next) => {
          setRecurrence(next);
          setRecOpen(false);
        }}
      />
      <NotificationCustomModal
        open={notifyOpen}
        value={notification}
        onClose={() => setNotifyOpen(false)}
        onConfirm={(next) => {
          setNotification(next);
          setNotifyOpen(false);
        }}
      />
    </div>
  );
}

export default EventEditorModal;
