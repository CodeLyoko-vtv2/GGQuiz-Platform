import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  LogOut,
} from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import ExamFinishScreen from "../../components/exams/ExamFinishScreen";
import TakeQuestionBlock from "../../components/exams/TakeQuestionBlock";
import {
  examIsManualReview,
  formatSubmitTime,
  formatWorkDuration,
  groupExamQuestions,
  scoreAutoExam,
  stripHtml,
  submissionLengthLabel,
} from "../../utils/examFormats";

function formatTime(totalSeconds) {
  const safe = Math.max(0, totalSeconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ExamTaking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loadError, setLoadError] = useState("");
  const questions = exam?.questions || [];
  const totalSeconds = (exam?.durationMinutes || 45) * 60;

  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [remaining, setRemaining] = useState(totalSeconds);
  const [phase, setPhase] = useState("taking");
  const [result, setResult] = useState(null);
  const questionRefs = useRef({});
  const answersRef = useRef(answers);
  const submittedRef = useRef(false);
  answersRef.current = answers;

  useEffect(() => {
    let cancelled = false;

    const fetchExam = async () => {
      try {
        const { data } = await api.get(`/exams/${id}`);
        if (!cancelled) {
          setExam(data.exam || null);
          setLoadError("");
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(getApiErrorMessage(err));
          setExam(null);
        }
      }
    };

    fetchExam();
    return () => {
      cancelled = true;
    };
  }, [id]);

  useEffect(() => {
    if (!exam || phase !== "taking") return undefined;
    setRemaining(totalSeconds);
    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          toast.error("Hết giờ! Hệ thống sẽ nộp bài.");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [exam, totalSeconds, phase]);

  useEffect(() => {
    const el = questionRefs.current[currentIndex];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [currentIndex]);

  const groups = useMemo(() => groupExamQuestions(questions), [questions]);

  const finishExam = useCallback(
    (usedSeconds) => {
      if (submittedRef.current) return;
      submittedRef.current = true;
      const currentAnswers = answersRef.current;
      const auto = scoreAutoExam(questions, currentAnswers);
      setResult({
        pending: examIsManualReview(questions),
        score: auto.correct,
        maxScore: auto.maxScore,
        correct: auto.correct,
        submittedAt: formatSubmitTime(),
        durationLabel: formatWorkDuration(usedSeconds),
        lengthLabel: submissionLengthLabel(currentAnswers),
      });
      setPhase("result");
    },
    [questions]
  );

  useEffect(() => {
    if (exam && phase === "taking" && remaining === 0) {
      finishExam(totalSeconds);
    }
  }, [exam, phase, remaining, totalSeconds, finishExam]);

  if (!exam && !loadError) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">Đang tải đề thi...</p>
      </div>
    );
  }

  if (!exam) {
    return <Navigate to="/practice-tests" replace />;
  }

  if (phase === "result" && result) {
    return (
      <ExamFinishScreen
        mode={result.pending ? "pending" : "score"}
        title={exam.title}
        score={result.score}
        maxScore={result.maxScore}
        correct={result.correct}
        submittedAt={result.submittedAt}
        durationLabel={result.durationLabel}
        lengthLabel={result.lengthLabel}
        onReview={() => setPhase("review")}
        onDashboard={() => navigate("/")}
      />
    );
  }

  const reviewing = phase === "review";
  const progress = ((totalSeconds - remaining) / totalSeconds) * 100;
  const current = questions[currentIndex];

  const isAnswered = (question) => {
    const value = answers[question.id];
    if (value == null) return false;
    if (typeof value === "object") return Boolean(value.dataUrl);
    return Boolean(stripHtml(String(value)));
  };

  const selectAnswer = (questionId, key) => {
    setAnswers((prev) => ({ ...prev, [questionId]: key }));
  };

  const goTo = (index) => {
    if (index < 0 || index >= questions.length) return;
    setCurrentIndex(index);
  };

  const handleSubmit = () => {
    finishExam(totalSeconds - remaining);
  };

  const handleExit = () => {
    if (window.confirm("Bạn có chắc muốn thoát bài thi? Tiến độ sẽ không được lưu.")) {
      navigate(`/exams/${exam.id}`);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-100">
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-4 px-3 py-4 pb-36 lg:flex-row lg:px-6">
        {/* Left: questions ~70% */}
        <section className="min-w-0 flex-1 lg:w-[70%]">
          <div className="mb-4 rounded-2xl border border-gray-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-xs font-bold tracking-wide text-purple-600 uppercase">
              {reviewing ? "Xem lại bài đã nộp" : "Phòng thi"}
            </p>
            <h1 className="mt-1 text-xl font-extrabold text-gray-900 sm:text-2xl">
              {exam.title}
            </h1>
            {reviewing ? (
              <p className="mt-2 text-sm text-slate-500">
                Bạn đang xem lại bài làm đã nộp. Nội dung không thể chỉnh sửa.
              </p>
            ) : null}
          </div>

          <div className="space-y-5">
            {groups.map((group) => (
              <TakeQuestionBlock
                key={group.id}
                group={group}
                currentIndex={currentIndex}
                answers={answers}
                onSelect={selectAnswer}
                onFocus={setCurrentIndex}
                questionRefs={questionRefs}
                readOnly={reviewing}
              />
            ))}
          </div>
        </section>

        {/* Right: control panel ~30% sticky */}
        <aside className="w-full shrink-0 lg:sticky lg:top-4 lg:h-[calc(100vh-7rem)] lg:w-[30%] lg:self-start">
          <div className="flex h-full flex-col gap-4">
            <div className="rounded-2xl border border-red-100 bg-white p-5 shadow-sm">
              <p className="text-center text-xs font-bold tracking-[0.14em] text-red-500 uppercase">
                {reviewing ? "Đã nộp bài" : "Thời gian còn lại"}
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
              <p className="mt-2 text-center text-xs text-gray-400">
                Tổng thời gian: {exam.durationMinutes} phút
              </p>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <p className="mb-3 text-sm font-bold text-gray-800">Danh sách câu hỏi</p>
              <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
                {questions.map((question, index) => {
                  const answered = isAnswered(question);
                  const isCurrent = index === currentIndex;
                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => goTo(index)}
                      className={`flex h-10 items-center justify-center rounded-lg text-sm font-bold transition ${
                        isCurrent
                          ? "bg-white text-blue-700 ring-2 ring-blue-500"
                          : answered
                            ? "bg-blue-600 text-white"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                      }`}
                    >
                      {index + 1}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-1.5 text-xs text-gray-500">
                <p>
                  <span className="mr-2 inline-block h-3 w-3 rounded bg-gray-100" />
                  Chưa trả lời
                </p>
                <p>
                  <span className="mr-2 inline-block h-3 w-3 rounded bg-blue-600" />
                  Đã trả lời
                </p>
                <p>
                  <span className="mr-2 inline-block h-3 w-3 rounded ring-2 ring-blue-500" />
                  Đang xem
                </p>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Bottom bar */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-gray-200 bg-white/95 px-3 py-3 shadow-[0_-8px_30px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => goTo(currentIndex - 1)}
            disabled={currentIndex === 0}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
            Câu trước
          </button>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {reviewing ? (
              <button
                type="button"
                onClick={() => setPhase("result")}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
              >
                <CheckCircle2 className="h-4 w-4" />
                Quay lại kết quả
              </button>
            ) : (
            <button
              type="button"
              onClick={handleSubmit}
              className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-red-700"
            >
              <CheckCircle2 className="h-4 w-4" />
              Nộp bài
            </button>
            )}
            <button
              type="button"
              onClick={() => goTo(currentIndex + 1)}
              disabled={currentIndex >= questions.length - 1}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Câu tiếp theo
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <button
            type="button"
            onClick={reviewing ? () => navigate("/") : handleExit}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-bold text-rose-600 transition hover:bg-rose-100"
          >
            <LogOut className="h-4 w-4" />
            {reviewing ? "Quay về Bảng điều khiển" : "Thoát bài thi"}
          </button>
        </div>
        <p className="mx-auto mt-1 max-w-7xl text-center text-[11px] text-gray-400 sm:text-left">
          Đang xem câu {currentIndex + 1}/{questions.length}
          {current
            ? ` · ${isAnswered(current) ? "Đã trả lời" : "Chưa trả lời"}`
            : ""}
        </p>
      </div>

      {/* Hidden link for a11y / fallback */}
      <Link to={`/exams/${exam.id}`} className="sr-only">
        Quay lại chi tiết đề
      </Link>
    </div>
  );
}

export default ExamTaking;
