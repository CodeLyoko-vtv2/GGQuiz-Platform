import { useState } from "react";
import { Sparkles, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";

function AiCreateLessonModal({ onClose, onCreated }) {
  const [prompt, setPrompt] = useState("Tạo giáo án 45 phút môn Tiếng Anh Unit 3 lớp 10");
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!prompt.trim()) return;
    setBusy(true);
    try {
      const { data } = await api.post("/lesson-plans/generate", { prompt: prompt.trim() });
      const created = await api.post("/lesson-plans", {
        title: data.title || prompt.trim(),
        subject: data.subject,
        grade: data.grade,
        htmlContent: data.html,
        content: data.blocks,
      });
      toast.success(data.fallback ? "Đã tạo khung giáo án mẫu" : "AI đã soạn dàn ý giáo án");
      onCreated?.(created.data.lessonPlan.id);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/45 px-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-indigo-600 uppercase">
              <Sparkles className="h-3.5 w-3.5" />
              Trợ lý soạn giáo án
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900">Tạo giáo án bằng AI</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={5}
          className="mt-4 w-full resize-none rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-indigo-200"
          placeholder="Ví dụ: Tạo giáo án 45 phút môn Tiếng Anh Unit 3 lớp 10"
        />
        <button
          type="submit"
          disabled={busy}
          className="mt-4 w-full rounded-2xl bg-indigo-600 py-3 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy ? "AI đang soạn dàn ý..." : "Sinh khung giáo án"}
        </button>
      </form>
    </div>
  );
}

export default AiCreateLessonModal;
