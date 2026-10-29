import { useEffect, useRef, useState } from "react";
import { CALENDAR_COLORS } from "../../utils/plannerStore";

function ColorPicker({ value, onChange, compact = false }) {
  const [open, setOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [hex, setHex] = useState(value || "#039BE5");
  const ref = useRef(null);

  useEffect(() => {
    setHex(value || "#039BE5");
  }, [value]);

  useEffect(() => {
    const onDoc = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-center rounded-full border border-slate-200 shadow-sm ${
          compact ? "h-8 w-8" : "h-10 w-10"
        }`}
        style={{ backgroundColor: value }}
        aria-label="Chọn màu"
        title="Chọn màu"
      />
      {open ? (
        <div className="absolute z-40 mt-2 w-[220px] rounded-2xl border border-slate-200 bg-white p-3 shadow-xl">
          <p className="mb-2 text-xs font-bold text-slate-500">Màu lịch</p>
          <div className="grid grid-cols-6 gap-2">
            {CALENDAR_COLORS.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => {
                  onChange(color);
                  setOpen(false);
                }}
                className={`h-6 w-6 rounded-full ring-offset-2 ${
                  value === color ? "ring-2 ring-blue-500" : ""
                }`}
                style={{ backgroundColor: color }}
                aria-label={color}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setCustomOpen(true);
              setOpen(false);
            }}
            className="mt-3 w-full rounded-lg px-2 py-1.5 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Tùy chỉnh...
          </button>
        </div>
      ) : null}

      {customOpen ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Đóng"
            onClick={() => setCustomOpen(false)}
          />
          <div className="relative w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-base font-extrabold text-slate-900">Chọn màu tùy chỉnh</h3>
            <p className="mt-1 text-xs text-slate-500">
              Màu nền cho lịch này. Màu văn bản sẽ được điều chỉnh tự động.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <input
                type="color"
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="h-12 w-16 cursor-pointer rounded-lg border border-slate-200 bg-white p-1"
              />
              <input
                value={hex}
                onChange={(e) => setHex(e.target.value)}
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500"
              />
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCustomOpen(false)}
                className="rounded-full px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange(hex);
                  setCustomOpen(false);
                }}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default ColorPicker;
