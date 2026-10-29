const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

const DEFAULT_GRADES = [
  ...Array.from({ length: 12 }, (_, index) => ({
    name: `Lớp ${index + 1}`,
    slug: `lop-${index + 1}`,
    sortOrder: index + 1,
    subjects: [
      "Toán",
      "Ngữ văn",
      "Tiếng Anh",
      "Vật lý",
      "Hóa học",
      "Sinh học",
      "Lịch sử",
      "Địa lý",
      "GDCD",
      "Tin học",
    ],
  })),
  {
    name: "Đại học",
    slug: "dai-hoc",
    sortOrder: 20,
    subjects: ["Toán cao cấp", "Tiếng Anh", "Tin học", "Kinh tế", "Luật"],
  },
  {
    name: "IELTS",
    slug: "ielts",
    sortOrder: 21,
    subjects: ["Listening", "Reading", "Writing", "Speaking"],
  },
  {
    name: "TOEIC",
    slug: "toeic",
    sortOrder: 22,
    subjects: ["Listening", "Reading", "Speaking", "Writing"],
  },
  {
    name: "THPT Quốc gia",
    slug: "thptqg",
    sortOrder: 23,
    subjects: ["Toán", "Ngữ văn", "Tiếng Anh", "Vật lý", "Hóa học", "Sinh học", "Lịch sử", "Địa lý"],
  },
];

function toSlug(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function ensureAdminUser() {
  const existing = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  if (existing) return existing;

  const email = process.env.ADMIN_EMAIL || "admin@ggquiz.local";
  const password = process.env.ADMIN_PASSWORD || "Admin@123";
  const hashed = await bcrypt.hash(password, 10);

  const byEmail = await prisma.user.findUnique({ where: { email } });
  if (byEmail) {
    return prisma.user.update({
      where: { id: byEmail.id },
      data: { role: "ADMIN", status: "active" },
    });
  }

  return prisma.user.create({
    data: {
      name: "Quản trị viên",
      email,
      password: hashed,
      role: "ADMIN",
      status: "active",
      isVerified: true,
    },
  });
}

const DEFAULT_SERIES = [
  {
    name: "Global Success",
    slug: "global-success",
    description: "Sách giáo khoa Tiếng Anh Global Success dành cho chương trình phổ thông.",
    color: "#f59e0b",
    sortOrder: 1,
  },
  {
    name: "Chân trời sáng tạo",
    slug: "chan-troi-sang-tao",
    description: "Bộ sách giáo khoa Chân trời sáng tạo — học liệu chính quy các môn.",
    color: "#2563eb",
    sortOrder: 2,
  },
  {
    name: "Kết nối tri thức",
    slug: "ket-noi-tri-thuc",
    description: "Bộ sách Kết nối tri thức với cuộc sống, bìa và bài tập theo từng lớp.",
    color: "#16a34a",
    sortOrder: 3,
  },
  {
    name: "Cánh Diều",
    slug: "canh-dieu",
    description: "Bộ sách giáo khoa Cánh Diều cho tiểu học và THCS.",
    color: "#7c3aed",
    sortOrder: 4,
  },
  {
    name: "Global Maths & Science",
    slug: "global-maths",
    description: "Tiếng Anh tăng cường Toán và Khoa học (GM & GS).",
    color: "#ec4899",
    sortOrder: 5,
  },
  {
    name: "My Little Fun",
    slug: "my-little-fun",
    description: "Học liệu tiếng Anh vui nhộn dành cho học sinh tiểu học.",
    color: "#ef4444",
    sortOrder: 6,
  },
];

async function ensureSeriesSeed() {
  const count = await prisma.curriculumSeries.count();
  if (count > 0) return { seeded: false };
  await prisma.curriculumSeries.createMany({ data: DEFAULT_SERIES });
  return { seeded: true };
}

async function ensureSampleBook() {
  const series = await prisma.curriculumSeries.findFirst({ where: { slug: "global-success" } });
  const grade = await prisma.curriculumGrade.findFirst({ where: { slug: "lop-1" } });
  if (!series || !grade) return;
  const existing = await prisma.curriculumBook.findFirst({ where: { seriesId: series.id } });
  if (existing) return;
  await prisma.curriculumBook.create({
    data: {
      seriesId: series.id,
      gradeId: grade.id,
      title: "Tiếng Anh 1 - Sách học sinh",
      subtitle: "Sách học sinh",
      publisher: "NXB Giáo dục Việt Nam",
      pdfUrl: "/uploads/curriculum/pdf/sample-global-success.pdf",
      pageCount: 4,
      sortOrder: 1,
    },
  });
}

async function ensureSampleSolutions() {
  const book = await prisma.curriculumBook.findFirst({
    where: { title: { contains: "Tiếng Anh 1" } },
    include: { chapters: true },
  });
  if (!book || book.chapters.length) return;
  const admin = await prisma.user.findFirst({ where: { role: "ADMIN" } });
  const chapter = await prisma.curriculumChapter.create({
    data: {
      bookId: book.id,
      title: "Unit 1: Local community",
      sortOrder: 1,
      lessons: {
        create: [
          { title: "Từ vựng", sortOrder: 1 },
          { title: "Luyện tập từ vựng", sortOrder: 2 },
          { title: "A Closer Look 1", sortOrder: 3 },
        ],
      },
    },
    include: { lessons: true },
  });
  const vocab = chapter.lessons.find((item) => item.sortOrder === 3) || chapter.lessons[0];
  if (admin && vocab) {
    await prisma.solution.create({
      data: {
        lessonId: vocab.id,
        createdBy: admin.id,
        title: "A Closer Look 1 - Lời giải chi tiết",
        content: `<h3>Giải chi tiết</h3><table border="1" style="width:100%;border-collapse:collapse"><tr><td>1 - c</td><td>police officer: bảo vệ người và tài sản</td></tr><tr><td>2 - e</td><td>garbage collector: thu gom rác</td></tr></table><p>Nghe và nối từ với định nghĩa tương ứng.</p>`,
      },
    });
  }
}

async function ensureCurriculumSeed() {
  await ensureSeriesSeed();
  const gradeCount = await prisma.curriculumGrade.count();
  if (gradeCount === 0) {
    for (const grade of DEFAULT_GRADES) {
      await prisma.curriculumGrade.create({
        data: {
          name: grade.name,
          slug: grade.slug,
          sortOrder: grade.sortOrder,
          subjects: {
            create: grade.subjects.map((name, index) => ({
              name,
              slug: toSlug(name),
              sortOrder: index + 1,
            })),
          },
        },
      });
    }
  }
  await ensureSampleBook();
  await ensureSampleSolutions();
  return { seeded: gradeCount === 0 };
}

module.exports = {
  toSlug,
  ensureAdminUser,
  ensureCurriculumSeed,
  ensureSeriesSeed,
};
