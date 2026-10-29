const { PrismaClient } = require("@prisma/client");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const { SPECIALIZED_SEED } = require("../data/specializedSeed");

const prisma = new PrismaClient();

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
].filter(Boolean);

function isPremiumUser(user) {
  if (!user || user.plan !== "premium") return false;
  if (!user.premiumUntil) return true;
  return new Date(user.premiumUntil).getTime() > Date.now();
}

function sanitizeVocab(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((item) => item && typeof item === "object")
    .slice(0, 40)
    .map((item) => ({
      term: String(item.term || "").slice(0, 120),
      meaning: String(item.meaning || "").slice(0, 240),
      example: String(item.example || "").slice(0, 280),
    }))
    .filter((item) => item.term);
}

function formatField(field, extras = {}) {
  return {
    id: field.id,
    name: field.name,
    slug: field.slug,
    description: field.description || "",
    icon: field.icon || "Languages",
    accent: field.accent || "amber",
    language: field.language || "en",
    sortOrder: field.sortOrder || 0,
    published: field.published !== false,
    lessonCount: extras.lessonCount ?? field._count?.lessons ?? field.lessons?.length ?? 0,
    completedCount: extras.completedCount || 0,
  };
}

function formatLesson(lesson, extras = {}) {
  return {
    id: lesson.id,
    fieldId: lesson.fieldId,
    title: lesson.title,
    description: lesson.description || "",
    icon: lesson.icon || "BookOpen",
    section: lesson.section || "",
    sortOrder: lesson.sortOrder,
    requiresPremium: Boolean(lesson.requiresPremium),
    scenarioTitle: lesson.scenarioTitle || "",
    vocab: extras.includeVocab ? sanitizeVocab(lesson.vocab) : undefined,
    aiSystemPrompt: extras.includePrompt ? String(lesson.aiSystemPrompt || "") : undefined,
    completed: Boolean(extras.completed),
    unlocked: Boolean(extras.unlocked),
    premiumLocked: Boolean(extras.premiumLocked),
    state: extras.state || "locked",
  };
}

function lessonStates(lessons, completedIds, premium) {
  const done = new Set(completedIds);
  return lessons.map((lesson, index) => {
    const completed = done.has(lesson.id);
    const prevDone = index === 0 || done.has(lessons[index - 1].id);
    const premiumLocked = Boolean(lesson.requiresPremium) && !premium;
    const unlocked = prevDone && !premiumLocked;
    let state = "locked";
    if (completed) state = "completed";
    else if (premiumLocked && prevDone) state = "premium";
    else if (unlocked) state = "current";
    return formatLesson(lesson, { completed, unlocked, premiumLocked, state });
  });
}

async function ensureSpecializedSeed() {
  const count = await prisma.specializedField.count();
  if (count > 0) return;
  for (const field of SPECIALIZED_SEED) {
    await prisma.specializedField.create({
      data: {
        name: field.name,
        slug: field.slug,
        description: field.description,
        icon: field.icon,
        accent: field.accent,
        sortOrder: field.sortOrder,
        lessons: {
          create: field.lessons.map((lesson) => ({
            title: lesson.title,
            description: lesson.description || "",
            icon: lesson.icon,
            section: lesson.section || "",
            sortOrder: lesson.sortOrder,
            requiresPremium: Boolean(lesson.requiresPremium),
            vocab: lesson.vocab || [],
            scenarioTitle: lesson.scenarioTitle || "",
            aiSystemPrompt: lesson.aiSystemPrompt || "",
          })),
        },
      },
    });
  }
}

