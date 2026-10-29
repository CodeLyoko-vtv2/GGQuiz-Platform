import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import {
  ArrowLeft,
  ChevronLeft,
  Download,
  Minus,
  PanelLeft,
  Pencil,
  Plus,
  Printer,
  Maximize2,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage, mediaUrl } from "../../api/client";

pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

function LessonPlanViewer() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [plan, setPlan] = useState(null);
  const [numPages, setNumPages] = useState(0);
  const [pageWidth, setPageWidth] = useState(860);
  const [zoom, setZoom] = useState(1);
  const [sidebar, setSidebar] = useState(true);
  const [current, setCurrent] = useState(1);

  useEffect(() => {
    api
      .get(`/lesson-plans/${id}`)
      .then(({ data }) => setPlan(data.lessonPlan))
      .catch((err) => {
        toast.error(getApiErrorMessage(err));
        navigate("/lesson-plans", { replace: true });
      });
  }, [id, navigate]);

  useEffect(() => {
    const fit = () => {
      const side = sidebar ? 196 : 0;
      const available = Math.max(320, window.innerWidth - side - 80);
      setPageWidth(Math.min(980, available));
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [sidebar]);

  const fileUrl = useMemo(() => (plan?.pdfUrl ? mediaUrl(plan.pdfUrl) : ""), [plan]);
  const renderedWidth = Math.round(pageWidth * zoom);

  const download = () => {
    if (!fileUrl) return;
    const link = document.createElement("a");
    link.href = fileUrl;
    link.download = `${plan?.title || "giao-an"}.pdf`;
    link.target = "_blank";
    link.rel = "noreferrer";
    link.click();
  };

  const printPdf = () => {
    if (!fileUrl) {
      window.print();
      return;
    }
    const frame = document.createElement("iframe");
    frame.style.display = "none";
    frame.src = fileUrl;
    document.body.appendChild(frame);
    frame.onload = () => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    };
  };

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#202124] text-sm text-slate-300">
        Đang mở giáo án...
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#202124] text-white">
      <header className="flex shrink-0 items-center gap-2 bg-[#2d2e30] px-3 py-2">
        <button
          type="button"
          onClick={() => navigate("/lesson-plans")}
          className="rounded-full p-2 hover:bg-white/10"
          aria-label="Quay lại"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => setSidebar((v) => !v)}
          className="rounded-full p-2 hover:bg-white/10"
          title="Ẩn/hiện trang thu nhỏ"
        >
          {sidebar ? <ChevronLeft className="h-5 w-5" /> : <PanelLeft className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{plan.title}</p>
          <p className="text-[11px] text-slate-400">
            {current}/{numPages || plan.pageCount || 1} · {plan.subject} · {plan.grade}
          </p>
        </div>
        <div className="flex items-center gap-1 rounded-lg bg-black/30 px-1">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.1).toFixed(2)))} className="p-2 hover:bg-white/10">
            <Minus className="h-4 w-4" />
          </button>
          <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))} className="p-2 hover:bg-white/10">
            <Plus className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setZoom(1)} className="px-2 py-1 text-xs hover:bg-white/10" title="Vừa vặn chiều rộng">
            <Maximize2 className="mr-1 inline h-3.5 w-3.5" />
            Fit
          </button>
        </div>
        {plan.isOwner ? (
          <button
            type="button"
            onClick={() => navigate(`/lesson-plans/${id}/edit`)}
            className="rounded-lg px-3 py-2 text-sm hover:bg-white/10"
          >
            <Pencil className="mr-1 inline h-4 w-4" />
            Sửa
          </button>
        ) : null}
        <button type="button" onClick={download} disabled={!fileUrl} className="rounded-lg p-2 hover:bg-white/10 disabled:opacity-40">
          <Download className="h-4 w-4" />
        </button>
        <button type="button" onClick={printPdf} className="rounded-lg p-2 hover:bg-white/10">
          <Printer className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {sidebar ? (
          <aside className="w-48 shrink-0 overflow-y-auto border-r border-white/10 bg-[#171717] p-3">
            {fileUrl ? (
              <Document file={fileUrl} loading={<p className="text-xs text-slate-400">Đang tải...</p>}>
                {Array.from({ length: numPages || plan.pageCount || 1 }, (_, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => {
                      setCurrent(index + 1);
                      document.getElementById(`lp-page-${index + 1}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
                    }}
                    className={`mb-3 w-full rounded border p-1 ${
                      current === index + 1 ? "border-sky-400" : "border-transparent hover:border-white/20"
                    }`}
                  >
                    <Page pageNumber={index + 1} width={156} renderTextLayer={false} renderAnnotationLayer={false} />
                    <span className="mt-1 block text-center text-[11px] text-slate-400">{index + 1}</span>
                  </button>
                ))}
              </Document>
            ) : (
              <p className="text-xs text-slate-500">Chưa có bản PDF. Mở trình soạn thảo để xuất bản.</p>
            )}
          </aside>
        ) : null}

        <main
          className="flex-1 overflow-y-auto py-6"
          onScroll={(e) => {
            const pages = [...e.currentTarget.querySelectorAll("[data-lp-page]")];
            const top = e.currentTarget.scrollTop + 80;
            const hit = pages.findLast((node) => node.offsetTop <= top) || pages[0];
            if (hit) setCurrent(Number(hit.dataset.lpPage));
          }}
        >
          {fileUrl ? (
            <Document
              file={fileUrl}
              onLoadSuccess={({ numPages: next }) => setNumPages(next)}
              loading={<p className="text-center text-sm text-slate-400">Đang tải PDF...</p>}
            >
              {Array.from({ length: numPages || 1 }, (_, index) => (
                <div
                  key={index}
                  id={`lp-page-${index + 1}`}
                  data-lp-page={index + 1}
                  className="mx-auto mb-4 bg-white shadow-xl"
                  style={{ width: renderedWidth }}
                >
                  <Page pageNumber={index + 1} width={renderedWidth} />
                </div>
              ))}
            </Document>
          ) : (
            <div className="mx-auto w-[min(794px,92vw)] bg-white p-12 text-slate-900 shadow-xl">
              <style>{`
                .lesson-html table { border-collapse: collapse; width: 100%; }
                .lesson-html td, .lesson-html th { border: 1px solid #222; padding: 6px 8px; }
                .lesson-html img { max-width: 100%; }
              `}</style>
              <div className="lesson-html" dangerouslySetInnerHTML={{ __html: plan.htmlContent || "<p>Chưa có nội dung.</p>" }} />
              {plan.isOwner ? (
                <button
                  type="button"
                  onClick={() => navigate(`/lesson-plans/${id}/edit`)}
                  className="mt-8 rounded-lg bg-[#1a73e8] px-4 py-2 text-sm font-semibold text-white"
                >
                  Mở soạn thảo để xuất PDF
                </button>
              ) : null}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default LessonPlanViewer;
