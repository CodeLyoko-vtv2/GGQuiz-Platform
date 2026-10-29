const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const DEFAULT_PRIVACY = {
  profilePublic: true,
  showOnLeaderboard: true,
  hideEmail: true,
  allowFriendRequests: true,
};

function sanitizeBackground(raw) {
  if (!raw || typeof raw !== "object") return { type: "none" };
  const type = ["none", "image", "youtube"].includes(raw.type) ? raw.type : "none";
  return {
    type,
    url: String(raw.url || "").slice(0, 2000),
    videoId: String(raw.videoId || "").slice(0, 32),
  };
}

function sanitizePrivacy(raw) {
  const src = raw && typeof raw === "object" ? raw : {};
  return {
    profilePublic: src.profilePublic !== false,
    showOnLeaderboard: src.showOnLeaderboard !== false,
    hideEmail: src.hideEmail !== false,
    allowFriendRequests: src.allowFriendRequests !== false,
  };
}

function formatUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatar: user.avatar || "",
    birthday: user.birthday,
    theme: user.theme === "dark" ? "dark" : "light",
    language: user.language === "en" ? "en" : "vi",
    background: sanitizeBackground(user.background),
    privacy: sanitizePrivacy(user.privacy),
    plan: user.plan === "premium" ? "premium" : "free",
    premiumUntil: user.premiumUntil,
    upgradePending: Boolean(user.upgradePending),
    createdAt: user.createdAt,
  };
}

function rankFromXp(xp) {
  const tiers = [
    { id: "iron", name: "Sắt", min: 0, next: 100 },
    { id: "bronze", name: "Đồng", min: 100, next: 300 },
    { id: "silver", name: "Bạc", min: 300, next: 700 },
    { id: "gold", name: "Vàng", min: 700, next: 1500 },
    { id: "plat", name: "Bạch Kim", min: 1500, next: 3000 },
    { id: "diamond", name: "Kim Cương", min: 3000, next: 6000 },
    { id: "challenger", name: "Challenger", min: 6000, next: null },
  ];
  let current = tiers[0];
  tiers.forEach((tier) => {
    if (xp >= tier.min) current = tier;
  });
  const span = current.next ? current.next - current.min : 1;
  const progress = current.next ? Math.min(100, Math.round(((xp - current.min) / span) * 100)) : 100;
  return { ...current, xp, progress };
}

function buildBadges({ studySetCount, quizAttemptCount, examCount, lessonCount, averageAccuracy, xp }) {
  return [
    { id: "rookie", name: "Tân binh", hint: "Tạo tài khoản GGQuiz", earned: true },
    { id: "collector", name: "Nhà sưu tập", hint: "Tạo 3 bộ thẻ", earned: studySetCount >= 3 },
    { id: "examinee", name: "Thí sinh", hint: "Tạo hoặc làm 1 đề thi", earned: examCount + quizAttemptCount >= 1 },
    { id: "planner", name: "Giáo án sư", hint: "Soạn 1 giáo án", earned: lessonCount >= 1 },
    { id: "sniper", name: "Xạ thủ", hint: "Độ chính xác ≥ 80%", earned: averageAccuracy >= 80 },
    { id: "elite", name: "Cao thủ", hint: "Đạt rank Vàng", earned: xp >= 700 },
  ];
}

exports.formatUser = formatUser;

exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    const pending = await prisma.upgradeRequest.findFirst({
      where: { userId: user.id, status: "pending" },
      select: { id: true },
    });
    return res.json({ user: formatUser({ ...user, upgradePending: Boolean(pending) }) });
  } catch (error) {
    console.error("Get me error:", error);
    return res.status(500).json({ message: "Không thể tải hồ sơ" });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    const data = {};
    if (req.body.name != null) {
      const name = String(req.body.name).trim();
      if (name.length < 2) return res.status(400).json({ message: "Tên cần ít nhất 2 ký tự" });
      data.name = name.slice(0, 80);
    }
    if (req.body.avatar !== undefined) data.avatar = String(req.body.avatar || "").slice(0, 900000) || null;
    if (req.body.birthday !== undefined) {
      if (!req.body.birthday) data.birthday = null;
      else {
        const date = new Date(req.body.birthday);
        if (Number.isNaN(date.getTime())) return res.status(400).json({ message: "Ngày sinh không hợp lệ" });
        data.birthday = date;
      }
    }
    if (req.body.theme === "light" || req.body.theme === "dark") data.theme = req.body.theme;
    if (req.body.language === "vi" || req.body.language === "en") data.language = req.body.language;
    if (req.body.background != null) data.background = sanitizeBackground(req.body.background);
    if (req.body.privacy != null) data.privacy = sanitizePrivacy(req.body.privacy);

    const updated = await prisma.user.update({ where: { id: user.id }, data });
    const pending = await prisma.upgradeRequest.findFirst({
      where: { userId: user.id, status: "pending" },
      select: { id: true },
    });
    return res.json({
      message: "Đã lưu hồ sơ",
      user: formatUser({ ...updated, upgradePending: Boolean(pending) }),
    });
  } catch (error) {
    console.error("Update me error:", error);
    return res.status(500).json({ message: "Không thể lưu hồ sơ" });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const currentPassword = String(req.body.currentPassword || "");
    const newPassword = String(req.body.newPassword || "");
    if (newPassword.length < 6) {
      return res.status(400).json({ message: "Mật khẩu mới cần ít nhất 6 ký tự" });
    }
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Mật khẩu hiện tại không đúng" });
    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hashed } });
    return res.json({ message: "Đã đổi mật khẩu" });
  } catch (error) {
    console.error("Change password error:", error);
    return res.status(500).json({ message: "Không thể đổi mật khẩu" });
  }
};

exports.deleteMe = async (req, res) => {
  try {
    const confirm = String(req.body.confirm || "").trim().toUpperCase();
    if (confirm !== "XOA" && confirm !== "XÓA") {
      return res.status(400).json({ message: "Gõ XÓA để xác nhận xóa tài khoản" });
    }
    await prisma.user.delete({ where: { id: req.user.id } });
    return res.json({ message: "Tài khoản đã được xóa" });
  } catch (error) {
    console.error("Delete me error:", error);
    return res.status(500).json({ message: "Không thể xóa tài khoản" });
  }
};

exports.sendFeedback = async (req, res) => {
  try {
    const message = String(req.body.message || "").trim();
    if (message.length < 8) {
      return res.status(400).json({ message: "Nội dung phản hồi cần ít nhất 8 ký tự" });
    }
    await prisma.feedback.create({
      data: { userId: req.user.id, message: message.slice(0, 2000) },
    });
    return res.status(201).json({ message: "Cảm ơn bạn đã gửi phản hồi" });
  } catch (error) {
    console.error("Feedback error:", error);
    return res.status(500).json({ message: "Không gửi được phản hồi" });
  }
};

exports.getUserStats = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Chưa đăng nhập" });

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });

    const [studySetCount, quizAttemptCount, examCount, lessonCount, quizAggregates] = await Promise.all([
      prisma.studySet.count({ where: { userId } }),
      prisma.quizResult.count({ where: { userId } }),
      prisma.exam.count({ where: { userId } }),
      prisma.lessonPlan.count({ where: { userId } }),
      prisma.quizResult.aggregate({
        where: { userId },
        _avg: { score: true, accuracy: true },
      }),
    ]);

    const averageScore =
      quizAggregates._avg.score != null ? Math.round(quizAggregates._avg.score * 10) / 10 : 0;
    const averageAccuracy =
      quizAggregates._avg.accuracy != null ? Math.round(quizAggregates._avg.accuracy * 10) / 10 : 0;
    const xp = studySetCount * 40 + quizAttemptCount * 25 + examCount * 50 + lessonCount * 35;
    const rank = rankFromXp(xp);

    return res.status(200).json({
      user: formatUser(user),
      stats: {
        studySetCount,
        quizAttemptCount,
        examCount,
        lessonCount,
        averageScore,
        averageAccuracy,
        xp,
        rank,
        badges: buildBadges({
          studySetCount,
          quizAttemptCount,
          examCount,
          lessonCount,
          averageAccuracy,
          xp,
        }),
      },
    });
  } catch (error) {
    console.error("Get user stats error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