async function listFields(req, res) {
  try {
    await ensureSpecializedSeed();
    const userId = req.user?.id;
    const fields = await prisma.specializedField.findMany({
      where: { published: true },
      include: { _count: { select: { lessons: true } }, lessons: { select: { id: true } } },
      orderBy: { sortOrder: "asc" },
    });
    const lessonIds = fields.flatMap((item) => item.lessons.map((lesson) => lesson.id));
    const done = userId
      ? await prisma.specializedProgress.findMany({
          where: { userId, lessonId: { in: lessonIds } },
          select: { lessonId: true },
        })
      : [];
    const doneSet = new Set(done.map((item) => item.lessonId));
    return res.json({
      fields: fields.map((field) =>
        formatField(field, {
          lessonCount: field._count.lessons,
          completedCount: field.lessons.filter((lesson) => doneSet.has(lesson.id)).length,
        })
      ),
    });
  } catch (error) {
    console.error("List specialized fields error:", error);
    return res.status(500).json({ message: "Không thể tải lĩnh vực" });
  }
}

async function getField(req, res) {
  try {
    await ensureSpecializedSeed();
    const key = req.params.id;
    const field = await prisma.specializedField.findFirst({
      where: Number(key) ? { id: Number(key) } : { slug: String(key) },
      include: { lessons: { orderBy: { sortOrder: "asc" } } },
    });
    if (!field || !field.published) return res.status(404).json({ message: "Không tìm thấy lĩnh vực" });

    const user = req.user?.id ? await prisma.user.findUnique({ where: { id: req.user.id } }) : null;
    const premium = isPremiumUser(user);
    const done = user
      ? await prisma.specializedProgress.findMany({
          where: { userId: user.id, lessonId: { in: field.lessons.map((item) => item.id) } },
          select: { lessonId: true },
        })
      : [];
    const nodes = lessonStates(
      field.lessons,
      done.map((item) => item.lessonId),
      premium
    );
    return res.json({
      field: formatField(field, {
        lessonCount: field.lessons.length,
        completedCount: nodes.filter((item) => item.completed).length,
      }),
      lessons: nodes,
      isPremium: premium,
    });
  } catch (error) {
    console.error("Get specialized field error:", error);
    return res.status(500).json({ message: "Không thể tải lộ trình" });
  }
}

async function resolveAccess(userId, lessonId) {
  const lesson = await prisma.specializedLesson.findUnique({
    where: { id: lessonId },
    include: { field: { include: { lessons: { orderBy: { sortOrder: "asc" } } } } },
  });
  if (!lesson || !lesson.field.published) return { error: { status: 404, message: "Không tìm thấy bài học" } };
  const user = userId ? await prisma.user.findUnique({ where: { id: userId } }) : null;
  if (!user) return { error: { status: 401, message: "Chưa đăng nhập" } };
  const premium = isPremiumUser(user);
  const siblings = lesson.field.lessons;
  const index = siblings.findIndex((item) => item.id === lesson.id);
  const prev = index > 0 ? siblings[index - 1] : null;
  if (prev) {
    const prevDone = await prisma.specializedProgress.findUnique({
      where: { userId_lessonId: { userId, lessonId: prev.id } },
    });
    if (!prevDone) return { error: { status: 403, code: "LOCKED", message: "Hãy hoàn thành bài trước đó" }, lesson };
  }
  if (lesson.requiresPremium && !premium) {
    return { error: { status: 403, code: "PREMIUM_REQUIRED", message: "Bài học này dành cho Premium" }, lesson };
  }
  const completed = await prisma.specializedProgress.findUnique({
    where: { userId_lessonId: { userId, lessonId: lesson.id } },
  });
  return { lesson, premium, completed: Boolean(completed) };
}

async function getLesson(req, res) {
  try {
    const access = await resolveAccess(req.user.id, Number(req.params.id));
    if (access.error) {
      return res.status(access.error.status).json({
        message: access.error.message,
        code: access.error.code,
        lesson: access.lesson
          ? formatLesson(access.lesson, { includeVocab: false, state: access.error.code === "PREMIUM_REQUIRED" ? "premium" : "locked" })
          : undefined,
      });
    }
    return res.json({
      lesson: formatLesson(access.lesson, {
        includeVocab: true,
        completed: access.completed,
        unlocked: true,
        state: access.completed ? "completed" : "current",
      }),
      field: formatField(access.lesson.field),
    });
  } catch (error) {
    console.error("Get specialized lesson error:", error);
    return res.status(500).json({ message: "Không thể tải bài học" });
  }
}

