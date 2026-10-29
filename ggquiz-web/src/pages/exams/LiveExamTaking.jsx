import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Maximize2,
} from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import ExamFinishScreen from "../../components/exams/ExamFinishScreen";
import TakeQuestionBlock from "../../components/exams/TakeQuestionBlock";
import {
  examIsManualReview,
  formatSubmitTime,
  formatWorkDuration,
  groupExamQuestions,
  stripHtml,
  submissionLengthLabel,
} from "../../utils/examFormats";

function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function isFullscreen() {
  return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
}

async function enterFullscreen() {
  const el = document.documentElement;
  if (el.requestFullscreen) return el.requestFullscreen();
  if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
  throw new Error("fullscreen");
}

function LiveExamTaking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [session, setSession] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [entered, setEntered] = useState(false);
  const [violation, setViolation] = useState(0);
  const [showWarning, setShowWarning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);
  const [reviewing, setReviewing] = useState(false);
  const questionRefs = useRef({});
  const answersRef = useRef(answers);
  const ignoreExitRef = useRef(false);
  const enteredRef = useRef(false);
  const finishedRef = useRef(false);

  answersRef.current = answers;
  enteredRef.current = entered;

  const persistPayload = () => {
    const payload = {};
    Object.entries(answersRef.current).forEach(([key, value]) => {
      if (value == null) return;
      if (typeof value === "object") {
        payload[key] = { value: value.dataUrl || JSON.stringify(value) };
        return;
      }
      payload[key] = { value: String(value) };
    });
    return payload;
  };

  const refresh = useCallback(async () => {
    const { data } = await api.get(`/live-exams/${id}/paper`);
    setSession(data.session);
    setQuestions(data.questions || []);
    const mine = data.session?.me;
    if (mine && ["submitted", "quit"].includes(mine.status)) {
      finishedRef.current = true;
      setResult((prev) =>
        prev || {
          quit: mine.status === "quit",
          pending: mine.status !== "quit" && examIsManualReview(data.questions || []),
          score: mine.score ?? 0,
          maxScore: mine.maxScore ?? 0,
          correct: mine.score ?? 0,
          submittedAt: formatSubmitTime(),
          durationLabel: formatWorkDuration(
            (data.session?.durationMinutes || 45) * 60 - (data.session?.remainingSeconds || 0)
          ),
          lengthLabel: submissionLengthLabel(answersRef.current),
        }
      );
    }
    if (data.session?.status === "ended" && mine && !["submitted", "quit"].includes(mine.status)) {
      await submitExam(false);
    }
    return data.session;
  }, [id]);

  useEffect(() => {
    let cancelled = false;
    refresh().catch((err) => {
      if (!cancelled) setError(getApiErrorMessage(err));
    });
    const timer = setInterval(() => {
      refresh().catch(() => {});
    }, 2500);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [refresh]);

  useEffect(() => {
    const beat = setInterval(() => {
      if (finishedRef.current || !enteredRef.current) return;
      api
        .post(`/live-exams/${id}/heartbeat`, { answers: persistPayload() })
        .then(({ data }) => setSession(data.session))
        .catch(() => {});
    }, 5000);
    return () => clearInterval(beat);
  }, [id]);

  const recordViolation = useCallback(async () => {
    if (finishedRef.current || !enteredRef.current || ignoreExitRef.current) return;
    try {
      const { data } = await api.post(`/live-exams/${id}/violation`);
      const count = data.violationCount || (session?.me?.violationCount || 0) + 1;
      setViolation(count);
      setShowWarning(true);
    } catch {
      setViolation((prev) => prev + 1);
      setShowWarning(true);
    }
  }, [id, session]);

  useEffect(() => {
    const onFull = () => {
      if (!isFullscreen()) recordViolation();
    };
    const onVis = () => {
      if (document.hidden) recordViolation();
    };
    document.addEventListener("fullscreenchange", onFull);
    document.addEventListener("webkitfullscreenchange", onFull);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("fullscreenchange", onFull);
      document.removeEventListener("webkitfullscreenchange", onFull);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [recordViolation]);

  useEffect(() => {
    const onLeave = (event) => {
      if (finishedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, []);

  const submitExam = async (quit) => {
    if (submitting || finishedRef.current) return;
    setSubmitting(true);
    ignoreExitRef.current = true;
    try {
      const { data } = await api.post(`/live-exams/${id}/submit`, {
        answers: persistPayload(),
        quit,
      });
      finishedRef.current = true;
      setSession(data.session);
      setResult({
        quit,
        pending: !quit && examIsManualReview(questions),
        score: data.session?.me?.score ?? 0,
        maxScore: data.session?.me?.maxScore ?? 0,
        correct: data.session?.me?.score ?? 0,
        submittedAt: formatSubmitTime(),
        durationLabel: formatWorkDuration(
          (session?.durationMinutes || 45) * 60 - (session?.remainingSeconds ?? 0)
        ),
        lengthLabel: submissionLengthLabel(answersRef.current),
      });
      if (document.exitFullscreen && isFullscreen()) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      ignoreExitRef.current = false;
    } finally {
      setSubmitting(false);
    }
  };

  const handleEnter = async () => {
    try {
      await enterFullscreen();
    } catch {
      toast.error("Trình duyệt đã chặn toàn màn hình. Hãy cho phép rồi thử lại.");
      return;
    }
    ignoreExitRef.current = true;
    setEntered(true);
    setShowWarning(false);
    try {
      const { data } = await api.post(`/live-exams/${id}/heartbeat`, {
        answers: persistPayload(),
      });
      setSession(data.session);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
    setTimeout(() => {
      ignoreExitRef.current = false;
    }, 800);
  };

  const resumeAfterWarning = async () => {
    try {
      await enterFullscreen();
      setShowWarning(false);
    } catch {
      toast.error("Hãy bật lại chế độ toàn màn hình để tiếp tục.");
    }
  };

  const groups = useMemo(() => groupExamQuestions(questions), [questions]);
  const remaining = session?.remainingSeconds ?? 0;
  const totalSeconds = (session?.durationMinutes || 45) * 60;
  const progress = totalSeconds ? ((totalSeconds - remaining) / totalSeconds) * 100 : 0;
  const current = questions[currentIndex];

  const isAnswered = (question) => {
    const value = answers[question.id];
    if (value == null) return false;
    if (typeof value === "object") return Boolean(value.dataUrl);
    return Boolean(stripHtml(String(value)));
  };

  useEffect(() => {
    if (session?.status === "live" && remaining === 0 && entered && !finishedRef.current) {
      submitExam(false);
    }
  }, [remaining, session, entered]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 px-6">
        <div className="max-w-md rounded-3xl bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-semibold text-rose-600">{error}</p>
          <button
            type="button"
            onClick={() => navigate("/practice-tests")}
            className="mt-4 text-sm font-bold text-indigo-700"
          >
            Về trang Đề thi
          </button>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-sm text-slate-500">
        Đang kết nối phòng thi...
      </div>
    );
  }

  if (result && !reviewing) {
    return (
      <ExamFinishScreen
        mode={result.pending ? "pending" : "score"}
        quit={result.quit}
        title={session.exam?.title}
        score={result.score}
        maxScore={result.maxScore}
        correct={result.correct}
        submittedAt={result.submittedAt}
        durationLabel={result.durationLabel}
        lengthLabel={result.lengthLabel}
        onReview={() => setReviewing(true)}
        onDashboard={() => navigate("/")}
      />
    );
  }

  if ((session.status === "lobby" || !entered) && !reviewing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
        <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 text-center">
          <p className="text-xs font-bold tracking-[0.2em] text-indigo-300 uppercase">
            Phòng thi thật
          </p>
          <h1 className="mt-2 text-2xl font-black">{session.exam?.title}</h1>
          <p className="mt-4 font-mono text-4xl font-black tracking-[0.2em] text-indigo-200">
            {session.code}
          </p>
          {session.status === "lobby" ? (
            <p className="mt-5 text-sm text-slate-300">
              Đang chờ giám thị bấm <span className="font-bold">Bắt đầu tính giờ</span>...
            </p>
          ) : (
            <p className="mt-5 text-sm text-slate-300">
              Kỳ thi đã bắt đầu. Bấm bên dưới để vào toàn màn hình và làm bài.
            </p>
          )}
          <button
            type="button"
            onClick={handleEnter}
            disabled={session.status !== "live"}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-sm font-extrabold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Maximize2 className="h-4 w-4" />
            {session.status === "live" ? "Vào thi (toàn màn hình)" : "Chờ bắt đầu"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      {showWarning ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-rose-950/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl bg-white p-8 text-center shadow-2xl">
            <AlertTriangle className="mx-auto h-14 w-14 text-rose-500" />
            <h2 className="mt-4 text-2xl font-black text-rose-700">
              Bạn đã vi phạm quy chế thi
            </h2>
            <p className="mt-3 text-lg font-bold text-slate-800">
              Lần vi phạm thứ {violation || session.me?.violationCount || 1}
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Thoát toàn màn hình hoặc chuyển tab đã được ghi nhận và gửi về giám thị.
            </p>
            <button
              type="button"
              onClick={resumeAfterWarning}
              className="mt-6 rounded-xl bg-rose-600 px-6 py-3 text-sm font-extrabold text-white hover:bg-rose-700"
            >
              Tiếp tục làm bài
            </button>
          </div>
        </div>
      ) : null}

      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 py-4 pb-36 lg:flex-row lg:px-6">
        <section className="min-w-0 flex-1 lg:w-[70%]">
          <div className="mb-4 rounded-2xl border border-rose-100 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-bold tracking-wide text-rose-600 uppercase">
              {reviewing ? "Xem lại bài đã nộp" : "Thi thật · chống gian lận"}
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-gray-900 sm:text-2xl">
              {session.exam?.title}
            </h1>
          </div>
          <div className={`space-y-5 ${showWarning ? "pointer-events-none opacity-40" : ""}`}>
            {groups.map((group) => (
              <TakeQuestionBlock
                key={group.id}
                group={group}
                currentIndex={currentIndex}
                answers={answers}
                onSelect={(questionId, value) =>
                  setAnswers((prev) => ({ ...prev, [questionId]: value }))
                }
                onFocus={setCurrentIndex}
                questionRefs={questionRefs}
                readOnly={reviewing}
              />
            ))}
          </div>
        </section>

        <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)] lg:w-[30%] lg:self-start">
          <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
            <p className="text-center text-xs font-bold tracking-[0.14em] text-red-500 uppercase">
              Thời gian còn lại
            </p>
            <p
              className={`mt-2 text-center text-5xl font-black tabular-nums ${
                remaining <= 60 ? "text-red-600" : "text-red-500"
              }`}
            >
              {formatTime(remaining)}
            </p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-red-100">
              <div
                className="h-full rounded-full bg-red-500 transition-all duration-1000"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="mt-3 text-center text-xs font-semibold text-rose-500">
              Cảnh báo: {session.me?.violationCount || violation || 0} lần
            </p>
          </div>
          <div className="mt-4 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <p className="mb-3 text-sm font-bold text-gray-800">Danh sách câu hỏi</p>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => setCurrentIndex(index)}
                  className={`flex h-10 items-center justify-center rounded-lg text-sm font-bold ${
                    index === currentIndex
                      ? "bg-white text-blue-700 ring-2 ring-blue-500"
                      : isAnswered(question)
                        ? "bg-blue-600 text-white"
                        : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {index + 1}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-3 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Câu trước
          </button>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {reviewing ? (
              <button
                type="button"
                onClick={() => setReviewing(false)}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Quay lại kết quả
              </button>
            ) : (
            <button
              type="button"
              onClick={() => submitExam(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-red-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Nộp bài
            </button>
            )}
            <button
              type="button"
              onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              disabled={currentIndex >= questions.length - 1}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"
            >
              Câu tiếp theo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (reviewing) {
                navigate("/");
                return;
              }
              if (window.confirm("Thoát bài thi sẽ nhận 0 điểm. Bạn chắc chứ?")) {
                submitExam(true);
              }
            }}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600"
          >
            <LogOut className="h-4 w-4" />
            {reviewing ? "Quay về Bảng điều khiển" : "Thoát bài thi"}
          </button>
        </div>
        <p className="mx-auto mt-1 max-w-7xl text-center text-[11px] text-gray-400 sm:text-left">
          Đang xem câu {currentIndex + 1}/{questions.length || 0}
          {current ? ` · ${isAnswered(current) ? "Đã trả lời" : "Chưa trả lời"}` : ""}
        </p>
      </div>
    </div>
  );
}

export default LiveExamTaking;
