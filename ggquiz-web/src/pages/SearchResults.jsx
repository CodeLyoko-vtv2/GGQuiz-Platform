import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import api, { getApiErrorMessage } from "../api/client";

function SearchResults() {
  const [searchParams] = useSearchParams();
  const q = (searchParams.get("q") || "").trim();
  const [studySets, setStudySets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const fetchResults = async () => {
      if (!q) {
        setStudySets([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/studysets/search", {
          params: { q },
        });
        if (!cancelled) {
          setStudySets(data.studySets || []);
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
          setStudySets([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [q]);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-8 py-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6">
          <h1 className="text-2xl font-extrabold text-gray-900">Kết quả tìm kiếm</h1>
          <p className="mt-1 text-sm text-gray-500">
            {q ? (
              <>
                Từ khóa: <span className="font-semibold text-purple-700">“{q}”</span>
              </>
            ) : (
              "Nhập từ khóa trên thanh tìm kiếm rồi nhấn Enter"
            )}
          </p>
        </header>

        {!q ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
            <Search className="mx-auto h-8 w-8 text-gray-400" />
            <p className="mt-3 text-sm text-gray-500">Chưa có từ khóa tìm kiếm.</p>
          </div>
        ) : loading ? (
          <p className="text-sm text-gray-500">Đang tìm kiếm...</p>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : studySets.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-300 bg-white px-8 py-16 text-center">
            <p className="text-lg font-bold text-gray-900">
              Không tìm thấy kết quả nào cho: {q}
            </p>
            <p className="mt-2 text-sm text-gray-500">Thử từ khóa khác hoặc tạo học phần mới.</p>
            <Link
              to="/create-set"
              className="mt-6 inline-flex rounded-xl bg-purple-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-purple-700"
            >
              Tạo học phần
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {studySets.map((item) => (
              <Link
                key={item.id}
                to={`/set/${item.id}`}
                className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm transition hover:border-purple-200 hover:shadow-md"
              >
                <p className="text-xs font-semibold tracking-wide text-purple-600 uppercase">
                  Học phần
                </p>
                <h3 className="mt-2 line-clamp-2 text-lg font-bold text-gray-900">{item.title}</h3>
                {item.description ? (
                  <p className="mt-2 line-clamp-2 text-sm text-gray-500">{item.description}</p>
                ) : null}
                <p className="mt-4 text-sm text-gray-500">
                  {item.cardCount} thuật ngữ · {item.user?.name || "Người dùng"}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SearchResults;
