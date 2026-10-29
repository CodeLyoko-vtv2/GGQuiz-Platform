const { PrismaClient } = require("@prisma/client");
const { getEsportsSetById } = require("../data/esportsCatalog");

const prisma = new PrismaClient();

const ITEM_TYPES = new Set(["STUDY_SET", "EXAM", "LESSON_PLAN", "ESPORTS_SET"]);

function formatFolder(folder) {
  return {
    id: folder.id,
    name: folder.name,
    createdAt: folder.createdAt,
    updatedAt: folder.updatedAt,
    lastAccessedAt: folder.lastAccessedAt,
    userId: folder.userId,
    itemCount: folder._count?.items ?? folder.items?.length ?? 0,
  };
}

async function resolveFolderItems(items) {
  const studySetIds = items
    .filter((item) => item.itemType === "STUDY_SET")
    .map((item) => item.refId);
  const examIds = items
    .filter((item) => item.itemType === "EXAM")
    .map((item) => item.refId);
  const lessonPlanIds = items
    .filter((item) => item.itemType === "LESSON_PLAN")
    .map((item) => item.refId);

  const [studySets, exams, lessonPlans] = await Promise.all([
    studySetIds.length
      ? prisma.studySet.findMany({
          where: { id: { in: studySetIds } },
          include: {
            user: { select: { id: true, name: true } },
            cards: { select: { id: true } },
          },
        })
      : [],
    examIds.length
      ? prisma.exam.findMany({
          where: { id: { in: examIds } },
          include: { user: { select: { id: true, name: true } } },
        })
      : [],
    lessonPlanIds.length
      ? prisma.lessonPlan.findMany({
          where: { id: { in: lessonPlanIds } },
          include: { user: { select: { id: true, name: true } } },
        })
      : [],
  ]);

  const studySetMap = new Map(studySets.map((item) => [item.id, item]));
  const examMap = new Map(exams.map((item) => [item.id, item]));
  const lessonPlanMap = new Map(lessonPlans.map((item) => [item.id, item]));

  return items
    .map((item) => {
      if (item.itemType === "STUDY_SET") {
        const studySet = studySetMap.get(item.refId);
        if (!studySet) return null;
        return {
          id: item.id,
          itemType: item.itemType,
          refId: item.refId,
          createdAt: item.createdAt,
          title: studySet.title,
          description: studySet.description,
          cardCount: studySet.cards.length,
          user: studySet.user,
          href: `/set/${studySet.id}`,
        };
      }

      if (item.itemType === "EXAM") {
        const exam = examMap.get(item.refId);
        if (!exam) return null;
        return {
          id: item.id,
          itemType: item.itemType,
          refId: item.refId,
          createdAt: item.createdAt,
          title: exam.title,
          description: exam.description,
          user: exam.user,
          href: `/practice-tests`,
        };
      }

      if (item.itemType === "ESPORTS_SET") {
        const esports = getEsportsSetById(item.refId);
        if (!esports) return null;
        return {
          id: item.id,
          itemType: item.itemType,
          refId: item.refId,
          createdAt: item.createdAt,
          title: esports.title,
          description: esports.description,
          cardCount: esports.cardCount,
          user: { name: "GGQuiz Esports" },
          href: `/esports?set=${esports.id}`,
        };
      }

      const lessonPlan = lessonPlanMap.get(item.refId);
      if (!lessonPlan) return null;
      return {
        id: item.id,
        itemType: item.itemType,
        refId: item.refId,
        createdAt: item.createdAt,
        title: lessonPlan.title,
        description: lessonPlan.description,
        user: lessonPlan.user,
        href: `/lesson-plans/${lessonPlan.id}`,
      };
    })
    .filter(Boolean);
}

