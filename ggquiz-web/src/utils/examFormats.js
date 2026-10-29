export const DEFAULT_FORMAT = "mcq";

export const EXAM_FORMATS = [
  {
    id: "mcq",
    label: "1. Trắc nghiệm thông thường",
    shortLabel: "Trắc nghiệm",
    hasOptions: 4,
    hasPassage: false,
    hasAudio: false,
    richPrompt: false,
  },
  {
    id: "pronunciation",
    label: "2. Trắc nghiệm phát âm",
    shortLabel: "Phát âm",
    hasOptions: 4,
    hasPassage: false,
    hasAudio: false,
    richPrompt: false,
  },
  {
    id: "cloze",
    label: "3. Đọc điền từ",
    shortLabel: "Đọc điền từ",
    hasOptions: 4,
    hasPassage: true,
    hasAudio: false,
    richPrompt: false,
  },
  {
    id: "reading",
    label: "4. Đọc hiểu",
    shortLabel: "Đọc hiểu",
    hasOptions: 4,
    hasPassage: true,
    hasAudio: false,
    richPrompt: false,
  },
  {
    id: "listening_tf",
    label: "5. Nghe True/False",
    shortLabel: "Nghe Đ/S",
    hasOptions: 2,
    hasPassage: false,
    hasAudio: true,
    richPrompt: false,
  },
  {
    id: "listening_mcq",
    label: "6. Nghe trắc nghiệm",
    shortLabel: "Nghe TN",
    hasOptions: 4,
    hasPassage: false,
    hasAudio: true,
    richPrompt: false,
  },
  {
    id: "word_form",
    label: "7. Điền từ",
    shortLabel: "Điền từ",
    hasOptions: 0,
    hasPassage: false,
    hasAudio: false,
    richPrompt: false,
  },
  {
    id: "sentence_rewrite",
    label: "8. Viết câu",
    shortLabel: "Viết câu",
    hasOptions: 0,
    hasPassage: false,
    hasAudio: false,
    richPrompt: false,
  },
  {
    id: "writing",
    label: "9. Viết luận",
    shortLabel: "Viết",
    hasOptions: 0,
    hasPassage: false,
    hasAudio: false,
    richPrompt: true,
  },
  {
    id: "speaking",
    label: "10. Nói",
    shortLabel: "Nói",
    hasOptions: 0,
    hasPassage: false,
    hasAudio: false,
    richPrompt: true,
  },
];

const FORMAT_MAP = new Map(EXAM_FORMATS.map((item) => [item.id, item]));

export function getFormat(type) {
  return FORMAT_MAP.get(normalizeFormat(type)) || FORMAT_MAP.get(DEFAULT_FORMAT);
}

export function normalizeFormat(type) {
  const raw = String(type || "").toLowerCase();
  if (raw === "standard") return "mcq";
  if (raw === "listening") return "listening_mcq";
  if (FORMAT_MAP.has(raw)) return raw;
  return DEFAULT_FORMAT;
}

export function isChoiceFormat(type) {
  return getFormat(type).hasOptions > 0;
}

export function isPassageFormat(type) {
  return getFormat(type).hasPassage;
}

export function isListeningFormat(type) {
  return getFormat(type).hasAudio;
}

export function isOpenFormat(type) {
  const id = normalizeFormat(type);
  return id === "writing" || id === "speaking";
}

export function isManualGradeFormat(type) {
  const id = normalizeFormat(type);
  return id === "sentence_rewrite" || id === "writing" || id === "speaking";
}

export function examIsManualReview(questions) {
  const list = Array.isArray(questions) ? questions : [];
  return list.length > 0 && list.every((item) => isManualGradeFormat(item.type));
}

export function summarizeSubmission(answers) {
  let words = 0;
  let audioCount = 0;
  Object.values(answers || {}).forEach((value) => {
    if (value && typeof value === "object" && (value.dataUrl || value.blobUrl)) {
      audioCount += 1;
      return;
    }
    const text = stripHtml(String(value || ""));
    if (text) words += text.split(/\s+/).filter(Boolean).length;
  });
  return { words, audioCount };
}

