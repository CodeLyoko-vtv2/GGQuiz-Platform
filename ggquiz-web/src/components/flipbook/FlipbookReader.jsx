import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { Document, Page, pdfjs } from "react-pdf";
import { ChevronLeft, ChevronRight, Maximize, Minus, Plus, Volume2 } from "lucide-react";
import { mediaUrl } from "../../api/client";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FlipPage = forwardRef(function FlipPage({ children, onPlace, pageNumber }, ref) {
  return (
    <div
      ref={ref}
      className="relative overflow-hidden bg-white shadow-lg"
      onClick={(event) => {
        if (!onPlace) return;
        if (event.target.closest(".audio-hotspot")) return;
        const rect = event.currentTarget.getBoundingClientRect();
        onPlace({
          page: pageNumber,
          x: ((event.clientX - rect.left) / rect.width) * 100,
          y: ((event.clientY - rect.top) / rect.height) * 100,
        });
      }}
    >
      {children}
    </div>
  );
});

let playing = null;

function playAudio(url) {
  if (playing) {
    playing.pause();
    playing = null;
  }
  const audio = new Audio(mediaUrl(url));
  playing = audio;
  audio.play().catch(() => {});
}

export default function FlipbookReader({ pdfUrl, hotspots = [] }) {
  const bookRef = useRef(null);
  const shellRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [jump, setJump] = useState("");
  const file = useMemo(() => (pdfUrl ? mediaUrl(pdfUrl) : ""), [pdfUrl]);
  const width = Math.round(420 * zoom);
  const height = Math.round(594 * zoom);

  useEffect(() => {
    setPage(1);
  }, [file]);

  useEffect(() => {
    function onKey(event) {
      if (event.target.closest("input, textarea, [contenteditable='true']")) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        bookRef.current?.pageFlip?.().flipNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        bookRef.current?.pageFlip?.().flipPrev();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function flipTo(next) {
    const api = bookRef.current?.pageFlip?.();
    if (!api) return;
    api.flip(Math.max(0, Math.min(numPages - 1, next - 1)));
  }

  if (!file) {
    return (
      <div className="grid min-h-[60vh] place-items-center text-slate-400">
        Sách này chưa có bản PDF.
      </div>
    );
  }

  return (
    <div ref={shellRef} className="relative flex min-h-screen flex-col bg-[#111827] text-white">
      <div className="flex flex-1 items-center justify-center overflow-hidden px-16 py-6">
        <button
          type="button"
          className="absolute left-3 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          onClick={() => bookRef.current?.pageFlip?.().flipPrev()}
        >
          <ChevronLeft />
        </button>
        <Document file={file} onLoadSuccess={({ numPages: count }) => setNumPages(count)}>
          <HTMLFlipBook
            key={`${file}-${zoom}`}
            ref={bookRef}
            width={width}
            height={height}
            size="fixed"
            maxShadowOpacity={0.5}
            showCover
            mobileScrollSupport={false}
            usePortrait={typeof window !== "undefined" && window.innerWidth < 900}
            onFlip={(event) => setPage((event.data || 0) + 1)}
          >
            {Array.from({ length: numPages || 1 }, (_, index) => {
              const pageNumber = index + 1;
              const marks = hotspots.filter((item) => item.page === pageNumber);
              return (
                <FlipPage key={pageNumber} pageNumber={pageNumber}>
                  <Page
                    pageNumber={pageNumber}
                    width={width}
                    renderAnnotationLayer={false}
                    renderTextLayer={false}
                  />
                  {marks.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={item.label || "Nghe audio"}
                      className="audio-hotspot absolute z-10 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-sky-500 text-white shadow-lg"
                      style={{ left: `${item.x}%`, top: `${item.y}%` }}
                      onClick={() => playAudio(item.audioUrl)}
                    >
                      <Volume2 size={16} />
                    </button>
                  ))}
                </FlipPage>
              );
            })}
          </HTMLFlipBook>
        </Document>
        <button
          type="button"
          className="absolute right-3 top-1/2 z-20 grid h-12 w-12 -translate-y-1/2 place-items-center rounded-full bg-white/10 hover:bg-white/20"
          onClick={() => bookRef.current?.pageFlip?.().flipNext()}
        >
          <ChevronRight />
        </button>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3 border-t border-white/10 bg-black/40 px-4 py-3">
        <span className="text-sm text-slate-300">
          {page} / {numPages || "—"}
        </span>
        <input
          value={jump}
          onChange={(event) => setJump(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") flipTo(Number(jump) || 1);
          }}
          placeholder="Nhảy tới trang"
          className="h-9 w-28 rounded-lg border border-white/15 bg-white/10 px-3 text-sm outline-none"
        />
        <button
          type="button"
          className="rounded-lg bg-white/10 px-3 py-1.5 text-sm"
          onClick={() => flipTo(Number(jump) || 1)}
        >
          Tới trang
        </button>
        <button type="button" className="rounded-lg bg-white/10 p-2" onClick={() => setZoom((v) => Math.max(0.7, +(v - 0.1).toFixed(1)))}>
          <Minus size={16} />
        </button>
        <button type="button" className="rounded-lg bg-white/10 p-2" onClick={() => setZoom((v) => Math.min(1.4, +(v + 0.1).toFixed(1)))}>
          <Plus size={16} />
        </button>
        <button
          type="button"
          className="rounded-lg bg-white/10 p-2"
          onClick={() => {
            if (!document.fullscreenElement) shellRef.current?.requestFullscreen?.();
            else document.exitFullscreen?.();
          }}
        >
          <Maximize size={16} />
        </button>
      </div>
    </div>
  );
}
