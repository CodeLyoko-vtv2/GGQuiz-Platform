const express = require("express");
const {
  generateCardsFromText,
  suggestTerms,
  suggestTranslate,
  suggestDefinitions,
  translateText,
  translateMedia,
  translateWeb,
  chatAssistant,
} = require("../controllers/aiController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/generate", authMiddleware, generateCardsFromText);
router.post("/suggest-term", authMiddleware, suggestTerms);
router.post("/suggest-translate", authMiddleware, suggestTranslate);
router.post("/suggest-def", authMiddleware, suggestDefinitions);
router.post("/translate", authMiddleware, translateText);
router.post("/translate-media", authMiddleware, translateMedia);
router.post("/translate-web", authMiddleware, translateWeb);
router.post("/chat", authMiddleware, chatAssistant);

module.exports = router;
