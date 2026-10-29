import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Search, Upload, X } from "lucide-react";
import { searchPixabayImages } from "../services/pixabaySearch";

function ImageSuggestPanel({
  initialQuery = "",
  onSelect,
  onClose,
  onUploadFile,
}) {
  const [query, setQuery] = useState(initialQuery);
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [searchTick, setSearchTick] = useState(0);
  const scrollRef = useRef(null);
  const requestIdRef = useRef(0);
  const fileInputRef = useRef(null);
  const immediateRef = useRef(true);

  useEffect(() => {
    immediateRef.current = true;
    setQuery(initialQuery || "");
    setSearchTick((n) => n + 1);
  }, [initialQuery]);

  useEffect(() => {
    const q = String(query || "").trim();
    if (!q) {
      setImages([]);
      setError("");
      setLoading(false);
      return undefined;
    }

    // Debounce dài hơn để tránh spam Pixabay (rate limit 429)
    const delay = immediateRef.current ? 150 : 550;
    immediateRef.current = false;

    const timer = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      setLoading(true);
      setError("");
      try {
        const results = await searchPixabayImages(q);
        if (requestId !== requestIdRef.current) return;
        setImages(results);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        setImages([]);
        setError(err?.message || "Không tìm được ảnh gợi ý");
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [query, searchTick]);

  const scrollBy = (direction) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * 280, behavior: "smooth" });
  };

  const handleUpload = (file) => {
    if (!file) return;
    onUploadFile?.(file);
  };

  return (
    <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800">Gợi ý hình ảnh</p>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                immediateRef.current = true;
                setQuery((prev) => prev.trim());
                setSearchTick((n) => n + 1);
              }
            }}
            placeholder="Tìm hình ảnh..."
            className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pr-3 pl-9 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
          />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm text-gray-400">hoặc</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              handleUpload(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-semibold text-gray-700 transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
          >
            <Upload className="h-4 w-4" />
            Tải lên
          </button>
        </div>
      </div>

      <div className="relative mt-4">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          className="absolute top-1/2 left-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
          aria-label="Ảnh trước"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          className="absolute top-1/2 right-0 z-10 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50"
          aria-label="Ảnh sau"
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <div
          ref={scrollRef}
          className="flex gap-3 overflow-x-auto scroll-smooth px-10 py-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {loading ? (
            Array.from({ length: 5 }).map((_, index) => (
              <div
                key={`skeleton-${index}`}
                className="h-28 w-36 shrink-0 animate-pulse rounded-xl bg-gray-100"
              />
            ))
          ) : error ? (
            <div className="flex min-h-28 w-full items-center justify-center px-4 text-center text-sm text-red-500">
              {error}
            </div>
          ) : !query.trim() ? (
            <div className="flex min-h-28 w-full items-center justify-center px-4 text-center text-sm text-gray-400">
              Nhập từ khóa để tìm ảnh gợi ý
            </div>
          ) : images.length === 0 ? (
            <div className="flex min-h-28 w-full items-center justify-center px-4 text-center text-sm text-gray-400">
              Không tìm thấy ảnh phù hợp
            </div>
          ) : (
            images.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect?.(item.url)}
                className="group relative h-28 w-36 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-50 transition hover:border-purple-400 hover:ring-2 hover:ring-purple-200"
                title="Chọn ảnh này"
              >
                <img
                  src={item.thumb || item.url}
                  alt={item.alt || "Gợi ý ảnh"}
                  referrerPolicy="no-referrer"
                  className="h-full w-full object-cover transition group-hover:scale-105"
                  loading="lazy"
                />
              </button>
            ))
          )}
        </div>

        {loading ? (
          <div className="mt-2 flex items-center justify-center gap-2 text-xs text-gray-400">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Đang tải ảnh gợi ý...
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default ImageSuggestPanel;
