import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import api from "../../api/client";

function FlashcardEmbed({ setId, title }) {
  const [cards, setCards] = useState([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [name, setName] = useState(title || "Thẻ ghi nhớ");

  useEffect(() => {
    if (!setId) return undefined;
    let cancelled = false;
    api
      .get(`/studysets/${setId}`)
      .then(({ data }) => {
        if (cancelled) return;
        const set = data.studySet || data;
        setName(set.title || title || "Thẻ ghi nhớ");
        setCards(set.cards || []);
      })
      .catch(() => {
        if (!cancelled) setCards([]);
      });
    return () => {
      cancelled = true;
    };
  }, [setId, title]);

  const card = cards[index];

  return (
    <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
      <p className="text-xs font-bold tracking-wide text-indigo-600 uppercase">{name}</p>
      {card ? (
        <>
          <button
            type="button"
            onClick={() => setFlipped((v) => !v)}
            className="mt-3 flex min-h-32 w-full items-center justify-center rounded-2xl bg-white px-4 py-6 text-center text-lg font-bold text-slate-900 shadow-sm ring-1 ring-indigo-100"
          >
            {flipped ? card.definition : card.term}
          </button>
          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
            <button type="button" onClick={() => { setIndex((i) => Math.max(0, i - 1)); setFlipped(false); }}>
              <ChevronLeft className="inline h-4 w-4" /> Trước
            </button>
            <span>
              {index + 1}/{cards.length} · bấm thẻ để lật
            </span>
            <button
              type="button"
              onClick={() => {
                setIndex((i) => Math.min(cards.length - 1, i + 1));
                setFlipped(false);
              }}
            >
              Sau <ChevronRight className="inline h-4 w-4" />
            </button>
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm text-slate-500">Chưa chọn bộ thẻ hoặc bộ thẻ trống.</p>
      )}
    </div>
  );
}

export default FlashcardEmbed;