export function essayToPlainText(value) {
  return String(value || "")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

export function stripHtml(value) {
  return String(value || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function scoreAutoExam(questions, answers) {
  let correct = 0;
  let autoTotal = 0;
  (questions || []).forEach((question) => {
    if (isManualGradeFormat(question.type)) return;
    autoTotal += 1;
    const raw = answers?.[question.id];
    const given = typeof raw === "object" ? "" : String(raw || "").trim();
    const key = String(question.correctKey || "").trim();
    if (!key || !given) return;
    if (question.type === "word_form") {
      if (given.toLowerCase() === key.toLowerCase()) correct += 1;
      return;
    }
    if (given === key) correct += 1;
  });
  return { correct, autoTotal, maxScore: autoTotal };
}

export function formatSubmitTime(date = new Date()) {
  const value = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(value.getTime())) return "—";
  const hh = String(value.getHours()).padStart(2, "0");
  const mm = String(value.getMinutes()).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  const month = String(value.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mm} - ${day}/${month}/${value.getFullYear()}`;
}

export function formatWorkDuration(seconds) {
  const safe = Math.max(0, Math.round(Number(seconds) || 0));
  if (safe < 60) return `${safe} giây`;
  return `${Math.round(safe / 60)} phút`;
}

export function submissionLengthLabel(answers) {
  const { words, audioCount } = summarizeSubmission(answers);
  if (audioCount > 0 && words > 0) return `${words} từ / ${audioCount} file ghi âm`;
  if (audioCount > 0) return `${audioCount} file ghi âm`;
  return `${words} từ`;
}

export function sanitizeHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, "")
    .replace(/\son\w+=("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

function defaultOptions(count) {
  if (count === 2) {
    return [
      { key: "A", text: "True" },
      { key: "B", text: "False" },
    ];
  }
  if (count === 4) {
    return ["A", "B", "C", "D"].map((key) => ({ key, text: "" }));
  }
  return [];
}

export function createEmptyQuestion(type = DEFAULT_FORMAT) {
  const format = getFormat(type);
  const options = defaultOptions(format.hasOptions);
  return {
    id: `q-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    prompt: "",
    type: format.id,
    audioUrl: null,
    passage: "",
    options,
    correctKey: options[0]?.key || "",
    explanation: "",
    meta: { starter: "", expectedAnswer: "", sectionTitle: "", instruction: "" },
  };
}

function nextId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createEmptyTask(type = DEFAULT_FORMAT) {
  return {
    id: nextId("task"),
    type: getFormat(type).id,
    instruction: "",
    body: "",
    audioUrl: null,
  };
}

export function createEmptySection(type = DEFAULT_FORMAT) {
  return {
    id: nextId("sec"),
    sectionTitle: "",
    tasks: [createEmptyTask(type)],
  };
}

export function applyFormatChange(task, type) {
  return {
    ...task,
    type: getFormat(type).id,
  };
}

export function sectionTasks(section) {
  if (Array.isArray(section?.tasks) && section.tasks.length > 0) {
    return section.tasks;
  }
  return [
    {
      id: section?.id || nextId("task"),
      type: section?.type || DEFAULT_FORMAT,
      instruction: section?.instruction || "",
      body: section?.body || "",
      audioUrl: section?.audioUrl || null,
    },
  ];
}

export function sectionKey(question) {
  const meta = question?.meta || {};
  if (meta.taskId) return String(meta.taskId);
  return [
    meta.sectionId || "",
    normalizeFormat(question?.type),
    meta.sectionTitle || "",
    meta.instruction || "",
    question?.passage || "",
    question?.audioUrl || "",
  ].join("\u0001");
}

export function groupExamQuestions(questions) {
  const groups = [];
  (questions || []).forEach((question, index) => {
    const type = normalizeFormat(question.type);
    const key = sectionKey(question);
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.items.push({ question, index });
      return;
    }

    const sectionTitle = question.meta?.sectionTitle || "";
    groups.push({
      id: `grp-${question.id}`,
      key,
      type,
      passage: String(question.passage || "").trim(),
      audioUrl: question.audioUrl || "",
      sectionTitle,
      showSectionTitle: Boolean(sectionTitle) && sectionTitle !== last?.sectionTitle,
      instruction: question.meta?.instruction || "",
      items: [{ question, index }],
    });
  });
  return groups;
}

