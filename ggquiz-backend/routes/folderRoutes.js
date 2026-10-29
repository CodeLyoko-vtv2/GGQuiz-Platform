const express = require("express");
const {
  createFolder,
  updateFolder,
  deleteFolder,
  getMyFolders,
  getFolderById,
  addFolderItem,
  removeFolderItem,
  getMyExams,
  getMyLessonPlans,
} = require("../controllers/folderController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.use(authMiddleware);

router.get("/me", getMyFolders);
router.get("/exams/me", getMyExams);
router.get("/lesson-plans/me", getMyLessonPlans);
router.post("/", createFolder);
router.get("/:id", getFolderById);
router.put("/:id", updateFolder);
router.patch("/:id", updateFolder);
router.delete("/:id", deleteFolder);
router.post("/:id/items", addFolderItem);
router.delete("/:id/items/:itemId", removeFolderItem);
router.delete("/:id/items", removeFolderItem);

module.exports = router;
