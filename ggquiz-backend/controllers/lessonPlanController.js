const { PrismaClient } = require("@prisma/client");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { exportLessonPdf } = require("../services/lessonPdf");

const prisma = new PrismaClient();

const SUBJECTS = ["Tiếng Anh", "Ngữ văn", "Toán", "Khoa học", "Sử - Địa", "Khác"];
const GRADES = ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Đại học"];
const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
].filter(Boolean);

function uid() {
  return `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function block(type, extra = {}) {
  return { id: uid(), type, text: "", items: [], data: {}, ...extra };
}

function defaultContent(title = "Giáo án mới") {
  return [
    block("heading1", { text: title }),
    block("paragraph", { text: "Gõ / để chèn tiêu đề, bảng, hình ảnh hoặc công cụ GGQuiz." }),
  ];
}

function sanitizeBlocks(raw) {
  if (!Array.isArray(raw)) return defaultContent();
  return raw
    .filter((item) => item && typeof item === "object" && item.type)
    .map((item) => ({
      id: String(item.id || uid()),
      type: String(item.type),
      text: String(item.text || ""),
      items: Array.isArray(item.items) ? item.items.map((row) => String(row ?? "")) : [],
      data: item.data && typeof item.data === "object" ? item.data : {},
      rows: Array.isArray(item.rows) ? item.rows : undefined,
    }));
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function defaultHtml(title = "Giáo án mới") {
  return `<h1 style="text-align:center">${escapeHtml(title)}</h1>
<p style="text-align:center"><em>LESSON PLAN</em></p>
<table style="width:100%;border-collapse:collapse" border="1">
<tbody>
<tr><td><strong>School</strong></td><td></td><td><strong>Teacher</strong></td><td></td></tr>
<tr><td><strong>Class</strong></td><td></td><td><strong>Date</strong></td><td></td></tr>
</tbody>
</table>
<h2>I. OBJECTIVES</h2>
<p>By the end of the lesson, students will be able to:</p>
<ul>
<li>Knowledge:</li>
<li>Competences:</li>
<li>Personal qualities:</li>
</ul>
<h2>II. MATERIALS</h2>
<p>Textbook, board, pictures...</p>
<h2>III. PROCEDURE</h2>
<table style="width:100%;border-collapse:collapse" border="1">
<thead><tr><th>Stage</th><th>Teacher's activities</th><th>Students' activities</th></tr></thead>
<tbody>
<tr><td>Warm-up</td><td></td><td></td></tr>
<tr><td>Presentation</td><td></td><td></td></tr>
<tr><td>Practice</td><td></td><td></td></tr>
<tr><td>Production</td><td></td><td></td></tr>
</tbody>
</table>
<h2>IV. HOMEWORK</h2>
<p></p>`;
}

function blocksToHtml(raw) {
  if (typeof raw === "string" && raw.trim()) return raw;
  if (!Array.isArray(raw)) return "";
  return raw
    .map((item) => {
      const text = escapeHtml(item.text || "");
      if (String(item.type || "").startsWith("heading")) {
        const level = item.type.replace(/\D/g, "") || "2";
        return `<h${level}>${text}</h${level}>`;
      }
      if (item.type === "bullet" && Array.isArray(item.items)) {
        return `<ul>${item.items.map((row) => `<li>${escapeHtml(row)}</li>`).join("")}</ul>`;
      }
      return text ? `<p>${text}</p>` : "";
    })
    .join("");
}

function resolveHtml(plan) {
  if (plan?.htmlContent) return plan.htmlContent;
  return blocksToHtml(plan?.content) || defaultHtml(plan?.title);
}

function formatPlan(plan, { includeContent = false } = {}) {
  return {
    id: plan.id,
    title: plan.title,
    description: plan.description || "",
    subject: plan.subject || "Tiếng Anh",
    grade: plan.grade || "Lớp 10",
    status: plan.status || "draft",
    visibility: plan.visibility || "private",
    createdAt: plan.createdAt,
    updatedAt: plan.updatedAt,
    lastAccessedAt: plan.lastAccessedAt,
    author: plan.user ? { id: plan.user.id, name: plan.user.name } : null,
    isOwner: undefined,
    htmlContent: includeContent ? resolveHtml(plan) : undefined,
    pdfUrl: plan.pdfUrl || "",
    previewUrl: plan.previewUrl || "",
    pageCount: plan.pageCount || 0,
    content: includeContent ? sanitizeBlocks(plan.content) : undefined,
  };
}

function canView(plan, userId) {
  if (plan.visibility === "public" || plan.visibility === "unlisted") return true;
  return Boolean(userId && plan.userId === userId);
}

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("MISSING_GEMINI_KEY");
  return new GoogleGenerativeAI(apiKey);
}

function withTimeout(promise, ms, label = "timeout") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

function extractJson(text) {
  const raw = String(text || "").trim();
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1] : raw;
  const start = candidate.search(/[\[{]/);
  if (start < 0) return null;
  const sliced = candidate.slice(start);
  try {
    return JSON.parse(sliced);
  } catch {
    const endObj = sliced.lastIndexOf("}");
    const endArr = sliced.lastIndexOf("]");
    const end = Math.max(endObj, endArr);
    if (end > 0) {
      try {
        return JSON.parse(sliced.slice(0, end + 1));
      } catch {
        return null;
      }
    }
  }
  return null;
}

async function askGeminiJson(prompt, { timeoutMs = 22000 } = {}) {
  const genAI = getGenAI();
  let lastError = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.4,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
        timeoutMs,
        `Gemini timeout (${modelName})`
      );
      const parsed = extractJson(result?.response?.text?.() || "");
      if (parsed) return parsed;
    } catch (error) {
      lastError = error;
      if (!/404|not found|NOT_FOUND/i.test(String(error.message || ""))) {
        /* try next */
      }
    }
  }
  if (lastError) throw lastError;
  return null;
}

function fallbackLesson(prompt) {
  const title = String(prompt || "Giáo án 45 phút")
    .replace(/^tạo giáo án\s*/i, "")
    .slice(0, 80) || "Giáo án 45 phút";
  return [
    block("heading1", { text: title }),
    block("heading2", { text: "Mục tiêu bài học" }),
    block("bullet", {
      items: [
        "Nắm được kiến thức trọng tâm của bài.",
        "Luyện kỹ năng nghe – nói – đọc – viết.",
        "Vận dụng từ vựng và ngữ pháp vào tình huống thực tế.",
      ],
    }),
    block("heading2", { text: "Hoạt động 1: Khởi động" }),
    block("paragraph", { text: "Giáo viên dẫn dắt chủ đề, kích hoạt kiến thức nền (5–7 phút)." }),
    block("heading2", { text: "Hoạt động 2: Hình thành kiến thức" }),
    block("paragraph", { text: "Trình bày nội dung mới, kết hợp ví dụ và luyện tập có kiểm soát (15–20 phút)." }),
    block("heading2", { text: "Hoạt động 3: Luyện tập – vận dụng" }),
    block("paragraph", { text: "Học sinh làm việc nhóm/cá nhân, giáo viên hỗ trợ và chữa lỗi (10–12 phút)." }),
    block("heading2", { text: "Bài tập về nhà" }),
    block("bullet", { items: ["Ôn lại từ vựng bài học.", "Hoàn thành bài tập trong sách."] }),
  ];
}

function normalizeGeneratedBlocks(parsed, prompt) {
  const list = Array.isArray(parsed) ? parsed : parsed?.blocks || parsed?.content;
  if (!Array.isArray(list) || !list.length) return fallbackLesson(prompt);
  return sanitizeBlocks(
    list.map((item) => ({
      ...item,
      id: uid(),
      type: item.type || "paragraph",
    }))
  );
}

async function listLessonPlans(req, res) {
  try {
    const userId = req.user.id;
    const plans = await prisma.lessonPlan.findMany({
      where: { userId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { updatedAt: "desc" },
    });
    return res.json({
      lessonPlans: plans.map((item) => ({ ...formatPlan(item), isOwner: true })),
    });
  } catch (error) {
    console.error("List lesson plans error:", error);
    return res.status(500).json({ message: "Không thể tải giáo án" });
  }
}

async function getLessonPlan(req, res) {
  try {
    const plan = await prisma.lessonPlan.findUnique({
      where: { id: Number(req.params.id) },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy giáo án" });
    if (!canView(plan, req.user?.id)) {
      return res.status(403).json({ message: "Giáo án này đang ở chế độ riêng tư" });
    }
    if (req.user?.id === plan.userId) {
      await prisma.lessonPlan.update({
        where: { id: plan.id },
        data: { lastAccessedAt: new Date() },
      });
    }
    return res.json({
      lessonPlan: {
        ...formatPlan(plan, { includeContent: true }),
        isOwner: req.user?.id === plan.userId,
      },
    });
  } catch (error) {
    console.error("Get lesson plan error:", error);
    return res.status(500).json({ message: "Không thể tải giáo án" });
  }
}

async function createLessonPlan(req, res) {
  try {
    const title = String(req.body.title || "Giáo án mới").trim() || "Giáo án mới";
    const created = await prisma.lessonPlan.create({
      data: {
        title,
        description: String(req.body.description || "").trim() || null,
        subject: SUBJECTS.includes(req.body.subject) ? req.body.subject : "Tiếng Anh",
        grade: GRADES.includes(req.body.grade) ? req.body.grade : "Lớp 10",
        status: req.body.status === "published" ? "published" : "draft",
        visibility: ["public", "unlisted", "private"].includes(req.body.visibility)
          ? req.body.visibility
          : "private",
        content: sanitizeBlocks(req.body.content || []),
        htmlContent: String(req.body.htmlContent || defaultHtml(title)),
        userId: req.user.id,
        lastAccessedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true } } },
    });
    return res.status(201).json({
      message: "Đã tạo giáo án",
      lessonPlan: { ...formatPlan(created, { includeContent: true }), isOwner: true },
    });
  } catch (error) {
    console.error("Create lesson plan error:", error);
    return res.status(500).json({ message: "Không thể tạo giáo án" });
  }
}

async function updateLessonPlan(req, res) {
  try {
    const plan = await prisma.lessonPlan.findUnique({ where: { id: Number(req.params.id) } });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy giáo án" });
    if (plan.userId !== req.user.id) {
      return res.status(403).json({ message: "Chỉ tác giả mới sửa được giáo án" });
    }
    const data = {};
    if (req.body.title != null) data.title = String(req.body.title).trim() || plan.title;
    if (req.body.description != null) data.description = String(req.body.description).trim();
    if (SUBJECTS.includes(req.body.subject)) data.subject = req.body.subject;
    if (GRADES.includes(req.body.grade)) data.grade = req.body.grade;
    if (req.body.status === "draft" || req.body.status === "published") data.status = req.body.status;
    if (["public", "unlisted", "private"].includes(req.body.visibility)) {
      data.visibility = req.body.visibility;
    }
    if (req.body.content != null) data.content = sanitizeBlocks(req.body.content);
    if (req.body.htmlContent != null) data.htmlContent = String(req.body.htmlContent);
    if (req.body.export === true || data.status === "published") {
      const html = data.htmlContent != null ? data.htmlContent : resolveHtml(plan);
      const title = data.title || plan.title;
      try {
        const pdf = await exportLessonPdf({ id: plan.id, title, html });
        data.htmlContent = html;
        data.pdfUrl = pdf.pdfUrl;
        data.previewUrl = pdf.previewUrl;
        data.pageCount = pdf.pageCount;
      } catch (error) {
        console.error("Lesson PDF export skipped:", error.message);
      }
    }
    const updated = await prisma.lessonPlan.update({
      where: { id: plan.id },
      data,
      include: { user: { select: { id: true, name: true } } },
    });
    return res.json({
      message: "Đã lưu giáo án",
      lessonPlan: { ...formatPlan(updated, { includeContent: true }), isOwner: true },
    });
  } catch (error) {
    console.error("Update lesson plan error:", error);
    return res.status(500).json({ message: "Không thể lưu giáo án" });
  }
}

async function deleteLessonPlan(req, res) {
  try {
    const plan = await prisma.lessonPlan.findUnique({ where: { id: Number(req.params.id) } });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy giáo án" });
    if (plan.userId !== req.user.id) {
      return res.status(403).json({ message: "Chỉ tác giả mới xóa được giáo án" });
    }
    await prisma.lessonPlan.delete({ where: { id: plan.id } });
    return res.json({ message: "Đã xóa giáo án" });
  } catch (error) {
    console.error("Delete lesson plan error:", error);
    return res.status(500).json({ message: "Không thể xóa giáo án" });
  }
}

async function duplicateLessonPlan(req, res) {
  try {
    const plan = await prisma.lessonPlan.findUnique({
      where: { id: Number(req.params.id) },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy giáo án" });
    if (plan.userId !== req.user.id && plan.visibility === "private") {
      return res.status(403).json({ message: "Không thể nhân bản giáo án riêng tư" });
    }
    const created = await prisma.lessonPlan.create({
      data: {
        title: `${plan.title} (bản sao)`,
        description: plan.description,
        subject: plan.subject,
        grade: plan.grade,
        status: "draft",
        visibility: "private",
        content: sanitizeBlocks(plan.content),
        htmlContent: resolveHtml(plan),
        userId: req.user.id,
      },
      include: { user: { select: { id: true, name: true } } },
    });
    return res.status(201).json({
      message: "Đã nhân bản giáo án",
      lessonPlan: { ...formatPlan(created, { includeContent: true }), isOwner: true },
    });
  } catch (error) {
    console.error("Duplicate lesson plan error:", error);
    return res.status(500).json({ message: "Không thể nhân bản giáo án" });
  }
}

async function generateLessonPlan(req, res) {
  try {
    const prompt = String(req.body.prompt || "").trim();
    if (!prompt) return res.status(400).json({ message: "Vui lòng nhập yêu cầu giáo án" });
    let blocks = fallbackLesson(prompt);
    try {
      const parsed = await askGeminiJson(
        `Bạn là giáo viên soạn giáo án giấy A4. Tạo giáo án HTML từ yêu cầu sau.
Trả JSON { "title": string, "subject": string, "grade": string, "html": string }.
html dùng h1, h2, p, ul, table (có border). Bắt buộc có: thông tin lớp, mục tiêu, học liệu, tiến trình (bảng), bài tập về nhà.
Dùng tiếng Việt, cụ thể, 45 phút nếu không nêu khác.
Yêu cầu: ${prompt}`
      );
      if (parsed) {
        blocks = normalizeGeneratedBlocks(parsed, prompt);
        const title = String(parsed.title || prompt).slice(0, 120);
        return res.json({
          title,
          subject: SUBJECTS.includes(parsed.subject) ? parsed.subject : "Tiếng Anh",
          grade: GRADES.includes(parsed.grade) ? parsed.grade : "Lớp 10",
          html: parsed.html || blocksToHtml(blocks),
          blocks,
        });
      }
    } catch (error) {
      console.warn("Generate lesson AI fallback:", error.message);
    }
    return res.json({
      title: prompt.slice(0, 80) || "Giáo án mới",
      subject: "Tiếng Anh",
      grade: "Lớp 10",
      html: defaultHtml(prompt.slice(0, 80) || "Giáo án mới"),
      blocks,
      fallback: true,
    });
  } catch (error) {
    console.error("Generate lesson plan error:", error);
    return res.status(500).json({ message: "Không thể tạo giáo án bằng AI" });
  }
}

async function transformLessonSelection(req, res) {
  try {
    const text = String(req.body.text || "").trim();
    const action = String(req.body.action || "").trim();
    if (!text) return res.status(400).json({ message: "Chưa có đoạn văn được chọn" });

    if (action === "questions") {
      let questions = [];
      try {
        const parsed = await askGeminiJson(
          `Đọc đoạn văn và tạo đúng 5 câu trắc nghiệm tiếng Anh/Việt phù hợp.
JSON: { "questions": [{ "prompt": string, "options": ["A...","B...","C...","D..."], "correct": 0-3 }] }
Đoạn văn:\n${text.slice(0, 4000)}`
        );
        questions = Array.isArray(parsed?.questions) ? parsed.questions.slice(0, 5) : [];
      } catch (error) {
        console.warn("Lesson questions AI:", error.message);
      }
      if (!questions.length) {
        questions = [1, 2, 3, 4, 5].map((n) => ({
          prompt: `Câu ${n}: What is the main idea of the passage?`,
          options: ["Idea A", "Idea B", "Idea C", "Idea D"],
          correct: 0,
        }));
      }
      return res.json({
        block: block("quiz", {
          data: { questions, source: text.slice(0, 240) },
        }),
      });
    }

    if (action === "vocab") {
      let rows = [];
      try {
        const parsed = await askGeminiJson(
          `Trích 6-10 từ khó trong đoạn văn. JSON: { "rows": [{ "word": "", "meaning": "", "example": "" }] }
Đoạn văn:\n${text.slice(0, 4000)}`
        );
        rows = Array.isArray(parsed?.rows) ? parsed.rows.slice(0, 12) : [];
      } catch (error) {
        console.warn("Lesson vocab AI:", error.message);
      }
      if (!rows.length) {
        const words = text
          .split(/\s+/)
          .filter((w) => w.length > 6)
          .slice(0, 6);
        rows = words.map((word) => ({
          word: word.replace(/[^\p{L}-]/gu, ""),
          meaning: "—",
          example: "",
        }));
      }
      return res.json({ block: block("vocab", { data: { rows } }) });
    }

    if (action === "translate" || action === "summarize") {
      let output = "";
      try {
        const parsed = await askGeminiJson(
          action === "translate"
            ? `Dịch đoạn sau sang tiếng Việt. JSON: { "text": "..." }\n${text.slice(0, 4000)}`
            : `Tóm tắt đoạn văn 3-5 câu bằng tiếng Việt. JSON: { "text": "..." }\n${text.slice(0, 4000)}`
        );
        output = String(parsed?.text || "").trim();
      } catch (error) {
        console.warn("Lesson transform AI:", error.message);
      }
      if (!output) output = text.slice(0, 400);
      return res.json({
        block: block("callout", {
          text: output,
          data: { emoji: action === "translate" ? "🌐" : "✨", label: action },
        }),
      });
    }

    return res.status(400).json({ message: "Hành động AI không hợp lệ" });
  } catch (error) {
    console.error("Transform lesson selection error:", error);
    return res.status(500).json({ message: "AI không xử lý được đoạn văn" });
  }
}

async function exportLessonPlan(req, res) {
  try {
    const plan = await prisma.lessonPlan.findUnique({
      where: { id: Number(req.params.id) },
      include: { user: { select: { id: true, name: true } } },
    });
    if (!plan) return res.status(404).json({ message: "Không tìm thấy giáo án" });
    if (plan.userId !== req.user.id) {
      return res.status(403).json({ message: "Chỉ tác giả mới xuất được giáo án" });
    }

    const html = req.body.htmlContent != null ? String(req.body.htmlContent) : resolveHtml(plan);
    const title = req.body.title != null ? String(req.body.title).trim() || plan.title : plan.title;

    let pdf;
    try {
      pdf = await exportLessonPdf({ id: plan.id, title, html });
    } catch (error) {
      console.error("Export PDF failed:", error);
      const updated = await prisma.lessonPlan.update({
        where: { id: plan.id },
        data: { htmlContent: html, title },
        include: { user: { select: { id: true, name: true } } },
      });
      return res.status(200).json({
        message: "Đã lưu bản nháp HTML. Chưa tạo được file PDF trên máy chủ.",
        lessonPlan: { ...formatPlan(updated, { includeContent: true }), isOwner: true },
        pdfError: true,
      });
    }

    const updated = await prisma.lessonPlan.update({
      where: { id: plan.id },
      data: {
        title,
        htmlContent: html,
        pdfUrl: pdf.pdfUrl,
        previewUrl: pdf.previewUrl,
        pageCount: pdf.pageCount,
        status: req.body.status === "draft" ? "draft" : "published",
      },
      include: { user: { select: { id: true, name: true } } },
    });
    return res.json({
      message: "Đã xuất bản giáo án PDF",
      lessonPlan: { ...formatPlan(updated, { includeContent: true }), isOwner: true },
    });
  } catch (error) {
    console.error("Export lesson plan error:", error);
    return res.status(500).json({ message: "Không thể xuất giáo án PDF" });
  }
}

module.exports = {
  listLessonPlans,
  getLessonPlan,
  createLessonPlan,
  updateLessonPlan,
  deleteLessonPlan,
  duplicateLessonPlan,
  generateLessonPlan,
  transformLessonSelection,
  exportLessonPlan,
};
