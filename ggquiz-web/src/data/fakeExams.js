/** Fake data cho UI Luyện đề — sẽ thay bằng API sau */

export const GRADE_OPTIONS = [
  "Lớp 6",
  "Lớp 7",
  "Lớp 8",
  "Lớp 9",
  "Lớp 10",
  "Lớp 11",
  "Lớp 12",
  "Đại học",
];

const SAMPLE_AUDIO =
  "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3";

export const FAKE_EXAMS = [
  {
    id: "exam-1",
    title: "Đề thi Tiếng Anh giữa kỳ — Lớp 10",
    grade: "Lớp 10",
    durationMinutes: 45,
    attemptCount: 1284,
    description: "Đề ôn tập giữa kỳ gồm nghe, đọc hiểu và ngữ pháp.",
    createdAt: "2026-09-12T08:00:00.000Z",
    questions: [
      {
        id: "q1",
        prompt: "What is the main topic of the conversation?",
        type: "listening",
        audioUrl: SAMPLE_AUDIO,
        passage: null,
        options: [
          { key: "A", text: "Booking a hotel room" },
          { key: "B", text: "Planning a school trip" },
          { key: "C", text: "Buying concert tickets" },
          { key: "D", text: "Ordering food online" },
        ],
        correctKey: "B",
        explanation:
          "Người nói nhắc đến lịch trình tham quan và xe buýt nhà trường → chủ đề là chuyến đi thực tế của lớp.",
      },
      {
        id: "q2",
        prompt: "According to the passage, why do many students prefer online learning?",
        type: "reading",
        audioUrl: null,
        passage:
          "In recent years, online learning has become increasingly popular among high school students. Many learners say that digital classes help them manage time better because they can review lessons whenever they need. Teachers also provide recorded videos, quizzes, and discussion boards so students can practice after school. However, some students still struggle with self-discipline and limited internet access at home.",
        options: [
          { key: "A", text: "It is always cheaper than offline classes" },
          { key: "B", text: "They can review lessons flexibly" },
          { key: "C", text: "Teachers no longer give homework" },
          { key: "D", text: "Internet access is unlimited everywhere" },
        ],
        correctKey: "B",
        explanation:
          "Đoạn văn nêu rõ học sinh thích học online vì có thể ôn bài bất cứ lúc nào (review lessons whenever they need).",
      },
      {
        id: "q3",
        prompt: "Choose the best word to complete the sentence: She is interested _____ learning Japanese.",
        type: "standard",
        audioUrl: null,
        passage: null,
        options: [
          { key: "A", text: "on" },
          { key: "B", text: "in" },
          { key: "C", text: "at" },
          { key: "D", text: "for" },
        ],
        correctKey: "B",
        explanation: "Cấu trúc cố định: be interested in + V-ing/N.",
      },
      {
        id: "q4",
        prompt: "Which sentence is grammatically correct?",
        type: "standard",
        audioUrl: null,
        passage: null,
        options: [
          { key: "A", text: "He don't like spicy food." },
          { key: "B", text: "He doesn't likes spicy food." },
          { key: "C", text: "He doesn't like spicy food." },
          { key: "D", text: "He not like spicy food." },
        ],
        correctKey: "C",
        explanation: "Hiện tại đơn ngôi 3 số ít: doesn't + động từ nguyên mẫu.",
      },
      {
        id: "q5",
        prompt: "What does the word “self-discipline” in the passage mostly mean?",
        type: "reading",
        audioUrl: null,
        passage:
          "In recent years, online learning has become increasingly popular among high school students. Many learners say that digital classes help them manage time better because they can review lessons whenever they need. Teachers also provide recorded videos, quizzes, and discussion boards so students can practice after school. However, some students still struggle with self-discipline and limited internet access at home.",
        options: [
          { key: "A", text: "Khả năng tự kiểm soát bản thân" },
          { key: "B", text: "Khả năng nói trước đám đông" },
          { key: "C", text: "Khả năng ghi nhớ từ vựng" },
          { key: "D", text: "Khả năng chạy phần mềm" },
        ],
        correctKey: "A",
        explanation:
          "Self-discipline = kỷ luật tự giác / khả năng tự kiểm soát để hoàn thành việc học.",
      },
      {
        id: "q6",
        prompt: "Find the synonym of “popular”.",
        type: "standard",
        audioUrl: null,
        passage: null,
        options: [
          { key: "A", text: "rare" },
          { key: "B", text: "common / well-liked" },
          { key: "C", text: "hidden" },
          { key: "D", text: "difficult" },
        ],
        correctKey: "B",
        explanation: "Popular ≈ được nhiều người yêu thích / phổ biến.",
      },
      {
        id: "q7",
        prompt: "When will the school bus leave according to the listening?",
        type: "listening",
        audioUrl: SAMPLE_AUDIO,
        passage: null,
        options: [
          { key: "A", text: "6:30 a.m." },
          { key: "B", text: "7:00 a.m." },
          { key: "C", text: "7:30 a.m." },
          { key: "D", text: "8:15 a.m." },
        ],
        correctKey: "C",
        explanation: "Trong đoạn nghe (demo), đáp án đúng được gắn sẵn là 7:30 a.m.",
      },
      {
        id: "q8",
        prompt: "Choose the correct passive form: They built this school in 1998.",
        type: "standard",
        audioUrl: null,
        passage: null,
        options: [
          { key: "A", text: "This school was built in 1998." },
          { key: "B", text: "This school is built in 1998." },
          { key: "C", text: "This school has built in 1998." },
          { key: "D", text: "This school were built in 1998." },
        ],
        correctKey: "A",
        explanation: "Quá khứ đơn bị động: was/were + V3. Chủ ngữ số ít → was built.",
      },
    ],
  },
  {
    id: "exam-2",
    title: "Đề Reading & Writing — IELTS Foundation",
    grade: "Đại học",
    durationMinutes: 60,
    attemptCount: 856,
    description: "Luyện kỹ năng đọc hiểu và viết câu cho trình độ nền tảng.",
    createdAt: "2026-10-01T10:00:00.000Z",
    questions: [
      {
        id: "e2q1",
        prompt: "The writer’s main purpose is to _____",
        type: "reading",
        audioUrl: null,
        passage:
          "Urban green spaces play an important role in modern cities. Parks and tree-lined streets reduce air pollution, lower stress levels, and encourage people to exercise outdoors. City planners now consider green areas as essential infrastructure rather than optional decoration.",
        options: [
          { key: "A", text: "criticize city parks" },
          { key: "B", text: "explain the value of urban green spaces" },
          { key: "C", text: "compare rural and urban lifestyles" },
          { key: "D", text: "describe a famous garden" },
        ],
        correctKey: "B",
        explanation: "Toàn đoạn nhấn mạnh vai trò/giá trị của không gian xanh đô thị.",
      },
      {
        id: "e2q2",
        prompt: "Which word is closest in meaning to “essential”?",
        type: "standard",
        audioUrl: null,
        passage: null,
        options: [
          { key: "A", text: "unnecessary" },
          { key: "B", text: "optional" },
          { key: "C", text: "vital" },
          { key: "D", text: "temporary" },
        ],
        correctKey: "C",
        explanation: "Essential ≈ vital / cần thiết.",
      },
      {
        id: "e2q3",
        prompt: "Complete: If it rains tomorrow, we _____ stay at home.",
        type: "standard",
        audioUrl: null,
        passage: null,
        options: [
          { key: "A", text: "will" },
          { key: "B", text: "would" },
          { key: "C", text: "have" },
          { key: "D", text: "had" },
        ],
        correctKey: "A",
        explanation: "Câu điều kiện loại 1: If + hiện tại, will + V.",
      },
      {
        id: "e2q4",
        prompt: "What can green spaces encourage people to do?",
        type: "reading",
        audioUrl: null,
        passage:
          "Urban green spaces play an important role in modern cities. Parks and tree-lined streets reduce air pollution, lower stress levels, and encourage people to exercise outdoors.",
        options: [
          { key: "A", text: "Work longer hours" },
          { key: "B", text: "Exercise outdoors" },
          { key: "C", text: "Avoid public transport" },
          { key: "D", text: "Buy more cars" },
        ],
        correctKey: "B",
        explanation: "Đoạn văn nói rõ: encourage people to exercise outdoors.",
      },
      {
        id: "e2q5",
        prompt: "Choose the best topic sentence for a paragraph about recycling.",
        type: "standard",
        audioUrl: null,
        passage: null,
        options: [
          { key: "A", text: "Recycling helps protect the environment in several ways." },
          { key: "B", text: "My favorite color is green." },
          { key: "C", text: "Yesterday I bought a new phone." },
          { key: "D", text: "Football is popular worldwide." },
        ],
        correctKey: "A",
        explanation: "Câu chủ đề phải nêu ý chính của đoạn về tái chế.",
      },
    ],
  },
  {
    id: "exam-3",
    title: "Đề Nghe hiểu cơ bản — Lớp 12",
    grade: "Lớp 12",
    durationMinutes: 30,
    attemptCount: 432,
    description: "Tập trung kỹ năng nghe với đoạn hội thoại ngắn.",
    createdAt: "2026-08-20T07:30:00.000Z",
    questions: [
      {
        id: "e3q1",
        prompt: "Where does the conversation most likely take place?",
        type: "listening",
        audioUrl: SAMPLE_AUDIO,
        passage: null,
        options: [
          { key: "A", text: "At a library" },
          { key: "B", text: "At a restaurant" },
          { key: "C", text: "At an airport" },
          { key: "D", text: "At a hospital" },
        ],
        correctKey: "B",
        explanation: "Demo: gắn đáp án nhà hàng dựa trên ngữ cảnh đặt món.",
      },
      {
        id: "e3q2",
        prompt: "What does the woman want to order?",
        type: "listening",
        audioUrl: SAMPLE_AUDIO,
        passage: null,
        options: [
          { key: "A", text: "A pizza" },
          { key: "B", text: "A salad" },
          { key: "C", text: "A steak" },
          { key: "D", text: "A sandwich" },
        ],
        correctKey: "D",
        explanation: "Demo đáp án: sandwich.",
      },
      {
        id: "e3q3",
        prompt: "How long will they wait?",
        type: "listening",
        audioUrl: SAMPLE_AUDIO,
        passage: null,
        options: [
          { key: "A", text: "5 minutes" },
          { key: "B", text: "10 minutes" },
          { key: "C", text: "15 minutes" },
          { key: "D", text: "30 minutes" },
        ],
        correctKey: "C",
        explanation: "Demo đáp án: 15 minutes.",
      },
      {
        id: "e3q4",
        prompt: "Choose the correct reported speech: She said, “I am tired.”",
        type: "standard",
        audioUrl: null,
        passage: null,
        options: [
          { key: "A", text: "She said she is tired." },
          { key: "B", text: "She said she was tired." },
          { key: "C", text: "She said she were tired." },
          { key: "D", text: "She said she be tired." },
        ],
        correctKey: "B",
        explanation: "Lùi thì: am → was trong câu tường thuật.",
      },
    ],
  },
];

const STORAGE_KEY = "ggquiz_fake_exams_v1";

export function loadExams() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return FAKE_EXAMS;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return FAKE_EXAMS;
    return parsed;
  } catch {
    return FAKE_EXAMS;
  }
}

export function saveExams(exams) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(exams));
}

export function getExamById(id) {
  return loadExams().find((exam) => String(exam.id) === String(id)) || null;
}

export function upsertExam(exam) {
  const exams = loadExams();
  const index = exams.findIndex((item) => String(item.id) === String(exam.id));
  if (index >= 0) {
    exams[index] = exam;
  } else {
    exams.unshift(exam);
  }
  saveExams(exams);
  return exam;
}

export { createEmptyQuestion } from "../utils/examFormats";
