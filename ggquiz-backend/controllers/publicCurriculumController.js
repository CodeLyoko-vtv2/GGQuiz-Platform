const { PrismaClient } = require("@prisma/client");
const { ensureCurriculumSeed } = require("../data/curriculumSeed");

const prisma = new PrismaClient();

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
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
        id: item.id,
        name: item.name,
        slug: item.slug,
        description: item.description,
        color: item.color,
        coverUrl: item.coverUrl,
        bookCount: item._count.books,
      })),
    });
  } catch (error) {
    console.error("Public series error:", error);
    return res.status(500).json({ message: "Không thể tải giáo trình" });
  }
};

exports.getSeries = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const gradeId = parseId(req.query.gradeId);
    const series = await prisma.curriculumSeries.findUnique({ where: { id } });
    if (!series) return res.status(404).json({ message: "Không tìm thấy bộ sách" });

    const grades = await prisma.curriculumGrade.findMany({
      where: { sortOrder: { lte: 12 } },
      orderBy: { sortOrder: "asc" },
    });

    const books = await prisma.curriculumBook.findMany({
      where: {
        seriesId: id,
        ...(gradeId ? { gradeId } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
      include: { grade: true },
    });

    return res.json({
      series,
      grades,
      books: books.map((item) => ({
        id: item.id,
        title: item.title,
        subtitle: item.subtitle,
        coverUrl: item.coverUrl,
        pdfUrl: item.pdfUrl,
        gradeId: item.gradeId,
        gradeName: item.grade?.name || "",
        publisher: item.publisher,
        sourceBookId: item.sourceBookId,
      })),
    });
  } catch (error) {
    console.error("Public series detail error:", error);
    return res.status(500).json({ message: "Không thể tải bộ sách" });
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
        hotspots: { orderBy: [{ page: "asc" }, { id: "asc" }] },
      },
    });
    if (!book) return res.status(404).json({ message: "Không tìm thấy sách" });
    return res.json({ book });
  } catch (error) {
    console.error("Public book error:", error);
    return res.status(500).json({ message: "Không thể tải sách điện tử" });
  }
};

exports.getBookToc = async (req, res) => {
  try {
    await ensureCurriculumSeed();
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const book = await prisma.curriculumBook.findUnique({
      where: { id },
      include: {
        series: true,
        grade: true,
        sourceBook: { select: { id: true, title: true, pdfUrl: true } },
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
        id: book.id,
        title: book.title,
        subtitle: book.subtitle,
        coverUrl: book.coverUrl,
        series: book.series,
        grade: book.grade,
        sourceBook: book.sourceBook,
        units: book.chapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          sortOrder: chapter.sortOrder,
          lessons: chapter.lessons.map((lesson) => ({
            id: lesson.id,
            title: lesson.title,
            sortOrder: lesson.sortOrder,
            hasSolution: lesson._count.solutions > 0,
          })),
        })),
      },
    });
  } catch (error) {
    console.error("Public TOC error:", error);
    return res.status(500).json({ message: "Không thể tải mục lục lời giải" });
  }
};

exports.getLessonSolution = async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const lesson = await prisma.curriculumLesson.findUnique({
      where: { id },
      include: {
        chapter: {
          include: {
            book: { include: { series: true, grade: true } },
            lessons: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true } },
          },
        },
        solutions: { orderBy: { updatedAt: "desc" }, take: 1 },
      },
    });
    if (!lesson) return res.status(404).json({ message: "Không tìm thấy bài học" });
    const solution = lesson.solutions[0] || null;
    return res.json({
      lesson: {
        id: lesson.id,
        title: lesson.title,
        unit: { id: lesson.chapter.id, title: lesson.chapter.title },
        book: {
          id: lesson.chapter.book.id,
          title: lesson.chapter.book.title,
          series: lesson.chapter.book.series,
          grade: lesson.chapter.book.grade,
        },
        siblings: lesson.chapter.lessons,
      },
      solution,
    });
  } catch (error) {
    console.error("Public lesson solution error:", error);
    return res.status(500).json({ message: "Không thể tải lời giải" });
  }
};
