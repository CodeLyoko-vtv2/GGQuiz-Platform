import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BookOpen,
  CircleHelp,
  Clock,
  Download,
  Lock,
  Play,
  Radio,
  ShieldCheck,
  Users,
  Volume2,
} from "lucide-react";
import api, { getApiErrorMessage, getStoredUser } from "../../api/client";
import ContentActionsMenu from "../../components/ContentActionsMenu";
import { downloadExamDocx } from "../../utils/exportExamDocx";
import { visibilityLabel } from "../../utils/examVisibility";
import {
  getFormat,
  groupExamQuestions,
  isOpenFormat,
  sanitizeHtml,
} from "../../utils/examFormats";

function authorInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function QuestionPreview({ question, index, showAnswer }) {
  const format = getFormat(question.type);
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-bold text-purple-700">
        Câu {index + 1}
        <span className="ml-2 text-xs font-semibold text-slate-400">
          {format.shortLabel}
        </span>
      </p>

      {question.audioUrl ? (
        <div className="mt-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
          <p className="mb-2 inline-flex items-center gap-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">
            <Volume2 className="h-3.5 w-3.5" />
            Bài nghe
          </p>
          <audio controls src={question.audioUrl} className="w-full">
            Trình duyệt không hỗ trợ audio.
          </audio>
        </div>
      ) : null}

      {question.passage ? (
        <div className="mt-3 rounded-xl border border-gray-100 bg-slate-50 p-4 text-sm leading-relaxed text-gray-700 whitespace-pre-wrap">
          {question.passage}
        </div>
      ) : null}

      {isOpenFormat(question.type) ? (
        <div
          className="exam-rich-text mt-3 text-base font-semibold text-gray-900"
          dangerouslySetInnerHTML={{ __html: sanitizeHtml(question.prompt) }}
        />
      ) : (
        <p className="mt-3 text-base font-semibold whitespace-pre-wrap text-gray-900">
          {question.prompt}
        </p>
      )}

      {question.meta?.starter ? (
        <p className="mt-2 text-sm text-slate-500">
          Gợi ý: <span className="font-semibold text-slate-700">{question.meta.starter}</span>
        </p>
      ) : null}

      {question.options?.length ? (
        <ul className="mt-3 space-y-2">
          {question.options.map((opt) => {
            const isCorrect = showAnswer && opt.key === question.correctKey;
            return (
              <li
                key={opt.key}
                className={`rounded-xl px-3 py-2.5 text-sm ${
                  isCorrect
                    ? "bg-green-50 font-bold text-green-700"
                    : "bg-gray-50 text-gray-700"
                }`}
              >
                <span className="mr-2 font-bold">{opt.key}.</span>
                {opt.text}
              </li>
            );
          })}
        </ul>
      ) : null}

      {showAnswer && question.correctKey && !question.options?.length ? (
        <p className="mt-3 text-sm font-semibold text-green-700">
          Đáp án: {question.correctKey}
        </p>
      ) : null}

      {showAnswer && question.explanation ? (
        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/70 px-4 py-3">
          <p className="text-xs font-bold tracking-wide text-amber-700 uppercase">
            Lời giải chi tiết
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-amber-950/80">
            {question.explanation}
          </p>
        </div>
      ) : null}
    </article>
  );
}

function ExamDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [exam, setExam] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("questions");
  const [exporting, setExporting] = useState(false);
  const [hosting, setHosting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const me = getStoredUser();

  useEffect(() => {
    let cancelled = false;

    const fetchExam = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get(`/exams/${id}`);
        if (!cancelled) {
          setExam(data.exam || null);
          setIsSaved(Boolean(data.exam?.isSaved));
        }
      } catch (err) {
        if (!cancelled) {
          setError(getApiErrorMessage(err));
          setExam(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchExam();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const handleDownload = async () => {
    if (!exam || exporting) return;
    setExporting(true);
    try {
      await downloadExamDocx(exam);
      try {
        const { data } = await api.post(`/exams/${exam.id}/download`);
        setExam((prev) =>
          prev
            ? { ...prev, downloadCount: data.downloadCount ?? (prev.downloadCount || 0) + 1 }
            : prev
        );
      } catch {
        setExam((prev) =>
          prev ? { ...prev, downloadCount: (prev.downloadCount || 0) + 1 } : prev
        );
      }
      toast.success("Đã tải file Word của đề thi.");
    } catch (err) {
      console.error(err);
      toast.error("Không thể xuất file Word. Vui lòng thử lại.");
    } finally {
      setExporting(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Đã sao chép liên kết!");
    } catch {
      toast.error("Không thể sao chép liên kết. Hãy thử lại.");
    }
  };

  const handleToggleSave = async () => {
    if (saving || !exam) return;
    setSaving(true);
    const prev = isSaved;
    setIsSaved(!prev);
    try {
      const { data } = await api.post(`/exams/${exam.id}/save`);
      setIsSaved(Boolean(data.isSaved));
      setExam((current) =>
        current
          ? { ...current, saveCount: data.saveCount ?? current.saveCount }
          : current
      );
      toast.success(data.isSaved ? "Đã lưu đề thi" : "Đã bỏ lưu đề thi");
    } catch (err) {
      setIsSaved(prev);
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!exam || deleting) return;
    const confirmed = window.confirm("Bạn có chắc chắn muốn xóa đề thi này?");
    if (!confirmed) return;
    setDeleting(true);
    try {
      await api.delete(`/exams/${exam.id}`);
      toast.success("Đã xóa đề thi.");
      navigate("/practice-tests");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">Đang tải đề thi...</p>
      </div>
    );
  }

  if (error && !exam) {
    const isPrivate = /riêng tư/i.test(error);
    return (
      <div className="bg-gray-50 px-8 py-16">
        <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <Lock className="mx-auto h-8 w-8 text-slate-400" />
          <h1 className="mt-3 text-lg font-extrabold text-slate-900">
            {isPrivate ? "Đề thi riêng tư" : "Không xem được đề thi"}
          </h1>
          <p className="mt-2 text-sm text-slate-500">{error}</p>
          <Link
            to="/practice-tests"
            className="mt-5 inline-flex rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700"
          >
            Về trang Đề thi
          </Link>
        </div>
      </div>
    );
  }

  if (!exam) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">Không tìm thấy đề thi.</p>
      </div>
    );
  }

  const questionCount = exam.questions?.length || 0;
  const isOwner =
    me?.id != null &&
    exam.userId != null &&
    Number(me.id) === Number(exam.userId);

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-4">
                <h1 className="min-w-0 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
                  {exam.title}
                </h1>
                <ContentActionsMenu
                  ariaLabel="Menu đề thi"
                  isSaved={isSaved}
                  onToggleSave={handleToggleSave}
                  onShare={handleShare}
                  isOwner={isOwner}
                  editTo={`/exams/${exam.id}/edit`}
                  onDelete={handleDelete}
                  deleting={deleting}
                />
              </div>
              <p className="mt-1.5 max-w-3xl text-sm leading-relaxed text-slate-500 sm:text-base">
                {exam.description?.trim()
                  ? exam.description
                  : "Chưa có mô tả"}
              </p>
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
                  {questionCount} câu
                </span>
                <span className="inline-flex items-center gap-1">
                  <Lock className="h-3.5 w-3.5 text-purple-500" />
                  {visibilityLabel(exam.visibility)}
                </span>
              </p>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <Users className="h-4 w-4" />
                  {exam.attemptCount?.toLocaleString("vi-VN") || 0} lượt thi
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Download className="h-4 w-4" />
                  {exam.downloadCount?.toLocaleString("vi-VN") || 0} lượt tải
                </span>
              </div>
              <p className="mt-3 inline-flex min-w-0 items-center gap-1.5 text-xs text-slate-500">
                <span
                  aria-hidden="true"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-slate-600"
                >
                  {authorInitials(exam.user?.name)}
                </span>
                <span className="truncate">
                  {exam.user?.name || "Người dùng"}
                </span>
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownload}
              disabled={exporting}
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-bold text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <Download className="h-4 w-4" />
              {exporting ? "Đang xuất..." : "Tải về"}
            </button>
          </div>
        </header>

        <section className="mb-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-6 text-center shadow-sm">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-slate-500 uppercase">
              <Play className="h-3.5 w-3.5" />
              Luyện tập
            </p>
            <p className="mt-2 text-sm text-slate-500">
              Làm đề online, không lưu điểm vào kỳ thi thật.
            </p>
            <Link
              to={`/exams/${exam.id}/take`}
              className="mt-4 inline-flex items-center justify-center gap-2 rounded-full border border-purple-200 bg-purple-50 px-7 py-2.5 text-sm font-extrabold tracking-wide text-purple-700 uppercase transition hover:bg-purple-100"
            >
              <Play className="h-4 w-4" />
              Thi thử
            </Link>
          </div>

          {me && exam.userId === me.id ? (
            <div className="rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-600 to-violet-600 px-6 py-6 text-center text-white shadow-lg">
              <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-indigo-100 uppercase">
                <Radio className="h-3.5 w-3.5" />
                Tổ chức thi
              </p>
              <p className="mt-2 text-sm text-indigo-100">
                Tạo phòng thi thật, phát mã cho học sinh và giám sát gian lận.
              </p>
              <button
                type="button"
                disabled={hosting}
                onClick={async () => {
                  if (hosting) return;
                  setHosting(true);
                  try {
                    const { data } = await api.post(`/exams/${exam.id}/live-sessions`);
                    navigate(`/live/${data.session.id}`);
                  } catch (err) {
                    toast.error(getApiErrorMessage(err));
                  } finally {
                    setHosting(false);
                  }
                }}
                className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-2.5 text-sm font-extrabold tracking-wide text-indigo-700 uppercase shadow-sm transition hover:bg-indigo-50 disabled:opacity-70"
              >
                <ShieldCheck className="h-4 w-4" />
                {hosting ? "Đang mở phòng..." : "Tổ chức thi"}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-6 text-center">
              <p className="text-sm font-semibold text-slate-600">Thi thật</p>
              <p className="mt-2 text-sm text-slate-500">
                Vào trang Đề thi và bấm “Vào phòng thi” nếu giáo viên đã cấp mã.
              </p>
            </div>
          )}
        </section>

        <section>
          <div className="mb-4 flex gap-2 border-b border-gray-200">
            {[
              { id: "questions", label: "Đề bài" },
              { id: "answers", label: "Xem đáp án" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                className={`border-b-2 px-4 py-2.5 text-sm font-bold transition ${
                  tab === item.id
                    ? "border-purple-600 text-purple-700"
                    : "border-transparent text-gray-500 hover:text-gray-800"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="space-y-6">
            {groupExamQuestions(exam.questions).map((group) => (
              <div key={group.id} className="space-y-4">
                {(group.showSectionTitle ?? Boolean(group.sectionTitle)) ? (
                  <h3 className="text-lg font-extrabold text-gray-900">
                    {group.sectionTitle}
                  </h3>
                ) : null}
                {group.instruction && group.instruction !== group.passage ? (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap text-slate-500">
                    {group.instruction}
                  </p>
                ) : null}
                {group.items.map(({ question, index }) => (
                  <QuestionPreview
                    key={question.id}
                    question={question}
                    index={index}
                    showAnswer={tab === "answers"}
                  />
                ))}
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default ExamDetail;
