const express = require("express");
const {
  listExams,
  getExamById,
  createExam,
  updateExam,
  deleteExam,
  toggleSaveExam,
  recordExamDownload,
} = require("../controllers/examController");
const { createLiveSession } = require("../controllers/liveExamController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

const router = express.Router();

router.get("/", optionalAuthMiddleware, listExams);
router.post("/:id/save", authMiddleware, toggleSaveExam);
router.post("/:id/download", optionalAuthMiddleware, recordExamDownload);
router.post("/:id/live-sessions", authMiddleware, createLiveSession);
router.put("/:id", authMiddleware, updateExam);
router.delete("/:id", authMiddleware, deleteExam);
router.get("/:id", optionalAuthMiddleware, getExamById);
router.post("/", authMiddleware, createExam);

module.exports = router;
