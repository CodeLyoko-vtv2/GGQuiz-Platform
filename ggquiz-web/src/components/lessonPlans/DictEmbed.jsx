import { useEffect, useState } from "react";
import { Languages } from "lucide-react";
import api from "../../api/client";

function DictEmbed() {
  const [query, setQuery] = useState("");
  const [hints, setHints] = useState([]);
  const [result, setResult] = useState("");

  useEffect(() => {
    if (query.trim().length < 2) {
      setHints([]);
      return undefined;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await api.post("/ai/suggest-translate", { q: query.trim() });
        setHints((data.suggestions || []).slice(0, 5));
      } catch {
        setHints([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const translate = async (text) => {
    const value = String(text || query).trim();
    if (!value) return;
    setQuery(value);
    try {
      const { data } = await api.post("/ai/translate", { text: value, targetLang: "vi" });
      setResult(data.translatedText || "");
    } catch {
      setResult("");
    }
  };

  return (
    <div className="rounded-2xl border border-sky-100 bg-sky-50/60 p-4">
      <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-sky-700 uppercase">
        <Languages className="h-3.5 w-3.5" />
        Từ điển nhanh
      </p>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            translate();
          }
        }}
        placeholder="Nhập từ hoặc cụm từ..."
        className="w-full rounded-xl border border-sky-200 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-sky-200"
      />
      {hints.length ? (
        <div className="mt-2 space-y-1">
          {hints.map((item) => (
            <button
              key={item.text || item}
              type="button"
              onClick={() => translate(item.text || item)}
              className="block w-full rounded-lg px-2 py-1.5 text-left text-sm hover:bg-white"
            >
              <span className="font-semibold">{item.text || item}</span>
              {item.translation ? (
                <span className="ml-2 text-sky-700">{item.translation}</span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}
      {result ? <p className="mt-3 text-sm font-semibold text-slate-800">{result}</p> : null}
    </div>
  );
}

export default DictEmbed;
