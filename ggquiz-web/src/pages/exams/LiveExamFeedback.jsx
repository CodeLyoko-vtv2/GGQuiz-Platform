import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import EssayAnnotator from "../../components/exams/EssayAnnotator";
import {
  essayToPlainText,
  getFormat,
  sanitizeHtml,
} from "../../utils/examFormats";

function LiveExamFeedback() {
  const { id } = useParams();
  const [paper, setPaper] = useState(null);
  const [error, setError] = useState("");
  const [currentId, setCurrentId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    api
      .get(`/live-exams/${id}/feedback`)
      .then(({ data }) => {
        if (cancelled) return;
        setPaper(data);
        setCurrentId(data.questions?.[0]?.id || null);
      })
      .catch((err) => {
        if (!cancelled) setError(getApiErrorMessage(err));
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (error) {
    return (
      <div className="px-6 py-16 text-center">
        <p className="text-sm font-semibold text-slate-600">{error}</p>
        <Link to="/" className="mt-4 inline-block text-sm font-bold text-indigo-700">
          Về Bảng điều khiển
        </Link>
      </div>
    );
  }

  if (!paper) {
    return <p className="px-6 py-16 text-center text-sm text-slate-500">Đang tải nhận xét...</p>;
  }

  const questions = paper.questions || [];
  const current = questions.find((item) => item.id === currentId) || questions[0];
  const item = current ? paper.grading?.items?.[String(current.id)] : null;
  const score = paper.participant?.score;
  const maxScore = paper.participant?.maxScore;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft className="h-4 w-4" />
          Bảng điều khiển
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold tracking-wide text-emerald-600 uppercase">
              Kết quả đã chấm
            </p>
            <h1 className="text-2xl font-extrabold text-slate-900">{paper.exam?.title}</h1>
          </div>
          <p className="text-3xl font-black text-indigo-700">
            {score ?? 0}/{maxScore ?? 0}
          </p>
        </div>
        {paper.grading?.overallComment ? (
          <div className="mt-4 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-sm text-indigo-900">
            {paper.grading.overallComment}
          </div>
        ) : null}

        <div className="mt-4 flex gap-2 overflow-x-auto">
          {questions.map((question, index) => (
            <button
              key={question.id}
              type="button"
              onClick={() => setCurrentId(question.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                question.id === current?.id
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200"
              }`}
            >
              Câu {index + 1} · {getFormat(question.type).shortLabel}
            </button>
          ))}
        </div>

        {current ? (
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Bài làm của bạn
              </p>
              <div
                className="exam-rich-text mt-2 text-sm font-semibold text-slate-900"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(current.prompt) }}
              />
              <div className="mt-4">
                {current.type === "speaking" ? (
                  current.studentAnswer ? (
                    <audio controls src={current.studentAnswer} className="w-full" />
                  ) : (
                    <p className="text-sm text-slate-400">Không có file ghi âm.</p>
                  )
                ) : current.isManual ? (
                  <EssayAnnotator
                    text={essayToPlainText(current.studentAnswer)}
                    comments={item?.inlineComments || []}
                    readOnly
                  />
                ) : (
                  <p className="text-sm text-slate-700">
                    Bạn chọn: <span className="font-bold">{current.studentAnswer || "—"}</span>
                  </p>
                )}
              </div>
            </section>
            <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-xs font-bold tracking-wide text-slate-500 uppercase">
                Nhận xét của giáo viên
              </p>
              {current.isManual ? (
                <>
                  <p className="mt-3 text-3xl font-black text-indigo-700">
                    {item?.score ?? "—"}
                    <span className="text-lg font-bold text-slate-400">/{item?.maxScore || 10}</span>
                  </p>
                  <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                    {item?.comment || "Giáo viên chưa ghi nhận xét chữ cho câu này."}
                  </p>
                  {item?.voiceComment?.dataUrl ? (
                    <div className="mt-4">
                      <p className="mb-2 text-xs font-bold text-slate-500 uppercase">
                        Nhận xét bằng giọng nói
                      </p>
                      <audio controls src={item.voiceComment.dataUrl} className="w-full" />
                    </div>
                  ) : null}
                </>
              ) : (
                <p className="mt-3 text-sm text-slate-600">Câu này được chấm tự động.</p>
              )}
            </section>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default LiveExamFeedback;
