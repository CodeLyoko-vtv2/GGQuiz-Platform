const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const {
  listFields,
  getField,
  getLesson,
  completeLesson,
  chatLesson,
} = require("../controllers/specializedController");

const router = express.Router();

router.get("/fields", optionalAuthMiddleware, listFields);
router.get("/fields/:id", optionalAuthMiddleware, getField);
router.get("/lessons/:id", authMiddleware, getLesson);
router.post("/lessons/:id/complete", authMiddleware, completeLesson);
router.post("/lessons/:id/chat", authMiddleware, chatLesson);

module.exports = router;
