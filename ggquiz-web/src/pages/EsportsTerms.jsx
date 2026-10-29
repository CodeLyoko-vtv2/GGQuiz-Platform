import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeft, Flame, Gamepad2, Sparkles, Star, Swords } from "lucide-react";
import { ESPORTS_SETS, getEsportsSetById } from "../data/esportsSets";

function setIcon(set) {
  if (set.slug === "lol") return <Swords className="h-5 w-5" />;
  if (set.slug === "valorant") return <Gamepad2 className="h-5 w-5" />;
  return <Star className="h-5 w-5 fill-yellow-300 text-yellow-300" />;
}

function EsportsTerms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeSet, setActiveSet] = useState(null);

  useEffect(() => {
    const setId = searchParams.get("set");
    if (setId) {
      const found = getEsportsSetById(setId);
      setActiveSet(found);
    } else {
      setActiveSet(null);
    }
  }, [searchParams]);

  const openSet = (set) => {
    setActiveSet(set);
    setSearchParams({ set: String(set.id) }, { replace: false });
  };

  const closeSet = () => {
    setActiveSet(null);
    setSearchParams({}, { replace: false });
  };

  if (activeSet) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-slate-900 px-8 py-8 text-white">
        <div className="mx-auto max-w-4xl">
          <button
            type="button"
            onClick={closeSet}
            className="mb-6 inline-flex items-center gap-2 text-sm font-semibold text-purple-300 transition hover:text-purple-200"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại Từ điển Esports
          </button>

          <div
            className={`mb-8 rounded-2xl bg-gradient-to-r ${activeSet.accent} p-[2px] shadow-xl ${activeSet.glow}`}
          >
            <div className="rounded-2xl bg-slate-950 px-6 py-5">
              <p className="text-xs font-bold tracking-[0.2em] text-purple-300 uppercase">
                {activeSet.game}
              </p>
              <h1 className="mt-2 text-3xl font-black">{activeSet.title}</h1>
              <p className="mt-2 text-sm text-slate-300">
                {activeSet.cards.length} thuật ngữ demo cho hội đồng
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {activeSet.cards.map((card, index) => (
              <div
                key={card.term}
                className="grid grid-cols-1 gap-3 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-4 md:grid-cols-2"
              >
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-purple-300 uppercase">
                    {index + 1}. Thuật ngữ
                  </p>
                  <p className="text-lg font-bold text-white">{card.term}</p>
                </div>
                <div>
                  <p className="mb-1 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
                    Định nghĩa
                  </p>
                  <p className="text-slate-200">{card.definition}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-slate-900 px-8 py-8 text-white">
      <div className="mx-auto max-w-5xl">
        <section className="relative overflow-hidden rounded-3xl border border-purple-500/40 bg-slate-950 p-8 shadow-[0_0_40px_rgba(168,85,247,0.35)]">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-purple-600/30 via-fuchsia-500/10 to-orange-500/20" />
          <div className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rounded-full bg-purple-500/30 blur-3xl" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-purple-400/40 bg-purple-500/10 px-3 py-1 text-xs font-bold tracking-widest text-purple-200 uppercase">
              <Flame className="h-3.5 w-3.5 text-orange-400" />
              GGQuiz Special Module
            </div>
            <h1 className="text-3xl font-black tracking-tight md:text-4xl">
              Từ điển Thuật ngữ{" "}
              <span className="bg-gradient-to-r from-purple-300 via-fuchsia-300 to-orange-300 bg-clip-text text-transparent">
                Esports
              </span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-300 md:text-base">
              Bộ sưu tập thuật ngữ thi đấu chuẩn meta — phong cách gaming neon, phục vụ
              demo đồ án.
            </p>
            <div className="mt-5 flex items-center gap-3 text-sm text-slate-400">
              <Sparkles className="h-4 w-4 text-yellow-300" />
              3 bộ thẻ đặc trưng: LoL · Valorant · CS:GO
            </div>
          </div>
        </section>

        <section className="mt-8 grid grid-cols-1 gap-5 md:grid-cols-3">
          {ESPORTS_SETS.map((set) => (
            <button
              key={set.id}
              type="button"
              onClick={() => openSet(set)}
              className={`group rounded-2xl bg-gradient-to-br ${set.accent} p-[2px] text-left shadow-lg transition hover:scale-[1.02] ${set.glow}`}
            >
              <div className="h-full rounded-2xl bg-slate-950 p-5">
                <div className="mb-4 flex items-center justify-between">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-800 text-purple-300">
                    {setIcon(set)}
                  </span>
                  <span className="text-xs font-bold tracking-wide text-slate-400 uppercase">
                    {set.cards.length} terms
                  </span>
                </div>
                <h2 className="text-lg font-extrabold text-white group-hover:text-purple-200">
                  {set.title}
                </h2>
                <p className="mt-2 text-sm text-slate-400">{set.game}</p>
                <p className="mt-4 text-xs font-semibold text-purple-300">Xem nhanh →</p>
              </div>
            </button>
          ))}
        </section>
      </div>
    </div>
  );
}

export default EsportsTerms;
