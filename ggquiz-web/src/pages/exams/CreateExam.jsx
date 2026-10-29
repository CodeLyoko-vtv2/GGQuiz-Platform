import { useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { Lock, Plus } from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import { GRADE_OPTIONS } from "../../data/fakeExams";
import QuestionEditorCard from "../../components/exams/QuestionEditorCard";
import ExamPrivacyModal from "../../components/exams/ExamPrivacyModal";
import { visibilityLabel } from "../../utils/examVisibility";
import {
  createEmptySection,
  getFormat,
  isChoiceFormat,
  sectionTasks,
  stripHtml,
} from "../../utils/examFormats";
import { expandSection } from "../../utils/parseSmartExam";

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function CreateExam() {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(45);
  const [grade, setGrade] = useState("Lớp 10");
  const [sections, setSections] = useState([createEmptySection()]);
  const [loading, setLoading] = useState(false);
  const [visibility, setVisibility] = useState(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);

  const updateSection = (index, next) => {
    setSections((prev) => prev.map((item, i) => (i === index ? next : item)));
  };

  const handleAudioFile = async (sectionIndex, taskIndex, file) => {
    if (!file) {
      setSections((prev) =>
        prev.map((section, i) => {
          if (i !== sectionIndex) return section;
          const tasks = sectionTasks(section);
          return {
            ...section,
            tasks: tasks.map((task, j) =>
              j === taskIndex ? { ...task, audioUrl: null } : task
            ),
          };
        })
      );
      return;
    }
    if (!file.type.startsWith("audio/")) {
      toast.error("Vui lòng chọn file âm thanh.");
      return;
    }
    try {
      const url = await readFileAsDataUrl(file);
      setSections((prev) =>
        prev.map((section, i) => {
          if (i !== sectionIndex) return section;
          const tasks = sectionTasks(section);
          return {
            ...section,
            tasks: tasks.map((task, j) =>
              j === taskIndex ? { ...task, audioUrl: url } : task
            ),
          };
        })
      );
    } catch {
      toast.error("Không thể đọc file âm thanh. Hãy thử lại.");
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;
    if (!title.trim()) {
      toast.error("Vui lòng nhập tên đề thi.");
      return;
    }
    if (!visibility) {
      toast.error("Hãy chọn quyền riêng tư trước khi tạo đề thi.");
      setPrivacyOpen(true);
      return;
    }

    const questions = [];
    for (const [index, section] of sections.entries()) {
      if (!section.sectionTitle?.trim()) {
        toast.error(`Phần ${index + 1}: vui lòng nhập tên phần thi.`);
        return;
      }

      const tasks = sectionTasks(section);
      for (const [taskIndex, task] of tasks.entries()) {
        if (!String(task.body || "").trim()) {
          toast.error(
            `Phần ${index + 1}, đề bài ${taskIndex + 1}: chưa có nội dung bộ câu hỏi.`
          );
          return;
        }
      }

      const expanded = expandSection(section);
      if (expanded.length === 0) {
        toast.error(
          `Phần ${index + 1}: chưa nhận diện được câu hỏi. Hãy dùng Câu 1:`
        );
        return;
      }
      for (const [qIndex, question] of expanded.entries()) {
        if (!stripHtml(question.prompt)) {
          toast.error(`Phần ${index + 1}, câu ${qIndex + 1}: thiếu đề bài.`);
          return;
        }
        const format = getFormat(question.type);
        if (isChoiceFormat(question.type) && format.hasOptions === 4) {
          if (question.options.length !== 4 || question.options.some((opt) => !opt.text)) {
            toast.error(`Phần ${index + 1}, câu ${qIndex + 1}: cần đủ đáp án A–D.`);
            return;
          }
        }
      }
      questions.push(...expanded);
    }

    setLoading(true);
    try {
      const { data } = await api.post("/exams", {
        title: title.trim(),
        description: description.trim(),
        grade,
        durationMinutes: Number(durationMinutes) || 45,
        visibility,
        questions,
      });
      toast.success("Đã tạo đề thi!");
      navigate(`/exams/${data.exam.id}`);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50 px-4 py-8 sm:px-8">
      <form onSubmit={handleSubmit} className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">Tạo đề thi</h1>
            <p className="mt-1 text-sm text-gray-500">
              Mỗi phần thi chứa nhiều đề bài. Mỗi đề bài chọn dạng riêng rồi dán bộ câu hỏi.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50"
            >
              <Lock className="h-4 w-4" />
              {visibility ? visibilityLabel(visibility) : "Quyền riêng tư"}
            </button>
            <button
              type="submit"
              disabled={loading || !visibility}
              title={!visibility ? "Hãy chọn quyền riêng tư trước khi tạo đề" : undefined}
              className="rounded-xl bg-purple-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Tạo đề thi"}
            </button>
          </div>
        </div>

        <section className="mb-6 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-bold tracking-wide text-gray-400 uppercase">
            Thông tin chung
          </h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                Tên đề thi
              </span>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="VD: Đề thi giữa kỳ Tiếng Anh lớp 10"
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
                required
              />
            </label>
            <label className="sm:col-span-2">
              <span className="mb-1.5 block text-sm font-semibold text-gray-700">
                Mô tả đề thi
              </span>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="Ghi chú ngắn về nội dung, đối tượng hoặc mục tiêu của đề thi..."
                className="w-full resize-y rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
              />
            </label>
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

        <section className="space-y-4">
          {sections.map((section, index) => (
            <QuestionEditorCard
              key={section.id}
              section={section}
              index={index}
              total={sections.length}
              onChange={(next) => updateSection(index, next)}
              onAudioFile={(taskIndex, file) => handleAudioFile(index, taskIndex, file)}
              onRemove={() =>
                setSections((prev) =>
                  prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)
                )
              }
            />
          ))}
        </section>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={() => setSections((prev) => [...prev, createEmptySection()])}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-300 bg-white px-5 py-3 text-sm font-bold text-purple-700 transition hover:border-purple-500 hover:bg-purple-50"
          >
            <Plus className="h-4 w-4" />
            Thêm phần mới
          </button>
          <div className="flex flex-wrap items-center justify-end gap-2">
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
              disabled={loading || !visibility}
              title={!visibility ? "Hãy chọn quyền riêng tư trước khi tạo đề" : undefined}
              className="rounded-xl bg-purple-600 px-8 py-3 text-sm font-bold text-white shadow-md transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Đang tạo..." : "Tạo đề thi"}
            </button>
          </div>
        </div>
        {!visibility ? (
          <p className="mt-3 text-right text-xs font-semibold text-amber-600">
            Chọn quyền riêng tư trước khi tạo đề thi. Hệ thống không tự gán Công khai hay Riêng tư.
          </p>
        ) : null}
      </form>
      <ExamPrivacyModal
        open={privacyOpen}
        value={visibility}
        onClose={() => setPrivacyOpen(false)}
        onConfirm={setVisibility}
        shareUrl=""
      />
    </div>
  );
}

export default CreateExam;