async function completeLesson(req, res) {
  try {
    const access = await resolveAccess(req.user.id, Number(req.params.id));
    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message, code: access.error.code });
    }
    await prisma.specializedProgress.upsert({
      where: { userId_lessonId: { userId: req.user.id, lessonId: access.lesson.id } },
      update: { completedAt: new Date() },
      create: { userId: req.user.id, lessonId: access.lesson.id },
    });
    return res.json({ message: "Đã hoàn thành bài học", fieldId: access.lesson.fieldId });
  } catch (error) {
    console.error("Complete specialized lesson error:", error);
    return res.status(500).json({ message: "Không thể cập nhật tiến độ" });
  }
}

async function chatLesson(req, res) {
  try {
    const access = await resolveAccess(req.user.id, Number(req.params.id));
    if (access.error) {
      return res.status(access.error.status).json({ message: access.error.message, code: access.error.code });
    }
    const message = String(req.body.message || "").trim();
    if (!message) return res.status(400).json({ message: "Hãy nhập câu thoại" });
    const history = Array.isArray(req.body.history) ? req.body.history.slice(-10) : [];
    const vocab = sanitizeVocab(access.lesson.vocab)
      .map((item) => item.term)
      .join(", ");
    const systemInstruction = `${access.lesson.aiSystemPrompt || "You are a helpful roleplay partner for English practice."}
Stay in character. Prefer English. If the learner uses Vietnamese, reply in English and briefly recast.
Target vocabulary: ${vocab || "general professional English"}.
Keep replies short (2-5 sentences) so the learner can respond.`;

    const contents = history
      .map((item) => ({
        role: item.role === "assistant" ? "model" : "user",
        parts: [{ text: String(item.content || "").trim() }],
      }))
      .filter((item) => item.parts[0].text);
    contents.push({ role: "user", parts: [{ text: message.slice(0, 2000) }] });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.json({
        reply: "Got it. Could you try using one of the target words from the list on the left?",
        fallback: true,
      });
    }
    const genAI = new GoogleGenerativeAI(apiKey);
    let reply = "";
    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName, systemInstruction });
        const result = await model.generateContent({
          contents,
          generationConfig: { temperature: 0.7, maxOutputTokens: 400 },
        });
        reply = String(result?.response?.text?.() || "").trim();
        if (reply) break;
      } catch (error) {
        if (!/404|not found|NOT_FOUND/i.test(String(error.message || ""))) {
          console.warn("Specialized chat:", error.message);
        }
      }
    }
    if (!reply) {
      reply = "Interesting. Can you say that again using one of the new terms?";
    }
    return res.json({ reply });
  } catch (error) {
    console.error("Specialized chat error:", error);
    return res.status(500).json({ message: "AI chưa phản hồi được. Thử lại nhé." });
  }
}

async function adminGetField(req, res) {
  try {
    const field = await prisma.specializedField.findUnique({
      where: { id: Number(req.params.id) },
      include: { lessons: { orderBy: { sortOrder: "asc" } } },
    });
    if (!field) return res.status(404).json({ message: "Không tìm thấy lĩnh vực" });
    return res.json({
      field: formatField(field, { lessonCount: field.lessons.length }),
      lessons: field.lessons.map((item) => formatLesson(item, { includeVocab: true, includePrompt: true })),
    });
  } catch (error) {
    console.error("Admin get field error:", error);
    return res.status(500).json({ message: "Không thể tải lĩnh vực" });
  }
}

