const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const PREMIUM_AMOUNT = 99000;
const PREMIUM_DAYS = 30;
const BANK = {
  accountName: "NGUYEN VU HUY",
  accountNumber: "56210005445523",
  bankName: "BIDV - CN Quảng Nam",
};

function transferCodeFor(userId) {
  return `GGQUIZ ${userId}`;
}

function isPremiumActive(user) {
  if (user?.plan !== "premium") return false;
  if (!user.premiumUntil) return true;
  return new Date(user.premiumUntil).getTime() > Date.now();
}

function formatRequest(item) {
  return {
    id: item.id,
    userId: item.userId,
    transferCode: item.transferCode,
    amount: item.amount,
    currency: item.currency,
    plan: item.plan,
    durationDays: item.durationDays,
    status: item.status,
    note: item.note || "",
    reviewedBy: item.reviewedBy || null,
    reviewedAt: item.reviewedAt,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    user: item.user
      ? {
          id: item.user.id,
          name: item.user.name,
          email: item.user.email,
          plan: item.user.plan,
        }
      : null,
  };
}

async function getBillingStatus(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    const pending = await prisma.upgradeRequest.findFirst({
      where: { userId: user.id, status: "pending" },
      orderBy: { createdAt: "desc" },
    });
    return res.json({
      plan: isPremiumActive(user) ? "premium" : "free",
      premiumUntil: user.premiumUntil,
      upgradePending: Boolean(pending),
      pendingRequest: pending ? formatRequest(pending) : null,
      transferCode: transferCodeFor(user.id),
      amount: PREMIUM_AMOUNT,
      bank: BANK,
    });
  } catch (error) {
    console.error("Billing status error:", error);
    return res.status(500).json({ message: "Không thể tải thông tin thanh toán" });
  }
}

async function createUpgradeRequest(req, res) {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ message: "Không tìm thấy người dùng" });
    if (isPremiumActive(user)) {
      return res.status(400).json({ message: "Tài khoản đã là Premium" });
    }

    const existing = await prisma.upgradeRequest.findFirst({
      where: { userId: user.id, status: "pending" },
    });
    if (existing) {
      return res.status(409).json({
        message: "Yêu cầu đang được xử lý. Vui lòng chờ admin đối chiếu thanh toán.",
        request: formatRequest(existing),
      });
    }

    const created = await prisma.upgradeRequest.create({
      data: {
        userId: user.id,
        transferCode: transferCodeFor(user.id),
        amount: PREMIUM_AMOUNT,
        durationDays: PREMIUM_DAYS,
        status: "pending",
      },
      include: { user: { select: { id: true, name: true, email: true, plan: true } } },
    });

    await prisma.appNotification.create({
      data: {
        userId: user.id,
        type: "billing",
        title: "Đã nhận yêu cầu nâng cấp",
        body: `Chúng tôi sẽ kích hoạt Premium sau khi đối chiếu nội dung chuyển khoản ${created.transferCode}.`,
        link: "/",
        meta: { requestId: created.id },
      },
    });

    return res.status(201).json({
      message: "Đã gửi yêu cầu. Premium sẽ được kích hoạt sau khi nhận được thanh toán.",
      request: formatRequest(created),
    });
  } catch (error) {
    console.error("Create upgrade request error:", error);
    return res.status(500).json({ message: "Không thể gửi yêu cầu nâng cấp" });
  }
}

async function listUpgradeRequests(req, res) {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const pageSize = Math.min(50, Math.max(5, Number(req.query.pageSize) || 10));
    const status = String(req.query.status || "").trim().toLowerCase();
    const where = {};
    if (["pending", "approved", "rejected"].includes(status)) where.status = status;

    const [total, rows] = await Promise.all([
      prisma.upgradeRequest.count({ where }),
      prisma.upgradeRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: { user: { select: { id: true, name: true, email: true, plan: true } } },
      }),
    ]);

    return res.json({
      requests: rows.map(formatRequest),
      total,
      page,
      pageSize,
      pendingCount: await prisma.upgradeRequest.count({ where: { status: "pending" } }),
    });
  } catch (error) {
    console.error("List upgrade requests error:", error);
    return res.status(500).json({ message: "Không thể tải yêu cầu nâng cấp" });
  }
}

async function approveUpgradeRequest(req, res) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.upgradeRequest.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!item) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    if (item.status !== "pending") {
      return res.status(400).json({ message: "Yêu cầu này đã được xử lý" });
    }

    const now = new Date();
    const base =
      item.user.premiumUntil && new Date(item.user.premiumUntil) > now
        ? new Date(item.user.premiumUntil)
        : now;
    const premiumUntil = new Date(base.getTime() + item.durationDays * 24 * 60 * 60 * 1000);

    const [updated] = await prisma.$transaction([
      prisma.upgradeRequest.update({
        where: { id },
        data: {
          status: "approved",
          reviewedBy: req.user.id,
          reviewedAt: now,
          note: String(req.body?.note || "").slice(0, 500) || null,
        },
        include: { user: { select: { id: true, name: true, email: true, plan: true } } },
      }),
      prisma.user.update({
        where: { id: item.userId },
        data: { plan: "premium", premiumUntil },
      }),
      prisma.appNotification.create({
        data: {
          userId: item.userId,
          type: "billing",
          title: "Premium đã được kích hoạt",
          body: `Gói Premium có hiệu lực đến ${premiumUntil.toLocaleDateString("vi-VN")}. Cảm ơn bạn đã đồng hành cùng GGQuiz.`,
          link: "/",
          meta: { requestId: item.id },
        },
      }),
    ]);

    return res.json({
      message: "Đã phê duyệt và kích hoạt Premium",
      request: formatRequest(updated),
    });
  } catch (error) {
    console.error("Approve upgrade request error:", error);
    return res.status(500).json({ message: "Không thể phê duyệt yêu cầu" });
  }
}

async function rejectUpgradeRequest(req, res) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.upgradeRequest.findUnique({ where: { id } });
    if (!item) return res.status(404).json({ message: "Không tìm thấy yêu cầu" });
    if (item.status !== "pending") {
      return res.status(400).json({ message: "Yêu cầu này đã được xử lý" });
    }

    const updated = await prisma.upgradeRequest.update({
      where: { id },
      data: {
        status: "rejected",
        reviewedBy: req.user.id,
        reviewedAt: new Date(),
        note: String(req.body?.note || "").slice(0, 500) || null,
      },
      include: { user: { select: { id: true, name: true, email: true, plan: true } } },
    });

    await prisma.appNotification.create({
      data: {
        userId: item.userId,
        type: "billing",
        title: "Yêu cầu nâng cấp bị từ chối",
        body: "Chúng tôi chưa đối chiếu được thanh toán. Hãy kiểm tra nội dung chuyển khoản rồi gửi lại yêu cầu.",
        link: "/",
        meta: { requestId: item.id },
      },
    });

    return res.json({
      message: "Đã từ chối yêu cầu nâng cấp",
      request: formatRequest(updated),
    });
  } catch (error) {
    console.error("Reject upgrade request error:", error);
    return res.status(500).json({ message: "Không thể từ chối yêu cầu" });
  }
}

module.exports = {
  getBillingStatus,
  createUpgradeRequest,
  listUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
};
