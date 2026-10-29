import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

export const LIBRARY_FILTERS = [
  { key: "all", label: "Tất cả" },
  { key: "created", label: "Đã tạo" },
  { key: "saved", label: "Đã lưu" },
  { key: "recent", label: "Gần đây" },
];

export const FOLDER_SORT_OPTIONS = [
  { key: "recent", label: "Gần đây" },
  { key: "name", label: "Theo tên (A-Z)" },
];

/**
 * Dropdown đồng bộ UI với trang Thẻ ghi nhớ (bo góc, shadow, danh sách).
 * Dùng cho bộ lọc / sắp xếp trên toàn nền tảng.
 */
function LibraryFilterDropdown({
  value,
  onChange,
  options = LIBRARY_FILTERS,
  prefix = "Hiển thị:",
  defaultLabel,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const activeLabel =
    options.find((f) => f.key === value)?.label ||
    defaultLabel ||
    options[0]?.label ||
    "";

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        {prefix ? <span className="text-slate-500">{prefix}</span> : null}
        <span className="font-semibold text-slate-900">{activeLabel}</span>
        <ChevronDown
          className={`h-4 w-4 text-slate-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open ? (
        <ul className="absolute left-0 z-20 mt-1.5 min-w-[11rem] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {options.map((f) => (
            <li key={f.key}>
              <button
                type="button"
                onClick={() => {
                  onChange?.(f.key);
                  setOpen(false);
                }}
                className={`flex w-full cursor-pointer px-4 py-2.5 text-left text-sm transition ${
                  value === f.key
                    ? "bg-purple-50 font-semibold text-purple-800"
                    : "text-slate-700 hover:bg-slate-50"
                }`}
              >
                {f.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export default LibraryFilterDropdown;
