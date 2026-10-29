const express = require("express");
const { searchImages } = require("../controllers/imageController");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/search", authMiddleware, searchImages);

module.exports = router;
