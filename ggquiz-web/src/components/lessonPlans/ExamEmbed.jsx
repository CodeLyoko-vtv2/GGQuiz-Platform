import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Play } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";

function ExamEmbed({ examId, title }) {
  const navigate = useNavigate();
  const [code, setCode] = useState("");

  const startPractice = () => {
    if (examId) navigate(`/exams/${examId}`);
  };

  const joinLive = async () => {
    if (!code.trim()) return;
    try {
      const { data } = await api.post("/live-exams/join", { code: code.trim() });
      navigate(`/live/${data.session.id}/take`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="rounded-2xl border border-violet-100 bg-violet-50/50 p-4">
      <p className="text-xs font-bold tracking-wide text-violet-600 uppercase">Đề thi</p>
      <p className="mt-1 text-base font-extrabold text-slate-900">{title || "Đề thi GGQuiz"}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={startPractice}
          disabled={!examId}
          className="inline-flex items-center gap-1.5 rounded-xl bg-violet-600 px-3 py-2 text-sm font-bold text-white disabled:opacity-40"
        >
          <Play className="h-4 w-4" />
          Bắt đầu làm bài
        </button>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="Mã thi live"
          className="w-32 rounded-xl border border-violet-200 bg-white px-3 py-2 font-mono text-sm uppercase outline-none"
        />
        <button
          type="button"
          onClick={joinLive}
          className="rounded-xl border border-violet-200 bg-white px-3 py-2 text-sm font-bold text-violet-700"
        >
          Vào phòng
        </button>
      </div>
    </div>
  );
}

export default ExamEmbed;
