const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { PrismaClient } = require("@prisma/client");
const { ensureAdminUser, ensureCurriculumSeed } = require("../data/curriculumSeed");

const prisma = new PrismaClient();

function signAuthToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function publicAdmin(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || "",
    status: user.status || "active",
    createdAt: user.createdAt,
  };
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function startOfDaysAgo(days) {
  const date = startOfToday();
  date.setDate(date.getDate() - days);
  return date;
}

exports.login = async (req, res) => {
  try {
    await ensureAdminUser();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    if (!email || !password) {
      return res.status(400).json({ message: "Vui lòng nhập email và mật khẩu" });
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }
    if (user.status === "banned") {
      return res.status(403).json({ message: "Tài khoản đã bị khóa" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Email hoặc mật khẩu không đúng" });
    }
    if (!["ADMIN", "TEACHER"].includes(user.role)) {
      return res.status(403).json({ message: "Tài khoản này chưa được cấp quyền quản trị" });
    }

    return res.json({
      message: "Đăng nhập quản trị thành công",
      token: signAuthToken(user),
      user: publicAdmin(user),
    });
  } catch (error) {
    console.error("Admin login error:", error);
    return res.status(500).json({ message: "Không thể đăng nhập quản trị" });
  }
};

exports.me = async (req, res) => {
  return res.json({ user: publicAdmin(req.admin) });
};

exports.stats = async (req, res) => {
  try {
    await ensureCurriculumSeed();
    const today = startOfToday();
    const weekAgo = startOfDaysAgo(6);

    const [
      userCount,
      examCount,
      flashcardCount,
      quizToday,
      liveToday,
      topExams,
      topUsers,
      recentQuiz,
      recentLive,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.exam.count(),
      prisma.studySet.count(),
      prisma.quizResult.count({ where: { createdAt: { gte: today } } }),
      prisma.liveExamParticipant.count({
        where: { submittedAt: { gte: today } },
      }),
      prisma.exam.findMany({
        orderBy: { attemptCount: "desc" },
        take: 8,
        select: {
          id: true,
          title: true,
          grade: true,
          attemptCount: true,
          user: { select: { name: true } },
        },
      }),
      prisma.user.findMany({
        take: 12,
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          role: true,
          createdAt: true,
          _count: {
            select: {
              quizResults: true,
              exams: true,
              studySets: true,
            },
          },
        },
      }),
      prisma.quizResult.findMany({
        where: { createdAt: { gte: weekAgo } },
        select: { createdAt: true },
      }),
      prisma.liveExamParticipant.findMany({
        where: { submittedAt: { gte: weekAgo } },
        select: { submittedAt: true },
      }),
    ]);

    const dayMap = {};
    for (let i = 6; i >= 0; i -= 1) {
      const date = startOfDaysAgo(i);
      const key = date.toISOString().slice(0, 10);
      dayMap[key] = 0;
    }
    recentQuiz.forEach((item) => {
      const key = new Date(item.createdAt).toISOString().slice(0, 10);
      if (dayMap[key] != null) dayMap[key] += 1;
    });
    recentLive.forEach((item) => {
      if (!item.submittedAt) return;
      const key = new Date(item.submittedAt).toISOString().slice(0, 10);
      if (dayMap[key] != null) dayMap[key] += 1;
    });

    const rankedUsers = topUsers
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: user.avatar || "",
        role: user.role,
        createdAt: user.createdAt,
        activity:
          user._count.quizResults * 2 + user._count.exams + user._count.studySets,
        quizResults: user._count.quizResults,
        exams: user._count.exams,
        studySets: user._count.studySets,
      }))
      .sort((a, b) => b.activity - a.activity)
      .slice(0, 8);

    return res.json({
      cards: {
        users: userCount,
        exams: examCount,
        flashcards: flashcardCount,
        attemptsToday: quizToday + liveToday,
      },
      weeklyAttempts: Object.entries(dayMap).map(([date, count]) => ({ date, count })),
      topExams,
      topUsers: rankedUsers,
    });
  } catch (error) {
    console.error("Admin stats error:", error);
    return res.status(500).json({ message: "Không thể tải thống kê" });
  }
};

