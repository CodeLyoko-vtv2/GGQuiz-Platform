import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { FileText } from "lucide-react";
import api, { getApiErrorMessage, mediaUrl } from "../../api/client";

export default function TextbookSeries() {
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

  const grades = data?.grades || [];
  const books = useMemo(() => data?.books || [], [data]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <Link to="/textbooks" className="text-sm font-semibold text-indigo-600">
        ← Tất cả bộ sách
      </Link>
      <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">
        {data?.series?.name || "Bộ sách"}
      </h1>
      <p className="mt-2 max-w-2xl text-slate-500">{data?.series?.description}</p>
      {error ? <p className="mt-4 text-rose-500">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setParams({})}
          className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
            !gradeId ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
          }`}
        >
          Tất cả
        </button>
        {grades.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setParams({ grade: String(item.id) })}
            className={`rounded-full px-4 py-1.5 text-sm font-semibold ${
              gradeId === item.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200"
            }`}
          >
            {item.name}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {books.map((item) => (
          <Link
            key={item.id}
            to={`/textbooks/read/${item.id}`}
            className="overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 transition hover:-translate-y-1 dark:bg-slate-900 dark:ring-slate-800"
          >
            <div
              className="grid h-52 place-items-center text-center text-lg font-black text-white"
              style={{ background: data?.series?.color || "#2563eb" }}
            >
              {item.coverUrl ? (
                <img src={mediaUrl(item.coverUrl)} alt="" className="h-full w-full object-cover" />
              ) : (
                item.title
              )}
            </div>
            <div className="p-4">
              <p className="font-bold text-slate-900 dark:text-white">{item.title}</p>
              <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                <FileText size={14} />
                {item.subtitle || item.gradeName || "Sách điện tử"}
              </p>
            </div>
          </Link>
        ))}
      </div>
      {!books.length ? (
        <p className="mt-10 text-center text-slate-400">Chưa có sách cho lớp này.</p>
      ) : null}
    </div>
  );
}
