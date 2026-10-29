import { CheckCircle2, ClipboardCheck, Hourglass, LayoutDashboard } from "lucide-react";

function ScoreRing({ percent }) {
  const safe = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (safe / 100) * circumference;

  return (
    <div className="relative mx-auto h-36 w-36">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth="10"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={safe >= 70 ? "#16a34a" : safe >= 40 ? "#f59e0b" : "#ef4444"}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-black text-slate-900">{safe}%</p>
        <p className="text-[11px] font-semibold text-slate-400">Điểm số</p>
      </div>
    </div>
  );
}

function ExamFinishScreen({
  mode = "score",
  quit = false,
  title,
  score = 0,
  maxScore = 0,
  correct = 0,
  submittedAt,
  durationLabel,
  lengthLabel,
  onReview,
  onDashboard,
}) {
  const pending = mode === "pending" && !quit;
  const percent = maxScore > 0 ? (score / maxScore) * 100 : 0;
  const wrong = Math.max(0, (maxScore || 0) - (correct || 0));

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-lg sm:p-10">
        {pending ? (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-amber-50 ring-8 ring-amber-50/70">
            <Hourglass className="h-10 w-10 text-amber-500" />
          </div>
        ) : (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 ring-8 ring-emerald-50/70">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>
        )}

        <h1
          className={`mt-5 text-2xl font-black sm:text-3xl ${
            quit ? "text-slate-800" : "text-emerald-600"
          }`}
        >
          {quit ? "Đã thoát bài thi" : "Nộp bài thành công!"}
        </h1>
        {title ? <p className="mt-1 text-sm font-medium text-slate-500">{title}</p> : null}

        {pending ? (
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            Bài làm của bạn đã được ghi nhận và đang chờ giáo viên chấm điểm. Kết quả sẽ được
            cập nhật sau.
          </p>
        ) : (
          <>
            {quit ? (
              <p className="mt-4 text-sm leading-relaxed text-slate-600">
                Bạn đã thoát bài thi nên nhận 0 điểm.
              </p>
            ) : null}
            <div className="mt-6">
              <ScoreRing percent={percent} />
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-2xl bg-emerald-50 px-4 py-4">
                <p className="text-[11px] font-bold tracking-wide text-emerald-600 uppercase">
                  Đúng
                </p>
                <p className="mt-1 text-2xl font-black text-emerald-700">{correct}</p>
              </div>
              <div className="rounded-2xl bg-rose-50 px-4 py-4">
                <p className="text-[11px] font-bold tracking-wide text-rose-600 uppercase">
                  Sai
                </p>
                <p className="mt-1 text-2xl font-black text-rose-700">{wrong}</p>
              </div>
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-500">
              {score}/{maxScore} điểm
            </p>
          </>
        )}

        {pending ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left">
            <p className="mb-3 text-xs font-bold tracking-wide text-slate-500 uppercase">
              Tóm tắt bài làm
            </p>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Thời gian nộp bài</dt>
                <dd className="font-semibold text-slate-800">{submittedAt || "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Tổng thời gian làm bài</dt>
                <dd className="font-semibold text-slate-800">{durationLabel || "—"}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="text-slate-500">Chiều dài bài làm</dt>
                <dd className="font-semibold text-slate-800">{lengthLabel || "—"}</dd>
              </div>
            </dl>
          </div>
        ) : null}

        <div className="mt-7 flex flex-col gap-3">
          <button
            type="button"
            onClick={onReview}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700"
          >
            <ClipboardCheck className="h-4 w-4" />
            Xem lại bài đã nộp
          </button>
          <button
            type="button"
            onClick={onDashboard}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
          >
            <LayoutDashboard className="h-4 w-4" />
            Quay về Bảng điều khiển
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExamFinishScreen;
