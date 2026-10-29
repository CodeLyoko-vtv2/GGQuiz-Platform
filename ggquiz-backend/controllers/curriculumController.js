const { PrismaClient } = require("@prisma/client");
const { toSlug, ensureCurriculumSeed } = require("../data/curriculumSeed");

const prisma = new PrismaClient();

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function trim(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

exports.listGrades = async (req, res) => {
  try {
    await ensureCurriculumSeed();
    const grades = await prisma.curriculumGrade.findMany({
      orderBy: { sortOrder: "asc" },
      include: {
        _count: { select: { subjects: true } },
      },
    });
    return res.json({
      grades: grades.map((item) => ({
        id: item.id,
        name: item.name,
        slug: item.slug,
        sortOrder: item.sortOrder,
        subjectCount: item._count.subjects,
      })),
    });
  } catch (error) {
    console.error("List grades error:", error);
    return res.status(500).json({ message: "Không thể tải danh sách khối/lớp" });
  }
};

exports.createGrade = async (req, res) => {
  try {
    const name = trim(req.body.name, 80);
    if (!name) return res.status(400).json({ message: "Vui lòng nhập tên khối/lớp" });
    const slug = trim(req.body.slug, 80) || toSlug(name);
    const sortOrder = Number(req.body.sortOrder) || 99;
    const grade = await prisma.curriculumGrade.create({
      data: { name, slug, sortOrder },
    });
    return res.status(201).json({ grade });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Khối/lớp này đã tồn tại" });
    }
    console.error("Create grade error:", error);
    return res.status(500).json({ message: "Không thể tạo khối/lớp" });
  }
};

exports.updateGrade = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const data = {};
    if (req.body.name != null) data.name = trim(req.body.name, 80);
    if (req.body.slug != null) data.slug = trim(req.body.slug, 80) || toSlug(req.body.name);
    if (req.body.sortOrder != null) data.sortOrder = Number(req.body.sortOrder) || 0;
    const grade = await prisma.curriculumGrade.update({ where: { id }, data });
    return res.json({ grade });
  } catch (error) {
    console.error("Update grade error:", error);
    return res.status(500).json({ message: "Không thể cập nhật khối/lớp" });
  }
};

exports.deleteGrade = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    await prisma.curriculumGrade.delete({ where: { id } });
    return res.json({ message: "Đã xóa khối/lớp" });
  } catch (error) {
    console.error("Delete grade error:", error);
    return res.status(500).json({ message: "Không thể xóa khối/lớp" });
  }
};

exports.listSubjects = async (req, res) => {
  try {
    const gradeId = parseId(req.query.gradeId);
    if (!gradeId) return res.status(400).json({ message: "Thiếu khối/lớp" });
    const subjects = await prisma.curriculumSubject.findMany({
      where: { gradeId },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { books: true } } },
    });
    return res.json({
      subjects: subjects.map((item) => ({
        id: item.id,
        gradeId: item.gradeId,
        name: item.name,
        slug: item.slug,
        sortOrder: item.sortOrder,
        bookCount: item._count.books,
      })),
    });
  } catch (error) {
    console.error("List subjects error:", error);
    return res.status(500).json({ message: "Không thể tải môn học" });
  }
};

exports.createSubject = async (req, res) => {
  try {
    const gradeId = parseId(req.body.gradeId);
    const name = trim(req.body.name, 80);
    if (!gradeId || !name) {
      return res.status(400).json({ message: "Vui lòng chọn lớp và nhập tên môn" });
    }
    const subject = await prisma.curriculumSubject.create({
      data: {
        gradeId,
        name,
        slug: trim(req.body.slug, 80) || toSlug(name),
        sortOrder: Number(req.body.sortOrder) || 99,
      },
    });
    return res.status(201).json({ subject });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ message: "Môn học này đã tồn tại trong lớp" });
    }
    console.error("Create subject error:", error);
    return res.status(500).json({ message: "Không thể tạo môn học" });
  }
};

exports.updateSubject = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const data = {};
    if (req.body.name != null) data.name = trim(req.body.name, 80);
    if (req.body.slug != null) data.slug = trim(req.body.slug, 80) || toSlug(req.body.name);
    if (req.body.sortOrder != null) data.sortOrder = Number(req.body.sortOrder) || 0;
    const subject = await prisma.curriculumSubject.update({ where: { id }, data });
    return res.json({ subject });
  } catch (error) {
    console.error("Update subject error:", error);
    return res.status(500).json({ message: "Không thể cập nhật môn học" });
  }
};

exports.deleteSubject = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    await prisma.curriculumSubject.delete({ where: { id } });
    return res.json({ message: "Đã xóa môn học" });
  } catch (error) {
    console.error("Delete subject error:", error);
    return res.status(500).json({ message: "Không thể xóa môn học" });
  }
};

