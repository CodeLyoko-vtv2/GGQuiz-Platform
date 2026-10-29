const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const { getBillingStatus, createUpgradeRequest } = require("../controllers/billingController");

const router = express.Router();

router.get("/status", authMiddleware, getBillingStatus);
router.post("/upgrade-request", authMiddleware, createUpgradeRequest);

module.exports = router;
