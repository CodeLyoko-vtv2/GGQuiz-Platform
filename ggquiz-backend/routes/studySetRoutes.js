const express = require("express");
const {
  createStudySet,
  getAllStudySets,
  getDashboardStudySets,
  getStudySetById,
  recordStudySetView,
  getMyStudySets,
  searchStudySets,
  toggleSaveStudySet,
  updateStudySet,
  deleteStudySet,
} = require("../controllers/studySetController");
const {
  saveResult,
  getLeaderboard,
} = require("../controllers/quizResultController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

const router = express.Router();

router.get("/", getAllStudySets);
router.get("/dashboard", authMiddleware, getDashboardStudySets);
router.get("/me", authMiddleware, getMyStudySets);
router.get("/search", searchStudySets);
// Public: anyone with a shared link can view a study set (no JWT)
router.post("/:id/results", authMiddleware, saveResult);
router.get("/:id/leaderboard", getLeaderboard);
router.post("/:id/save", authMiddleware, toggleSaveStudySet);
router.post("/:id/view", optionalAuthMiddleware, recordStudySetView);
router.get("/:id", optionalAuthMiddleware, getStudySetById);
// Protected mutations
router.post("/", authMiddleware, createStudySet);
router.put("/:id", authMiddleware, updateStudySet);
router.delete("/:id", authMiddleware, deleteStudySet);

module.exports = router;
