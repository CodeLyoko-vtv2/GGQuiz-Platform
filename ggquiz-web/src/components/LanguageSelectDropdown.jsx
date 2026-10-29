import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Sparkles } from "lucide-react";
import {
  ALL_LANGUAGES,
  DETECT_LANG,
  POPULAR_LANGUAGES,
  getLanguageLabel,
} from "../data/languages";

function LanguageSelectDropdown({
  value,
  onChange,
  allowDetect = false,
  placeholder = "CHỌN NGÔN NGỮ",
  align = "left",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return undefined;
    }

    const timer = setTimeout(() => searchRef.current?.focus(), 0);
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const filteredPopular = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return POPULAR_LANGUAGES;
    return POPULAR_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q)
    );
  }, [query]);

  const filteredAll = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_LANGUAGES;
    return ALL_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q)
    );
  }, [query]);

  const showDetect =
    allowDetect &&
    (!query.trim() ||
      DETECT_LANG.name.toLowerCase().includes(query.trim().toLowerCase()) ||
      "auto".includes(query.trim().toLowerCase()));

  const label = getLanguageLabel(value, { placeholder, allowDetect });
  const isPlaceholder = !value || (value === "auto" && !allowDetect);

  const pick = (code) => {
    onChange?.(code);
    setOpen(false);
  };

  return (
    <div className="relative min-w-0 flex-1" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className={`flex w-full items-center justify-between gap-2 rounded-xl px-4 py-3 text-left transition ${
          open
            ? "bg-purple-50 text-purple-700"
            : "bg-transparent text-gray-800 hover:bg-gray-50"
        }`}
      >
        <span
          className={`truncate text-sm font-semibold tracking-wide ${
            isPlaceholder && value !== "auto" ? "text-gray-400 uppercase" : ""
          }`}
        >
          {value === "auto" && allowDetect ? (
            <span className="inline-flex items-center gap-1.5 normal-case">
              <Sparkles className="h-4 w-4 text-purple-500" />
              {DETECT_LANG.name}
            </span>
          ) : (
            label
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open ? (
        <div
          className={`absolute top-full z-20 mt-2 w-[min(100vw-2rem,22rem)] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="border-b border-gray-100 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm ngôn ngữ..."
                className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-3 pl-9 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
              />
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto overscroll-contain p-2">
            {showDetect ? (
              <button
                type="button"
                onClick={() => pick(DETECT_LANG.code)}
                className={`mb-1 flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                  value === DETECT_LANG.code
                    ? "bg-purple-50 text-purple-700"
                    : "text-gray-800 hover:bg-gray-50"
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-500" />
                  {DETECT_LANG.name}
                </span>
                {value === DETECT_LANG.code ? <Check className="h-4 w-4" /> : null}
              </button>
            ) : null}

            {filteredPopular.length > 0 ? (
              <>
                <p className="px-3 pt-2 pb-1 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Ngôn ngữ phổ biến
                </p>
                {filteredPopular.map((lang) => (
                  <button
                    key={`popular-${lang.code}`}
                    type="button"
                    onClick={() => pick(lang.code)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                      value === lang.code
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <span>{lang.name}</span>
                    {value === lang.code ? <Check className="h-4 w-4" /> : null}
                  </button>
                ))}
              </>
            ) : null}

            {filteredAll.length > 0 ? (
              <>
                <p className="px-3 pt-3 pb-1 text-[11px] font-bold tracking-wider text-gray-400 uppercase">
                  Tất cả ngôn ngữ
                </p>
                {filteredAll.map((lang) => (
                  <button
                    key={`all-${lang.code}`}
                    type="button"
                    onClick={() => pick(lang.code)}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-medium transition ${
                      value === lang.code
                        ? "bg-purple-50 text-purple-700"
                        : "text-gray-800 hover:bg-gray-50"
                    }`}
                  >
                    <span>{lang.name}</span>
                    {value === lang.code ? <Check className="h-4 w-4" /> : null}
                  </button>
                ))}
              </>
            ) : null}

            {!showDetect && filteredPopular.length === 0 && filteredAll.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-gray-400">
                Không tìm thấy ngôn ngữ
              </p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LanguageSelectDropdown;