async function adminListFields(req, res) {
  try {
    await ensureSpecializedSeed();
    const fields = await prisma.specializedField.findMany({
      include: { _count: { select: { lessons: true } } },
      orderBy: { sortOrder: "asc" },
    });
    return res.json({ fields: fields.map((item) => formatField(item)) });
  } catch (error) {
    console.error("Admin list fields error:", error);
    return res.status(500).json({ message: "Không thể tải lĩnh vực" });
  }
}

async function adminSaveField(req, res) {
  try {
    const id = Number(req.params.id);
    const data = {
      name: String(req.body.name || "").trim(),
      slug: String(req.body.slug || "").trim().toLowerCase(),
      description: String(req.body.description || "").trim(),
      icon: String(req.body.icon || "Languages"),
      accent: String(req.body.accent || "amber"),
      language: String(req.body.language || "en"),
      sortOrder: Number(req.body.sortOrder) || 0,
      published: req.body.published !== false,
    };
    if (!data.name || !data.slug) return res.status(400).json({ message: "Cần tên và slug" });
    const field = id
      ? await prisma.specializedField.update({ where: { id }, data })
      : await prisma.specializedField.create({ data });
    return res.json({ field: formatField(field) });
  } catch (error) {
    console.error("Admin save field error:", error);
    return res.status(500).json({ message: "Không thể lưu lĩnh vực" });
  }
}

async function adminDeleteField(req, res) {
  try {
    await prisma.specializedField.delete({ where: { id: Number(req.params.id) } });
    return res.json({ message: "Đã xóa lĩnh vực" });
  } catch (error) {
    console.error("Admin delete field error:", error);
    return res.status(500).json({ message: "Không thể xóa lĩnh vực" });
  }
}

async function adminListLessons(req, res) {
  try {
    const fieldId = Number(req.params.fieldId);
    const lessons = await prisma.specializedLesson.findMany({
      where: { fieldId },
      orderBy: { sortOrder: "asc" },
    });
    return res.json({
      lessons: lessons.map((item) => formatLesson(item, { includeVocab: true, includePrompt: true })),
    });
  } catch (error) {
    console.error("Admin list lessons error:", error);
    return res.status(500).json({ message: "Không thể tải bài học" });
  }
}

async function adminSaveLesson(req, res) {
  try {
    const id = Number(req.params.id);
    const fieldId = Number(req.body.fieldId || req.params.fieldId);
    const data = {
      fieldId,
      title: String(req.body.title || "").trim(),
      description: String(req.body.description || "").trim(),
      icon: String(req.body.icon || "BookOpen"),
      section: String(req.body.section || "").trim(),
      sortOrder: Number(req.body.sortOrder) || 0,
      requiresPremium: Boolean(req.body.requiresPremium),
      vocab: sanitizeVocab(req.body.vocab),
      scenarioTitle: String(req.body.scenarioTitle || "").trim(),
      aiSystemPrompt: String(req.body.aiSystemPrompt || "").trim(),
    };
    if (!data.title || !fieldId) return res.status(400).json({ message: "Cần tiêu đề và lĩnh vực" });
    const lesson = id
      ? await prisma.specializedLesson.update({ where: { id }, data })
      : await prisma.specializedLesson.create({ data });
    return res.json({
      lesson: formatLesson(lesson, { includeVocab: true, includePrompt: true }),
    });
  } catch (error) {
    console.error("Admin save lesson error:", error);
    return res.status(500).json({ message: "Không thể lưu bài học" });
  }
}

async function adminDeleteLesson(req, res) {
  try {
    await prisma.specializedLesson.delete({ where: { id: Number(req.params.id) } });
    return res.json({ message: "Đã xóa bài học" });
  } catch (error) {
    console.error("Admin delete lesson error:", error);
    return res.status(500).json({ message: "Không thể xóa bài học" });
  }
}

module.exports = {
  listFields,
  getField,
  getLesson,
  completeLesson,
  chatLesson,
  adminListFields,
  adminGetField,
  adminSaveField,
  adminDeleteField,
  adminListLessons,
  adminSaveLesson,
  adminDeleteLesson,
};
