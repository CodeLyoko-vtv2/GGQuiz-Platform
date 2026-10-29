import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { X } from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import FlipbookReader from "../../components/flipbook/FlipbookReader";

export default function TextbookReader() {
  const { bookId } = useParams();
  const [book, setBook] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get(`/curriculum/books/${bookId}`)
      .then(({ data }) => setBook(data.book))
      .catch((err) => setError(getApiErrorMessage(err)));
  }, [bookId]);

  return (
    <div className="relative min-h-screen bg-[#111827]">
      <div className="absolute left-4 top-4 z-30 flex items-center gap-3">
        <Link
          to={book?.seriesId ? `/textbooks/${book.seriesId}` : "/textbooks"}
          className="grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
        >
          <X size={18} />
        </Link>
        <div>
          <p className="text-sm font-semibold text-white">{book?.title || "Đang mở sách..."}</p>
          <p className="text-xs text-slate-400">{book?.series?.name}</p>
        </div>
      </div>
      {error ? <p className="pt-24 text-center text-rose-300">{error}</p> : null}
      {book ? <FlipbookReader pdfUrl={book.pdfUrl} hotspots={book.hotspots || []} /> : null}
    </div>
  );
}
