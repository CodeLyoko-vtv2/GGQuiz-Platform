import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { DoorOpen, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";

function JoinExamModal({ open, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCode("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const value = code.trim().toUpperCase();
    if (value.length < 4) {
      toast.error("Vui lòng nhập mã phòng thi.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.post("/live-exams/join", { code: value });
      toast.success("Đã vào phòng thi.");
      onClose?.();
      navigate(`/live/${data.session.id}/take`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
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
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          aria-label="Đóng"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600">
          <DoorOpen className="h-6 w-6" />
        </div>
        <h2 className="text-xl font-extrabold text-slate-900">Tham gia phòng thi</h2>
        <p className="mt-1.5 text-sm text-slate-500">
          Nhập mã phòng do giáo viên cấp để vào kỳ thi thật.
        </p>
        <label className="mt-6 block">
          <span className="mb-1.5 block text-sm font-semibold text-slate-700">
            Mã phòng thi
          </span>
          <input
            ref={inputRef}
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            maxLength={8}
            placeholder="VD: 7K2M9Q"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-lg font-bold tracking-[0.28em] text-slate-900 uppercase outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-200"
          />
        </label>
        <button
          type="submit"
          disabled={loading}
          className="mt-5 w-full rounded-xl bg-indigo-600 px-4 py-3 text-sm font-extrabold text-white shadow-md transition hover:bg-indigo-700 disabled:opacity-70"
        >
          {loading ? "Đang vào..." : "Bắt đầu thi"}
        </button>
      </form>
    </div>
  );
}

export default JoinExamModal;
