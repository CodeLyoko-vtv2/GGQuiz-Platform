const express = require("express");
const {
  listLessonPlans,
  getLessonPlan,
  createLessonPlan,
  updateLessonPlan,
  deleteLessonPlan,
  duplicateLessonPlan,
  generateLessonPlan,
  transformLessonSelection,
  exportLessonPlan,
} = require("../controllers/lessonPlanController");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");

const router = express.Router();

router.get("/", authMiddleware, listLessonPlans);
router.post("/generate", authMiddleware, generateLessonPlan);
router.post("/transform", authMiddleware, transformLessonSelection);
router.post("/:id/duplicate", authMiddleware, duplicateLessonPlan);
router.post("/:id/export", authMiddleware, exportLessonPlan);
router.get("/:id", optionalAuthMiddleware, getLessonPlan);
router.post("/", authMiddleware, createLessonPlan);
router.put("/:id", authMiddleware, updateLessonPlan);
router.delete("/:id", authMiddleware, deleteLessonPlan);

module.exports = router;
