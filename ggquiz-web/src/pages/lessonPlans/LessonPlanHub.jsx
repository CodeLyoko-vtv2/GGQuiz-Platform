import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Copy,
  FileDown,
  LayoutGrid,
  List as ListIcon,
  MoreHorizontal,
  NotebookPen,
  Pencil,
  Plus,
  Share2,
  Sparkles,
  Trash2,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage, mediaUrl } from "../../api/client";
import { formatRelative } from "../../utils/lessonBlocks";
import AiCreateLessonModal from "../../components/lessonPlans/AiCreateLessonModal";

function statusLabel(status) {
  return status === "published" ? "Đã hoàn thành" : "Bản nháp";
}

function PlanMenu({ plan, onEdit, onRename, onDuplicate, onShare, onDelete, onExport }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (event) => {
      if (ref.current && !ref.current.contains(event.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const run = (fn) => {
    setOpen(false);
    fn?.(plan);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label="Thao tác giáo án"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-9 w-9 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-20 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          {[
            { label: "Chỉnh sửa", icon: Pencil, fn: onEdit },
            { label: "Đổi tên", icon: Pencil, fn: onRename },
            { label: "Nhân bản", icon: Copy, fn: onDuplicate },
            { label: "Chia sẻ", icon: Share2, fn: onShare },
            { label: "Tải PDF", icon: FileDown, fn: onExport },
          ].map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                run(item.fn);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              run(onDelete);
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Xóa
          </button>
        </div>
      ) : null}
    </div>
  );
}

function PreviewPane({ plan }) {
  const preview = plan.previewUrl
    ? `${mediaUrl(plan.previewUrl)}?t=${new Date(plan.updatedAt || Date.now()).getTime()}`
    : "";
  return (
    <div className="relative aspect-[210/297] overflow-hidden rounded-t-2xl bg-[#ececec]">
      {preview ? (
        <img src={preview} alt="" className="h-full w-full object-cover object-top" />
      ) : (
        <div className="absolute inset-4 overflow-hidden bg-white p-4 text-[8px] leading-snug text-slate-700 shadow-sm">
          <p className="text-center text-[11px] font-bold">{plan.title}</p>
          <p className="mt-2 text-center italic">LESSON PLAN</p>
          <p className="mt-3">I. OBJECTIVES</p>
          <p className="mt-1">II. MATERIALS</p>
          <p className="mt-1">III. PROCEDURE</p>
        </div>
      )}
      <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white">
        {plan.pageCount || 1} pages
      </span>
    </div>
  );
}

function LessonPlanHub() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const creatingRef = useRef(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");
  const [aiOpen, setAiOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get("/lesson-plans");
      setPlans(data.lessonPlans || []);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openPlan = (plan) => navigate(`/lesson-plans/${plan.id}`);
  const editPlan = (plan) => navigate(`/lesson-plans/${plan.id}/edit`);

  const createBlank = async () => {
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      const { data } = await api.post("/lesson-plans", { title: "Giáo án mới" });
      navigate(`/lesson-plans/${data.lessonPlan.id}/edit`);
    } catch (err) {
      creatingRef.current = false;
      toast.error(getApiErrorMessage(err));
    }
  };

  useEffect(() => {
    if (searchParams.get("create") === "1") createBlank();
  }, [searchParams]);

  const rename = async (plan) => {
    const title = window.prompt("Tên giáo án", plan.title);
    if (!title || title.trim() === plan.title) return;
    try {
      const { data } = await api.put(`/lesson-plans/${plan.id}`, { title: title.trim() });
      setPlans((list) => list.map((item) => (item.id === plan.id ? { ...item, ...data.lessonPlan } : item)));
      toast.success("Đã đổi tên");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const duplicate = async (plan) => {
    try {
      const { data } = await api.post(`/lesson-plans/${plan.id}/duplicate`);
      setPlans((list) => [data.lessonPlan, ...list]);
      toast.success("Đã nhân bản giáo án");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const share = async (plan) => {
    try {
      await api.put(`/lesson-plans/${plan.id}`, { visibility: "unlisted" });
      const url = `${window.location.origin}/lesson-plans/${plan.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết chia sẻ");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const exportPdf = async (plan) => {
    try {
      if (!plan.pdfUrl) {
        const { data } = await api.post(`/lesson-plans/${plan.id}/export`);
        if (data.lessonPlan?.pdfUrl) {
          window.open(mediaUrl(data.lessonPlan.pdfUrl), "_blank");
          setPlans((list) => list.map((item) => (item.id === plan.id ? { ...item, ...data.lessonPlan } : item)));
          return;
        }
        toast.error(data.message || "Chưa có file PDF. Hãy mở soạn thảo và xuất bản.");
        return;
      }
      window.open(mediaUrl(plan.pdfUrl), "_blank");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const remove = async (plan) => {
    if (!window.confirm(`Xóa giáo án "${plan.title}"?`)) return;
    try {
      await api.delete(`/lesson-plans/${plan.id}`);
      setPlans((list) => list.filter((item) => item.id !== plan.id));
      toast.success("Đã xóa giáo án");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  const empty = !loading && plans.length === 0;
  const menuProps = {
    onEdit: editPlan,
    onRename: rename,
    onDuplicate: duplicate,
    onShare: share,
    onDelete: remove,
    onExport: exportPdf,
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f3f4f6] px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">Giáo án</h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-600 sm:text-base">
              Soạn thảo giống Google Docs, lưu bản nháp HTML và xem bản xuất PDF như tài liệu giấy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setAiOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-white px-4 py-3 text-sm font-semibold text-indigo-700 shadow-sm hover:bg-indigo-50"
            >
              <Sparkles className="h-4 w-4" />
              Tạo giáo án bằng AI
            </button>
            <button
              type="button"
              onClick={createBlank}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700"
            >
              <Plus className="h-4 w-4" />
              Soạn giáo án
            </button>
          </div>
        </header>

        <div className="mt-6 flex justify-end">
          <div className="inline-flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm ring-1 ring-slate-200">
            <button
              type="button"
              onClick={() => setView("grid")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                view === "grid" ? "bg-indigo-600 text-white" : "text-slate-500"
              }`}
            >
              <LayoutGrid className="mr-1 inline h-4 w-4" />
              Lưới
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold ${
                view === "list" ? "bg-indigo-600 text-white" : "text-slate-500"
              }`}
            >
              <ListIcon className="mr-1 inline h-4 w-4" />
              Danh sách
            </button>
          </div>
        </div>

        {loading ? (
          <p className="mt-10 text-sm text-slate-400">Đang tải giáo án...</p>
        ) : empty ? (
          <div className="mt-16 flex flex-col items-center text-center">
            <NotebookPen className="h-12 w-12 text-indigo-300" />
            <p className="mt-3 text-lg font-bold text-slate-800">Chưa có giáo án nào</p>
            <p className="mt-1 text-sm text-slate-500">Soạn trên giấy A4 hoặc để AI dựng khung giáo án.</p>
          </div>
        ) : view === "grid" ? (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
            {plans.map((plan) => (
              <article
                key={plan.id}
                role="button"
                tabIndex={0}
                onClick={() => openPlan(plan)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") openPlan(plan);
                }}
                className="cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <PreviewPane plan={plan} />
                <div className="flex items-start justify-between gap-2 px-3 py-3">
                  <div className="min-w-0">
                    <h2 className="truncate text-base font-extrabold text-slate-900">{plan.title}</h2>
                    <p className="mt-1 text-xs text-slate-500">
                      {plan.subject} · {plan.grade} · {statusLabel(plan.status)}
                    </p>
                  </div>
                  <PlanMenu plan={plan} {...menuProps} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            {plans.map((plan) => (
              <div
                key={plan.id}
                role="button"
                tabIndex={0}
                onClick={() => openPlan(plan)}
                className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0 hover:bg-slate-50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  {plan.previewUrl ? (
                    <img src={mediaUrl(plan.previewUrl)} alt="" className="h-14 w-10 rounded border object-cover" />
                  ) : (
                    <div className="h-14 w-10 rounded border bg-slate-100" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-slate-900">{plan.title}</p>
                    <p className="text-xs text-slate-500">
                      {plan.subject} · {plan.grade} · {plan.pageCount || 1} pages · {statusLabel(plan.status)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="hidden text-xs text-slate-400 sm:inline">{formatRelative(plan.updatedAt)}</span>
                  <PlanMenu plan={plan} {...menuProps} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {aiOpen ? (
        <AiCreateLessonModal
          onClose={() => setAiOpen(false)}
          onCreated={(nextId) => {
            setAiOpen(false);
            navigate(`/lesson-plans/${nextId}/edit`);
          }}
        />
      ) : null}
    </div>
  );
}

export default LessonPlanHub;
