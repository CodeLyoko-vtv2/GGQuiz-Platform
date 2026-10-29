const { publicUrl } = require("../middleware/uploadMiddleware");

exports.uploadFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "Vui lòng chọn tệp để tải lên" });
    }
    return res.status(201).json({
      url: publicUrl(req.file),
      name: req.file.originalname,
      size: req.file.size,
      mime: req.file.mimetype,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return res.status(500).json({ message: error.message || "Không thể tải tệp lên" });
  }
};
