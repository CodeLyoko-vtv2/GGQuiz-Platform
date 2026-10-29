import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  Copy,
  Crown,
  Play,
  Square,
  Users,
  WifiOff,
  X,
} from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";

const STATUS_META = {
  waiting: { label: "Chờ bắt đầu", className: "bg-slate-100 text-slate-600" },
  in_progress: { label: "Đang làm bài", className: "bg-blue-50 text-blue-700" },
  disconnected: { label: "Đang mất kết nối", className: "bg-amber-50 text-amber-700" },
  submitted: { label: "Đã nộp bài", className: "bg-emerald-50 text-emerald-700" },
  pending_grade: { label: "Chờ chấm điểm", className: "bg-amber-100 text-amber-800" },
  published: { label: "Đã chấm", className: "bg-emerald-100 text-emerald-800" },
  quit: { label: "Bỏ cuộc", className: "bg-rose-50 text-rose-700" },
};

function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.waiting;
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${meta.className}`}>
      {meta.label}
    </span>
  );
}

function rowStatus(row) {
  if (row.gradingStatus === "published") return "published";
  if (row.needsManualGrade && ["submitted", "quit"].includes(row.status)) {
    return "pending_grade";
  }
  return row.status;
}

function LiveExamHost() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const { data } = await api.get(`/live-exams/${id}`);
        if (!cancelled) {
          setSession(data.session);
          setError("");
        }
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      }
    };
    tick();
    const timer = setInterval(tick, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [id]);

  const leaderboard = useMemo(() => {
    const rows = [...(session?.participants || [])];
    return rows.sort((a, b) => {
      const scoreA = a.score ?? -1;
      const scoreB = b.score ?? -1;
      if (scoreB !== scoreA) return scoreB - scoreA;
      return String(a.name).localeCompare(String(b.name), "vi");
    });
  }, [session]);

  const copyCode = async () => {
    if (!session?.code) return;
    try {
      await navigator.clipboard.writeText(session.code);
      toast.success("Đã sao chép mã phòng thi.");
    } catch {
      toast.error("Không thể sao chép. Hãy chọn mã rồi Ctrl+C.");
    }
  };

  const handleStart = async () => {
    if (busy) return;
    setBusy("start");
    try {
      const { data } = await api.post(`/live-exams/${id}/start`);
      setSession(data.session);
      toast.success("Đã bắt đầu tính giờ.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const handleEnd = async () => {
    if (busy) return;
    if (!window.confirm("Kết thúc kỳ thi và buộc mọi thí sinh nộp bài?")) return;
    setBusy("end");
    try {
      const { data } = await api.post(`/live-exams/${id}/end`);
      setSession(data.session);
      toast.success("Đã kết thúc kỳ thi.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const openReview = async (participant) => {
    if (participant.needsManualGrade && ["submitted", "quit"].includes(participant.status)) {
      navigate(`/live/${id}/grade/${participant.id}`);
      return;
    }
    setReviewLoading(true);
    try {
      const { data } = await api.get(
        `/live-exams/${id}/participants/${participant.id}`
      );
      setReview(data);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setReviewLoading(false);
    }
  };

  if (error && !session) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm text-rose-600">{error}</p>
        <button
          type="button"
          onClick={() => navigate("/practice-tests")}
          className="mt-4 text-sm font-semibold text-purple-700"
        >
          Quay lại đề thi
        </button>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="px-6 py-16 text-center text-sm text-slate-500">
        Đang tải phòng thi...
      </div>
    );
  }

  const ended = session.status === "ended";
  const live = session.status === "live";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-[0.16em] text-indigo-600 uppercase">
              Tổ chức thi
            </p>
            <h1 className="mt-1 text-2xl font-extrabold text-slate-900">
              {session.exam?.title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {session.exam?.grade} · {session.durationMinutes} phút ·{" "}
              {session.exam?.questionCount || 0} câu
            </p>
          </div>
          <Link
            to={`/exams/${session.exam?.id}`}
            className="text-sm font-semibold text-slate-500 hover:text-slate-800"
          >
            ← Về chi tiết đề
          </Link>
        </div>

        <section className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-violet-600 p-6 text-white shadow-lg">
            <p className="text-xs font-bold tracking-[0.18em] text-indigo-100 uppercase">
              Mã kết nối
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <p className="font-mono text-5xl font-black tracking-[0.2em]">
                {session.code}
              </p>
              <button
                type="button"
                onClick={copyCode}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-2 text-sm font-bold hover:bg-white/25"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>
            <p className="mt-3 text-sm text-indigo-100">
              Gửi mã này cho học sinh. Họ bấm “Vào phòng thi” trên trang Đề thi để tham gia.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-slate-800">Điều khiển</p>
              <StatusBadge
                status={ended ? "submitted" : live ? "in_progress" : "waiting"}
              />
            </div>
            <p className="mt-4 text-center font-mono text-4xl font-black text-slate-900 tabular-nums">
              {formatTime(session.remainingSeconds || 0)}
            </p>
            <p className="mt-1 text-center text-xs text-slate-400">
              {live ? "Đang tính giờ" : ended ? "Kỳ thi đã kết thúc" : "Chưa bắt đầu"}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleStart}
                disabled={busy || live || ended}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Play className="h-4 w-4" />
                {busy === "start" ? "Đang bắt đầu..." : "Bắt đầu tính giờ"}
              </button>
              <button
                type="button"
                onClick={handleEnd}
                disabled={busy || ended}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-3 text-sm font-bold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Square className="h-4 w-4" />
                {busy === "end" ? "Đang kết thúc..." : "Kết thúc bài thi"}
              </button>
            </div>
          </div>
        </section>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: "Thí sinh", value: session.stats?.total || 0, icon: Users },
            { label: "Đang làm", value: session.stats?.inProgress || 0, icon: WifiOff },
            { label: "Đã nộp", value: session.stats?.submitted || 0, icon: CheckCircle2 },
            { label: "Chờ chấm", value: session.stats?.pendingGrade || 0, icon: Crown },
            { label: "Cảnh báo", value: session.stats?.violations || 0, icon: WifiOff },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
            >
              <p className="text-xs font-semibold text-slate-400 uppercase">{item.label}</p>
              <p className="mt-1 text-2xl font-black text-slate-900">{item.value}</p>
            </div>
          ))}
        </section>

        <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="text-base font-extrabold text-slate-900">
              {ended ? "Bảng điểm tổng sắp" : "Giám sát trực tiếp"}
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold tracking-wide text-slate-500 uppercase">
                <tr>
                  {ended ? <th className="px-5 py-3">Hạng</th> : null}
                  <th className="px-5 py-3">Thí sinh</th>
                  <th className="px-5 py-3">Trạng thái</th>
                  <th className="px-5 py-3">Cảnh báo gian lận</th>
                  <th className="px-5 py-3">Điểm</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={ended ? 5 : 4} className="px-5 py-10 text-center text-slate-400">
                      Chưa có thí sinh nào vào phòng.
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((row, index) => (
                    <tr key={row.id} className="border-t border-slate-100">
                      {ended ? (
                        <td className="px-5 py-3 font-black text-slate-400">#{index + 1}</td>
                      ) : null}
                      <td className="px-5 py-3">
                        <button
                          type="button"
                          onClick={() => openReview(row)}
                          className="font-bold text-indigo-700 hover:underline"
                        >
                          {row.name}
                        </button>
                      </td>
                      <td className="px-5 py-3">
                        <StatusBadge status={rowStatus(row)} />
                      </td>
                      <td className="px-5 py-3 font-semibold text-rose-600">
                        {row.violationCount || 0}
                      </td>
                      <td className="px-5 py-3 font-bold text-slate-800">
                        {rowStatus(row) === "pending_grade"
                          ? row.autoMaxScore
                            ? `${row.autoScore ?? 0}/${row.autoMaxScore} + tự luận`
                            : "Chờ chấm"
                          : row.score == null
                            ? "—"
                            : `${row.score}/${row.maxScore ?? "?"}`}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {review || reviewLoading ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 px-4 backdrop-blur-sm">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-bold tracking-wide text-indigo-600 uppercase">
                  Bài làm chi tiết
                </p>
                <h3 className="text-lg font-extrabold text-slate-900">
                  {review?.participant?.name || "Đang tải..."}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setReview(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                aria-label="Đóng"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {reviewLoading && !review ? (
              <p className="text-sm text-slate-500">Đang tải bài làm...</p>
            ) : (
              <div className="space-y-3">
                {(review?.questions || []).map((question, index) => (
                  <article
                    key={question.id}
                    className={`rounded-2xl border px-4 py-3 ${
                      question.isCorrect === true
                        ? "border-emerald-200 bg-emerald-50/60"
                        : question.isCorrect === false
                          ? "border-rose-200 bg-rose-50/60"
                          : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <p className="text-xs font-bold text-slate-500">Câu {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">{question.prompt}</p>
                    <p className="mt-2 text-sm text-slate-600">
                      Học sinh chọn:{" "}
                      <span className="font-bold">
                        {question.studentAnswer || "—"}
                      </span>
                    </p>
                    {question.correctKey ? (
                      <p className="text-sm text-slate-600">
                        Đáp án đúng: <span className="font-bold">{question.correctKey}</span>
                      </p>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default LiveExamHost;
