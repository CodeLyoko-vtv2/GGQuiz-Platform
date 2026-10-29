import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock } from "lucide-react";
import api, { getApiErrorMessage, getStoredUser } from "../../api/client";
import { GRADE_OPTIONS } from "../../data/fakeExams";
import ExamPrivacyModal from "../../components/exams/ExamPrivacyModal";
import { visibilityLabel } from "../../utils/examVisibility";

function EditExam() {
  const { id } = useParams();
  const navigate = useNavigate();
  const meId = getStoredUser()?.id;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [grade, setGrade] = useState("Lớp 10");
  const [visibility, setVisibility] = useState(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const fetchExam = async () => {
      setLoading(true);
      try {
        const { data } = await api.get(`/exams/${id}`);
        const exam = data.exam;
        if (!exam) throw new Error("missing");
        if (meId == null || Number(meId) !== Number(exam.userId)) {
          toast.error("Chỉ người tạo đề mới được chỉnh sửa.");
          navigate(`/exams/${id}`, { replace: true });
          return;
        }
        if (cancelled) return;
        setTitle(exam.title || "");
        setDescription(exam.description || "");
        setDurationMinutes(exam.durationMinutes || 45);
        setGrade(exam.grade || "Lớp 10");
        setVisibility(exam.visibility || null);
      } catch (err) {
        if (!cancelled) {
          toast.error(getApiErrorMessage(err));
          navigate("/practice-tests", { replace: true });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchExam();
    return () => {
      cancelled = true;
    };
  }, [id, meId, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (saving) return;
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên đề thi.");
      return;
    }
    if (!visibility) {
      toast.error("Hãy chọn quyền riêng tư trước khi lưu.");
      setPrivacyOpen(true);
      return;
    }

    setSaving(true);
    try {
      await api.put(`/exams/${id}`, {
        title: title.trim(),
        description: description.trim(),
        grade,
        durationMinutes: Number(durationMinutes) || 45,
        visibility,
      });
      toast.success("Đã cập nhật đề thi.");
      navigate(`/exams/${id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 px-8 py-12">
        <p className="text-center text-sm text-gray-500">Đang tải đề thi...</p>
      </div>
    );
  }

  const shareUrl = `${window.location.origin}/exams/${id}`;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-8 sm:px-8">
      <form onSubmit={handleSubmit} className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Chỉnh sửa đề thi</h1>
            <p className="mt-1 text-sm text-gray-500">
              Cập nhật thông tin chung và quyền riêng tư. Nội dung câu hỏi giữ nguyên.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Lock className="h-4 w-4" />
              {visibility ? visibilityLabel(visibility) : "Quyền riêng tư"}
            </button>
            <button
              type="submit"
              disabled={saving || !visibility}
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </button>
          </div>
        </div>

        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <label className="block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">
              Tên đề thi
            </span>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
              required
            />
          </label>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-semibold text-gray-700">
              Mô tả đề thi
            </span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
            />
          </label>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                Thời gian làm bài (phút)
              </span>
              <input
                type="number"
                min={5}
                max={300}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
              />
            </label>
            <label>
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                Khối / Lớp
              </span>
              <select
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
              >
                {GRADE_OPTIONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </section>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <Link to={`/exams/${id}`} className="text-sm font-semibold text-slate-500 hover:text-slate-800">
            Hủy
          </Link>
          <button
            type="submit"
            disabled={saving || !visibility}
            className="rounded-xl bg-purple-600 px-8 py-3 text-sm font-bold text-white shadow-md hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </button>
        </div>
      </form>
      <ExamPrivacyModal
        open={privacyOpen}
        value={visibility}
        onClose={() => setPrivacyOpen(false)}
        onConfirm={setVisibility}
        shareUrl={shareUrl}
      />
    </div>
  );
}

export default EditExam;
