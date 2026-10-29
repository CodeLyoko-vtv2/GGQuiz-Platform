const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

exports.saveResult = async (req, res) => {
  try {
    const userId = req.user?.id;
    const studySetId = Number(req.params.id);
    const { score, totalQuestions, accuracy } = req.body;

    if (!userId) {
      return res.status(401).json({ message: "Chưa đăng nhập" });
    }

    if (!Number.isInteger(studySetId) || studySetId <= 0) {
      return res.status(400).json({ message: "ID học phần không hợp lệ" });
    }

    const scoreNum = Number(score);
    const totalNum = Number(totalQuestions);
    const accuracyNum = Number(accuracy);

    if (
      !Number.isFinite(scoreNum) ||
      !Number.isFinite(totalNum) ||
      totalNum <= 0 ||
      scoreNum < 0 ||
      scoreNum > totalNum
    ) {
      return res.status(400).json({ message: "Dữ liệu điểm số không hợp lệ" });
    }

    const studySet = await prisma.studySet.findUnique({
      where: { id: studySetId },
      select: { id: true },
    });

    if (!studySet) {
      return res.status(404).json({ message: "Không tìm thấy học phần" });
    }

    const result = await prisma.quizResult.create({
      data: {
        score: Math.round(scoreNum),
        totalQuestions: Math.round(totalNum),
        accuracy: Number.isFinite(accuracyNum)
          ? accuracyNum
          : Math.round((scoreNum / totalNum) * 100),
        userId,
        studySetId,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    return res.status(201).json({
      message: "Lưu kết quả thành công",
      result,
    });
  } catch (error) {
    console.error("Save quiz result error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};

exports.getLeaderboard = async (req, res) => {
  try {
    const studySetId = Number(req.params.id);

    if (!Number.isInteger(studySetId) || studySetId <= 0) {
      return res.status(400).json({ message: "ID học phần không hợp lệ" });
    }

    const studySet = await prisma.studySet.findUnique({
      where: { id: studySetId },
      select: { id: true },
    });

    if (!studySet) {
      return res.status(404).json({ message: "Không tìm thấy học phần" });
    }

    const results = await prisma.quizResult.findMany({
      where: { studySetId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ score: "desc" }, { createdAt: "desc" }],
      take: 5,
    });

    const leaderboard = results.map((item, index) => ({
      rank: index + 1,
      id: item.id,
      score: item.score,
      totalQuestions: item.totalQuestions,
      accuracy: item.accuracy,
      createdAt: item.createdAt,
      userId: item.userId,
      username: item.user?.name || "Người chơi",
    }));

    return res.status(200).json({ leaderboard });
  } catch (error) {
    console.error("Get leaderboard error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ" });
  }
};
