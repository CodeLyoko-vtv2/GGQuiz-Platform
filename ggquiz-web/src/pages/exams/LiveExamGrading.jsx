import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft, CheckCircle2, Save } from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import EssayAnnotator from "../../components/exams/EssayAnnotator";
import SpeakingRecorder from "../../components/exams/SpeakingRecorder";
import {
  essayToPlainText,
  getFormat,
  isManualGradeFormat,
  sanitizeHtml,
} from "../../utils/examFormats";

function emptyItem(question) {
  return {
    score: null,
    maxScore: question?.maxManualScore || 10,
    comment: "",
    inlineComments: [],
    voiceComment: null,
  };
}

function LiveExamGrading() {
  const { id, participantId } = useParams();
  const navigate = useNavigate();
  const [paper, setPaper] = useState(null);
  const [grading, setGrading] = useState(null);
  const [currentId, setCurrentId] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const { data } = await api.get(`/live-exams/${id}/participants/${participantId}`);
        if (cancelled) return;
        setPaper(data);
        setGrading(data.grading);
        const firstManual = (data.questions || []).find((item) => item.isManual);
        setCurrentId(firstManual?.id || data.questions?.[0]?.id || null);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [id, participantId]);

  const questions = paper?.questions || [];
  const current = questions.find((item) => item.id === currentId) || questions[0];
  const item = current
    ? grading?.items?.[String(current.id)] || emptyItem(current)
    : emptyItem(current);

  const stats = useMemo(() => {
    const manual = questions.filter((q) => q.isManual);
    const scored = manual.filter((q) => grading?.items?.[String(q.id)]?.score != null);
    return { manual: manual.length, scored: scored.length };
  }, [questions, grading]);

  const updateItem = (patch) => {
    if (!current) return;
    setGrading((prev) => ({
      ...prev,
      items: {
        ...(prev?.items || {}),
        [String(current.id)]: { ...item, ...patch },
      },
    }));
  };

  const persist = async (publish) => {
    if (busy) return;
    setBusy(publish ? "publish" : "save");
    try {
      const url = publish
        ? `/live-exams/${id}/participants/${participantId}/publish`
        : `/live-exams/${id}/participants/${participantId}/grade`;
      const { data } = await api[publish ? "post" : "put"](url, { grading });
      setGrading(data.grading);
      if (data.participant) {
        setPaper((prev) => ({ ...prev, participant: data.participant }));
      }
      toast.success(data.message || (publish ? "Đã công bố điểm" : "Đã lưu nháp"));
      if (publish) navigate(`/live/${id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="max-w-md text-center">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <Link to={`/live/${id}`} className="mt-4 inline-block text-sm font-bold text-indigo-700">
            Về bảng quản lý phòng thi
          </Link>
        </div>
      </div>
    );
  }

  if (!paper || !grading || !current) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Đang mở không gian chấm bài...
      </div>
    );
  }

  const published = paper.participant?.gradingStatus === "published";
  const answerText = essayToPlainText(current.studentAnswer);
  const isSpeaking = current.type === "speaking";
  const isWriting = current.type === "writing" || current.type === "sentence_rewrite";

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => navigate(`/live/${id}`)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Bảng quản lý phòng thi
          </button>
          <h1 className="truncate text-lg font-extrabold text-slate-900">
            {paper.participant?.name}
          </h1>
          <p className="truncate text-xs text-slate-500">{paper.exam?.title}</p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <p className="hidden text-xs font-semibold text-slate-500 sm:block">
            Đã nhập {stats.scored}/{stats.manual} câu tự luận
          </p>
          <button
            type="button"
            onClick={() => persist(false)}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <Save className="h-4 w-4" />
            {busy === "save" ? "Đang lưu..." : "Lưu nháp"}
          </button>
          <button
            type="button"
            onClick={() => persist(true)}
            disabled={Boolean(busy)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40"
          >
            <CheckCircle2 className="h-4 w-4" />
            {busy === "publish" ? "Đang công bố..." : "Lưu & Công bố điểm"}
          </button>
        </div>
      </header>

      <div className="flex gap-2 overflow-x-auto border-b border-slate-200 bg-white px-4 py-2">
        {questions.map((question, index) => {
          const manual = isManualGradeFormat(question.type);
          const scored = grading.items?.[String(question.id)]?.score != null;
          const active = question.id === current.id;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => setCurrentId(question.id)}
              className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold ${
                active
                  ? "bg-indigo-600 text-white"
                  : manual && !scored
                    ? "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
                    : "bg-slate-100 text-slate-600"
              }`}
            >
              Câu {index + 1} · {getFormat(question.type).shortLabel}
              {manual && scored ? " ✓" : ""}
            </button>
          );
        })}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 p-4 md:grid-cols-2">
        <section className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-xs font-bold tracking-wide text-indigo-600 uppercase">
              Bài làm của thí sinh
            </p>
            <div
              className="exam-rich-text mt-2 text-sm font-semibold text-slate-900"
              dangerouslySetInnerHTML={{ __html: sanitizeHtml(current.prompt) }}
            />
            {current.meta?.starter ? (
              <p className="mt-1 text-xs text-slate-500">
                Gợi ý: <span className="font-semibold">{current.meta.starter}</span>
              </p>
            ) : null}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            {isSpeaking ? (
              current.studentAnswer ? (
                <audio controls src={current.studentAnswer} className="w-full">
                  Trình duyệt không hỗ trợ audio.
                </audio>
              ) : (
                <p className="text-sm text-slate-400">Thí sinh chưa nộp file ghi âm.</p>
              )
            ) : null}
            {isWriting ? (
              <EssayAnnotator
                text={answerText}
                comments={item.inlineComments || []}
                onAdd={(comment) =>
                  updateItem({ inlineComments: [...(item.inlineComments || []), comment] })
                }
                onRemove={(commentId) =>
                  updateItem({
                    inlineComments: (item.inlineComments || []).filter((c) => c.id !== commentId),
                  })
                }
              />
            ) : null}
            {!isSpeaking && !isWriting ? (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                <p>
                  Học sinh chọn:{" "}
                  <span className="font-bold">{current.studentAnswer || "—"}</span>
                </p>
                {current.correctKey ? (
                  <p className="mt-1">
                    Đáp án đúng: <span className="font-bold">{current.correctKey}</span>
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>
        </section>

        <section className="flex min-h-0 flex-col rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-5 py-4">
            <p className="text-xs font-bold tracking-wide text-indigo-600 uppercase">
              Bảng chấm điểm & nhận xét
            </p>
            {published ? (
              <p className="mt-1 text-xs font-semibold text-emerald-600">Đã công bố điểm</p>
            ) : (
              <p className="mt-1 text-xs text-slate-500">
                Nhập điểm tự luận. Điểm này chỉ cộng vào tổng khi bạn công bố.
              </p>
            )}
          </div>
          <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
            {current.isManual ? (
              <>
                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-800">Điểm số</span>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="0"
                      max={item.maxScore}
                      step="0.5"
                      value={item.score ?? ""}
                      onChange={(e) =>
                        updateItem({
                          score: e.target.value === "" ? null : Number(e.target.value),
                        })
                      }
                      placeholder="8.5"
                      className="w-28 rounded-xl border-2 border-indigo-200 bg-indigo-50 px-3 py-3 text-center text-2xl font-black text-indigo-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    />
                    <span className="text-lg font-bold text-slate-400">/{item.maxScore}</span>
                  </div>
                </label>

                <label className="block">
                  <span className="mb-1.5 block text-sm font-bold text-slate-800">
                    Ghi chú / nhận xét chung
                  </span>
                  <textarea
                    value={item.comment}
                    onChange={(e) => updateItem({ comment: e.target.value })}
                    rows={7}
                    placeholder="Nhận xét về ý tưởng, ngữ pháp, phát âm..."
                    className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                  />
                </label>

                <div>
                  <p className="mb-1.5 text-sm font-bold text-slate-800">Thu âm nhận xét</p>
                  <SpeakingRecorder
                    value={item.voiceComment}
                    onChange={(value) => updateItem({ voiceComment: value })}
                  />
                </div>
              </>
            ) : (
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
                Câu trắc nghiệm đã được chấm tự động.
                {current.isCorrect === true
                  ? " Học sinh trả lời đúng."
                  : current.isCorrect === false
                    ? " Học sinh trả lời sai."
                    : ""}
              </div>
            )}

            <label className="block">
              <span className="mb-1.5 block text-sm font-bold text-slate-800">
                Nhận xét tổng quát cho cả bài
              </span>
              <textarea
                value={grading.overallComment || ""}
                onChange={(e) =>
                  setGrading((prev) => ({ ...prev, overallComment: e.target.value }))
                }
                rows={4}
                placeholder="Lời nhận xét gửi học sinh khi công bố điểm..."
                className="w-full resize-y rounded-2xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
            </label>
            <p className="text-xs text-slate-400">
              Trắc nghiệm: {grading.autoScore}/{grading.autoMaxScore} · Tự luận chỉ cộng sau khi
              công bố.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}

export default LiveExamGrading;
