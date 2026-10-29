const express = require("express");
const {
  joinLiveSession,
  getLiveSession,
  startLiveSession,
  endLiveSession,
  getLivePaper,
  heartbeatLiveSession,
  reportViolation,
  submitLiveExam,
  getParticipantPaper,
  saveParticipantGrade,
  publishParticipantGrade,
  getMyFeedback,
} = require("../controllers/liveExamController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/join", authMiddleware, joinLiveSession);
router.get("/:id/paper", authMiddleware, getLivePaper);
router.post("/:id/heartbeat", authMiddleware, heartbeatLiveSession);
router.post("/:id/violation", authMiddleware, reportViolation);
router.post("/:id/submit", authMiddleware, submitLiveExam);
router.post("/:id/start", authMiddleware, startLiveSession);
router.post("/:id/end", authMiddleware, endLiveSession);
router.get("/:id/feedback", authMiddleware, getMyFeedback);
router.get("/:id/participants/:participantId", authMiddleware, getParticipantPaper);
router.put("/:id/participants/:participantId/grade", authMiddleware, saveParticipantGrade);
router.post("/:id/participants/:participantId/publish", authMiddleware, publishParticipantGrade);
router.get("/:id", authMiddleware, getLiveSession);

module.exports = router;
