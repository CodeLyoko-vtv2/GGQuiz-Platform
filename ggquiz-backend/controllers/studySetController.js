const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.createStudySet = async (req, res) => {
  try {
    const { title, description, cards } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Vui lòng nhập tiêu đề học phần" });
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ message: "Vui lòng thêm ít nhất một thẻ" });
    }

    const cleanedCards = cards
      .map((card) => ({
        term: String(card.term || "").trim(),
        definition: String(card.definition || "").trim(),
        image: card.image ? String(card.image) : null,
        termImage: card.termImage ? String(card.termImage) : null,
      }))
      .filter((card) => card.term && card.definition);

    if (cleanedCards.length === 0) {
      return res.status(400).json({
        message: "Mỗi thẻ cần có thuật ngữ và định nghĩa",
      });
    }

    const studySet = await prisma.$transaction(async (tx) => {
      const createdSet = await tx.studySet.create({
        data: {
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
          userId,
          cards: {
            create: cleanedCards,
          },
        },
        include: {
          cards: true,
        },
      });

      return createdSet;
    });

    return res.status(201).json({
      message: "Tạo học phần thành công",
      studySet,
    });
  } catch (error) {
    console.error("Create study set error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

const listInclude = {
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  cards: {
    select: {
      id: true,
    },
  },
};

function formatStudySet(set, { isSaved = false, viewedAt = null } = {}) {
  return {
    id: set.id,
    title: set.title,
    description: set.description,
    createdAt: set.createdAt,
    lastAccessedAt: set.lastAccessedAt,
    viewCount: set.viewCount ?? 0,
    saveCount: set.saveCount ?? 0,
    userId: set.userId,
    user: set.user,
    cardCount: set.cards.length,
    isSaved: Boolean(isSaved),
    viewedAt: viewedAt || null,
  };
}

function sortForAllFilter(sets) {
  return [...sets].sort((a, b) => {
    if ((b.viewCount || 0) !== (a.viewCount || 0)) {
      return (b.viewCount || 0) - (a.viewCount || 0);
    }
    if ((b.saveCount || 0) !== (a.saveCount || 0)) {
      return (b.saveCount || 0) - (a.saveCount || 0);
    }
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

exports.getAllStudySets = async (req, res) => {
  try {
    const studySets = await prisma.studySet.findMany({
      include: listInclude,
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = studySets.map((set) => formatStudySet(set));

    return res.status(200).json({ studySets: formatted });
  } catch (error) {
    console.error("Get all study sets error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

/**
 * Dashboard list with filters: all | created | saved | recent
 */
exports.getDashboardStudySets = async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const filter = String(req.query.filter || "all").toLowerCase();
    const valid = ["all", "created", "saved", "recent"];
    if (!valid.includes(filter)) {
      return res.status(400).json({
        message: "Bộ lọc không hợp lệ. Dùng: all, created, saved, recent",
      });
    }

    const savedRows = await prisma.studySetSave.findMany({
      where: { userId },
      select: { studySetId: true },
    });
    const savedIds = new Set(savedRows.map((r) => r.studySetId));

    let studySets = [];
    let viewedAtById = new Map();

    if (filter === "created") {
      studySets = await prisma.studySet.findMany({
        where: { userId },
        include: listInclude,
        orderBy: { createdAt: "desc" },
      });
    } else if (filter === "saved") {
      const saves = await prisma.studySetSave.findMany({
        where: { userId },
        include: {
          studySet: { include: listInclude },
        },
        orderBy: { createdAt: "desc" },
      });
      studySets = saves.map((s) => s.studySet).filter(Boolean);
    } else if (filter === "recent") {
      const views = await prisma.studySetView.findMany({
        where: { userId },
        include: {
          studySet: { include: listInclude },
        },
        orderBy: { viewedAt: "desc" },
      });
      studySets = views.map((v) => v.studySet).filter(Boolean);
      viewedAtById = new Map(views.map((v) => [v.studySetId, v.viewedAt]));
    } else {
      // all — toàn bộ hệ thống, sắp xếp theo view → save → mới nhất
      studySets = await prisma.studySet.findMany({
        include: listInclude,
      });
      studySets = sortForAllFilter(studySets);
    }

    const formatted = studySets.map((set) =>
      formatStudySet(set, {
        isSaved: savedIds.has(set.id),
        viewedAt: viewedAtById.get(set.id) || null,
      })
    );

    return res.status(200).json({ studySets: formatted, filter });
  } catch (error) {
    console.error("Get dashboard study sets error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.toggleSaveStudySet = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID học phần không hợp lệ" });
    }

    const studySet = await prisma.studySet.findUnique({ where: { id } });
    if (!studySet) {
      return res.status(404).json({ message: "Không tìm thấy học phần" });
    }

    const existing = await prisma.studySetSave.findUnique({
      where: {
        userId_studySetId: { userId, studySetId: id },
      },
    });

    let isSaved;
    let saveCount;

    if (existing) {
      await prisma.$transaction([
        prisma.studySetSave.delete({
          where: { userId_studySetId: { userId, studySetId: id } },
        }),
        prisma.studySet.update({
          where: { id },
          data: { saveCount: { decrement: 1 } },
        }),
      ]);
      isSaved = false;
      const updated = await prisma.studySet.findUnique({
        where: { id },
        select: { saveCount: true },
      });
      saveCount = Math.max(0, updated?.saveCount ?? 0);
      if (updated && updated.saveCount < 0) {
        await prisma.studySet.update({
          where: { id },
          data: { saveCount: 0 },
        });
        saveCount = 0;
      }
    } else {
      await prisma.$transaction([
        prisma.studySetSave.create({
          data: { userId, studySetId: id },
        }),
        prisma.studySet.update({
          where: { id },
          data: { saveCount: { increment: 1 } },
        }),
      ]);
      isSaved = true;
      const updated = await prisma.studySet.findUnique({
        where: { id },
        select: { saveCount: true },
      });
      saveCount = updated?.saveCount ?? 1;
    }

    return res.status(200).json({
      message: isSaved ? "Đã lưu học phần" : "Đã bỏ lưu học phần",
      isSaved,
      saveCount,
      studySetId: id,
    });
  } catch (error) {
    console.error("Toggle save study set error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

const VIEW_COOLDOWN_MS = 30_000;

exports.recordStudySetView = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const viewerId = req.user?.id || null;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID học phần không hợp lệ" });
    }

    const studySet = await prisma.studySet.findUnique({
      where: { id },
      select: { id: true, viewCount: true },
    });

    if (!studySet) {
      return res.status(404).json({ message: "Không tìm thấy học phần" });
    }

    const now = new Date();
    let shouldIncrement = true;

    if (viewerId) {
      const existing = await prisma.studySetView.findUnique({
        where: {
          userId_studySetId: { userId: viewerId, studySetId: id },
        },
      });

      if (
        existing &&
        now.getTime() - new Date(existing.viewedAt).getTime() < VIEW_COOLDOWN_MS
      ) {
        shouldIncrement = false;
      }

      await prisma.studySetView.upsert({
        where: {
          userId_studySetId: { userId: viewerId, studySetId: id },
        },
        create: {
          userId: viewerId,
          studySetId: id,
          viewedAt: now,
        },
        update: {
          viewedAt: now,
        },
      });
    }

    if (shouldIncrement) {
      const updated = await prisma.studySet.update({
        where: { id },
        data: {
          lastAccessedAt: now,
          viewCount: { increment: 1 },
        },
        select: { viewCount: true },
      });

      return res.status(200).json({
        viewCount: updated.viewCount,
        counted: true,
      });
    }

    await prisma.studySet.update({
      where: { id },
      data: { lastAccessedAt: now },
    });

    return res.status(200).json({
      viewCount: studySet.viewCount ?? 0,
      counted: false,
    });
  } catch (error) {
    console.error("Record study set view error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getStudySetById = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const viewerId = req.user?.id || null;

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID học phần không hợp lệ" });
    }

    const studySet = await prisma.studySet.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cards: {
          orderBy: { id: "asc" },
        },
      },
    });

    if (!studySet) {
      return res.status(404).json({ message: "Không tìm thấy học phần" });
    }

    let isSaved = false;
    if (viewerId) {
      const save = await prisma.studySetSave.findUnique({
        where: {
          userId_studySetId: { userId: viewerId, studySetId: id },
        },
      });
      isSaved = Boolean(save);
    }

    return res.status(200).json({
      studySet: {
        ...studySet,
        viewCount: studySet.viewCount ?? 0,
        isSaved,
      },
    });
  } catch (error) {
    console.error("Get study set by id error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getMyStudySets = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    const studySets = await prisma.studySet.findMany({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cards: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = studySets.map((set) => formatStudySet(set));

    return res.status(200).json({ studySets: formatted });
  } catch (error) {
    console.error("Get my study sets error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.searchStudySets = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();

    if (!q) {
      return res.status(400).json({ message: "Vui lòng nhập từ khóa tìm kiếm" });
    }

    const studySets = await prisma.studySet.findMany({
      where: {
        title: {
          contains: q,
          mode: "insensitive",
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        cards: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    const formatted = studySets.map((set) => formatStudySet(set));

    return res.status(200).json({ studySets: formatted, query: q });
  } catch (error) {
    console.error("Search study sets error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.updateStudySet = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);
    const { title, description, cards } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID học phần không hợp lệ" });
    }

    if (!title || !String(title).trim()) {
      return res.status(400).json({ message: "Vui lòng nhập tiêu đề học phần" });
    }

    if (!Array.isArray(cards) || cards.length === 0) {
      return res.status(400).json({ message: "Vui lòng thêm ít nhất một thẻ" });
    }

    const existing = await prisma.studySet.findUnique({
      where: { id },
      include: { cards: true },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy học phần" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền chỉnh sửa học phần này" });
    }

    const cleanedCards = cards
      .map((card) => ({
        id: card.id ? Number(card.id) : null,
        term: String(card.term || "").trim(),
        definition: String(card.definition || "").trim(),
        image: card.image ? String(card.image) : null,
        termImage: card.termImage ? String(card.termImage) : null,
      }))
      .filter((card) => card.term && card.definition);

    if (cleanedCards.length === 0) {
      return res.status(400).json({
        message: "Mỗi thẻ cần có thuật ngữ và định nghĩa",
      });
    }

    const existingCardIds = existing.cards.map((card) => card.id);
    const keptIds = cleanedCards
      .map((card) => card.id)
      .filter((cardId) => cardId && existingCardIds.includes(cardId));
    const idsToDelete = existingCardIds.filter((cardId) => !keptIds.includes(cardId));

    const studySet = await prisma.$transaction(async (tx) => {
      await tx.studySet.update({
        where: { id },
        data: {
          title: String(title).trim(),
          description: description ? String(description).trim() : null,
        },
      });

      if (idsToDelete.length > 0) {
        await tx.card.deleteMany({
          where: {
            id: { in: idsToDelete },
            studySetId: id,
          },
        });
      }

      for (const card of cleanedCards) {
        if (card.id && existingCardIds.includes(card.id)) {
          await tx.card.update({
            where: { id: card.id },
            data: {
              term: card.term,
              definition: card.definition,
              image: card.image,
              termImage: card.termImage,
            },
          });
        } else {
          await tx.card.create({
            data: {
              term: card.term,
              definition: card.definition,
              image: card.image,
              termImage: card.termImage,
              studySetId: id,
            },
          });
        }
      }

      return tx.studySet.findUnique({
        where: { id },
        include: {
          cards: { orderBy: { id: "asc" } },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
      });
    });

    return res.status(200).json({
      message: "Cập nhật học phần thành công",
      studySet,
    });
  } catch (error) {
    console.error("Update study set error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.deleteStudySet = async (req, res) => {
  try {
    const userId = req.user?.id;
    const id = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "ID học phần không hợp lệ" });
    }

    const existing = await prisma.studySet.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ message: "Không tìm thấy học phần" });
    }

    if (existing.userId !== userId) {
      return res.status(403).json({ message: "Bạn không có quyền xóa học phần này" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.card.deleteMany({ where: { studySetId: id } });
      await tx.studySet.delete({ where: { id } });
    });

    return res.status(200).json({ message: "Đã xóa học phần thành công" });
  } catch (error) {
    console.error("Delete study set error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
