import { useEffect, useState } from "react";
import { Link2, X } from "lucide-react";
import toast from "react-hot-toast";
import { EXAM_VISIBILITY_OPTIONS } from "../../utils/examVisibility";

function ExamPrivacyModal({
  open,
  value,
  onClose,
  onConfirm,
  shareUrl,
}) {
  const [draft, setDraft] = useState(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  const handleDone = () => {
    if (!draft) {
      toast.error("Hãy chọn một quyền riêng tư trước khi xác nhận.");
      return;
    }
    onConfirm(draft);
    onClose();
  };

  const handleCopy = async () => {
    if (!shareUrl) {
      toast.error("Liên kết đầy đủ sẽ có sau khi bạn tạo đề thi.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Đã sao chép đường liên kết.");
    } catch {
      toast.error("Không thể sao chép liên kết. Hãy thử lại.");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-extrabold text-slate-900">Quyền riêng tư</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chọn rõ trước khi tạo đề. Hệ thống không tự gán Công khai hay Riêng tư giúp bạn.
        </p>

        <div className="mt-5 space-y-2">
          {EXAM_VISIBILITY_OPTIONS.map((option) => {
            const checked = draft === option.id;
            return (
              <label
                key={option.id}
                className={`flex cursor-pointer items-start gap-3 rounded-2xl border-2 px-4 py-3 transition ${
                  checked
                    ? "border-purple-500 bg-purple-50"
                    : "border-slate-200 bg-white hover:border-purple-200"
                }`}
              >
                <input
                  type="radio"
                  name="exam-visibility"
                  value={option.id}
                  checked={checked}
                  onChange={() => setDraft(option.id)}
                  className="mt-1 h-4 w-4 accent-purple-600"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-900">
                    {option.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-slate-500">
                    {option.hint}
                  </span>
                </span>
              </label>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
        >
          <Link2 className="h-4 w-4" />
          Sao chép đường liên kết
        </button>

        <button
          type="button"
          onClick={handleDone}
          className="mt-3 w-full rounded-xl bg-purple-600 px-4 py-3 text-sm font-extrabold text-white hover:bg-purple-700"
        >
          Xong
        </button>
      </div>
    </div>
  );
}

export default ExamPrivacyModal;
