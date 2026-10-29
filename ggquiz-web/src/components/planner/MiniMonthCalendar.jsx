import { ChevronLeft, ChevronRight } from "lucide-react";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

function startOfMonthGrid(year, month) {
  const first = new Date(year, month, 1);
  const day = first.getDay();
  const mondayBased = day === 0 ? 6 : day - 1;
  first.setDate(1 - mondayBased);
  first.setHours(0, 0, 0, 0);
  return first;
}

function sameDay(a, b) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function MiniMonthCalendar({ value, onChange }) {
  const view = value || new Date();
  const year = view.getFullYear();
  const month = view.getMonth();
  const today = new Date();
  const gridStart = startOfMonthGrid(year, month);
  const cells = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
  const trailingEmpty = cells.slice(35).every((d) => d.getMonth() !== month);
  const days = trailingEmpty ? cells.slice(0, 35) : cells;

  const shiftMonth = (delta) => {
    const next = new Date(year, month + delta, 1);
    onChange?.(next);
  };

  return (
    <div className="gg-mini-cal px-1 py-1">
      <div className="mb-1 flex items-center justify-between px-1">
        <p className="text-[13px] font-semibold text-slate-800">
          Tháng {month + 1}, {year}
        </p>
        <div className="flex">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Tháng trước"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-full p-1 text-slate-500 hover:bg-slate-100"
            aria-label="Tháng sau"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {WEEKDAYS.map((label) => (
          <div key={label} className="py-0.5 text-[10px] font-semibold text-slate-400">
            {label}
          </div>
        ))}
        {days.map((day) => {
          const outside = day.getMonth() !== month;
          const isToday = sameDay(day, today);
          const isSelected = sameDay(day, view);
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onChange?.(new Date(day))}
              className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[12px] transition ${
                isSelected
                  ? "bg-blue-600 font-bold text-white"
                  : isToday
                    ? "bg-blue-50 font-bold text-blue-600"
                    : outside
                      ? "text-slate-300 hover:bg-slate-100"
                      : "text-slate-700 hover:bg-slate-100"
              }`}
            >
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default MiniMonthCalendar;
