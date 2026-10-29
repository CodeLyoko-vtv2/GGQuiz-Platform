import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bookmark,
  BookOpen,
  CircleHelp,
  ClipboardList,
  Clock,
  DoorOpen,
  Plus,
  User,
  Users,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";
import LibraryFilterDropdown from "../../components/LibraryFilterDropdown";
import JoinExamModal from "../../components/exams/JoinExamModal";

function ExamList() {
  const navigate = useNavigate();
  const [filter, setFilter] = useState("all");
  const [exams, setExams] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingId, setSavingId] = useState(null);
  const [joinOpen, setJoinOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchExams = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/exams", { params: { filter } });
        if (!cancelled) setExams(data.exams || []);
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
          setExams([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchExams();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const handleToggleSave = async (event, exam) => {
    event.preventDefault();
    event.stopPropagation();
    if (savingId === exam.id) return;

    setSavingId(exam.id);
    const prevSaved = exam.isSaved;
    const prevCount = exam.saveCount || 0;

    setExams((list) =>
      list
        .map((item) =>
          item.id === exam.id
            ? {
                ...item,
                isSaved: !prevSaved,
                saveCount: Math.max(0, prevCount + (prevSaved ? -1 : 1)),
              }
            : item
        )
        .filter((item) => {
          if (filter === "saved" && item.id === exam.id && prevSaved) {
            return false;
          }
          return true;
        })
    );

    try {
      const { data } = await api.post(`/exams/${exam.id}/save`);
      setExams((list) =>
        list.map((item) =>
          item.id === exam.id
            ? {
                ...item,
                isSaved: data.isSaved,
                saveCount: data.saveCount,
              }
            : item
        )
      );
    } catch (err) {
      setExams((list) => {
        const restored = {
          ...exam,
          isSaved: prevSaved,
          saveCount: prevCount,
        };
        const exists = list.some((item) => item.id === exam.id);
        if (!exists && filter === "saved" && prevSaved) {
          return [restored, ...list];
        }
        return list.map((item) => (item.id === exam.id ? restored : item));
      });
      toast.error(getApiErrorMessage(err));
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-purple-50 via-white to-violet-50/40 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Đề thi
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Thử sức với các bộ đề đa dạng, tự đánh giá năng lực và chuẩn bị kỹ
              lưỡng — sẵn sàng chinh phục mọi kỳ thi phía trước.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setJoinOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-white px-5 py-3 text-sm font-semibold text-indigo-700 shadow-sm transition hover:bg-indigo-50"
            >
              <DoorOpen className="h-4 w-4" />
              Vào phòng thi
            </button>
            <button
              type="button"
              onClick={() => navigate("/exams/create")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Tạo đề thi
            </button>
          </div>
        </header>

        <div className="mt-8">
          <LibraryFilterDropdown value={filter} onChange={setFilter} />
        </div>

        <div className="mt-6">
          {loading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-56 animate-pulse rounded-2xl bg-slate-200/70"
                />
              ))}
            </div>
          ) : error ? (
            <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
              {error}
            </p>
          ) : exams.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
              <ClipboardList className="mx-auto h-10 w-10 text-slate-300" />
              <p className="mt-3 text-base font-semibold text-slate-800">
                {filter === "saved" && "Bạn chưa lưu đề thi nào"}
                {filter === "recent" && "Chưa có lịch sử xem gần đây"}
                {filter === "created" && "Bạn chưa tạo đề thi nào"}
                {filter === "all" && "Chưa có đề thi nào"}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {filter === "created" || filter === "all"
                  ? "Tạo đề đầu tiên để bắt đầu luyện tập."
                  : "Duyệt mục Tất cả và lưu hoặc mở đề thi bạn quan tâm."}
              </p>
              {(filter === "created" || filter === "all") && (
                <button
                  type="button"
                  onClick={() => navigate("/exams/create")}
                  className="mt-5 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4" />
                  Tạo đề thi
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {exams.map((exam) => (
                <Link
                  key={exam.id}
                  to={`/exams/${exam.id}`}
                  className="group relative flex cursor-pointer flex-col rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-md"
                >
                  <button
                    type="button"
                    title={exam.isSaved ? "Bỏ lưu" : "Lưu đề thi"}
                    aria-label={exam.isSaved ? "Bỏ lưu" : "Lưu đề thi"}
                    disabled={savingId === exam.id}
                    onClick={(event) => handleToggleSave(event, exam)}
                    className={`absolute right-3 top-3 rounded-lg p-2 transition ${
                      exam.isSaved
                        ? "bg-amber-50 text-amber-600 hover:bg-amber-100"
                        : "text-slate-300 hover:bg-slate-100 hover:text-slate-500"
                    } disabled:opacity-60`}
                  >
                    <Bookmark
                      className="h-5 w-5"
                      fill={exam.isSaved ? "currentColor" : "none"}
                      strokeWidth={exam.isSaved ? 0 : 2}
                    />
                  </button>

                  <h2 className="pr-10 text-lg font-bold leading-snug text-slate-900 group-hover:text-purple-800">
                    {exam.title}
                  </h2>
                  {exam.description ? (
                    <p className="mt-1.5 line-clamp-2 text-sm text-slate-500">
                      {exam.description}
                    </p>
                  ) : (
                    <p className="mt-1.5 text-sm italic text-slate-400">
                      Chưa có mô tả
                    </p>
                  )}

                  <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-medium text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <BookOpen className="h-3.5 w-3.5 text-purple-500" />
                      {exam.grade}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-purple-500" />
                      {exam.durationMinutes} phút
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <CircleHelp className="h-3.5 w-3.5 text-purple-500" />
                      {exam.questionCount || 0} câu
                    </span>
                  </p>

                  <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 pt-4 text-sm text-slate-500">
                    <span className="inline-flex items-center gap-1.5">
                      <Users className="h-4 w-4" />
                      {exam.attemptCount?.toLocaleString("vi-VN") || 0} lượt thi
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <Bookmark className="h-4 w-4" />
                      {exam.saveCount?.toLocaleString("vi-VN") || 0} lượt lưu
                    </span>
                  </div>

                  <div className="mt-3 flex items-end justify-between gap-3">
                    <p className="inline-flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                      <User className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">
                        {exam.user?.name || "Người dùng"}
                      </span>
                    </p>
                    <span className="shrink-0 text-sm font-semibold text-purple-600 transition group-hover:text-purple-700">
                      Xem chi tiết ➔
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
      <JoinExamModal open={joinOpen} onClose={() => setJoinOpen(false)} />
    </div>
  );
}

export default ExamList;
