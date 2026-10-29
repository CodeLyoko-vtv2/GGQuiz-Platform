import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { RotateCcw, Trophy, Zap } from "lucide-react";
import api, { getApiErrorMessage } from "../api/client";
import {
  playCorrectSound,
  playVictorySound,
  playWrongSound,
} from "../utils/audio";

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function buildQuizQuestions(cards) {
  if (!Array.isArray(cards) || cards.length === 0) {
    return [];
  }

  const uniqueDefs = [...new Set(cards.map((card) => card.definition).filter(Boolean))];
  const fillers = ["Không có dữ liệu", "Đáp án phụ A", "Đáp án phụ B", "Đáp án phụ C"];

  return shuffle(cards).map((card) => {
    const distractors = shuffle(
      uniqueDefs.filter((definition) => definition !== card.definition)
    ).slice(0, 3);

    while (distractors.length < 3) {
      const filler = fillers[distractors.length % fillers.length];
      if (!distractors.includes(filler) && filler !== card.definition) {
        distractors.push(filler);
      } else {
        distractors.push(`Lựa chọn ${distractors.length + 1}`);
      }
    }

    const options = shuffle([card.definition, ...distractors.slice(0, 3)]);

    return {
      id: card.id,
      term: card.term,
      correctAnswer: card.definition,
      options,
    };
  });
}

