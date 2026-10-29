const express = require("express");
const { synthesizeSpeech } = require("../controllers/ttsController");

const router = express.Router();

// Public: dùng được cả khi xem học phần chia sẻ
router.get("/", synthesizeSpeech);
router.post("/", synthesizeSpeech);

module.exports = router;