export const SMART_HINTS = {
  mcq: `Cấu trúc:
Câu 1: [Nội dung câu hỏi]
A. [Đáp án]
B. [Đáp án đúng]*
C. [Đáp án]
D. [Đáp án]
** [Lời giải]

Ví dụ:
Câu 1: Choose the best answer to complete the sentence.
A. go
B. goes*
C. going
D. gone
** Chủ ngữ số ít đi với "goes".`,
  pronunciation: `Cấu trúc:
Câu 1: A. [từ 1]    B. [từ 2]    C. [từ 3]    D. [từ đúng]*

Ví dụ:
Câu 1: A. dedicated    B. animation    C. sales    D. general*`,
  cloze: `Cấu trúc:
[Đoạn văn có chỗ trống (10), (11)...]
Câu 10: A. [đáp án]*    B. [đáp án]    C. [đáp án]    D. [đáp án]
** [Lời giải]

Ví dụ:
Dán đoạn văn có chỗ trống (10), (11)... rồi:
Câu 10: A. inspiring*    B. inspiration    C. inspire    D. inspirationally
** inspiring phù hợp vị trí tính từ.`,
  reading: `Cấu trúc:
[Đoạn đọc hiểu]
Câu 1: [Câu hỏi]
A. [Đáp án]
B. [Đáp án đúng]*
C. [Đáp án]
D. [Đáp án]

Ví dụ:
The library is a quiet place for students to read.
Câu 1: Which is the best title?
A. A noisy market
B. A quiet library*
C. A football match
D. A cooking class`,
  listening_tf: `Cấu trúc:
Câu 1: [Câu nhận định]
A. True*
B. False

Ví dụ:
Câu 1: The New Year begins after midnight on December 31st.
A. True*
B. False`,
  listening_mcq: `Cấu trúc:
Câu 1: [Câu hỏi sau khi nghe]
A. [Đáp án]
B. [Đáp án đúng]*
C. [Đáp án]
D. [Đáp án]

Ví dụ:
Câu 1: Which benefit is mentioned?
A. Option A
B. Option B*
C. Option C
D. Option D`,
  word_form: `Cấu trúc:
Câu 1: [Câu có chỗ trống __________] ([TỪ GỐC])
** [dạng từ đúng]

Ví dụ:
Câu 1: Developing __________ thinking skills is essential. (CRITIC)
** critical`,
  sentence_rewrite: `Cấu trúc:
Câu 1: [Câu gốc / ý cần viết lại] ([TỪ GỢI Ý])
Gợi ý: [phần bắt đầu câu]
** [câu viết lại hoàn chỉnh]

Ví dụ:
Câu 1: Our classroom is hot. I don't like our classroom. (BECAUSE)
Gợi ý: I don't like
** I don't like our classroom because it is hot.`,
  writing: `Cấu trúc:
Câu 1: [Đề bài / chủ đề viết luận, kèm yêu cầu độ dài nếu có]

Ví dụ:
Câu 1: Write a paragraph (120-150 words) about your last holiday.`,
  speaking: `Cấu trúc:
Câu 1: [Đề bài nói / tình huống, kèm thời lượng gợi ý]

Ví dụ:
Câu 1: Introduce yourself and talk about your favorite subject (1-2 minutes).`,
};