exports.listUsers = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
    const q = String(req.query.q || "").trim();
    const role = String(req.query.role || "").trim().toUpperCase();
    const status = String(req.query.status || "").trim().toLowerCase();

    const where = {};
    if (q) {
      where.OR = [
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
      ];
    }
    if (["ADMIN", "TEACHER", "STUDENT"].includes(role)) where.role = role;
    if (["active", "banned"].includes(status)) where.status = status;

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          status: true,
          avatar: true,
          createdAt: true,
          plan: true,
        },
      }),
    ]);

    return res.json({ users, total, page, pageSize });
  } catch (error) {
    console.error("Admin list users error:", error);
    return res.status(500).json({ message: "Không thể tải danh sách người dùng" });
  }
};

exports.updateUser = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    if (id === req.admin.id && req.body.status === "banned") {
      return res.status(400).json({ message: "Không thể khóa chính tài khoản đang đăng nhập" });
    }

    const data = {};
    if (["ADMIN", "TEACHER", "STUDENT"].includes(req.body.role)) data.role = req.body.role;
    if (["active", "banned"].includes(req.body.status)) data.status = req.body.status;
    if (!Object.keys(data).length) {
      return res.status(400).json({ message: "Không có thay đổi hợp lệ" });
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
        createdAt: true,
        plan: true,
      },
    });
    return res.json({ user });
  } catch (error) {
    console.error("Admin update user error:", error);
    return res.status(500).json({ message: "Không thể cập nhật người dùng" });
  }
};

exports.listReports = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
    const status = String(req.query.status || "").trim();
    const where = {};
    if (["pending", "resolved", "dismissed"].includes(status)) where.status = status;

    const [total, reports] = await Promise.all([
      prisma.contentReport.count({ where }),
      prisma.contentReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          reporter: { select: { id: true, name: true, email: true, avatar: true } },
        },
      }),
    ]);

    const examIds = reports.filter((item) => item.targetType === "exam").map((item) => item.targetId);
    const exams = examIds.length
      ? await prisma.exam.findMany({
          where: { id: { in: examIds } },
          select: { id: true, title: true, hidden: true, userId: true },
        })
      : [];
    const examMap = Object.fromEntries(exams.map((item) => [item.id, item]));

    return res.json({
      reports: reports.map((item) => ({
        ...item,
        target: item.targetType === "exam" ? examMap[item.targetId] || null : null,
      })),
      total,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Admin list reports error:", error);
    return res.status(500).json({ message: "Không thể tải báo cáo" });
  }
};

exports.updateReport = async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID không hợp lệ" });
    }
    const report = await prisma.contentReport.findUnique({ where: { id } });
    if (!report) return res.status(404).json({ message: "Không tìm thấy báo cáo" });

    const action = String(req.body.action || "").trim();
    const status = ["resolved", "dismissed", "pending"].includes(req.body.status)
      ? req.body.status
      : action
        ? "resolved"
        : report.status;

    if (action === "hide_exam" && report.targetType === "exam") {
      await prisma.exam.update({
        where: { id: report.targetId },
        data: { hidden: true },
      });
    }
    if (action === "warn_user" && report.targetType === "exam") {
      const exam = await prisma.exam.findUnique({
        where: { id: report.targetId },
        select: { userId: true, title: true },
      });
      if (exam) {
        await prisma.appNotification.create({
          data: {
            userId: exam.userId,
            type: "warning",
            title: "Cảnh cáo nội dung",
            body: `Đề thi "${exam.title}" đã bị báo cáo và đang được xem xét.`,
            link: `/exams/${exam.id}`,
          },
        });
      }
    }
    if (action === "ban_user") {
      const targetUserId =
        report.targetType === "user"
          ? report.targetId
          : (
              await prisma.exam.findUnique({
                where: { id: report.targetId },
                select: { userId: true },
              })
            )?.userId;
      if (targetUserId && targetUserId !== req.admin.id) {
        await prisma.user.update({
          where: { id: targetUserId },
          data: { status: "banned" },
        });
      }
    }

    const next = await prisma.contentReport.update({
      where: { id },
      data: { status, action: action || report.action },
      include: {
        reporter: { select: { id: true, name: true, email: true, avatar: true } },
      },
    });
    return res.json({ report: next });
  } catch (error) {
    console.error("Admin update report error:", error);
    return res.status(500).json({ message: "Không thể xử lý báo cáo" });
  }
};
