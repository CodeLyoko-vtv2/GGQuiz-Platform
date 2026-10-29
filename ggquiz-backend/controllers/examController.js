const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const GRADE_OPTIONS = new Set([
  "Lớp 6",
  "Lớp 7",
  "Lớp 8",
  "Lớp 9",
  "Lớp 10",
  "Lớp 11",
  "Lớp 12",
  "Đại học",
]);

const VISIBILITY_OPTIONS = new Set(["public", "private", "unlisted"]);

function canViewExam(exam, userId) {
  const visibility = exam.visibility || "public";
  if (visibility === "public" || visibility === "unlisted") return true;
  return Boolean(userId && exam.userId === userId);
}

function parseVisibility(raw, { required = false } = {}) {
  const value = String(raw || "").trim().toLowerCase();
  if (!value) return required ? null : undefined;
  return VISIBILITY_OPTIONS.has(value) ? value : null;
}

const QUESTION_FORMATS = new Set([
  "mcq",
  "pronunciation",
  "cloze",
  "reading",
  "listening_tf",
  "listening_mcq",
  "word_form",
  "sentence_rewrite",
  "writing",
  "speaking",
]);

function stripHtml(value) {
  return String(value || "")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function resolveQuestionType(question) {
  const raw = String(question?.type || "").toLowerCase();
  if (raw === "standard") return "mcq";
  if (raw === "listening") return "listening_mcq";
  if (QUESTION_FORMATS.has(raw)) return raw;
  if (question?.audioUrl) return "listening_mcq";
  if (question?.passage) return "reading";
  return "mcq";
}

function formatQuestion(question) {
  return {
    id: question.id,
    prompt: question.prompt,
    type: resolveQuestionType(question),
    audioUrl: question.audioUrl,
    passage: question.passage,
    options: Array.isArray(question.options) ? question.options : [],
    correctKey: question.correctKey || "",
    explanation: question.explanation || "",
    meta: question.meta && typeof question.meta === "object" ? question.meta : {},
  };
}

function formatExam(exam, { includeQuestions = false, isSaved = false } = {}) {
  return {
    id: exam.id,
    title: exam.title,
    description: exam.description || "",
    grade: exam.grade,
    durationMinutes: exam.durationMinutes,
    attemptCount: exam.attemptCount || 0,
    downloadCount: exam.downloadCount || 0,
    saveCount: exam.saveCount || 0,
    createdAt: exam.createdAt,
    lastAccessedAt: exam.lastAccessedAt,
    userId: exam.userId,
    user: exam.user || null,
    isSaved: Boolean(isSaved),
    visibility: exam.visibility || "public",
    questionCount: exam._count?.questions ?? exam.questions?.length ?? 0,
    questions: includeQuestions
      ? (exam.questions || []).map(formatQuestion)
      : undefined,
  };
}

function normalizeQuestions(questions) {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question, index) => {
      const options = Array.isArray(question.options)
        ? question.options
            .map((opt) => ({
              key: String(opt.key || "").trim().toUpperCase(),
              text: String(opt.text || "").trim(),
            }))
            .filter((opt) => opt.key)
        : [];

      const prompt = String(question.prompt || "").trim();
      const rawKey = String(question.correctKey || "").trim();
      const correctKey = /^[A-D]$/i.test(rawKey) ? rawKey.toUpperCase() : rawKey;
      const passage = String(question.passage || "").trim();
      const audioUrl = question.audioUrl ? String(question.audioUrl) : null;
      const meta =
        question.meta && typeof question.meta === "object"
          ? {
              starter: String(question.meta.starter || ""),
              expectedAnswer: String(question.meta.expectedAnswer || ""),
              sectionTitle: String(question.meta.sectionTitle || ""),
              instruction: String(question.meta.instruction || ""),
              sectionId: String(question.meta.sectionId || ""),
              taskId: String(question.meta.taskId || ""),
            }
          : {};

      return {
        prompt,
        type: resolveQuestionType(question),
        audioUrl,
        passage: passage || null,
        options,
        correctKey,
        explanation: String(question.explanation || "").trim() || null,
        meta,
        sortOrder: index,
      };
    })
    .filter((question) => stripHtml(question.prompt));
}

const examListInclude = {
  user: { select: { id: true, name: true } },
  _count: { select: { questions: true } },
};

