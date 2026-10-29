import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Crown, Sparkles } from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import { SpecializedIcon, accentOf } from "./SpecializedIcons";

function SpecializedHub() {
  const [fields, setFields] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    api
      .get("/specialized/fields")
      .then(({ data }) => {
        if (alive) setFields(data.fields || []);
      })
      .catch((err) => {
        if (alive) setError(getApiErrorMessage(err));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="spec-hub min-h-screen px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <Link
          to="/"
          className="mb-5 inline-flex items-center gap-2 text-sm text-amber-100/60 hover:text-amber-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Về trang chủ
        </Link>
        <p className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-300/20 bg-amber-400/10 px-3 py-1 text-[11px] font-bold tracking-[0.18em] text-amber-200 uppercase">
          <Sparkles className="h-3.5 w-3.5" />
          Signature
        </p>
        <h1 className="text-3xl font-black tracking-tight text-amber-50 sm:text-4xl">
          Ngoại ngữ chuyên ngành
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-amber-100/65 sm:text-base">
          Học từ vựng theo lĩnh vực, rồi bước vào tình huống thật với Trợ thủ AI.
          Ba bài đầu miễn phí — các node tiếp theo dành cho Premium.
        </p>

        {error ? <p className="mt-6 text-sm text-rose-300">{error}</p> : null}

        {loading ? (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((item) => (
              <div key={item} className="h-44 animate-pulse rounded-3xl bg-white/5" />
            ))}
          </div>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => {
              const accent = accentOf(field.accent);
              const progress = field.lessonCount
                ? Math.round((field.completedCount / field.lessonCount) * 100)
                : 0;
              return (
                <Link
                  key={field.id}
                  to={`/specialized/${field.slug}`}
                  className={`group relative overflow-hidden rounded-3xl border bg-gradient-to-br p-5 transition hover:-translate-y-0.5 hover:border-amber-200/40 ${accent.chip}`}
                >
                  <div className="mb-6 flex items-start justify-between">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-black/30 text-amber-50">
                      <SpecializedIcon name={field.icon} className="h-6 w-6" />
                    </span>
                    {field.completedCount > 0 ? (
                      <span className="rounded-full bg-black/30 px-2 py-1 text-[11px] font-semibold text-amber-100/80">
                        {progress}%
                      </span>
                    ) : (
                      <Crown className="h-4 w-4 text-amber-300/70" />
                    )}
                  </div>
                  <h2 className="text-lg font-bold text-white">{field.name}</h2>
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-white/60">
                    {field.description}
                  </p>
                  <p className={`mt-4 text-xs font-semibold ${accent.text}`}>
                    {field.lessonCount} bài học · {field.completedCount} đã xong
                  </p>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default SpecializedHub;
