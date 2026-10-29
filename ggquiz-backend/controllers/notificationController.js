const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function formatNotification(item) {
  return {
    id: item.id,
    source: "server",
    type: item.type,
    title: item.title,
    body: item.body,
    link: item.link || "",
    read: Boolean(item.read),
    createdAt: item.createdAt,
    meta: item.meta || {},
  };
}

async function listNotifications(req, res) {
  try {
    const items = await prisma.appNotification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      take: 60,
    });
    return res.json({ notifications: items.map(formatNotification) });
  } catch (error) {
    console.error("List notifications error:", error);
    return res.status(500).json({ message: "Không thể tải thông báo" });
  }
}

async function markNotificationRead(req, res) {
  try {
    const id = Number(req.params.id);
    const item = await prisma.appNotification.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!item) return res.status(404).json({ message: "Không tìm thấy thông báo" });
    const updated = await prisma.appNotification.update({
      where: { id },
      data: { read: true },
    });
    return res.json({ notification: formatNotification(updated) });
  } catch (error) {
    console.error("Mark notification read error:", error);
    return res.status(500).json({ message: "Không thể cập nhật thông báo" });
  }
}

async function markAllNotificationsRead(req, res) {
  try {
    await prisma.appNotification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true },
    });
    return res.json({ message: "Đã đánh dấu đã đọc" });
  } catch (error) {
    console.error("Mark all notifications read error:", error);
    return res.status(500).json({ message: "Không thể cập nhật thông báo" });
  }
}

module.exports = {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};
