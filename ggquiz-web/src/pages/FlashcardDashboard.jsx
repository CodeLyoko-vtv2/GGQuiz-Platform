import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bookmark,
  Eye,
  Layers3,
  Plus,
  User,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../api/client";
import LibraryFilterDropdown from "../components/LibraryFilterDropdown";

function FlashcardDashboard() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [studySets, setStudySets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    const fetchSets = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/studysets/dashboard", {
          params: { filter },
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
        if (!cancelled) setLoading(false);
      }
    };

    fetchSets();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const handleToggleSave = async (e, set) => {
    e.preventDefault();
    e.stopPropagation();
    if (savingId === set.id) return;

    setSavingId(set.id);
    const prevSaved = set.isSaved;
    const prevCount = set.saveCount || 0;

    // Optimistic UI
    setStudySets((list) =>
      list
        .map((item) =>
          item.id === set.id
            ? {
                ...item,
                isSaved: !prevSaved,
                saveCount: Math.max(0, prevCount + (prevSaved ? -1 : 1)),
              }
            : item
        )
        .filter((item) => {
          // Khi đang ở bộ lọc "Đã lưu", bỏ thẻ khỏi danh sách nếu vừa bỏ lưu
          if (filter === "saved" && item.id === set.id && prevSaved) {
            return false;
          }
          return true;
        })
    );

    try {
      const { data } = await api.post(`/studysets/${set.id}/save`);
      setStudySets((list) =>
        list.map((item) =>
          item.id === set.id
            ? {
                ...item,
                isSaved: data.isSaved,
                saveCount: data.saveCount,
              }
            : item
        )
      );
    } catch (err) {
      // Rollback
      setStudySets((list) => {
        const restored = {
          ...set,
          isSaved: prevSaved,
          saveCount: prevCount,
        };
        const exists = list.some((item) => item.id === set.id);
        if (!exists && filter === "saved" && prevSaved) {
          return [restored, ...list];
        }
        return list.map((item) => (item.id === set.id ? restored : item));
      });
      toast.error(getApiErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-purple-50 via-white to-violet-50/50 px-4 py-8 sm:px-8">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-purple-100/80 px-3 py-1 text-xs font-semibold text-purple-800">
            <Layers3 className="h-3.5 w-3.5" />
            Thẻ ghi nhớ
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Thẻ ghi nhớ
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
            Khám phá học phần từ cộng đồng, lưu lại những bộ thẻ hữu ích, ôn lại
            những gì bạn vừa xem và tự do sáng tạo bộ thẻ của riêng mình — học
            nhanh hơn mỗi ngày.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/create-set")}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
        >
          <Plus className="h-4 w-4" />
          Tạo học phần
        </button>
      </header>

      {/* Filter */}
      <div className="mx-auto mt-8 max-w-6xl">
        <LibraryFilterDropdown value={filter} onChange={setFilter} />
      </div>

      {/* Grid */}
      <div className="mx-auto mt-6 max-w-6xl">
        {loading && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-40 animate-pulse rounded-2xl bg-slate-200/70"
              />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        )}

        {!loading && !error && studySets.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-14 text-center">
            <Layers3 className="mx-auto h-10 w-10 text-slate-300" />
            <p className="mt-3 text-base font-semibold text-slate-800">
              {filter === "saved" && "Bạn chưa lưu học phần nào"}
              {filter === "recent" && "Chưa có lịch sử xem gần đây"}
              {filter === "created" && "Bạn chưa tạo học phần nào"}
              {filter === "all" && "Chưa có học phần nào trong hệ thống"}
            </p>
            <p className="mt-1 text-sm text-slate-500">
              {filter === "created" || filter === "all"
                ? "Hãy tạo học phần đầu tiên để bắt đầu học."
                : "Duyệt mục Tất cả và lưu hoặc mở học phần bạn quan tâm."}
            </p>
            {(filter === "created" || filter === "all") && (
              <button
                type="button"
                onClick={() => navigate("/create-set")}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
              >
                <Plus className="h-4 w-4" />
                Tạo học phần
              </button>
            )}
          </div>
        )}

        {!loading && !error && studySets.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {studySets.map((set) => (
              <Link
                key={set.id}
                to={`/set/${set.id}`}
                className="group relative flex flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
              >
                <button
                  type="button"
                  title={set.isSaved ? "Bỏ lưu" : "Lưu học phần"}
                  aria-label={set.isSaved ? "Bỏ lưu" : "Lưu học phần"}
                  disabled={savingId === set.id}
                  onClick={(e) => handleToggleSave(e, set)}
                  className={`absolute right-3 top-3 rounded-lg p-2 transition ${
                    set.isSaved
                      ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                      : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                  } disabled:opacity-60`}
                >
                  <Bookmark
                    className="h-5 w-5"
                    fill={set.isSaved ? "currentColor" : "none"}
                    strokeWidth={set.isSaved ? 0 : 2}
                  />
                </button>

                <h2 className="pr-10 text-base font-bold leading-snug text-slate-900 group-hover:text-purple-800">
                  {set.title}
                </h2>
                {set.description ? (
                  <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                    {set.description}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm italic text-slate-400">
                    Chưa có mô tả
                  </p>
                )}

                <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-xs text-slate-500">
                  <span className="font-medium text-slate-700">
                    {set.cardCount} thuật ngữ
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Eye className="h-3.5 w-3.5" />
                    {set.viewCount ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <Bookmark className="h-3.5 w-3.5" />
                    {set.saveCount ?? 0}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
                  <User className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">
                    {set.user?.name || "Người dùng"}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FlashcardDashboard;
