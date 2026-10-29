import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChevronDown, ChevronRight } from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";

export default function ExplanationToc() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [openId, setOpenId] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/curriculum/books/${bookId}/toc`)
      .then(({ data }) => {
        setBook(data.book);
        setOpenId(data.book?.units?.[0]?.id || null);
      })
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [bookId]);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <Link
        to={book?.series?.id ? `/explanations/${book.series.id}` : "/explanations"}
        className="text-sm font-semibold text-amber-600"
      >
        ← Chọn sách khác
      </Link>
      <h1 className="mt-3 text-3xl font-black text-slate-900 dark:text-white">{book?.title || "Mục lục lời giải"}</h1>
      <p className="mt-1 text-slate-500">
        {book?.series?.name} {book?.grade?.name ? `· ${book.grade.name}` : ""}
      </p>
      {book?.sourceBook ? (
        <Link to={`/textbooks/read/${book.sourceBook.id}`} className="mt-2 inline-block text-sm text-indigo-600">
          Mở sách điện tử gốc
        </Link>
      ) : null}
      {error ? <p className="mt-3 text-rose-500">{error}</p> : null}

      <div className="mt-6 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-slate-100 dark:bg-slate-900 dark:ring-slate-800">
        {(book?.units || []).map((unit) => {
          const open = openId === unit.id;
          return (
            <div key={unit.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
              <button
                type="button"
                className="flex w-full items-center justify-between px-5 py-4 text-left font-bold"
                onClick={() => setOpenId(open ? null : unit.id)}
              >
                <span>{unit.title}</span>
                {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
              </button>
              {open ? (
                <div className="grid gap-1 px-5 pb-4 sm:grid-cols-2">
                  {unit.lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      to={`/explanations/lesson/${lesson.id}`}
                      className="rounded-xl px-3 py-2 text-sm text-slate-600 hover:bg-amber-50 hover:text-amber-700 dark:text-slate-300 dark:hover:bg-slate-800"
                    >
                      {lesson.title}
                      {lesson.hasSolution ? "" : " · sắp có"}
                    </Link>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {!book?.units?.length ? (
          <p className="px-5 py-10 text-center text-slate-400">Chưa có mục lục lời giải cho sách này.</p>
        ) : null}
      </div>
    </div>
  );
}
