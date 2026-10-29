import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import HTMLFlipBook from "react-pageflip";
import { Document, Page, pdfjs } from "react-pdf";
import { Button, InputNumber, Space, Tooltip } from "antd";
import {
  FullscreenOutlined,
  LeftOutlined,
  MinusOutlined,
  PlusOutlined,
  RightOutlined,
  SoundOutlined,
} from "@ant-design/icons";
import { mediaUrl } from "../api/client";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

const FlipPage = forwardRef(function FlipPage({ children, onPlace, pageNumber }, ref) {
  return (
    <div
      ref={ref}
      className="flip-page"
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

export default function FlipbookReader({
  pdfUrl,
  hotspots = [],
  mappingMode = false,
  onPlaceHotspot,
  onDeleteHotspot,
}) {
  const bookRef = useRef(null);
  const shellRef = useRef(null);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  const [jump, setJump] = useState(1);
  const file = useMemo(() => (pdfUrl ? mediaUrl(pdfUrl) : ""), [pdfUrl]);
  const width = Math.round(420 * zoom);
  const height = Math.round(594 * zoom);

  useEffect(() => {
    setPage(1);
    setJump(1);
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
    const index = Math.max(0, Math.min(numPages - 1, next - 1));
    api.flip(index);
  }

  if (!file) {
    return <div className="flip-empty">Chưa có file PDF. Hãy tải bản gốc của cuốn sách.</div>;
  }

  return (
    <div className="flip-shell" ref={shellRef}>
      <button className="flip-edge left" type="button" onClick={() => bookRef.current?.pageFlip?.().flipPrev()}>
        <LeftOutlined />
      </button>
      <Document
        file={file}
        onLoadSuccess={({ numPages: count }) => setNumPages(count)}
        loading={<div className="flip-empty">Đang tải sách...</div>}
      >
        <HTMLFlipBook
          key={`${file}-${zoom}`}
          ref={bookRef}
          width={width}
          height={height}
          size="fixed"
          maxShadowOpacity={0.45}
          showCover
          mobileScrollSupport={false}
          usePortrait={typeof window !== "undefined" && window.innerWidth < 900}
          onFlip={(event) => {
            const next = (event.data || 0) + 1;
            setPage(next);
            setJump(next);
          }}
          className="flip-book"
        >
          {Array.from({ length: numPages || 1 }, (_, index) => {
            const pageNumber = index + 1;
            const marks = hotspots.filter((item) => item.page === pageNumber);
            return (
              <FlipPage
                key={pageNumber}
                pageNumber={pageNumber}
                onPlace={mappingMode ? onPlaceHotspot : undefined}
              >
                <Page pageNumber={pageNumber} width={width} renderAnnotationLayer={false} renderTextLayer={false} />
                {marks.map((item) => (
                  <Tooltip key={item.id} title={item.label || `Audio trang ${item.page}`}>
                    <button
                      type="button"
                      className="audio-hotspot"
                      style={{ left: `${item.x}%`, top: `${item.y}%` }}
                      onClick={(event) => {
                        event.stopPropagation();
                        playAudio(item.audioUrl);
                      }}
                      onContextMenu={(event) => {
                        event.preventDefault();
                        if (mappingMode) onDeleteHotspot?.(item);
                      }}
                    >
                      <SoundOutlined />
                    </button>
                  </Tooltip>
                ))}
              </FlipPage>
            );
          })}
        </HTMLFlipBook>
      </Document>
      <button className="flip-edge right" type="button" onClick={() => bookRef.current?.pageFlip?.().flipNext()}>
        <RightOutlined />
      </button>
      <div className="flip-bar">
        <Space>
          <span>
            Trang {page} / {numPages || "—"}
          </span>
          <InputNumber
            min={1}
            max={numPages || 1}
            value={jump}
            onChange={setJump}
            onPressEnter={() => flipTo(jump || 1)}
          />
          <Button onClick={() => flipTo(jump || 1)}>Tới trang</Button>
          <Button icon={<MinusOutlined />} onClick={() => setZoom((value) => Math.max(0.7, +(value - 0.1).toFixed(1)))} />
          <Button icon={<PlusOutlined />} onClick={() => setZoom((value) => Math.min(1.4, +(value + 0.1).toFixed(1)))} />
          <Button
            icon={<FullscreenOutlined />}
            onClick={() => {
              if (!document.fullscreenElement) shellRef.current?.requestFullscreen?.();
              else document.exitFullscreen?.();
            }}
          />
        </Space>
      </div>
    </div>
  );
}
