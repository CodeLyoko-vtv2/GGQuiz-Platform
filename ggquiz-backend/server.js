require("dotenv").config();

const path = require("path");
const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const studySetRoutes = require("./routes/studySetRoutes");
const aiRoutes = require("./routes/aiRoutes");
const userRoutes = require("./routes/userRoutes");
const folderRoutes = require("./routes/folderRoutes");
const examRoutes = require("./routes/examRoutes");
const liveExamRoutes = require("./routes/liveExamRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const lessonPlanRoutes = require("./routes/lessonPlanRoutes");
const ttsRoutes = require("./routes/ttsRoutes");
const imageRoutes = require("./routes/imageRoutes");
const adminRoutes = require("./routes/adminRoutes");
const curriculumRoutes = require("./routes/curriculumRoutes");
const billingRoutes = require("./routes/billingRoutes");
const specializedRoutes = require("./routes/specializedRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: "40mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Route kiểm tra sức khỏe server (Health Check)
app.get("/", (req, res) => {
  res.json({ status: "success", message: "GGQuiz Backend is running!" });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/studysets", studySetRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/exams", examRoutes);
app.use("/api/live-exams", liveExamRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/lesson-plans", lessonPlanRoutes);
app.use("/api/tts", ttsRoutes);
app.use("/api/images", imageRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/users", userRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/curriculum", curriculumRoutes);
app.use("/api/billing", billingRoutes);
app.use("/api/specialized", specializedRoutes);

const PORT = process.env.PORT || 5000;

// Khởi tạo server và gắn cơ chế giám sát sự kiện
const server = app.listen(PORT, () => {
  console.log(`🚀 GGQuiz server is securely running and listening on port ${PORT}`);
});

// Bắt và hiển thị lỗi cụ thể nếu tiến trình định tự tắt
server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Lỗi: Cổng ${PORT} đang bị một phần mềm khác chiếm dụng.`);
  } else {
    console.error("❌ Lỗi khởi động server:", err);
  }
});