const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function asIdList(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item > 0)
    .slice(0, 20);
}

function asTags(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

exports.listSolutions = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
    const lessonId = parseId(req.query.lessonId);
    const chapterId = parseId(req.query.chapterId);
    const bookId = parseId(req.query.bookId);
    const subjectId = parseId(req.query.subjectId);
    const gradeId = parseId(req.query.gradeId);
    const q = String(req.query.q || "").trim();

    const where = {};
    if (q) where.title = { contains: q, mode: "insensitive" };
    if (lessonId) where.lessonId = lessonId;
    else {
      const lessonWhere = {};
      if (chapterId) lessonWhere.chapterId = chapterId;
      if (bookId) lessonWhere.chapter = { bookId };
      if (subjectId) lessonWhere.chapter = { ...(lessonWhere.chapter || {}), book: { subjectId } };
      if (gradeId) {
        lessonWhere.chapter = {
          ...(lessonWhere.chapter || {}),
          book: {
            ...((lessonWhere.chapter && lessonWhere.chapter.book) || {}),
            subject: { gradeId },
          },
        };
      }
      if (Object.keys(lessonWhere).length) where.lesson = lessonWhere;
    }

    const [total, solutions] = await Promise.all([
      prisma.solution.count({ where }),
      prisma.solution.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          author: { select: { id: true, name: true } },
          lesson: {
            include: {
              chapter: {
                include: {
                  book: {
                    include: {
                      grade: true,
                      subject: { include: { grade: true } },
                    },
                  },
                },
              },
            },
          },
        },
      }),
    ]);

    return res.json({
      solutions: solutions.map((item) => ({
        id: item.id,
        title: item.title,
        tags: item.tags || [],
        examIds: item.examIds || [],
        studySetIds: item.studySetIds || [],
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        author: item.author,
        lesson: {
          id: item.lesson.id,
          title: item.lesson.title,
          chapter: item.lesson.chapter.title,
          book: item.lesson.chapter.book.title,
          subject: item.lesson.chapter.book.subject?.name || "",
          grade: item.lesson.chapter.book.grade?.name || item.lesson.chapter.book.subject?.grade?.name || "",
        },
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("List solutions error:", error);
    return res.status(500).json({ message: "Không thể tải lời giải" });
  }
};

exports.getSolution = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const solution = await prisma.solution.findUnique({
      where: { id },
      include: {
        lesson: {
          include: {
            chapter: {
              include: {
                book: { include: { subject: { include: { grade: true } } } },
              },
            },
          },
        },
      },
    });
    if (!solution) return res.status(404).json({ message: "Không tìm thấy lời giải" });
    return res.json({ solution });
  } catch (error) {
    console.error("Get solution error:", error);
    return res.status(500).json({ message: "Không thể tải lời giải" });
  }
};

exports.createSolution = async (req, res) => {
  try {
    const lessonId = parseId(req.body.lessonId);
    const title = String(req.body.title || "").trim().slice(0, 200);
    if (!lessonId || !title) {
      return res.status(400).json({ message: "Vui lòng chọn bài học và nhập tiêu đề" });
    }
    const solution = await prisma.solution.create({
      data: {
        lessonId,
        title,
        content: String(req.body.content || ""),
        audioUrl: req.body.audioUrl ? String(req.body.audioUrl).slice(0, 500) : null,
        tags: asTags(req.body.tags),
        examIds: asIdList(req.body.examIds),
        studySetIds: asIdList(req.body.studySetIds),
        createdBy: req.admin.id,
      },
    });
    return res.status(201).json({ solution });
  } catch (error) {
    console.error("Create solution error:", error);
    return res.status(500).json({ message: "Không thể tạo lời giải" });
  }
};

exports.updateSolution = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const data = {};
    if (req.body.title != null) data.title = String(req.body.title).trim().slice(0, 200);
    if (req.body.content != null) data.content = String(req.body.content);
    if (req.body.lessonId != null) data.lessonId = parseId(req.body.lessonId);
    if (req.body.tags != null) data.tags = asTags(req.body.tags);
    if (req.body.examIds != null) data.examIds = asIdList(req.body.examIds);
    if (req.body.studySetIds != null) data.studySetIds = asIdList(req.body.studySetIds);
    if (req.body.audioUrl !== undefined) {
      data.audioUrl = req.body.audioUrl ? String(req.body.audioUrl).slice(0, 500) : null;
    }
    const solution = await prisma.solution.update({ where: { id }, data });
    return res.json({ solution });
  } catch (error) {
    console.error("Update solution error:", error);
    return res.status(500).json({ message: "Không thể cập nhật lời giải" });
  }
};

exports.upsertByLesson = async (req, res) => {
  try {
    const lessonId = parseId(req.params.lessonId);
    const title = String(req.body.title || "").trim().slice(0, 200);
    if (!lessonId || !title) {
      return res.status(400).json({ message: "Vui lòng nhập tiêu đề lời giải" });
    }
    const existing = await prisma.solution.findFirst({ where: { lessonId } });
    const data = {
      title,
      content: String(req.body.content || ""),
      audioUrl: req.body.audioUrl ? String(req.body.audioUrl).slice(0, 500) : null,
      tags: asTags(req.body.tags),
      examIds: asIdList(req.body.examIds),
      studySetIds: asIdList(req.body.studySetIds),
    };
    const solution = existing
      ? await prisma.solution.update({ where: { id: existing.id }, data })
      : await prisma.solution.create({
          data: { ...data, lessonId, createdBy: req.admin.id },
        });
    return res.json({ solution });
  } catch (error) {
    console.error("Upsert solution error:", error);
    return res.status(500).json({ message: "Không thể lưu lời giải" });
  }
};

exports.deleteSolution = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    await prisma.solution.delete({ where: { id } });
    return res.json({ message: "Đã xóa lời giải" });
  } catch (error) {
    console.error("Delete solution error:", error);
    return res.status(500).json({ message: "Không thể xóa lời giải" });
  }
};
