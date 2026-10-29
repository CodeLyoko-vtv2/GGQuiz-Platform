const express = require("express");
const {
  getUserStats,
  getMe,
  updateMe,
  changePassword,
  deleteMe,
  sendFeedback,
} = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);
router.put("/me/password", authMiddleware, changePassword);
router.delete("/me", authMiddleware, deleteMe);
router.post("/feedback", authMiddleware, sendFeedback);
router.get("/profile/stats", authMiddleware, getUserStats);

module.exports = router;
