import { useEffect, useState } from "react";

const WEEKDAYS = [
  { id: 0, label: "CN" },
  { id: 1, label: "T2" },
  { id: 2, label: "T3" },
  { id: 3, label: "T4" },
  { id: 4, label: "T5" },
  { id: 5, label: "T6" },
  { id: 6, label: "T7" },
];

function RecurrenceModal({ open, value, startIso, onClose, onConfirm }) {
  const [interval, setInterval] = useState(1);
  const [freq, setFreq] = useState("week");
  const [weekdays, setWeekdays] = useState([1]);
  const [endType, setEndType] = useState("never");
  const [until, setUntil] = useState("");
  const [count, setCount] = useState(13);

  useEffect(() => {
    if (!open) return;
    const start = new Date(startIso || Date.now());
    setInterval(value?.interval || 1);
    setFreq(value?.freq || "week");
    setWeekdays(
      value?.weekdays?.length ? value.weekdays : [start.getDay()]
    );
    setEndType(value?.endType || "never");
    setUntil(value?.until || "");
    setCount(value?.count || 13);
  }, [open, value, startIso]);

  if (!open) return null;

  const toggleDay = (id) => {
    setWeekdays((prev) => {
      const next = prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id];
      return next.length ? next : prev;
    });
  };

  return (
    <div className="fixed inset-0 z-[95] flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Đóng"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
        <h3 className="text-base font-extrabold text-slate-900">Lặp lại tùy chỉnh</h3>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <span className="font-semibold text-slate-700">Lặp lại mỗi</span>
          <input
            type="number"
            min={1}
            max={99}
            value={interval}
            onChange={(e) => setInterval(Math.max(1, Number(e.target.value) || 1))}
            className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          />
          <select
            value={freq}
            onChange={(e) => setFreq(e.target.value)}
            className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm outline-none focus:border-blue-500"
          >
            <option value="day">ngày</option>
            <option value="week">tuần</option>
            <option value="month">tháng</option>
            <option value="year">năm</option>
          </select>
        </div>

        {freq === "week" ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-semibold text-slate-700">Lặp lại vào</p>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map((day) => {
                const active = weekdays.includes(day.id);
                return (
                  <button
                    key={day.id}
                    type="button"
                    onClick={() => toggleDay(day.id)}
                    className={`h-9 w-9 rounded-full text-xs font-bold ${
                      active
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        <div className="mt-4 space-y-2">
          <p className="text-sm font-semibold text-slate-700">Kết thúc</p>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="rec-end"
              checked={endType === "never"}
              onChange={() => setEndType("never")}
              className="accent-blue-600"
            />
            Không bao giờ
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="rec-end"
              checked={endType === "until"}
              onChange={() => setEndType("until")}
              className="accent-blue-600"
            />
            Vào ngày
            <input
              type="date"
              value={until}
              onChange={(e) => {
                setUntil(e.target.value);
                setEndType("until");
              }}
              className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
            />
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="radio"
              name="rec-end"
              checked={endType === "count"}
              onChange={() => setEndType("count")}
              className="accent-blue-600"
            />
            Sau
            <input
              type="number"
              min={1}
              value={count}
              onChange={(e) => {
                setCount(Math.max(1, Number(e.target.value) || 1));
                setEndType("count");
              }}
              className="w-16 rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-blue-500"
            />
            lần xuất hiện
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() =>
              onConfirm({
                preset: "custom",
                freq,
                interval,
                weekdays,
                endType,
                until,
                count,
              })
            }
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
          >
            Xong
          </button>
        </div>
      </div>
    </div>
  );
}

export default RecurrenceModal;
