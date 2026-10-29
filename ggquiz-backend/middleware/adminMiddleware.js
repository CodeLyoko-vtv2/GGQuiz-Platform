const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function adminMiddleware(roles = ["ADMIN", "TEACHER"]) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        return res.status(401).json({ message: "Thiếu token xác thực" });
      }

      const user = await prisma.user.findUnique({ where: { id: req.user.id } });
      if (!user) {
        return res.status(401).json({ message: "Không tìm thấy tài khoản" });
      }
      if (user.status === "banned") {
        return res.status(403).json({ message: "Tài khoản đã bị khóa" });
      }
      if (!roles.includes(user.role)) {
        return res.status(403).json({ message: "Bạn không có quyền truy cập khu vực quản trị" });
      }

      req.admin = user;
      return next();
    } catch (error) {
      console.error("Admin middleware error:", error);
      return res.status(500).json({ message: "Không thể xác thực quyền quản trị" });
    }
  };
}

module.exports = adminMiddleware;
