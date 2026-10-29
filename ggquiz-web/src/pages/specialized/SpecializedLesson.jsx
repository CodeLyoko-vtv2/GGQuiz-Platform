import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2, RotateCcw, Send, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";
import { useUserSettings } from "../../context/UserSettingsContext";

function FlashCard({ item }) {
  const [flipped, setFlipped] = useState(false);
  return (
    <button
      type="button"
      onClick={() => setFlipped((prev) => !prev)}
      className={`spec-flip ${flipped ? "spec-flip--on" : ""} w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-left`}
    >
      <p className="text-[10px] font-bold tracking-[0.16em] text-amber-200/50 uppercase">
        {flipped ? "Nghĩa" : "Thuật ngữ"}
      </p>
      <p className="mt-1 text-base font-bold text-amber-50">{flipped ? item.meaning : item.term}</p>
      {flipped && item.example ? (
        <p className="mt-2 text-sm italic text-amber-100/55">“{item.example}”</p>
      ) : (
        <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-amber-100/35">
          <RotateCcw className="h-3 w-3" />
          Chạm để lật
        </p>
      )}
    </button>
  );
}

function SpecializedLesson() {
  const { fieldId, lessonId } = useParams();
  const navigate = useNavigate();
  const { openModal } = useUserSettings();
  const [lesson, setLesson] = useState(null);
  const [field, setField] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [completing, setCompleting] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    api
      .get(`/specialized/lessons/${lessonId}`)
      .then(({ data }) => {
        if (!alive) return;
        setLesson(data.lesson);
        setField(data.field);
        setMessages([
          {
            role: "assistant",
            content: data.lesson.scenarioTitle
              ? `Tình huống: ${data.lesson.scenarioTitle}. Hãy bắt đầu bằng tiếng Anh, cố dùng các từ bên trái.`
              : "Hãy bắt đầu tình huống bằng tiếng Anh.",
          },
        ]);
      })
      .catch((err) => {
        if (!alive) return;
        const code = err.response?.data?.code;
        if (code === "PREMIUM_REQUIRED") {
          openModal("premium");
          navigate(`/specialized/${fieldId}`, { replace: true });
          return;
        }
        if (code === "LOCKED") {
          toast.error("Hãy hoàn thành bài trước đó.");
          navigate(`/specialized/${fieldId}`, { replace: true });
          return;
        }
        setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
    // openModal/navigate are stable enough for this screen; avoid resetting chat on settings refresh
  }, [lessonId, fieldId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  const send = async (event) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || sending) return;
    setDraft("");
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setSending(true);
    try {
      const { data } = await api.post(`/specialized/lessons/${lessonId}/chat`, {
        message: text,
        history: next.filter((item) => item.role !== "system").slice(-10),
      });
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSending(false);
    }
  };

  const complete = async () => {
    setCompleting(true);
    try {
      await api.post(`/specialized/lessons/${lessonId}/complete`);
      toast.success("Đã mở khóa bài tiếp theo");
      navigate(`/specialized/${field?.slug || fieldId}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="spec-stars grid min-h-screen place-items-center text-amber-100/60">
        Đang mở phòng học...
      </div>
    );
  }

  if (error || !lesson) {
    return (
      <div className="spec-stars grid min-h-screen place-items-center text-rose-300">
        {error || "Không tìm thấy bài học"}
      </div>
    );
  }

  return (
    <div className="spec-stars min-h-screen text-amber-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            to={`/specialized/${field?.slug || fieldId}`}
            className="inline-flex items-center gap-2 text-sm text-amber-100/70 hover:text-amber-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Về bản đồ
          </Link>
          <div className="text-right">
            <p className="text-[11px] tracking-[0.18em] text-amber-200/50 uppercase">{field?.name}</p>
            <h1 className="text-xl font-black">{lesson.title}</h1>
          </div>
        </div>

        <div className="grid min-h-[70vh] gap-5 lg:grid-cols-[0.9fr_1.2fr]">
          <section className="rounded-[28px] border border-white/10 bg-black/25 p-5 backdrop-blur-md">
            <p className="mb-4 text-xs font-bold tracking-[0.2em] text-amber-200/55 uppercase">
              Học thuật ngữ
            </p>
            <div className="space-y-3">
              {(lesson.vocab || []).map((item) => (
                <FlashCard key={item.term} item={item} />
              ))}
            </div>
          </section>

          <section className="flex min-h-[520px] flex-col rounded-[28px] border border-amber-200/15 bg-black/35 p-5 backdrop-blur-md">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <p className="inline-flex items-center gap-1 text-xs font-bold tracking-[0.2em] text-amber-200/70 uppercase">
                  <Sparkles className="h-3.5 w-3.5" />
                  Tình huống với AI
                </p>
                <p className="mt-1 text-sm text-amber-100/70">{lesson.scenarioTitle}</p>
              </div>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto pr-1">
              {messages.map((item, index) => (
                <div
                  key={`${item.role}-${index}`}
                  className={`max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    item.role === "user"
                      ? "ml-auto bg-amber-300 text-amber-950"
                      : "bg-white/10 text-amber-50"
                  }`}
                >
                  {item.content}
                </div>
              ))}
              {sending ? <p className="text-xs text-amber-100/40">AI đang trả lời...</p> : null}
              <div ref={bottomRef} />
            </div>

            <form onSubmit={send} className="mt-4 flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Trả lời bằng tiếng Anh..."
                className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-amber-50 outline-none placeholder:text-amber-100/30 focus:border-amber-300/40"
              />
              <button
                type="submit"
                disabled={sending || !draft.trim()}
                className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-300 text-amber-950 disabled:opacity-40"
              >
                {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </button>
            </form>
          </section>
        </div>

        <div className="flex justify-end pb-6">
          <button
            type="button"
            onClick={complete}
            disabled={completing}
            className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-3 text-sm font-bold text-emerald-950 hover:bg-emerald-300 disabled:opacity-50"
          >
            {completing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            Hoàn thành bài học
          </button>
        </div>
      </div>
    </div>
  );
}

export default SpecializedLesson;
