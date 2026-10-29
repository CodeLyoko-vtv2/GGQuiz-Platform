const express = require("express");
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require("../controllers/notificationController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, listNotifications);
router.patch("/read-all", authMiddleware, markAllNotificationsRead);
router.patch("/:id/read", authMiddleware, markNotificationRead);

module.exports = router;
