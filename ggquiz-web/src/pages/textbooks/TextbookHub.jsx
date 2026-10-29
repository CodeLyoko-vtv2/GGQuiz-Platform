import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BookOpen } from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";

export default function TextbookHub() {
  const [series, setSeries] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/curriculum/series")
      .then(({ data }) => setSeries(data.series || []))
      .catch((err) => setError(getApiErrorMessage(err)));
  }, []);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-8 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-500">Giáo trình</p>
        <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Học liệu chính quy</h1>
        <p className="mx-auto mt-2 max-w-2xl text-slate-500">
          Chọn bộ sách, vào đúng lớp của bạn và mở sách điện tử lật trang như sách giấy.
        </p>
      </div>
      {error ? <p className="text-center text-rose-500">{error}</p> : null}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {series.map((item) => (
          <Link
            key={item.id}
            to={`/textbooks/${item.id}`}
            className="group overflow-hidden rounded-3xl p-6 text-white shadow-lg transition hover:-translate-y-1"
            style={{ background: `linear-gradient(145deg, ${item.color || "#2563eb"}, #0f172a)` }}
          >
            <BookOpen className="mb-10 opacity-90" />
            <h2 className="text-2xl font-black">{item.name}</h2>
            <p className="mt-2 text-sm text-white/80">{item.description || "Bộ sách giáo khoa chính quy"}</p>
            <p className="mt-6 text-xs uppercase tracking-wider text-white/70">{item.bookCount || 0} cuốn sách</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