function QuizMode() {
  const { id } = useParams();
  const navigate = useNavigate();
  const advanceTimerRef = useRef(null);
  const resultSavedRef = useRef(false);
  const victoryPlayedRef = useRef(false);

  const [studySet, setStudySet] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState(null);
  const [finished, setFinished] = useState(false);
  const [saveStatus, setSaveStatus] = useState("");
  const [combo, setCombo] = useState(0);

  const clearAdvanceTimer = () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  };

  const startQuiz = useCallback((setData) => {
    clearAdvanceTimer();
    resultSavedRef.current = false;
    victoryPlayedRef.current = false;
    setStudySet(setData);
    setQuestions(buildQuizQuestions(setData.cards || []));
    setCurrentIndex(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
    setSaveStatus("");
    setCombo(0);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchStudySet = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/studysets/${id}`);
        if (!cancelled) {
          startQuiz(data.studySet);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchStudySet();

    return () => {
      cancelled = true;
      clearAdvanceTimer();
    };
  }, [id, startQuiz]);

  const total = questions.length;
  const currentQuestion = questions[currentIndex];
  const progressPercent = total === 0 ? 0 : ((currentIndex + 1) / total) * 100;
  const accuracy = useMemo(() => {
    if (total === 0) return 0;
    return Math.round((score / total) * 100);
  }, [score, total]);

  useEffect(() => {
    if (!finished || total === 0 || resultSavedRef.current) return;

    resultSavedRef.current = true;
    setSaveStatus("Đang lưu điểm lên bảng xếp hạng...");

    if (!victoryPlayedRef.current) {
      victoryPlayedRef.current = true;
      playVictorySound();
    }

    api
      .post(`/studysets/${id}/results`, {
        score,
        totalQuestions: total,
        accuracy,
      })
      .then(() => {
        setSaveStatus("Đã lưu điểm vào bảng xếp hạng!");
      })
      .catch((err) => {
        resultSavedRef.current = false;
        setSaveStatus(getApiErrorMessage(err));
      });
  }, [finished, score, total, accuracy, id]);

  const handleSelect = (option) => {
    if (selected !== null || finished || !currentQuestion) return;

    const isCorrect = option === currentQuestion.correctAnswer;
    setSelected(option);

    if (isCorrect) {
      playCorrectSound();
      setScore((prev) => prev + 1);
      setCombo((prev) => prev + 1);
    } else {
      playWrongSound();
      setCombo(0);
    }

    clearAdvanceTimer();
    advanceTimerRef.current = window.setTimeout(() => {
      if (currentIndex >= total - 1) {
        setFinished(true);
        setSelected(null);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setSelected(null);
      }
    }, 1500);
  };

  const handleRetry = () => {
    if (!studySet) return;
    startQuiz(studySet);
  };

  if (loading) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">Đang chuẩn bị bài luyện thi...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-red-600">{error}</p>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="bg-gray-50 px-8 py-12 text-center">
        <p className="text-sm text-gray-500">Học phần chưa có thẻ để luyện thi.</p>
        <Link
          to={`/set/${id}`}
          className="mt-4 inline-block font-semibold text-purple-600 hover:text-purple-700"
        >
          Quay về Học phần
        </Link>
      </div>
    );
  }

  if (finished) {
    return (
      <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center bg-gray-50 px-8 py-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-lg rounded-2xl border border-gray-200 bg-white p-10 text-center shadow-lg"
        >
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-100">
            <Trophy className="h-10 w-10 text-yellow-500" />
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Hoàn thành!</h1>
          <p className="mt-2 text-sm text-gray-500">{studySet?.title}</p>

          <div className="mt-8 grid grid-cols-2 gap-4">
            <div className="rounded-2xl bg-purple-50 px-4 py-5">
              <p className="text-xs font-bold tracking-wide text-purple-600 uppercase">Điểm số</p>
              <p className="mt-2 text-3xl font-black text-gray-900">
                {score}/{total}
              </p>
            </div>
            <div className="rounded-2xl bg-green-50 px-4 py-5">
              <p className="text-xs font-bold tracking-wide text-green-600 uppercase">
                Độ chính xác
              </p>
              <p className="mt-2 text-3xl font-black text-gray-900">{accuracy}%</p>
            </div>
          </div>

          {saveStatus ? (
            <p className="mt-4 text-sm font-medium text-purple-600">{saveStatus}</p>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 font-bold text-white transition hover:bg-purple-700"
            >
              <RotateCcw className="h-4 w-4" />
              Thi lại
            </button>
            <button
              type="button"
              onClick={() => navigate(`/set/${id}`)}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-5 py-3 font-bold text-gray-800 transition hover:bg-gray-50"
            >
              Quay về Học phần
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-8 py-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-between text-sm font-semibold text-gray-600">
          <span className="inline-flex items-center gap-2">
            <Zap className="h-4 w-4 text-purple-600" />
            Luyện thi
          </span>
          <span>
            {currentIndex + 1}/{total}
          </span>
        </div>

        <div className="mb-6 h-2.5 overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full rounded-full bg-purple-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {combo >= 3 ? (
          <div className="mb-4 flex justify-center">
            <div className="animate-bounce rounded-full bg-gradient-to-r from-red-500 via-orange-500 to-amber-400 px-5 py-2 text-sm font-black tracking-wide text-white uppercase shadow-[0_0_24px_rgba(249,115,22,0.55)]">
              🔥 ON FIRE! WINSTREAK x{combo}
            </div>
          </div>
        ) : null}

        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          <p className="text-xs font-bold tracking-widest text-purple-600 uppercase">
            Thuật ngữ nghĩa là gì?
          </p>
          <h2 className="mt-3 text-3xl font-extrabold text-gray-900">{currentQuestion.term}</h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {currentQuestion.options.map((option, index) => {
            let stateClass =
              "border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50";

            if (selected !== null) {
              if (option === currentQuestion.correctAnswer) {
                stateClass = "border-green-500 bg-green-50 text-green-800";
              } else if (option === selected) {
                stateClass = "border-red-500 bg-red-50 text-red-800";
              } else {
                stateClass = "border-gray-200 bg-gray-50 text-gray-400";
              }
            }

            return (
              <motion.button
                key={`${currentQuestion.id}-${option}`}
                type="button"
                disabled={selected !== null}
                onClick={() => handleSelect(option)}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.25 }}
                className={`rounded-2xl border-2 px-5 py-6 text-left text-base font-semibold transition disabled:cursor-default ${stateClass}`}
              >
                {option}
              </motion.button>
            );
          })}
        </div>

        {selected !== null ? (
          <p className="mt-5 text-center text-sm font-medium text-gray-500">
            {selected === currentQuestion.correctAnswer
              ? "Chính xác! Chuyển câu tiếp theo..."
              : "Chưa đúng. Đáp án đúng đã được tô xanh..."}
          </p>
        ) : null}
      </div>
    </div>
  );
}

export default QuizMode;
