import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";
import { useUserSettings } from "../../context/UserSettingsContext";

const FAQ = [
  {
    q: "Làm sao để tạo đề thi live?",
    a: "Vào Đề thi → mở một đề của bạn → bấm Tổ chức thi live. Học sinh nhập mã phòng để vào.",
  },
  {
    q: "Hình nền YouTube không phát?",
    a: "Video cần cho phép nhúng. Thử lại link dạng youtube.com/watch?v=... và đảm bảo trình duyệt không chặn autoplay.",
  },
  {
    q: "XP và rank tính thế nào?",
    a: "Mỗi bộ thẻ, đề thi, giáo án và lần luyện quiz đều cộng XP. Đủ mốc sẽ lên Đồng, Vàng, Kim Cương rồi Challenger.",
  },
];

function HelpModal() {
  const { modal, closeModal } = useUserSettings();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  if (modal !== "help") return null;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/users/feedback", { message });
      toast.success("Đã gửi phản hồi");
      setMessage("");
      closeModal();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4" onClick={closeModal}>
      <div
        className="max-h-[88vh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-sky-600 uppercase">
              <HelpCircle className="h-3.5 w-3.5" />
              Trung tâm trợ giúp
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Giúp đỡ và phản hồi</h2>
          </div>
          <button type="button" onClick={closeModal} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          {FAQ.map((item) => (
            <details key={item.q} className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700">
              <summary className="font-bold text-slate-800 dark:text-slate-100">{item.q}</summary>
              <p className="mt-2 text-sm text-slate-500">{item.a}</p>
            </details>
          ))}
        </div>
        <form onSubmit={submit} className="mt-5">
          <p className="text-sm font-bold text-slate-800 dark:text-white">Gửi phản hồi</p>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            placeholder="Góp ý tính năng, báo lỗi, hoặc ý tưởng mới..."
            className="mt-2 w-full rounded-2xl border border-slate-200 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
          />
          <button
            type="submit"
            disabled={busy}
            className="mt-3 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "Đang gửi..." : "Gửi phản hồi"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default HelpModal;
