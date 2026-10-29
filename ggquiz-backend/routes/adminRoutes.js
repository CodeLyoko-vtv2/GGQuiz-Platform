const express = require("express");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const admin = require("../controllers/adminController");
const curriculum = require("../controllers/curriculumController");
const solution = require("../controllers/solutionController");
const hotspot = require("../controllers/hotspotController");
const uploadController = require("../controllers/uploadController");
const billing = require("../controllers/billingController");
const specialized = require("../controllers/specializedController");
const { upload } = require("../middleware/uploadMiddleware");

const router = express.Router();

router.post("/login", admin.login);

const staff = [authMiddleware, adminMiddleware(["ADMIN", "TEACHER"])];
const admins = [authMiddleware, adminMiddleware(["ADMIN"])];

router.get("/me", ...staff, admin.me);
router.get("/stats", ...staff, admin.stats);

router.post("/upload", ...staff, upload.single("file"), uploadController.uploadFile);

router.get("/series", ...staff, curriculum.listSeries);
router.post("/series", ...staff, curriculum.createSeries);
router.put("/series/:id", ...staff, curriculum.updateSeries);
router.delete("/series/:id", ...admins, curriculum.deleteSeries);

router.get("/grades", ...staff, curriculum.listGrades);
router.post("/grades", ...staff, curriculum.createGrade);
router.put("/grades/:id", ...staff, curriculum.updateGrade);
router.delete("/grades/:id", ...admins, curriculum.deleteGrade);

router.get("/subjects", ...staff, curriculum.listSubjects);
router.post("/subjects", ...staff, curriculum.createSubject);
router.put("/subjects/:id", ...staff, curriculum.updateSubject);
router.delete("/subjects/:id", ...admins, curriculum.deleteSubject);

router.get("/books", ...staff, curriculum.listBooks);
router.post("/books", ...staff, curriculum.createBook);
router.get("/books/:id", ...staff, curriculum.getBook);
router.put("/books/:id", ...staff, curriculum.updateBook);
router.delete("/books/:id", ...admins, curriculum.deleteBook);
router.get("/books/:id/tree", ...staff, curriculum.getBookTree);
router.get("/books/:id/hotspots", ...staff, hotspot.listHotspots);
router.post("/books/:id/hotspots", ...staff, hotspot.createHotspot);
router.put("/hotspots/:hotspotId", ...staff, hotspot.updateHotspot);
router.delete("/hotspots/:hotspotId", ...staff, hotspot.deleteHotspot);

router.post("/chapters", ...staff, curriculum.createChapter);
router.put("/chapters/:id", ...staff, curriculum.updateChapter);
router.delete("/chapters/:id", ...admins, curriculum.deleteChapter);

router.post("/lessons", ...staff, curriculum.createLesson);
router.put("/lessons/:id", ...staff, curriculum.updateLesson);
router.delete("/lessons/:id", ...admins, curriculum.deleteLesson);

router.post("/lessons/:lessonId/solution", ...staff, solution.upsertByLesson);
router.get("/solutions", ...staff, solution.listSolutions);
router.get("/solutions/:id", ...staff, solution.getSolution);
router.post("/solutions", ...staff, solution.createSolution);
router.put("/solutions/:id", ...staff, solution.updateSolution);
router.delete("/solutions/:id", ...admins, solution.deleteSolution);

router.get("/users", ...admins, admin.listUsers);
router.patch("/users/:id", ...admins, admin.updateUser);

router.get("/reports", ...admins, admin.listReports);

router.get("/specialized/fields", ...staff, specialized.adminListFields);
router.post("/specialized/fields", ...staff, specialized.adminSaveField);
router.get("/specialized/fields/:id", ...staff, specialized.adminGetField);
router.put("/specialized/fields/:id", ...staff, specialized.adminSaveField);
router.delete("/specialized/fields/:id", ...admins, specialized.adminDeleteField);
router.get("/specialized/fields/:fieldId/lessons", ...staff, specialized.adminListLessons);
router.post("/specialized/lessons", ...staff, specialized.adminSaveLesson);
router.put("/specialized/lessons/:id", ...staff, specialized.adminSaveLesson);
router.delete("/specialized/lessons/:id", ...admins, specialized.adminDeleteLesson);

router.get("/upgrade-requests", ...admins, billing.listUpgradeRequests);
router.post("/upgrade-requests/:id/approve", ...admins, billing.approveUpgradeRequest);
router.post("/upgrade-requests/:id/reject", ...admins, billing.rejectUpgradeRequest);
router.patch("/reports/:id", ...admins, admin.updateReport);

module.exports = router;
