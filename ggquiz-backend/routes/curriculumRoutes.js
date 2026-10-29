const express = require("express");
const optionalAuthMiddleware = require("../middleware/optionalAuthMiddleware");
const pub = require("../controllers/publicCurriculumController");

const router = express.Router();

router.get("/series", optionalAuthMiddleware, pub.listSeries);
router.get("/series/:id", optionalAuthMiddleware, pub.getSeries);
router.get("/books/:id/toc", optionalAuthMiddleware, pub.getBookToc);
router.get("/books/:id", optionalAuthMiddleware, pub.getBook);
router.get("/lessons/:id", optionalAuthMiddleware, pub.getLessonSolution);

module.exports = router;