exports.createFolder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const name = String(req.body?.name || "").trim();

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!name) {
      return res.status(400).json({ message: "Vui lòng nhập tên thư mục" });
    }

    const folder = await prisma.folder.create({
      data: {
        name,
        userId,
        lastAccessedAt: new Date(),
      },
      include: {
        _count: { select: { items: true } },
      },
    });

    return res.status(201).json({
      message: "Tạo thư mục thành công",
      folder: formatFolder(folder),
    });
  } catch (error) {
    console.error("Create folder error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.updateFolder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    const name = String(req.body?.name || "").trim();

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID thư mục không hợp lệ" });
    }

    if (!name) {
      return res.status(400).json({ message: "Vui lòng nhập tên thư mục" });
    }

    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return res.status(404).json({ message: "Không tìm thấy thư mục" });
    }
    if (folder.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa thư mục này" });
    }

    const updated = await prisma.folder.update({
      where: { id },
      data: { name },
      include: { _count: { select: { items: true } } },
    });

    return res.status(200).json({
      message: "Đã cập nhật thư mục",
      folder: formatFolder(updated),
    });
  } catch (error) {
    console.error("Update folder error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.deleteFolder = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID thư mục không hợp lệ" });
    }

    const folder = await prisma.folder.findUnique({ where: { id } });
    if (!folder) {
      return res.status(404).json({ message: "Không tìm thấy thư mục" });
    }
    if (folder.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền xóa thư mục này" });
    }

    await prisma.folder.delete({ where: { id } });

    return res.status(200).json({ message: "Đã xóa thư mục" });
  } catch (error) {
    console.error("Delete folder error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getMyFolders = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const folders = await prisma.folder.findMany({
      where: { userId },
      include: { _count: { select: { items: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return res.status(200).json({
      folders: folders.map(formatFolder),
    });
  } catch (error) {
    console.error("Get my folders error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getFolderById = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID thư mục không hợp lệ" });
    }

    const folder = await prisma.folder.findUnique({
      where: { id },
      include: {
        items: { orderBy: { createdAt: "desc" } },
        _count: { select: { items: true } },
      },
    });

    if (!folder) {
      return res.status(404).json({ message: "Không tìm thấy thư mục" });
    }

    if (folder.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền xem thư mục này" });
    }

    await prisma.folder.update({
      where: { id },
      data: { lastAccessedAt: new Date() },
    });

    const items = await resolveFolderItems(folder.items);

    return res.status(200).json({
      folder: {
        ...formatFolder(folder),
        items,
      },
    });
  } catch (error) {
    console.error("Get folder by id error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.addFolderItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const folderId = Number(req.params.id);
    const itemType = String(req.body?.itemType || "").trim().toUpperCase();
    const refId = Number(req.body?.refId);

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(folderId) || folderId <= 0) {
      return res.status(400).json({ message: "ID thư mục không hợp lệ" });
    }

    if (!ITEM_TYPES.has(itemType) || !Number.isInteger(refId) || refId <= 0) {
      return res.status(400).json({ message: "Tài liệu không hợp lệ" });
    }

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) {
      return res.status(404).json({ message: "Không tìm thấy thư mục" });
    }
    if (folder.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa thư mục này" });
    }

    if (itemType === "STUDY_SET") {
      const studySet = await prisma.studySet.findUnique({ where: { id: refId } });
      if (!studySet) {
        return res.status(404).json({ message: "Không tìm thấy thẻ ghi nhớ" });
      }
    } else if (itemType === "EXAM") {
      const exam = await prisma.exam.findUnique({ where: { id: refId } });
      if (!exam || exam.userId !== userId) {
        return res.status(404).json({ message: "Không tìm thấy đề" });
      }
    } else if (itemType === "LESSON_PLAN") {
      const lessonPlan = await prisma.lessonPlan.findUnique({ where: { id: refId } });
      if (!lessonPlan || lessonPlan.userId !== userId) {
        return res.status(404).json({ message: "Không tìm thấy giáo án" });
      }
    } else if (itemType === "ESPORTS_SET") {
      if (!getEsportsSetById(refId)) {
        return res.status(404).json({ message: "Không tìm thấy thuật ngữ Esports" });
      }
    } else {
      return res.status(400).json({ message: "Loại tài liệu không hợp lệ" });
    }

    const item = await prisma.folderItem.upsert({
      where: {
        folderId_itemType_refId: {
          folderId,
          itemType,
          refId,
        },
      },
      update: {},
      create: {
        folderId,
        itemType,
        refId,
      },
    });

    await prisma.folder.update({
      where: { id: folderId },
      data: { updatedAt: new Date() },
    });

    return res.status(200).json({
      message: "Đã thêm tài liệu vào thư mục",
      item,
    });
  } catch (error) {
    console.error("Add folder item error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.removeFolderItem = async (req, res) => {
  try {
    const userId = req.user?.id;
    const folderId = Number(req.params.id);
    const itemType = String(req.body?.itemType || req.query?.itemType || "")
      .trim()
      .toUpperCase();
    const refId = Number(req.body?.refId || req.query?.refId);
    const itemId = Number(req.params.itemId || req.body?.itemId);

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(folderId) || folderId <= 0) {
      return res.status(400).json({ message: "ID thư mục không hợp lệ" });
    }

    const folder = await prisma.folder.findUnique({ where: { id: folderId } });
    if (!folder) {
      return res.status(404).json({ message: "Không tìm thấy thư mục" });
    }
    if (folder.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa thư mục này" });
    }

    if (Number.isInteger(itemId) && itemId > 0) {
      await prisma.folderItem.deleteMany({
        where: { id: itemId, folderId },
      });
    } else if (ITEM_TYPES.has(itemType) && Number.isInteger(refId) && refId > 0) {
      await prisma.folderItem.deleteMany({
        where: { folderId, itemType, refId },
      });
    } else {
      return res.status(400).json({ message: "Thiếu thông tin tài liệu cần xóa" });
    }

    await prisma.folder.update({
      where: { id: folderId },
      data: { updatedAt: new Date() },
    });

    return res.status(200).json({ message: "Đã xóa tài liệu khỏi thư mục" });
  } catch (error) {
    console.error("Remove folder item error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getMyExams = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const exams = await prisma.exam.findMany({
      where: { userId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ exams });
  } catch (error) {
    console.error("Get my exams error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getMyLessonPlans = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const lessonPlans = await prisma.lessonPlan.findMany({
      where: { userId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });

    return res.status(200).json({ lessonPlans });
  } catch (error) {
    console.error("Get my lesson plans error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
