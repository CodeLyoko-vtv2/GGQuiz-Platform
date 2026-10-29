const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

exports.listHotspots = async (req, res) => {
  try {
    const bookId = parseId(req.params.id || req.query.bookId);
    if (!bookId) return res.status(400).json({ message: "Thiếu sách" });
    const hotspots = await prisma.bookAudioHotspot.findMany({
      where: { bookId },
      orderBy: [{ page: "asc" }, { id: "asc" }],
    });
    return res.json({ hotspots });
  } catch (error) {
    console.error("List hotspots error:", error);
    return res.status(500).json({ message: "Không thể tải bản đồ âm thanh" });
  }
};

exports.createHotspot = async (req, res) => {
  try {
    const bookId = parseId(req.params.id || req.body.bookId);
    const page = Number(req.body.page);
    const x = Number(req.body.x);
    const y = Number(req.body.y);
    const audioUrl = String(req.body.audioUrl || "").trim();
    if (!bookId || !page || !audioUrl) {
      return res.status(400).json({ message: "Thiếu trang hoặc file âm thanh" });
    }
    const hotspot = await prisma.bookAudioHotspot.create({
      data: {
        bookId,
        page,
        x: Math.min(100, Math.max(0, x || 50)),
        y: Math.min(100, Math.max(0, y || 50)),
        audioUrl: audioUrl.slice(0, 500),
        label: String(req.body.label || "").trim().slice(0, 80) || null,
      },
    });
    return res.status(201).json({ hotspot });
  } catch (error) {
    console.error("Create hotspot error:", error);
    return res.status(500).json({ message: "Không thể đặt icon loa" });
  }
};

exports.updateHotspot = async (req, res) => {
  try {
    const id = parseId(req.params.hotspotId || req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    const data = {};
    if (req.body.x != null) data.x = Math.min(100, Math.max(0, Number(req.body.x)));
    if (req.body.y != null) data.y = Math.min(100, Math.max(0, Number(req.body.y)));
    if (req.body.page != null) data.page = Number(req.body.page);
    if (req.body.audioUrl != null) data.audioUrl = String(req.body.audioUrl).slice(0, 500);
    if (req.body.label !== undefined) data.label = String(req.body.label || "").trim().slice(0, 80) || null;
    const hotspot = await prisma.bookAudioHotspot.update({ where: { id }, data });
    return res.json({ hotspot });
  } catch (error) {
    console.error("Update hotspot error:", error);
    return res.status(500).json({ message: "Không thể cập nhật icon loa" });
  }
};

exports.deleteHotspot = async (req, res) => {
  try {
    const id = parseId(req.params.hotspotId || req.params.id);
    if (!id) return res.status(400).json({ message: "ID không hợp lệ" });
    await prisma.bookAudioHotspot.delete({ where: { id } });
    return res.json({ message: "Đã xóa icon loa" });
  } catch (error) {
    console.error("Delete hotspot error:", error);
    return res.status(500).json({ message: "Không thể xóa icon loa" });
  }
};