exports.listExams = async (req, res) => {
  try {
    const userId = req.user?.id;
    const filter = String(req.query.filter || "all").toLowerCase();
    const valid = ["all", "created", "saved", "recent"];
    if (!valid.includes(filter)) {
      return res.status(400).json({
        message: "Bộ lọc không hợp lệ. Dùng: all, created, saved, recent",
      });
    }

    let savedIds = new Set();
    if (userId) {
      const savedRows = await prisma.examSave.findMany({
        where: { userId },
        select: { examId: true },
      });
      savedIds = new Set(savedRows.map((row) => row.examId));
    }

    let exams = [];

    if (filter === "created") {
      if (userId) {
        exams = await prisma.exam.findMany({
          where: { userId },
          include: examListInclude,
          orderBy: { createdAt: "desc" },
        });
      }
    } else if (filter === "saved") {
      if (userId) {
        const saves = await prisma.examSave.findMany({
          where: { userId },
          include: { exam: { include: examListInclude } },
          orderBy: { createdAt: "desc" },
        });
        exams = saves.map((row) => row.exam).filter(Boolean);
      }
    } else if (filter === "recent") {
      if (userId) {
        const views = await prisma.examView.findMany({
          where: { userId },
          include: { exam: { include: examListInclude } },
          orderBy: { viewedAt: "desc" },
        });
        exams = views.map((row) => row.exam).filter(Boolean);
      }
    } else {
      exams = await prisma.exam.findMany({
        where: userId
          ? { OR: [{ visibility: "public" }, { userId }] }
          : { visibility: "public" },
        include: examListInclude,
        orderBy: { createdAt: "desc" },
      });
    }

    return res.status(200).json({
      exams: exams.map((exam) =>
        formatExam(exam, { isSaved: savedIds.has(exam.id) })
      ),
      filter,
    });
  } catch (error) {
    console.error("List exams error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getExamById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID đề thi không hợp lệ" });
    }

    const exam = await prisma.exam.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, name: true } },
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { questions: true } },
      },
    });

    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy đề thi" });
    }

    const viewerId = req.user?.id;
    if (!canViewExam(exam, viewerId)) {
      return res.status(403).json({ message: "Đề thi này ở chế độ riêng tư" });
    }

    await prisma.exam.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    });

    let isSaved = false;
    if (viewerId) {
      await prisma.examView.upsert({
        where: { userId_examId: { userId: viewerId, examId: id } },
        create: { userId: viewerId, examId: id },
        update: { viewedAt: new Date() },
      });
      const save = await prisma.examSave.findUnique({
        where: { userId_examId: { userId: viewerId, examId: id } },
      });
      isSaved = Boolean(save);
    }

    return res.status(200).json({
      exam: formatExam(exam, { includeQuestions: true, isSaved }),
    });
  } catch (error) {
    console.error("Get exam by id error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.createExam = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const title = String(req.body?.title || "").trim();
    const description = String(req.body?.description || "").trim();
    const grade = String(req.body?.grade || "Lớp 10").trim();
    const durationMinutes = Number(req.body?.durationMinutes);
    const questions = normalizeQuestions(req.body?.questions);
    const visibility = parseVisibility(req.body?.visibility, { required: true });

    if (!title) {
      return res.status(400).json({ message: "Vui lòng nhập tên đề thi" });
    }

    if (!visibility) {
      return res.status(400).json({
        message: "Vui lòng chọn quyền riêng tư trước khi tạo đề thi",
      });
    }

    if (!GRADE_OPTIONS.has(grade)) {
      return res.status(400).json({ message: "Khối / lớp không hợp lệ" });
    }

    if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 300) {
      return res.status(400).json({ message: "Thời gian làm bài không hợp lệ" });
    }

    if (questions.length === 0) {
      return res.status(400).json({ message: "Cần ít nhất một câu hỏi" });
    }

    for (const [index, question] of questions.entries()) {
      const n = index + 1;
      const choice4 = ["mcq", "pronunciation", "cloze", "reading", "listening_mcq"];
      if (choice4.includes(question.type)) {
        if (question.options.length !== 4 || question.options.some((opt) => !opt.text)) {
          return res.status(400).json({
            message: `Câu ${n}: hãy điền đủ 4 đáp án A–D`,
          });
        }
        if (!question.options.some((opt) => opt.key === question.correctKey)) {
          return res.status(400).json({
            message: `Câu ${n}: đáp án đúng không hợp lệ`,
          });
        }
      }
      if (question.type === "listening_tf") {
        if (question.options.length < 2) {
          question.options = [
            { key: "A", text: "True" },
            { key: "B", text: "False" },
          ];
        }
        if (!["A", "B"].includes(question.correctKey)) {
          question.correctKey = "A";
        }
      }
      if (question.type === "word_form" && !question.correctKey) {
        return res.status(400).json({
          message: `Câu ${n}: hãy nhập đáp án dạng từ`,
        });
      }
    }

    const exam = await prisma.exam.create({
      data: {
        title,
        description: description || null,
        grade,
        durationMinutes,
        visibility,
        userId,
        questions: {
          create: questions,
        },
      },
      include: {
        user: { select: { id: true, name: true } },
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { questions: true } },
      },
    });

    return res.status(201).json({
      message: "Tạo đề thi thành công",
      exam: formatExam(exam, { includeQuestions: true }),
    });
  } catch (error) {
    console.error("Create exam error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.toggleSaveExam = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID đề thi không hợp lệ" });
    }

    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy đề thi" });
    }

    const existing = await prisma.examSave.findUnique({
      where: {
        userId_examId: { userId, examId: id },
      },
    });

    let isSaved;
    let saveCount;

    if (existing) {
      await prisma.$transaction([
        prisma.examSave.delete({
          where: { userId_examId: { userId, examId: id } },
        }),
        prisma.exam.update({
          where: { id },
          data: { saveCount: { decrement: 1 } },
        }),
      ]);
      isSaved = false;
      const updated = await prisma.exam.findUnique({
        where: { id },
        select: { saveCount: true },
      });
      saveCount = Math.max(0, updated?.saveCount ?? 0);
      if (updated && updated.saveCount < 0) {
        await prisma.exam.update({
          where: { id },
          data: { saveCount: 0 },
        });
        saveCount = 0;
      }
    } else {
      await prisma.$transaction([
        prisma.examSave.create({
          data: { userId, examId: id },
        }),
        prisma.exam.update({
          where: { id },
          data: { saveCount: { increment: 1 } },
        }),
      ]);
      isSaved = true;
      const updated = await prisma.exam.findUnique({
        where: { id },
        select: { saveCount: true },
      });
      saveCount = updated?.saveCount ?? 1;
    }

    return res.status(200).json({
      message: isSaved ? "Đã lưu đề thi" : "Đã bỏ lưu đề thi",
      isSaved,
      saveCount,
      examId: id,
    });
  } catch (error) {
    console.error("Toggle save exam error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.recordExamDownload = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID đề thi không hợp lệ" });
    }

    const exam = await prisma.exam.findUnique({
      where: { id },
      select: { id: true, userId: true, visibility: true },
    });
    if (!exam) {
      return res.status(404).json({ message: "Không tìm thấy đề thi" });
    }
    if (!canViewExam(exam, req.user?.id)) {
      return res.status(403).json({ message: "Đề thi này ở chế độ riêng tư" });
    }

    const updated = await prisma.exam.update({
      where: { id },
      data: { downloadCount: { increment: 1 } },
      select: { downloadCount: true },
    });

    return res.status(200).json({
      downloadCount: updated.downloadCount || 0,
    });
  } catch (error) {
    console.error("Record exam download error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.updateExam = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID đề thi không hợp lệ" });
    }

    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return res.status(404).json({ message: "Không tìm thấy đề thi" });
    if (exam.userId !== userId) {
      return res.status(403).json({ message: "Chỉ người tạo đề mới được chỉnh sửa" });
    }

    const data = {};
    if (req.body?.title != null) {
      const title = String(req.body.title).trim();
      if (!title) return res.status(400).json({ message: "Vui lòng nhập tên đề thi" });
      data.title = title;
    }
    if (req.body?.description != null) {
      data.description = String(req.body.description).trim() || null;
    }
    if (req.body?.grade != null) {
      const grade = String(req.body.grade).trim();
      if (!GRADE_OPTIONS.has(grade)) {
        return res.status(400).json({ message: "Khối / lớp không hợp lệ" });
      }
      data.grade = grade;
    }
    if (req.body?.durationMinutes != null) {
      const durationMinutes = Number(req.body.durationMinutes);
      if (!Number.isInteger(durationMinutes) || durationMinutes < 5 || durationMinutes > 300) {
        return res.status(400).json({ message: "Thời gian làm bài không hợp lệ" });
      }
      data.durationMinutes = durationMinutes;
    }
    if (req.body?.visibility != null) {
      const visibility = parseVisibility(req.body.visibility, { required: true });
      if (!visibility) {
        return res.status(400).json({ message: "Quyền riêng tư không hợp lệ" });
      }
      data.visibility = visibility;
    }

    const updated = await prisma.exam.update({
      where: { id },
      data,
      include: {
        user: { select: { id: true, name: true } },
        questions: { orderBy: { sortOrder: "asc" } },
        _count: { select: { questions: true } },
      },
    });

    return res.json({
      message: "Đã cập nhật đề thi",
      exam: formatExam(updated, { includeQuestions: true }),
    });
  } catch (error) {
    console.error("Update exam error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.deleteExam = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID đề thi không hợp lệ" });
    }

    const exam = await prisma.exam.findUnique({ where: { id } });
    if (!exam) return res.status(404).json({ message: "Không tìm thấy đề thi" });
    if (exam.userId !== userId) {
      return res.status(403).json({ message: "Chỉ người tạo đề mới được xóa" });
    }

    await prisma.exam.delete({ where: { id } });
    return res.json({ message: "Đã xóa đề thi" });
  } catch (error) {
    console.error("Delete exam error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
