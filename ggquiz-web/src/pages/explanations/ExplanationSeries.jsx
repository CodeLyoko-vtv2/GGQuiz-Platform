import { useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import api, { getApiErrorMessage, mediaUrl } from "../../api/client";

export default function ExplanationSeries() {
  const { seriesId } = useParams();
  const [params, setParams] = useSearchParams();
  const gradeId = Number(params.get("grade") || 0) || null;
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/curriculum/series/${seriesId}`, { params: gradeId ? { gradeId } : {} })
      .then(({ data: payload }) => setData(payload))
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [seriesId, gradeId]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/explanations" className="text-sm font-semibold text-amber-600">
        ← Tất cả bộ lời giải
      </Link>
      <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
        {data?.series?.name || "Bộ lời giải"}
      </h1>
      <p className="mt-2 text-slate-500">{data?.series?.description}</p>
      {error ? <p className="mt-3 text-rose-500">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setParams({})}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            !gradeId ? "bg-amber-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          Tất cả
        </button>
        {(data?.grades || []).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setParams({ grade: String(item.id) })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              gradeId === item.id
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(data?.books || []).map((item) => (
          <Link
            key={item.id}
            to={`/explanations/book/${item.id}`}
            className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 dark:bg-slate-900 dark:ring-slate-800"
          >
            <div
              className="grid h-48 place-items-center px-4 text-center text-lg font-black text-white"
              style={{ background: data?.series?.color || "#f59e0b" }}
            >
              {item.coverUrl ? <img src={mediaUrl(item.coverUrl)} alt="" className="h-full w-full object-cover" /> : item.title}
            </div>
            <div className="p-4">
              <p className="font-bold">{item.title}</p>
              <p className="text-sm text-slate-500">{item.subtitle || item.gradeName}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
