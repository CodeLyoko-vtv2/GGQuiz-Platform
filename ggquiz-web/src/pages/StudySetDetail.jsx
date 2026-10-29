import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Lightbulb,
  Pause,
  Play,
  Settings,
  Shuffle,
  Undo2,
  X,
} from "lucide-react";
import SpeakButton from "../components/SpeakButton";
import ContentActionsMenu from "../components/ContentActionsMenu";
import api, { getApiErrorMessage, getStoredUser } from "../api/client";
import { speakText, stopSpeaking } from "../utils/speech";

const AUTOPLAY_MS = 4000;
const BROWSE_SLIDE_MS = 280;
const recentViewPosts = new Map();

function recordStudySetViewOnce(id) {
  const key = String(id);
  const last = recentViewPosts.get(key);
  if (last && Date.now() - last < 15_000) return;
  recentViewPosts.set(key, Date.now());
  api.post(`/studysets/${id}/view`).catch(() => {});
}

function shuffleArray(items) {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

function buildHint(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 1) {
    return `${value.slice(0, Math.max(1, Math.ceil(value.length / 3)))}…`;
  }
  return `${words.slice(0, Math.min(2, words.length)).join(" ")}…`;
}

function stopCardFlip(event) {
  event.preventDefault();
  event.stopPropagation();
}

function FaceControls({ hintActive, onToggleHint, speakText, speakLabel }) {
  return (
    <div
      className="absolute inset-x-0 top-0 z-20 flex items-start justify-between gap-3 p-4"
      onClick={stopCardFlip}
      onMouseDown={stopCardFlip}
      onPointerDown={stopCardFlip}
      onKeyDown={stopCardFlip}
    >
      <button
        type="button"
        onClick={(event) => {
          stopCardFlip(event);
          onToggleHint();
        }}
        onMouseDown={stopCardFlip}
        onPointerDown={stopCardFlip}
        className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-sm transition ${
          hintActive
            ? "border-amber-300 bg-amber-50 text-amber-700"
            : "border-gray-200 bg-white/95 text-gray-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
        }`}
      >
        <Lightbulb className="h-4 w-4" />
        Hiển thị gợi ý
      </button>
      <SpeakButton text={speakText} label={speakLabel} />
    </div>
  );
}

function CardFaceBody({ text, image, imageAlt, hint, large }) {
  const textClass = large
    ? "text-3xl font-bold break-words text-gray-900 sm:text-4xl md:text-5xl"
    : "text-2xl font-semibold break-words text-gray-900 sm:text-3xl md:text-4xl";

  if (image) {
    return (
      <div className="grid h-full w-full grid-cols-2 items-center gap-4 px-6 pt-14 pb-12 sm:px-8">
        <div className="flex h-full items-center justify-center">
          <div className="max-w-full text-center">
            <p className={textClass}>{text}</p>
            {hint ? (
              <p className="mt-4 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700">
                {hint}
              </p>
            ) : null}
          </div>
        </div>
        <div className="flex h-full items-center justify-center">
          <div className="aspect-square w-full max-h-[70%] max-w-[280px] overflow-hidden rounded-2xl bg-gray-100 shadow-sm">
            <img
              src={image}
              alt={imageAlt}
              referrerPolicy="no-referrer"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full items-center justify-center px-10 pt-14 pb-12">
      <div className="flex max-w-[85%] flex-col items-center justify-center text-center">
        <p className={textClass}>{text}</p>
        {hint ? (
          <p className="mt-5 rounded-full bg-amber-50 px-4 py-1.5 text-sm font-medium text-amber-700">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function cardKey(card, fallbackIndex) {
  if (card?.id != null) return `id:${card.id}`;
  return `idx:${fallbackIndex}`;
}

function countByStatus(cardStatus, status) {
  return Object.values(cardStatus).filter((value) => value === status).length;
}

function getEndTitle(studyMode, knownPct) {
  if (studyMode === "browse") {
    return "Chúc mừng! Bạn đã ôn tập tất cả các thẻ.";
  }
  if (knownPct >= 100) {
    return "Chà, bạn nắm bài thật chắc! Bạn đã ghi nhớ tất cả các thẻ.";
  }
  if (knownPct >= 50) {
    return "Tuyệt vời! Bạn đã gần tới đích.";
  }
  return "Bạn đang có tiến bộ đấy! Hãy tiếp tục cho đến khi nắm rõ.";
}

function ProgressRing({ known, learning, total }) {
  const size = 196;
  const stroke = 18;
  const radius = (size - stroke) / 2;
  const circ = 2 * Math.PI * radius;
  const knownPct = total > 0 ? known / total : 0;
  const knownLen = knownPct * circ;
  const learningLen = total > 0 ? (learning / total) * circ : 0;
  const displayPct = total > 0 ? Math.round((known / total) * 100) : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="study-progress-ring shrink-0"
      aria-hidden="true"
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={stroke}
      />
      {learningLen > 0 ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#f43f5e"
          strokeWidth={stroke}
          strokeDasharray={`${learningLen} ${circ}`}
          strokeDashoffset={-knownLen}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
      {knownLen > 0 ? (
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth={stroke}
          strokeLinecap={knownPct >= 1 ? "butt" : "round"}
          strokeDasharray={`${knownLen} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      ) : null}
      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        dominantBaseline="central"
        className="fill-gray-900"
        style={{ fontSize: 36, fontWeight: 800 }}
      >
        {displayPct}%
      </text>
    </svg>
  );
}