function bookPayload(body) {
  const data = {};
  if (body.title != null) data.title = trim(body.title, 160);
  if (body.subtitle !== undefined) data.subtitle = trim(body.subtitle, 200) || null;
  if (body.publisher !== undefined) data.publisher = trim(body.publisher, 120) || null;
  if (body.coverUrl !== undefined) {
    data.coverUrl = body.coverUrl ? String(body.coverUrl).slice(0, 900000) : null;
  }
  if (body.pdfUrl !== undefined) data.pdfUrl = body.pdfUrl ? String(body.pdfUrl).slice(0, 500) : null;
  if (body.pageCount !== undefined) data.pageCount = Number(body.pageCount) || null;
  if (body.sortOrder != null) data.sortOrder = Number(body.sortOrder) || 0;
  if (body.subjectId !== undefined) data.subjectId = parseId(body.subjectId);
  if (body.seriesId !== undefined) data.seriesId = parseId(body.seriesId);
  if (body.gradeId !== undefined) data.gradeId = parseId(body.gradeId);
  if (body.sourceBookId !== undefined) data.sourceBookId = parseId(body.sourceBookId);
  return data;
}

exports.listSeries = async (req, res) => {
  try {
    await ensureCurriculumSeed();
    const series = await prisma.curriculumSeries.findMany({
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { books: true } } },
    });
    return res.json({
      series: series.map((item) => ({
        ...item,
        bookCount: item._count.books,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error("List series error:", error);
    return res.status(500).json({ message: "Không thể tải bộ sách" });
  }
};

exports.createSeries = async (req, res) => {
  try {
    const name = trim(req.body.name, 120);
    if (!name) return res.status(400).json({ message: "Vui lòng nhập tên bộ sách" });
    const created = await prisma.curriculumSeries.create({
      data: {
        name,
        slug: trim(req.body.slug, 120) || toSlug(name),
        description: trim(req.body.description, 400) || null,
        color: trim(req.body.color, 20) || "#2563eb",
        coverUrl: req.body.coverUrl ? String(req.body.coverUrl).slice(0, 900000) : null,
        sortOrder: Number(req.body.sortOrder) || 99,
      },
    });
    return res.status(201).json({ series: created });
  } catch (error) {
    if (error.code === "P2002") return res.status(409).json({ message: "Bộ sách đã tồn tại" });
    console.error("Create series error:", error);
    return res.status(500).json({ message: "Không thể tạo bộ sách" });
  }
};

exports.updateSeries = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const data = {};
    if (req.body.name != null) data.name = trim(req.body.name, 120);
    if (req.body.description !== undefined) data.description = trim(req.body.description, 400) || null;
    if (req.body.color != null) data.color = trim(req.body.color, 20) || "#2563eb";
    if (req.body.coverUrl !== undefined) {
      data.coverUrl = req.body.coverUrl ? String(req.body.coverUrl).slice(0, 900000) : null;
    }
    if (req.body.sortOrder != null) data.sortOrder = Number(req.body.sortOrder) || 0;
    const series = await prisma.curriculumSeries.update({ where: { id }, data });
    return res.json({ series });
  } catch (error) {
    console.error("Update series error:", error);
    return res.status(500).json({ message: "Không thể cập nhật bộ sách" });
  }
};

exports.deleteSeries = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    await prisma.curriculumSeries.delete({ where: { id } });
    return res.json({ message: "Đã xóa bộ sách" });
  } catch (error) {
    console.error("Delete series error:", error);
    return res.status(500).json({ message: "Không thể xóa bộ sách" });
  }
};

exports.listBooks = async (req, res) => {
  try {
    const subjectId = parseId(req.query.subjectId);
    const seriesId = parseId(req.query.seriesId);
    const gradeId = parseId(req.query.gradeId);
    const where = {};
    if (subjectId) where.subjectId = subjectId;
    if (seriesId) where.seriesId = seriesId;
    if (gradeId) where.gradeId = gradeId;
    if (!subjectId && !seriesId) {
      return res.status(400).json({ message: "Thiếu bộ sách hoặc môn học" });
    }
    const books = await prisma.curriculumBook.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: {
        grade: true,
        series: true,
        _count: { select: { chapters: true, hotspots: true } },
      },
    });
    return res.json({
      books: books.map((item) => ({
        ...item,
        chapterCount: item._count.chapters,
        hotspotCount: item._count.hotspots,
        _count: undefined,
      })),
    });
  } catch (error) {
    console.error("List books error:", error);
    return res.status(500).json({ message: "Không thể tải cuốn sách" });
  }
};

exports.createBook = async (req, res) => {
  try {
    const title = trim(req.body.title, 160);
    const seriesId = parseId(req.body.seriesId);
    const subjectId = parseId(req.body.subjectId);
    const gradeId = parseId(req.body.gradeId);
    if (!title || (!seriesId && !subjectId)) {
      return res.status(400).json({ message: "Vui lòng nhập tên sách và chọn bộ sách hoặc môn" });
    }
    const book = await prisma.curriculumBook.create({
      data: {
        title,
        subtitle: trim(req.body.subtitle, 200) || null,
        publisher: trim(req.body.publisher, 120) || null,
        coverUrl: req.body.coverUrl ? String(req.body.coverUrl).slice(0, 900000) : null,
        pdfUrl: req.body.pdfUrl ? String(req.body.pdfUrl).slice(0, 500) : null,
        seriesId,
        subjectId,
        gradeId,
        sortOrder: Number(req.body.sortOrder) || 99,
      },
    });
    return res.status(201).json({ book });
  } catch (error) {
    console.error("Create book error:", error);
    return res.status(500).json({ message: "Không thể tạo cuốn sách" });
  }
};

