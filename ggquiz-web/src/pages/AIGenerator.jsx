import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Sparkles, Trash2, Wand2 } from "lucide-react";
import api, { getApiErrorMessage } from "../api/client";

function AIGenerator() {
  const navigate = useNavigate();
  const [text, setText] = useState("");
  const [title, setTitle] = useState("");
  const [cards, setCards] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleAnalyze = async () => {
    setError("");
    setSuccess("");
    setCards([]);
    setAnalyzing(true);

    try {
      const { data } = await api.post("/ai/generate", { text });
      setCards(
        (data.cards || []).map((card) => ({
          term: card.term || "",
          definition: card.definition || "",
        }))
      );
      setSuccess("AI đã tạo danh sách thẻ. Bạn có thể chỉnh sửa trước khi lưu.");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCardChange = (index, field, value) => {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, [field]: value } : card))
    );
  };

  const removeCard = (index) => {
    setCards((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setError("");
    setSuccess("");

    if (!title.trim()) {
      setError("Vui lòng nhập tiêu đề học phần trước khi lưu.");
      return;
    }

    const cleanedCards = cards
      .map((card) => ({
        term: String(card.term || "").trim(),
        definition: String(card.definition || "").trim(),
      }))
      .filter((card) => card.term && card.definition);

    if (cleanedCards.length === 0) {
      setError("Cần ít nhất một thẻ hợp lệ để lưu vào thư viện.");
      return;
    }

    setSaving(true);
    try {
      await api.post("/studysets", {
        title: title.trim(),
        description: "Được tạo tự động bằng Chức năng AI GGQuiz",
        cards: cleanedCards,
      });
      navigate("/library");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-950 px-8 py-8 text-white">
      <div className="mx-auto max-w-4xl">
        <section className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 p-[2px] shadow-[0_0_40px_rgba(168,85,247,0.35)]">
          <div className="rounded-3xl bg-slate-950/90 p-8 backdrop-blur">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold tracking-widest uppercase">
              <Sparkles className="h-3.5 w-3.5 text-yellow-300" />
              AI Generator
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Chức năng AI tạo Flashcard
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-200 md:text-base">
              Dán tài liệu học tập — AI giả lập sẽ tách câu và đề xuất thẻ thuật ngữ / định nghĩa
              để bạn chỉnh sửa rồi lưu vào thư viện.
            </p>
          </div>
        </section>

        <section className="mt-8 rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
          <label htmlFor="ai-text" className="mb-2 block text-sm font-semibold text-slate-200">
            Văn bản nguồn
          </label>
          <textarea
            id="ai-text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            rows={10}
            placeholder="Dán đoạn văn bản, tài liệu hoặc giáo trình của bạn vào đây..."
            className="w-full resize-y rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none placeholder:text-slate-500 focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40"
          />

          <button
            type="button"
            onClick={handleAnalyze}
            disabled={analyzing || !text.trim()}
            className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-4 text-base font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
          >
            {analyzing ? <Loader2 className="h-5 w-5 animate-spin" /> : <Wand2 className="h-5 w-5" />}
            {analyzing ? "Đang phân tích..." : "✨ Phân tích bằng AI"}
          </button>
        </section>

        {analyzing ? (
          <div className="mt-6 rounded-2xl border border-purple-400/30 bg-slate-900 p-6">
            <div className="mb-4 flex items-center gap-3 text-purple-200">
              <Loader2 className="h-5 w-5 animate-spin" />
              <p className="text-sm font-semibold">Trí tuệ nhân tạo đang phân tích tài liệu...</p>
            </div>
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse rounded-xl bg-slate-800 p-4">
                  <div className="mb-3 h-4 w-1/3 rounded bg-slate-700" />
                  <div className="h-4 w-2/3 rounded bg-slate-700" />
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6 rounded-xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mt-6 rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {success}
          </div>
        ) : null}

        {cards.length > 0 ? (
          <section className="mt-8 space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
              <label htmlFor="set-title" className="mb-2 block text-sm font-semibold text-slate-200">
                Tiêu đề học phần
              </label>
              <input
                id="set-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ví dụ: Tóm tắt chương 1 bằng AI"
                className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-400/40"
              />
            </div>

            {cards.map((card, index) => (
              <article
                key={`ai-card-${index}`}
                className="rounded-2xl border border-white/10 bg-slate-900/80 p-5"
              >
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-sm font-bold text-purple-300">Thẻ {index + 1}</span>
                  <button
                    type="button"
                    onClick={() => removeCard(index)}
                    className="rounded-lg p-2 text-slate-400 transition hover:bg-red-500/10 hover:text-red-300"
                    aria-label="Xóa thẻ"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <input
                      type="text"
                      value={card.term}
                      onChange={(event) => handleCardChange(index, "term", event.target.value)}
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-400"
                      placeholder="Thuật ngữ"
                    />
                    <p className="mt-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
                      Thuật ngữ
                    </p>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={card.definition}
                      onChange={(event) =>
                        handleCardChange(index, "definition", event.target.value)
                      }
                      className="w-full rounded-xl border border-white/10 bg-slate-950 px-4 py-3 text-white outline-none focus:border-purple-400"
                      placeholder="Định nghĩa"
                    />
                    <p className="mt-1.5 text-xs font-medium tracking-wide text-slate-400 uppercase">
                      Định nghĩa
                    </p>
                  </div>
                </div>
              </article>
            ))}

            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="w-full rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 px-6 py-4 text-base font-extrabold text-white shadow-lg transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Đang lưu vào thư viện..." : "Lưu vào Thư viện"}
            </button>
          </section>
        ) : null}
      </div>
    </div>
  );
}

export default AIGenerator;
