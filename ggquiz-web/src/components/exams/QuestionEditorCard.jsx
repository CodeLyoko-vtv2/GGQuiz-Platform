import { Plus, Trash2 } from "lucide-react";
import {
  EXAM_FORMATS,
  SMART_HINTS,
  applyFormatChange,
  createEmptyTask,
  getFormat,
  isListeningFormat,
  sectionTasks,
} from "../../utils/examFormats";
import { parseSmartExam } from "../../utils/parseSmartExam";

function previewLabel(item, format) {
  if (format.hasOptions > 0) {
    return item.correctKey ? `đáp án ${item.correctKey}` : "chưa gắn *";
  }
  if (item.correctKey) return `đáp án: ${item.correctKey}`;
  return "đã nhận đề";
}

function TaskEditor({ task, index, total, onChange, onRemove, onAudioFile }) {
  const format = getFormat(task.type);
  const parsed = parseSmartExam(task.body, format.id);
  const hint = SMART_HINTS[format.id] || SMART_HINTS.mcq;

  return (
    <div className="rounded-2xl border border-gray-200 bg-slate-50/80 p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-bold text-gray-900">Đề bài {index + 1}</h4>
        <div className="flex items-center gap-2">
          <select
            value={format.id}
            onChange={(e) => onChange(applyFormatChange(task, e.target.value))}
            className="max-w-[16rem] rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs font-semibold text-gray-700 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200 sm:max-w-xs sm:text-sm"
            aria-label={`Dạng bài của đề bài ${index + 1}`}
          >
            {EXAM_FORMATS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onRemove}
            disabled={total <= 1}
            className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
            aria-label={`Xóa đề bài ${index + 1}`}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      <label className="mb-4 block">
        <span className="mb-1.5 block text-sm font-semibold text-gray-700">
          Đề bài chung
        </span>
        <textarea
          value={task.instruction}
          onChange={(e) => onChange({ ...task, instruction: e.target.value })}
          rows={isListeningFormat(task.type) || format.hasPassage ? 3 : 2}
          placeholder={
            format.hasPassage
              ? "Câu lệnh hướng dẫn hoặc đoạn văn dùng chung cho đề bài này..."
              : "VD: Mark the letter A, B, C or D to indicate the correct answer..."
          }
          className="w-full resize-y rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        />
      </label>

      {isListeningFormat(task.type) ? (
        <label className="mb-4 block">
          <span className="mb-1.5 block text-sm font-semibold text-gray-700">
            File nghe
          </span>
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => onAudioFile?.(e.target.files?.[0] || null)}
            className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-3 py-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-purple-100 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-purple-700"
          />
          {task.audioUrl ? (
            <audio controls src={task.audioUrl} className="mt-2 w-full">
              Trình duyệt không hỗ trợ audio.
            </audio>
          ) : null}
        </label>
      ) : null}

      <div className="mb-3 rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-3">
        <p className="mb-1.5 text-[11px] font-bold tracking-wide text-slate-500 uppercase">
          Hướng dẫn định dạng
        </p>
        <pre className="max-h-48 overflow-auto font-mono text-[12px] leading-relaxed whitespace-pre-wrap text-slate-700 select-text">
          {hint}
        </pre>
      </div>

      <label className="block">
        <span className="mb-1.5 block text-sm font-semibold text-gray-700">
          Nội dung bộ câu hỏi
        </span>
        <textarea
          value={task.body}
          onChange={(e) => onChange({ ...task, body: e.target.value })}
          rows={10}
          placeholder="Dán hoặc soạn bộ câu hỏi theo mẫu phía trên..."
          spellCheck={false}
          className="w-full resize-y rounded-2xl border border-gray-200 bg-white px-4 py-4 font-mono text-sm leading-relaxed text-gray-800 outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-200"
        />
      </label>

      <p className="mt-2 text-xs leading-relaxed text-gray-400">
        Dùng <span className="font-semibold text-gray-500">Câu 1:</span> để tách câu,{" "}
        <span className="font-semibold text-gray-500">A. B. C. D.</span> cho đáp án,{" "}
        <span className="font-semibold text-gray-500">*</span> cuối đáp án đúng,{" "}
        <span className="font-semibold text-gray-500">**</span> hoặc{" "}
        <span className="font-semibold text-gray-500">Lời giải:</span> cho phần giải thích.
      </p>

      {parsed.questions.length > 0 ? (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-purple-50 px-2.5 py-1 text-[11px] font-semibold text-purple-700">
            {parsed.questions.length} câu đã nhận
          </span>
          {parsed.questions.map((item, qIndex) => (
            <span
              key={`${task.id}-pv-${qIndex}`}
              className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-gray-600 ring-1 ring-gray-200"
            >
              Câu {qIndex + 1}: {previewLabel(item, format)}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function QuestionEditorCard({
  section,
  index,
  total,
  onChange,
  onRemove,
  onAudioFile,
}) {
  const tasks = sectionTasks(section);

  const updateTask = (taskIndex, nextTask) => {
    onChange({
      ...section,
      tasks: tasks.map((item, i) => (i === taskIndex ? nextTask : item)),
    });
  };

  const addTask = () => {
    onChange({
      ...section,
      tasks: [...tasks, createEmptyTask()],
    });
  };

  const removeTask = (taskIndex) => {
    if (tasks.length <= 1) return;
    onChange({
      ...section,
      tasks: tasks.filter((_, i) => i !== taskIndex),
    });
  };

  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-5 flex items-center justify-between gap-3">
        <h3 className="text-base font-bold text-gray-900">Phần {index + 1}</h3>
        <button
          type="button"
          onClick={onRemove}
          disabled={total <= 1}
          className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-40"
          aria-label="Xóa phần thi"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <label className="mb-5 block">
        <span className="mb-1.5 block text-sm font-semibold text-gray-700">
          Phần thi <span className="text-red-500">*</span>
        </span>
        <input
          type="text"
          value={section.sectionTitle}
          onChange={(e) => onChange({ ...section, sectionTitle: e.target.value })}
          placeholder="VD: Phần I: Đọc hiểu, Phần II: Nghe hiểu..."
          required
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
        />
      </label>

      <div className="space-y-4">
        {tasks.map((task, taskIndex) => (
          <TaskEditor
            key={task.id}
            task={task}
            index={taskIndex}
            total={tasks.length}
            onChange={(next) => updateTask(taskIndex, next)}
            onRemove={() => removeTask(taskIndex)}
            onAudioFile={(file) => onAudioFile?.(taskIndex, file)}
          />
        ))}
      </div>

      <button
        type="button"
        onClick={addTask}
        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-600 transition hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700"
      >
        <Plus className="h-4 w-4" />
        Thêm đề bài mới
      </button>
    </article>
  );
}

export default QuestionEditorCard;
