const fs = require("fs");
const path = require("path");
const multer = require("multer");

const UPLOAD_ROOT = path.join(__dirname, "..", "uploads", "curriculum");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    const kind = String(req.query.kind || req.body.kind || "files");
    const folder = ["pdf", "audio", "cover"].includes(kind) ? kind : "files";
    const dest = path.join(UPLOAD_ROOT, folder);
    ensureDir(dest);
    cb(null, dest);
  },
  filename(req, file, cb) {
    const ext = path.extname(file.originalname || "").toLowerCase() || ".bin";
    const safe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, safe);
  },
});

function fileFilter(req, file, cb) {
  const kind = String(req.query.kind || req.body.kind || "");
  const mime = file.mimetype || "";
  if (kind === "pdf" && (mime === "application/pdf" || file.originalname.toLowerCase().endsWith(".pdf"))) {
    return cb(null, true);
  }
  if (kind === "audio" && (mime.startsWith("audio/") || /\.(mp3|wav|m4a|ogg)$/i.test(file.originalname))) {
    return cb(null, true);
  }
  if (kind === "cover" && mime.startsWith("image/")) {
    return cb(null, true);
  }
  return cb(new Error("Định dạng tệp không được hỗ trợ"));
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 80 * 1024 * 1024 },
});

function publicUrl(file) {
  const relative = path.relative(path.join(__dirname, ".."), file.path).replace(/\\/g, "/");
  return `/${relative}`;
}

module.exports = { upload, publicUrl, UPLOAD_ROOT };