function StudyEndScreen({
  studyMode,
  known,
  learning,
  total,
  onRestart,
  onBackToLast,
  onFocusLearning,
}) {
  const knownPct = total > 0 ? Math.round((known / total) * 100) : 0;
  const showFocus = studyMode === "classify" && learning > 0;

  return (
    <div className="study-end-screen relative rounded-3xl border border-gray-200 bg-white px-6 pt-10 pb-16 shadow-xl sm:px-10">
      <h2 className="text-center text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
        {getEndTitle(studyMode, knownPct)}
      </h2>

      <div className="mx-auto mt-8 flex max-w-xl flex-col items-center justify-center gap-8 sm:flex-row sm:items-center">
        <ProgressRing known={known} learning={learning} total={total} />
        <div className="min-w-[200px]">
          <p className="text-sm font-bold text-gray-900">Tiến độ của bạn</p>
          <ul className="mt-4 space-y-3">
            <li className="flex items-center justify-between gap-8 text-sm">
              <span className="inline-flex items-center gap-2 font-semibold text-emerald-700">
                <span className="h-3 w-3 rounded-full bg-emerald-500" />
                {studyMode === "browse" ? "Đã ôn" : "Đã biết"}
              </span>
              <span className="font-extrabold text-gray-900">{known}</span>
            </li>
            {studyMode === "classify" ? (
              <li className="flex items-center justify-between gap-8 text-sm">
                <span className="inline-flex items-center gap-2 font-semibold text-rose-600">
                  <span className="h-3 w-3 rounded-full bg-rose-500" />
                  Đang học
                </span>
                <span className="font-extrabold text-gray-900">{learning}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-8 flex w-full max-w-sm flex-col items-stretch gap-3">
        {showFocus ? (
          <button
            type="button"
            onClick={onFocusLearning}
            className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-purple-700"
          >
            Tập trung vào học {learning} thẻ
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRestart}
          className={`rounded-xl px-6 py-3 text-sm font-bold transition ${
            showFocus
              ? "border border-gray-200 bg-white text-gray-800 hover:border-purple-200 hover:bg-purple-50 hover:text-purple-700"
              : "bg-purple-600 text-white hover:bg-purple-700"
          }`}
        >
          Khởi động lại Thẻ ghi nhớ
        </button>
      </div>

      <button
        type="button"
        onClick={onBackToLast}
        className="absolute bottom-4 left-4 inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-semibold text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
      >
        <Undo2 className="h-4 w-4" />
        Quay lại thẻ cuối cùng
      </button>
    </div>
  );
}

function StudySetDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUser = useMemo(() => getStoredUser(), []);
  const classifyLockRef = useRef(false);
  const classifyHistoryRef = useRef([]);
  const originalOrderRef = useRef([]);
  const browseLockRef = useRef(false);
  const currentIndexRef = useRef(0);
  const totalRef = useRef(0);
  const studyModeRef = useRef("browse");
  const sortOpenRef = useRef(false);
  const settingsOpenRef = useRef(false);
  const roundDoneRef = useRef(false);

  const [studySet, setStudySet] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [showTermHint, setShowTermHint] = useState(false);
  const [showDefHint, setShowDefHint] = useState(false);
  const [shuffled, setShuffled] = useState(false);
  const [orderedCards, setOrderedCards] = useState([]);
  const [studyMode, setStudyMode] = useState("browse");
  const [sortOpen, setSortOpen] = useState(false);
  const [pendingMode, setPendingMode] = useState("browse");
  const [swipeDir, setSwipeDir] = useState(null);
  const [overlay, setOverlay] = useState(null);
  const [roundDone, setRoundDone] = useState(false);
  const [cardStatus, setCardStatus] = useState({});
  const [autoplay, setAutoplay] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [browseSlide, setBrowseSlide] = useState(null);
  const [browseBusy, setBrowseBusy] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [frontFace, setFrontFace] = useState("term");
  const [autoSpeak, setAutoSpeak] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchStudySet = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/studysets/${id}`);
        if (!cancelled) {
          setStudySet(data.studySet);
          setIsSaved(Boolean(data.studySet?.isSaved));
          const loadedCards = data.studySet?.cards || [];
          originalOrderRef.current = loadedCards;
          setOrderedCards(loadedCards);
          setCurrentIndex(0);
          setFlipped(false);
          setShowTermHint(false);
          setShowDefHint(false);
          setShuffled(false);
          setRoundDone(false);
          setCardStatus({});
          setAutoplay(false);
          classifyHistoryRef.current = [];
          setCanUndo(false);
          recordStudySetViewOnce(id);
        }
      } catch (err) {
        if (!cancelled) {
          const message = getApiErrorMessage(err);
          setError(message);
          toast.error(message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchStudySet();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const cards = orderedCards;
  const total = cards.length;
  const knownCount = countByStatus(cardStatus, "known");
  const learningCount = countByStatus(cardStatus, "learning");
  const sessionTotal = originalOrderRef.current.length || total;
  const currentCard = cards[currentIndex];
  currentIndexRef.current = currentIndex;
  totalRef.current = total;
  studyModeRef.current = studyMode;
  sortOpenRef.current = sortOpen;
  settingsOpenRef.current = settingsOpen;
  roundDoneRef.current = roundDone;
  const isOwner =
    currentUser?.id != null &&
    studySet?.userId != null &&
    Number(currentUser.id) === Number(studySet.userId);

  const resetFace = () => {
    setFlipped(false);
    setShowTermHint(false);
    setShowDefHint(false);
  };

  const browseTo = (nextIndex, direction) => {
    const tot = totalRef.current;
    const fromIndex = currentIndexRef.current;
    const finishRound =
      direction === "next" && tot > 0 && fromIndex >= tot - 1 && nextIndex >= tot;

    if (browseLockRef.current || classifyLockRef.current) return;
    if (!finishRound && (nextIndex < 0 || nextIndex >= tot || nextIndex === fromIndex)) {
      return;
    }

    browseLockRef.current = true;
    setBrowseBusy(true);
    stopSpeaking();
    setBrowseSlide(direction === "next" ? "out-left" : "out-right");

    window.setTimeout(() => {
      resetFace();
      if (finishRound) {
        setBrowseSlide(null);
        browseLockRef.current = false;
        setBrowseBusy(false);
        setAutoplay(false);
        setRoundDone(true);
        return;
      }
      setCurrentIndex(nextIndex);
      setBrowseSlide(direction === "next" ? "in-right" : "in-left");
      window.setTimeout(() => {
        setBrowseSlide(null);
        browseLockRef.current = false;
        setBrowseBusy(false);
      }, BROWSE_SLIDE_MS);
    }, BROWSE_SLIDE_MS);
  };

  const goPrev = () => {
    if (classifyLockRef.current || roundDoneRef.current) return;
    if (studyModeRef.current === "browse") {
      browseTo(currentIndexRef.current - 1, "prev");
      return;
    }
    if (currentIndexRef.current <= 0) return;
    stopSpeaking();
    resetFace();
    setCurrentIndex((prev) => prev - 1);
  };

  const goNext = () => {
    if (classifyLockRef.current || roundDoneRef.current) return;
    if (studyModeRef.current === "browse") {
      browseTo(currentIndexRef.current + 1, "next");
      return;
    }
    if (currentIndexRef.current >= totalRef.current - 1) return;
    stopSpeaking();
    resetFace();
    setCurrentIndex((prev) => prev + 1);
  };

  const goPrevRef = useRef(goPrev);
  const goNextRef = useRef(goNext);
  goPrevRef.current = goPrev;
  goNextRef.current = goNext;

  const classifyCard = (kind) => {
    if (classifyLockRef.current || !currentCard || roundDone) return;
    classifyLockRef.current = true;
    stopSpeaking();
    setOverlay(kind);
    setSwipeDir(kind === "known" ? "right" : "left");

    const fromIndex = currentIndex;
    const key = cardKey(currentCard, fromIndex);
    const prevStatus = cardStatus[key] || null;
    window.setTimeout(() => {
      const isLast = fromIndex >= total - 1;
      resetFace();
      setOverlay(null);
      setSwipeDir(null);
      classifyHistoryRef.current.push({ index: fromIndex, kind, cardKey: key, prevStatus });
      setCanUndo(true);
      setCardStatus((prev) => ({ ...prev, [key]: kind }));
      if (isLast) {
        setRoundDone(true);
      } else {
        setCurrentIndex(fromIndex + 1);
      }
      classifyLockRef.current = false;
    }, 620);
  };

  const classifyCardRef = useRef(classifyCard);
  classifyCardRef.current = classifyCard;

  const undoClassify = () => {
    if (classifyLockRef.current || classifyHistoryRef.current.length === 0) return;
    const previous = classifyHistoryRef.current.pop();
    setCanUndo(classifyHistoryRef.current.length > 0);
    if (previous.cardKey) {
      setCardStatus((prev) => {
        const next = { ...prev };
        if (previous.prevStatus) next[previous.cardKey] = previous.prevStatus;
        else delete next[previous.cardKey];
        return next;
      });
    }
    stopSpeaking();
    resetFace();
    setOverlay(null);
    setSwipeDir(null);
    setRoundDone(false);
    setCurrentIndex(previous.index);
  };

  useEffect(() => {
    if (!studySet) return undefined;

    const isTypingTarget = (target) => {
      const tag = String(target?.tagName || "").toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        Boolean(target?.isContentEditable)
      );
    };

    const onKeyDown = (event) => {
      if (isTypingTarget(event.target)) return;

      const isLeft = event.key === "ArrowLeft" || event.code === "ArrowLeft";
      const isRight = event.key === "ArrowRight" || event.code === "ArrowRight";
      const isSpace = event.key === " " || event.key === "Spacebar" || event.code === "Space";

      if (!isLeft && !isRight && !isSpace) return;
      if (totalRef.current === 0) return;

      event.preventDefault();
      event.stopPropagation();

      if (sortOpenRef.current || settingsOpenRef.current) return;
      if (roundDoneRef.current) return;

      if (isLeft || isRight) {
        if (studyModeRef.current === "classify") {
          classifyCardRef.current(isLeft ? "learning" : "known");
          return;
        }
        if (isLeft) goPrevRef.current();
        else goNextRef.current();
        return;
      }

      if (classifyLockRef.current || browseLockRef.current) return;
      stopSpeaking();
      setShowTermHint(false);
      setShowDefHint(false);
      setFlipped((value) => !value);
    };

    window.addEventListener("keydown", onKeyDown, { capture: true });
    return () => window.removeEventListener("keydown", onKeyDown, { capture: true });
  }, [studySet]);

  useEffect(() => {
    if (
      !autoplay ||
      studyMode !== "browse" ||
      roundDone ||
      sortOpen ||
      settingsOpen ||
      browseBusy ||
      total < 1
    ) {
      if (autoplay && (studyMode !== "browse" || roundDone)) {
        setAutoplay(false);
      }
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      browseTo(currentIndex + 1, "next");
    }, AUTOPLAY_MS);

    return () => window.clearTimeout(timerId);
  }, [autoplay, studyMode, currentIndex, total, roundDone, sortOpen, settingsOpen, flipped, browseBusy]);

  const termIsFront = frontFace === "term";
  const frontHintText = useMemo(
    () => buildHint(termIsFront ? currentCard?.definition : currentCard?.term),
    [currentCard, termIsFront]
  );
  const backHintText = useMemo(
    () => buildHint(termIsFront ? currentCard?.term : currentCard?.definition),
    [currentCard, termIsFront]
  );

  useEffect(() => {
    if (!autoSpeak || !currentCard || roundDone || browseBusy || settingsOpen) {
      return undefined;
    }
    const visibleText = flipped
      ? termIsFront
        ? currentCard.definition
        : currentCard.term
      : termIsFront
        ? currentCard.term
        : currentCard.definition;
    speakText(visibleText);
    return () => stopSpeaking();
  }, [autoSpeak, currentCard, currentIndex, flipped, termIsFront, roundDone, browseBusy, settingsOpen]);

  const handleDelete = async () => {
    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa học phần này?");
    if (!confirmed) return;

    setDeleting(true);
    try {
      await api.delete(`/studysets/${id}`);
      toast.success("Đã xóa học phần.");
      navigate("/flashcards");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setDeleting(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết!");
    } catch {
      toast.error("Không thể sao chép liên kết. Hãy thử lại.");
    }
  };

  const handleToggleSave = async () => {
    if (saving) return;
    setSaving(true);
    const prev = isSaved;
    setIsSaved(!prev);
    try {
      const { data } = await api.post(`/studysets/${id}/save`);
      setIsSaved(Boolean(data.isSaved));
      toast.success(data.isSaved ? "Đã lưu học phần" : "Đã bỏ lưu học phần");
    } catch (err) {
      setIsSaved(prev);
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleShuffle = () => {
    if (!studySet?.cards?.length) return;
    const nextOn = !shuffled;
    const nextCards = nextOn ? shuffleArray(studySet.cards) : [...studySet.cards];
    setShuffled(nextOn);
    originalOrderRef.current = nextCards;
    setOrderedCards(nextCards);
    setCurrentIndex(0);
    resetFace();
    setRoundDone(false);
    setCardStatus({});
    setAutoplay(false);
    classifyHistoryRef.current = [];
    setCanUndo(false);
    toast.success(nextOn ? "Đã xáo trộn thẻ" : "Đã tắt xáo trộn");
  };

  const resetProgressToFirstCard = () => {
    setOrderedCards(
      originalOrderRef.current.length
        ? [...originalOrderRef.current]
        : [...(studySet?.cards || [])]
    );
    setCurrentIndex(0);
    resetFace();
    setRoundDone(false);
    setCardStatus({});
    setOverlay(null);
    setSwipeDir(null);
    setAutoplay(false);
    classifyHistoryRef.current = [];
    setCanUndo(false);
    classifyLockRef.current = false;
  };

  const startSortMode = () => {
    setStudyMode(pendingMode);
    setSortOpen(false);
    resetProgressToFirstCard();
  };

  const restartRound = () => {
    resetProgressToFirstCard();
  };

  const backToLastCard = () => {
    if (studyMode === "classify") {
      undoClassify();
      return;
    }
    stopSpeaking();
    resetFace();
    setRoundDone(false);
    setAutoplay(false);
    setCurrentIndex(Math.max(0, totalRef.current - 1));
  };

  const focusLearningCards = () => {
    const source = originalOrderRef.current.length
      ? originalOrderRef.current
      : orderedCards;
    const nextCards = source.filter((card, index) => {
      return cardStatus[cardKey(card, index)] === "learning";
    });
    if (nextCards.length === 0) return;
    setOrderedCards(nextCards);
    setCurrentIndex(0);
    resetFace();
    setRoundDone(false);
    setOverlay(null);
    setSwipeDir(null);
    setAutoplay(false);
    classifyHistoryRef.current = [];
    setCanUndo(false);
    classifyLockRef.current = false;
  };

  const handleRestartFromSettings = () => {
    restartRound();
    setSettingsOpen(false);
    toast.success("Đã khởi động lại thẻ ghi nhớ");
  };

  if (loading) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">Đang tải học phần...</p>
      </div>
    );
  }

  if ((error && !studySet) || !studySet) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-red-600">
          {error || "Không tìm thấy học phần"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-8 py-8">
      <div className="mx-auto max-w-6xl">
        {error && studySet ? (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <section className="mb-12 grid items-stretch gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
          <div className="min-w-0">
            <div className="@container perspective-1000 relative mx-auto w-full max-w-4xl">
              <header className="mb-5">
                <div className="flex items-center justify-between gap-4">
                  <h1 className="min-w-0 text-3xl font-extrabold text-gray-900">
                    {studySet.title}
                  </h1>
                  <ContentActionsMenu
                    ariaLabel="Menu học phần"
                    isSaved={isSaved}
                    onToggleSave={handleToggleSave}
                    onShare={handleShare}
                    isOwner={isOwner}
                    editTo={`/edit-set/${id}`}
                    onDelete={handleDelete}
                    deleting={deleting}
                  />
                </div>
                {studySet.description ? (
                  <p className="mt-2 text-gray-600">{studySet.description}</p>
                ) : null}
                <p className="mt-2 text-sm text-gray-500">
                  {total} thuật ngữ · {studySet.user?.name || "Người dùng"}
                </p>
              </header>

              {total === 0 ? (
                <p className="text-center text-sm text-gray-500">
                  Học phần chưa có thẻ nào.
                </p>
              ) : roundDone ? (
                <StudyEndScreen
                  studyMode={studyMode}
                  known={studyMode === "browse" ? sessionTotal : knownCount}
                  learning={studyMode === "browse" ? 0 : learningCount}
                  total={sessionTotal}
                  onRestart={restartRound}
                  onBackToLast={backToLastCard}
                  onFocusLearning={focusLearningCards}
                />
              ) : (
                <>
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      if (classifyLockRef.current || roundDone || browseBusy) return;
                      stopSpeaking();
                      setShowTermHint(false);
                      setShowDefHint(false);
                      setFlipped((value) => !value);
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        if (classifyLockRef.current || roundDone || browseBusy) return;
                        stopSpeaking();
                        setShowTermHint(false);
                        setShowDefHint(false);
                        setFlipped((value) => !value);
                      }
                    }}
                    className={`relative aspect-video min-h-[400px] w-full cursor-pointer outline-none sm:min-h-[425px] md:min-h-[450px] ${
                      swipeDir === "left"
                        ? "study-card-swipe-left"
                        : swipeDir === "right"
                          ? "study-card-swipe-right"
                          : browseSlide === "out-left"
                            ? "study-card-browse-out-left"
                            : browseSlide === "out-right"
                              ? "study-card-browse-out-right"
                              : browseSlide === "in-left"
                                ? "study-card-browse-in-left"
                                : browseSlide === "in-right"
                                  ? "study-card-browse-in-right"
                                  : ""
                    }`}
                    aria-label="Lật thẻ"
                  >
                    <div
                      key={currentIndex}
                      className={`flashcard-inner ${flipped ? "is-flipped" : ""}`}
                    >
                      <div className="flashcard-face flashcard-face-front overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-xl">
                        <FaceControls
                          hintActive={showTermHint}
                          onToggleHint={() => setShowTermHint((value) => !value)}
                          speakText={termIsFront ? currentCard.term : currentCard.definition}
                          speakLabel={
                            termIsFront
                              ? "Phát âm thanh cho thuật ngữ này"
                              : "Phát âm thanh cho định nghĩa này"
                          }
                        />
                        <CardFaceBody
                          text={termIsFront ? currentCard.term : currentCard.definition}
                          image={termIsFront ? currentCard.termImage : currentCard.image}
                          imageAlt={termIsFront ? currentCard.term : currentCard.definition}
                          hint={
                            showTermHint && frontHintText
                              ? termIsFront
                                ? `Gợi ý định nghĩa: ${frontHintText}`
                                : `Gợi ý thuật ngữ: ${frontHintText}`
                              : null
                          }
                          large
                        />
                      </div>

                      <div className="flashcard-face flashcard-face-back overflow-hidden rounded-3xl border border-purple-200 bg-purple-50 shadow-xl">
                        <FaceControls
                          hintActive={showDefHint}
                          onToggleHint={() => setShowDefHint((value) => !value)}
                          speakText={termIsFront ? currentCard.definition : currentCard.term}
                          speakLabel={
                            termIsFront
                              ? "Phát âm thanh cho định nghĩa này"
                              : "Phát âm thanh cho thuật ngữ này"
                          }
                        />
                        <CardFaceBody
                          text={termIsFront ? currentCard.definition : currentCard.term}
                          image={termIsFront ? currentCard.image : currentCard.termImage}
                          imageAlt={termIsFront ? currentCard.definition : currentCard.term}
                          hint={
                            showDefHint && backHintText
                              ? termIsFront
                                ? `Gợi ý thuật ngữ: ${backHintText}`
                                : `Gợi ý định nghĩa: ${backHintText}`
                              : null
                          }
                        />
                      </div>
                    </div>

                    {overlay ? (
                      <div
                        className={`study-classify-overlay pointer-events-none absolute inset-0 z-30 flex items-center justify-center rounded-3xl ${
                          overlay === "known" ? "bg-emerald-500/90" : "bg-rose-500/90"
                        }`}
                      >
                        <p className="text-4xl font-black tracking-wide text-white uppercase sm:text-5xl">
                          {overlay === "known" ? "Đã biết" : "Đang học"}
                        </p>
                      </div>
                    ) : null}

                  </div>

                  <div className="mt-6 grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 @[520px]:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] @[520px]:gap-4">
                  <div className="justify-self-start">
                    <button
                      type="button"
                      onClick={() => {
                        setPendingMode(studyMode);
                        setSortOpen(true);
                      }}
                      title="Chọn cách phân loại"
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-semibold text-gray-700 shadow-sm transition hover:border-purple-200 hover:text-purple-700 sm:px-4"
                    >
                      <Filter className="h-4 w-4 shrink-0" />
                      <span className="hidden whitespace-nowrap @[520px]:inline">
                        Chọn cách phân loại
                      </span>
                    </button>
                  </div>

                  <div className="flex items-center justify-center gap-3 @[520px]:gap-4">
                    {studyMode === "browse" ? (
                      <button
                        type="button"
                        onClick={goPrev}
                        disabled={currentIndex === 0 || roundDone || browseBusy}
                        className="rounded-full p-2.5 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Thẻ trước"
                      >
                        <ChevronLeft className="h-7 w-7" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => classifyCard("learning")}
                        disabled={roundDone}
                        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-rose-400 bg-white text-rose-500 shadow-sm transition hover:bg-rose-50 disabled:opacity-40"
                        aria-label="Đang học"
                        title="Đang học"
                      >
                        <X className="h-6 w-6" strokeWidth={2.5} />
                      </button>
                    )}

                    <span className="min-w-14 text-center text-sm font-semibold text-gray-700">
                      {Math.min(currentIndex + 1, total)}/{total}
                    </span>

                    {studyMode === "browse" ? (
                      <button
                        type="button"
                        onClick={goNext}
                        disabled={roundDone || browseBusy}
                        className="rounded-full p-2.5 text-gray-500 transition hover:bg-purple-50 hover:text-purple-600 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Thẻ sau"
                      >
                        <ChevronRight className="h-7 w-7" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => classifyCard("known")}
                        disabled={roundDone}
                        className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-emerald-400 bg-white text-emerald-600 shadow-sm transition hover:bg-emerald-50 disabled:opacity-40"
                        aria-label="Đã biết"
                        title="Đã biết"
                      >
                        <Check className="h-6 w-6" strokeWidth={2.5} />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-1 @[520px]:gap-2">
                    {studyMode === "browse" ? (
                      <button
                        type="button"
                        onClick={() => setAutoplay((playing) => !playing)}
                        disabled={roundDone || total < 1}
                        className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                          autoplay
                            ? "bg-purple-100 text-purple-700"
                            : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                        } disabled:cursor-not-allowed disabled:opacity-40`}
                        aria-label={autoplay ? "Tạm dừng tự chuyển thẻ" : "Tự động chuyển thẻ"}
                        title={autoplay ? "Tạm dừng" : "Phát"}
                      >
                        {autoplay ? (
                          <Pause className="h-5 w-5" />
                        ) : (
                          <Play className="h-5 w-5 translate-x-[1px]" />
                        )}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={undoClassify}
                        disabled={!canUndo || Boolean(swipeDir)}
                        className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800 disabled:cursor-not-allowed disabled:opacity-40"
                        aria-label="Hoàn tác thẻ vừa phân loại"
                        title="Quay lại"
                      >
                        <Undo2 className="h-5 w-5" />
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleShuffle}
                      className={`flex h-11 w-11 items-center justify-center rounded-full transition ${
                        shuffled
                          ? "bg-purple-100 text-purple-700"
                          : "text-gray-500 hover:bg-gray-100 hover:text-gray-800"
                      }`}
                      aria-label="Xáo trộn thẻ"
                      title="Xáo trộn thẻ"
                    >
                      <Shuffle className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSettingsOpen(true)}
                      className="flex h-11 w-11 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                      aria-label="Tùy chọn"
                      title="Tùy chọn"
                    >
                      <Settings className="h-5 w-5" />
                    </button>
                  </div>
                  </div>
                </>
              )}
            </div>
          </div>

              <aside className="flex h-full min-h-[280px] items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-5 py-10 text-center xl:min-h-full">
                <div>
                  <p className="text-xs font-bold tracking-[0.2em] text-slate-400 uppercase">
                    Ad Space
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Không gian Quảng cáo
                  </p>
                </div>
              </aside>
            </section>

            {total > 0 ? (
            <section>
              <h2 className="mb-4 text-lg font-bold text-gray-900">Danh sách thuật ngữ</h2>
              <div className="space-y-3">
                {cards.map((card, index) => (
                  <div
                    key={card.id}
                    className="rounded-xl border border-gray-200 bg-white px-5 py-4"
                  >
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="flex min-h-[88px] flex-col">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                            {index + 1}. Thuật ngữ
                          </p>
                          <SpeakButton
                            text={card.term}
                            label="Phát âm thanh cho thuật ngữ này"
                            className="h-8 w-8"
                            iconClassName="h-3.5 w-3.5"
                          />
                        </div>
                        <div
                          className={`flex flex-1 items-center ${
                            card.termImage ? "gap-4" : ""
                          }`}
                        >
                          <p className="min-w-0 flex-1 font-medium text-gray-900">
                            {card.term}
                          </p>
                          {card.termImage ? (
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                              <img
                                src={card.termImage}
                                alt={card.term}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                      <div className="flex min-h-[88px] flex-col">
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <p className="text-[11px] font-semibold tracking-wide text-gray-400 uppercase">
                            Định nghĩa
                          </p>
                          <SpeakButton
                            text={card.definition}
                            label="Phát âm thanh cho định nghĩa này"
                            className="h-8 w-8"
                            iconClassName="h-3.5 w-3.5"
                          />
                        </div>
                        <div
                          className={`flex flex-1 items-center ${
                            card.image ? "gap-4" : ""
                          }`}
                        >
                          <p className="min-w-0 flex-1 text-gray-700">{card.definition}</p>
                          {card.image ? (
                            <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-gray-200 bg-gray-100">
                              <img
                                src={card.image}
                                alt={card.definition}
                                referrerPolicy="no-referrer"
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
            ) : null}
      </div>

      {sortOpen ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4">
          <div className="study-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-extrabold text-gray-900">
                  Chọn cách phân loại
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Chọn cách bạn muốn học bộ thẻ này.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSortOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              <button
                type="button"
                onClick={() => setPendingMode("browse")}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  pendingMode === "browse"
                    ? "border-purple-400 bg-purple-50 ring-2 ring-purple-100"
                    : "border-gray-200 hover:border-purple-200"
                }`}
              >
                <p className="text-sm font-bold text-gray-900">Duyệt từ vựng</p>
                <p className="mt-1 text-xs text-gray-500">
                  Dùng mũi tên trái/phải để xem lần lượt từng thẻ.
                </p>
              </button>
              <button
                type="button"
                onClick={() => setPendingMode("classify")}
                className={`w-full rounded-xl border px-4 py-3 text-left transition ${
                  pendingMode === "classify"
                    ? "border-purple-400 bg-purple-50 ring-2 ring-purple-100"
                    : "border-gray-200 hover:border-purple-200"
                }`}
              >
                <p className="text-sm font-bold text-gray-900">Phân loại cơ bản</p>
                <p className="mt-1 text-xs text-gray-500">
                  Vuốt thẻ: X đỏ = Đang học, dấu tích xanh = Đã biết.
                </p>
              </button>
            </div>

            <button
              type="button"
              onClick={startSortMode}
              className="mt-5 w-full rounded-xl bg-purple-600 py-3 text-sm font-bold text-white hover:bg-purple-700"
            >
              Bắt đầu
            </button>
          </div>
        </div>
      ) : null}

      {settingsOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/40 px-4"
          onClick={() => setSettingsOpen(false)}
        >
          <div
            className="study-modal-panel w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <h2 className="text-lg font-extrabold text-gray-900">Tùy chọn</h2>
              <button
                type="button"
                onClick={() => setSettingsOpen(false)}
                className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700"
                aria-label="Đóng"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <p className="text-sm font-bold text-gray-900">Hiển thị mặt trước</p>
                <p className="mt-1 text-xs text-gray-500">
                  Chọn mặt thẻ hiện lên trước khi lật.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFrontFace("term");
                      resetFace();
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      frontFace === "term"
                        ? "border-purple-400 bg-purple-50 text-purple-700 ring-2 ring-purple-100"
                        : "border-gray-200 text-gray-700 hover:border-purple-200"
                    }`}
                  >
                    Thuật ngữ
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setFrontFace("definition");
                      resetFace();
                    }}
                    className={`rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                      frontFace === "definition"
                        ? "border-purple-400 bg-purple-50 text-purple-700 ring-2 ring-purple-100"
                        : "border-gray-200 text-gray-700 hover:border-purple-200"
                    }`}
                  >
                    Định nghĩa
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 px-4 py-3">
                <div>
                  <p className="text-sm font-bold text-gray-900">
                    Chuyển văn bản thành lời nói
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">Đọc tự động mặt thẻ đang xem</p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={autoSpeak}
                  onClick={() => {
                    setAutoSpeak((value) => {
                      const next = !value;
                      if (!next) stopSpeaking();
                      return next;
                    });
                  }}
                  className={`relative h-7 w-12 shrink-0 rounded-full transition ${
                    autoSpeak ? "bg-purple-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition ${
                      autoSpeak ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>

              <button
                type="button"
                onClick={handleRestartFromSettings}
                className="w-full rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-600 transition hover:bg-red-100"
              >
                Khởi động lại Thẻ ghi nhớ
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export default StudySetDetail;