exports.updateBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const book = await prisma.curriculumBook.update({
      where: { id },
      data: bookPayload(req.body),
    });
    return res.json({ book });
  } catch (error) {
    console.error("Update book error:", error);
    return res.status(500).json({ message: "Không thể cập nhật cuốn sách" });
  }
};

exports.getBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const book = await prisma.curriculumBook.findUnique({
      where: { id },
      include: {
        series: true,
        grade: true,
        subject: true,
        sourceBook: { select: { id: true, title: true } },
        hotspots: { orderBy: [{ page: "asc" }, { id: "asc" }] },
      },
    });
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });
    return res.json({ book });
  } catch (error) {
    console.error("Get book error:", error);
    return res.status(500).json({ message: "Không thể tải sách" });
  }
};

exports.deleteBook = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    await prisma.curriculumBook.delete({ where: { id } });
    return res.json({ message: "Đã xóa bộ sách" });
  } catch (error) {
    console.error("Delete book error:", error);
    return res.status(500).json({ message: "Không thể xóa bộ sách" });
  }
};

exports.getBookTree = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const book = await prisma.curriculumBook.findUnique({
      where: { id },
      include: {
        subject: { include: { grade: true } },
        chapters: {
          orderBy: { sortOrder: "asc" },
          include: {
            lessons: {
              orderBy: { sortOrder: "asc" },
              include: { _count: { select: { solutions: true } } },
            },
          },
        },
      },
    });
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });
    return res.json({
      book: {
        ...book,
        chapters: book.chapters.map((chapter) => ({
          ...chapter,
          lessons: chapter.lessons.map((lesson) => ({
            ...lesson,
            solutionCount: lesson._count.solutions,
            _count: undefined,
          })),
        })),
      },
    });
  } catch (error) {
    console.error("Get book tree error:", error);
    return res.status(500).json({ message: "Không thể tải cấu trúc sách" });
  }
};

exports.createChapter = async (req, res) => {
  try {
    const bookId = parseId(req.body.bookId);
    const title = trim(req.body.title, 160);
    if (!bookId || !title) return res.status(400).json({ message: "Vui lòng nhập tên chương" });
    const chapter = await prisma.curriculumChapter.create({
      data: {
        bookId,
        title,
        sortOrder: Number(req.body.sortOrder) || 99,
      },
    });
    return res.status(201).json({ chapter });
  } catch (error) {
    console.error("Create chapter error:", error);
    return res.status(500).json({ message: "Không thể tạo chương" });
  }
};

exports.updateChapter = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const data = {};
    if (req.body.title != null) data.title = trim(req.body.title, 160);
    if (req.body.sortOrder != null) data.sortOrder = Number(req.body.sortOrder) || 0;
    const chapter = await prisma.curriculumChapter.update({ where: { id }, data });
    return res.json({ chapter });
  } catch (error) {
    console.error("Update chapter error:", error);
    return res.status(500).json({ message: "Không thể cập nhật chương" });
  }
};

exports.deleteChapter = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    await prisma.curriculumChapter.delete({ where: { id } });
    return res.json({ message: "Đã xóa chương" });
  } catch (error) {
    console.error("Delete chapter error:", error);
    return res.status(500).json({ message: "Không thể xóa chương" });
  }
};

exports.createLesson = async (req, res) => {
  try {
    const chapterId = parseId(req.body.chapterId);
    const title = trim(req.body.title, 160);
    if (!chapterId || !title) return res.status(400).json({ message: "Vui lòng nhập tên bài học" });
    const lesson = await prisma.curriculumLesson.create({
      data: {
        chapterId,
        title,
        sortOrder: Number(req.body.sortOrder) || 99,
      },
    });
    return res.status(201).json({ lesson });
  } catch (error) {
    console.error("Create lesson error:", error);
    return res.status(500).json({ message: "Không thể tạo bài học" });
  }
};

exports.updateLesson = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const data = {};
    if (req.body.title != null) data.title = trim(req.body.title, 160);
    if (req.body.sortOrder != null) data.sortOrder = Number(req.body.sortOrder) || 0;
    const lesson = await prisma.curriculumLesson.update({ where: { id }, data });
    return res.json({ lesson });
  } catch (error) {
    console.error("Update lesson error:", error);
    return res.status(500).json({ message: "Không thể cập nhật bài học" });
  }
};

exports.deleteLesson = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    await prisma.curriculumLesson.delete({ where: { id } });
    return res.json({ message: "Đã xóa bài học" });
  } catch (error) {
    console.error("Delete lesson error:", error);
    return res.status(500).json({ message: "Không thể xóa bài học" });
  }
};
