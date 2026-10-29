const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const DISCONNECT_MS = 20_000;
const AUTO_TYPES = new Set([
  "mcq",
  "pronunciation",
  "cloze",
  "reading",
  "listening_tf",
  "listening_mcq",
]);

function generateCode() {
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

function remainingSeconds(session) {
  if (session.status === "ended") return 0;
  if (session.status !== "live" || !session.startedAt) {
    return (session.durationMinutes || 0) * 60;
  }
  const elapsed = (Date.now() - new Date(session.startedAt).getTime()) / 1000;
  return Math.max(0, Math.round((session.durationMinutes || 0) * 60 - elapsed));
}

function isManualQuestion(question) {
  const type = String(question.type || "");
  return type === "writing" || type === "speaking" || type === "sentence_rewrite";
}

function isAutoGradable(question) {
  if (isManualQuestion(question)) return false;
  const type = String(question.type || "mcq");
  if (AUTO_TYPES.has(type)) return true;
  if (type === "word_form" && question.correctKey) return true;
  return false;
}

function essayMaxScore(question) {
  const meta = question?.meta && typeof question.meta === "object" ? question.meta : {};
  const value = Number(meta.maxScore);
  return Number.isFinite(value) && value > 0 ? value : 10;
}

function examHasManual(questions) {
  return (questions || []).some(isManualQuestion);
}

function emptyGrading(questions, auto = { score: 0, maxScore: 0 }) {
  return {
    autoScore: auto.score || 0,
    autoMaxScore: auto.maxScore || 0,
    items: {},
    overallComment: "",
    publishedAt: null,
  };
}

function sanitizeInlineComments(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => ({
      id: String(item?.id || `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`),
      start: Math.max(0, Number(item?.start) || 0),
      end: Math.max(0, Number(item?.end) || 0),
      quote: String(item?.quote || "").slice(0, 500),
      text: String(item?.text || "").slice(0, 2000),
    }))
    .filter((item) => item.end >= item.start && item.text.trim());
}

function sanitizeVoice(raw) {
  if (!raw || typeof raw !== "object") return null;
  const dataUrl = String(raw.dataUrl || "");
  if (!dataUrl.startsWith("data:audio")) return null;
  return {
    dataUrl,
    duration: Math.max(0, Number(raw.duration) || 0),
  };
}

function sanitizeGrading(raw, questions, auto = { score: 0, maxScore: 0 }) {
  const base = emptyGrading(questions, auto);
  const source = raw && typeof raw === "object" ? raw : {};
  const items = {};
  (questions || []).forEach((question) => {
    if (!isManualQuestion(question)) return;
    const incoming = source.items?.[String(question.id)] || source.items?.[question.id] || {};
    const maxScore = essayMaxScore(question);
    const scoreRaw = incoming.score;
    const score =
      scoreRaw === "" || scoreRaw == null || Number.isNaN(Number(scoreRaw))
        ? null
        : Math.max(0, Math.min(maxScore, Number(scoreRaw)));
    items[String(question.id)] = {
      score,
      maxScore,
      comment: String(incoming.comment || "").slice(0, 4000),
      inlineComments: sanitizeInlineComments(incoming.inlineComments),
      voiceComment: sanitizeVoice(incoming.voiceComment),
    };
  });
  return {
    autoScore: Number(source.autoScore ?? base.autoScore) || 0,
    autoMaxScore: Number(source.autoMaxScore ?? base.autoMaxScore) || 0,
    items,
    overallComment: String(source.overallComment || "").slice(0, 4000),
    publishedAt: source.publishedAt || null,
  };
}

function resolveGradingStatus(participant, questions) {
  if (participant.gradingStatus === "published") return "published";
  if (!examHasManual(questions)) return "none";
  if (["submitted", "quit"].includes(participant.status)) return "pending";
  return participant.gradingStatus === "pending" ? "pending" : "none";
}

function totalsFromGrading(grading) {
  let manualScore = 0;
  let manualMax = 0;
  Object.values(grading.items || {}).forEach((item) => {
    manualMax += Number(item.maxScore) || 0;
    if (item.score != null) manualScore += Number(item.score) || 0;
  });
  return {
    manualScore,
    manualMax,
    totalScore: (Number(grading.autoScore) || 0) + manualScore,
    totalMax: (Number(grading.autoMaxScore) || 0) + manualMax,
  };
}

function normalizeAnswers(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const next = {};
  Object.entries(raw).forEach(([key, value]) => {
    if (value == null) return;
    if (typeof value === "object") {
      next[String(key)] = { value: String(value.value ?? "") };
      return;
    }
    next[String(key)] = { value: String(value) };
  });
  return next;
}

function gradeAnswers(questions, answers) {
  const map = normalizeAnswers(answers);
  let score = 0;
  let maxScore = 0;
  questions.forEach((question) => {
    if (!isAutoGradable(question)) return;
    maxScore += 1;
    const given = String(map[String(question.id)]?.value || "").trim();
    const expected = String(question.correctKey || "").trim();
    if (!expected) return;
    const hasOptions = Array.isArray(question.options) && question.options.length > 0;
    const ok = hasOptions
      ? given.toUpperCase() === expected.toUpperCase()
      : given.toLowerCase() === expected.toLowerCase();
    if (ok) score += 1;
  });
  return { score, maxScore };
}

function displayStatus(participant, session) {
  if (participant.status === "submitted" || participant.status === "quit") {
    return participant.status;
  }
  if (session.status === "ended") {
    return participant.status === "waiting" ? "quit" : "submitted";
  }
  const stale = Date.now() - new Date(participant.lastSeenAt).getTime() > DISCONNECT_MS;
  if (participant.status === "in_progress" && stale) return "disconnected";
  return participant.status;
}

function formatQuestionPublic(question) {
  return {
    id: question.id,
    prompt: question.prompt,
    type: question.type,
    audioUrl: question.audioUrl,
    passage: question.passage,
    options: Array.isArray(question.options) ? question.options : [],
    meta: question.meta && typeof question.meta === "object" ? question.meta : {},
  };
}

function formatQuestionPrivate(question) {
  return {
    ...formatQuestionPublic(question),
    correctKey: question.correctKey || "",
    explanation: question.explanation || "",
  };
}

function formatParticipant(participant, session, { includeAnswers = false, includeGrading = false } = {}) {
  const questions = session.exam?.questions || [];
  const gradingStatus = resolveGradingStatus(participant, questions);
  const needsManualGrade = examHasManual(questions);
  const stored = participant.grading && typeof participant.grading === "object" ? participant.grading : {};
  const autoScore = stored.autoScore ?? (gradingStatus === "published" ? null : participant.score);
  const autoMaxScore = stored.autoMaxScore ?? (gradingStatus === "published" ? null : participant.maxScore);
  return {
    id: participant.id,
    userId: participant.userId,
    name: participant.user?.name || "Thí sinh",
    status: displayStatus(participant, session),
    rawStatus: participant.status,
    violationCount: participant.violationCount || 0,
    score: gradingStatus === "published" ? participant.score : autoScore,
    maxScore: gradingStatus === "published" ? participant.maxScore : autoMaxScore,
    autoScore: autoScore ?? 0,
    autoMaxScore: autoMaxScore ?? 0,
    gradingStatus,
    needsManualGrade,
    submittedAt: participant.submittedAt,
    lastSeenAt: participant.lastSeenAt,
    startedAt: participant.startedAt,
    answers: includeAnswers ? normalizeAnswers(participant.answers) : undefined,
    grading: includeGrading ? sanitizeGrading(participant.grading, questions, {
      score: autoScore ?? 0,
      maxScore: autoMaxScore ?? 0,
    }) : undefined,
  };
}

function formatSession(session, { role = "student", me = null } = {}) {
  const participants = (session.participants || []).map((item) =>
    formatParticipant(item, session, { includeAnswers: false })
  );
  const mine = me
    ? participants.find((item) => item.userId === me) || null
    : null;

  return {
    id: session.id,
    code: session.code,
    status: session.status,
    startedAt: session.startedAt,
    endedAt: session.endedAt,
    durationMinutes: session.durationMinutes,
    remainingSeconds: remainingSeconds(session),
    createdAt: session.createdAt,
    exam: session.exam
      ? {
          id: session.exam.id,
          title: session.exam.title,
          description: session.exam.description || "",
          grade: session.exam.grade,
          durationMinutes: session.exam.durationMinutes,
          questionCount: session.exam._count?.questions ?? session.exam.questions?.length ?? 0,
        }
      : null,
    host: session.host ? { id: session.host.id, name: session.host.name } : null,
    isHost: Boolean(me && session.hostId === me),
    participants: role === "host" ? participants : undefined,
    stats:
      role === "host"
        ? {
            total: participants.length,
            waiting: participants.filter((p) => p.status === "waiting").length,
            inProgress: participants.filter((p) =>
              ["in_progress", "disconnected"].includes(p.status)
            ).length,
            submitted: participants.filter((p) => p.status === "submitted").length,
            pendingGrade: participants.filter((p) => p.gradingStatus === "pending").length,
            graded: participants.filter((p) => p.gradingStatus === "published").length,
            quit: participants.filter((p) => p.status === "quit").length,
            violations: participants.reduce((sum, p) => sum + (p.violationCount || 0), 0),
          }
        : undefined,
    me: mine,
  };
}

async function createUniqueCode() {
  for (let i = 0; i < 12; i += 1) {
    const code = generateCode();
    const exists = await prisma.liveExamSession.findUnique({ where: { code } });
    if (!exists) return code;
  }
  return `${generateCode()}${Date.now().toString(36).slice(-2)}`.slice(0, 8);
}

async function loadSession(id) {
  return prisma.liveExamSession.findUnique({
    where: { id: Number(id) },
    include: {
      exam: {
        include: {
          questions: { orderBy: { sortOrder: "asc" } },
          _count: { select: { questions: true } },
        },
      },
      host: { select: { id: true, name: true } },
      participants: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

async function finalizeParticipant(participant, questions, { quit = false, answers } = {}) {
  const nextAnswers = answers != null ? normalizeAnswers(answers) : normalizeAnswers(participant.answers);
  const graded = quit ? { score: 0, maxScore: gradeAnswers(questions, {}).maxScore } : gradeAnswers(questions, nextAnswers);
  const hasManual = examHasManual(questions);
  const prev = participant.grading && typeof participant.grading === "object" ? participant.grading : {};
  return prisma.liveExamParticipant.update({
    where: { id: participant.id },
    data: {
      status: quit ? "quit" : "submitted",
      score: graded.score,
      maxScore: graded.maxScore,
      answers: nextAnswers,
      gradingStatus: hasManual ? "pending" : "none",
      grading: {
        ...emptyGrading(questions, graded),
        items: prev.items || {},
        overallComment: prev.overallComment || "",
      },
      submittedAt: new Date(),
      lastSeenAt: new Date(),
    },
  });
}

async function expireIfNeeded(session) {
  if (!session || session.status !== "live") return session;
  if (remainingSeconds(session) > 0) return session;
  return endSessionInternal(session);
}

async function endSessionInternal(session) {
  const questions = session.exam?.questions || [];
  const pending = (session.participants || []).filter(
    (item) => item.status === "waiting" || item.status === "in_progress"
  );

  await prisma.$transaction(async (tx) => {
    await tx.liveExamSession.update({
      where: { id: session.id },
      data: { status: "ended", endedAt: new Date() },
    });
    for (const item of pending) {
      const quit = item.status === "waiting";
      const graded = quit
        ? { score: 0, maxScore: gradeAnswers(questions, {}).maxScore }
        : gradeAnswers(questions, item.answers);
      const hasManual = examHasManual(questions);
      const prev = item.grading && typeof item.grading === "object" ? item.grading : {};
      await tx.liveExamParticipant.update({
        where: { id: item.id },
        data: {
          status: quit ? "quit" : "submitted",
          score: graded.score,
          maxScore: graded.maxScore,
          answers: normalizeAnswers(item.answers),
          gradingStatus: hasManual ? "pending" : "none",
          grading: {
            ...emptyGrading(questions, graded),
            items: prev.items || {},
            overallComment: prev.overallComment || "",
          },
          submittedAt: new Date(),
        },
      });
    }
  });

  if (pending.length) {
    await prisma.exam.update({
      where: { id: session.examId },
      data: { attemptCount: { increment: pending.filter((p) => p.status === "in_progress").length } },
    });
  }

  return loadSession(session.id);
}

async function createLiveSession(req, res) {
  try {
    const examId = Number(req.params.id);
    const hostId = req.user.id;
    const exam = await prisma.exam.findUnique({
      where: { id: examId },
      include: { _count: { select: { questions: true } } },
    });
    if (!exam) return res.status(404).json({ message: "Không tìm thấy đề thi" });
    if (exam.userId !== hostId) {
      return res.status(403).json({ message: "Chỉ người tạo đề mới tổ chức được kỳ thi" });
    }
    if (!exam._count.questions) {
      return res.status(400).json({ message: "Đề thi chưa có câu hỏi" });
    }

    const existing = await prisma.liveExamSession.findFirst({
      where: { examId, hostId, status: { in: ["lobby", "live"] } },
      orderBy: { createdAt: "desc" },
    });
    if (existing) {
      const session = await expireIfNeeded(await loadSession(existing.id));
      return res.status(200).json({
        message: "Đã mở lại phòng thi hiện có",
        session: formatSession(session, { role: "host", me: hostId }),
      });
    }

    const created = await prisma.liveExamSession.create({
      data: {
        code: await createUniqueCode(),
        examId,
        hostId,
        durationMinutes: exam.durationMinutes,
      },
    });
    const session = await loadSession(created.id);
    return res.status(201).json({
      message: "Đã tạo phòng thi",
      session: formatSession(session, { role: "host", me: hostId }),
    });
  } catch (error) {
    console.error("Create live session error:", error);
    return res.status(500).json({ message: "Không thể tạo phòng thi" });
  }
}

async function joinLiveSession(req, res) {
  try {
    const code = String(req.body.code || "").trim().toUpperCase();
    if (code.length < 4) {
      return res.status(400).json({ message: "Vui lòng nhập mã phòng thi" });
    }
    const found = await prisma.liveExamSession.findUnique({
      where: { code },
      include: { exam: { select: { id: true, title: true } } },
    });
    if (!found) return res.status(404).json({ message: "Không tìm thấy phòng thi với mã này" });

    let session = await expireIfNeeded(await loadSession(found.id));
    if (session.status === "ended") {
      return res.status(400).json({ message: "Kỳ thi này đã kết thúc" });
    }

    const userId = req.user.id;
    const existing = session.participants.find((item) => item.userId === userId);
    if (!existing) {
      await prisma.liveExamParticipant.create({
        data: { sessionId: session.id, userId, lastSeenAt: new Date() },
      });
      session = await loadSession(session.id);
    }

    return res.json({
      message: "Đã vào phòng thi",
      session: formatSession(session, { role: "student", me: userId }),
    });
  } catch (error) {
    console.error("Join live session error:", error);
    return res.status(500).json({ message: "Không thể vào phòng thi" });
  }
}

async function getLiveSession(req, res) {
  try {
    let session = await expireIfNeeded(await loadSession(req.params.id));
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    const me = req.user.id;
    const isHost = session.hostId === me;
    const isParticipant = session.participants.some((item) => item.userId === me);
    if (!isHost && !isParticipant) {
      return res.status(403).json({ message: "Bạn chưa tham gia phòng thi này" });
    }
    return res.json({
      session: formatSession(session, { role: isHost ? "host" : "student", me }),
    });
  } catch (error) {
    console.error("Get live session error:", error);
    return res.status(500).json({ message: "Không thể tải phòng thi" });
  }
}

async function startLiveSession(req, res) {
  try {
    let session = await expireIfNeeded(await loadSession(req.params.id));
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    if (session.hostId !== req.user.id) {
      return res.status(403).json({ message: "Chỉ giám thị mới bắt đầu được kỳ thi" });
    }
    if (session.status === "ended") {
      return res.status(400).json({ message: "Kỳ thi đã kết thúc" });
    }
    if (session.status === "lobby") {
      session = await prisma.liveExamSession.update({
        where: { id: session.id },
        data: { status: "live", startedAt: new Date() },
      });
      session = await loadSession(session.id);
    }
    return res.json({
      message: "Đã bắt đầu tính giờ",
      session: formatSession(session, { role: "host", me: req.user.id }),
    });
  } catch (error) {
    console.error("Start live session error:", error);
    return res.status(500).json({ message: "Không thể bắt đầu kỳ thi" });
  }
}

async function endLiveSession(req, res) {
  try {
    let session = await loadSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    if (session.hostId !== req.user.id) {
      return res.status(403).json({ message: "Chỉ giám thị mới kết thúc được kỳ thi" });
    }
    if (session.status !== "ended") {
      session = await endSessionInternal(session);
    }
    return res.json({
      message: "Đã kết thúc kỳ thi. Tất cả bài làm đã được nộp.",
      session: formatSession(session, { role: "host", me: req.user.id }),
    });
  } catch (error) {
    console.error("End live session error:", error);
    return res.status(500).json({ message: "Không thể kết thúc kỳ thi" });
  }
}

async function getLivePaper(req, res) {
  try {
    let session = await expireIfNeeded(await loadSession(req.params.id));
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    const me = req.user.id;
    const participant = session.participants.find((item) => item.userId === me);
    if (!participant && session.hostId !== me) {
      return res.status(403).json({ message: "Bạn chưa tham gia phòng thi này" });
    }
    if (session.status === "lobby") {
      return res.json({
        session: formatSession(session, { role: "student", me }),
        questions: [],
        locked: true,
      });
    }
    const finished = participant && ["submitted", "quit"].includes(participant.status);
    return res.json({
      session: formatSession(session, { role: "student", me }),
      questions: (session.exam.questions || []).map((question) =>
        finished || session.status === "ended"
          ? formatQuestionPrivate(question)
          : formatQuestionPublic(question)
      ),
      locked: false,
    });
  } catch (error) {
    console.error("Get live paper error:", error);
    return res.status(500).json({ message: "Không thể tải đề thi" });
  }
}

async function heartbeatLiveSession(req, res) {
  try {
    let session = await expireIfNeeded(await loadSession(req.params.id));
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    const participant = session.participants.find((item) => item.userId === req.user.id);
    if (!participant) {
      return res.status(403).json({ message: "Bạn chưa tham gia phòng thi này" });
    }
    if (["submitted", "quit"].includes(participant.status) || session.status === "ended") {
      return res.json({
        session: formatSession(session, { role: "student", me: req.user.id }),
      });
    }

    const answers = req.body.answers != null ? normalizeAnswers(req.body.answers) : undefined;
    const entering = session.status === "live" && participant.status === "waiting";
    await prisma.liveExamParticipant.update({
      where: { id: participant.id },
      data: {
        lastSeenAt: new Date(),
        ...(answers ? { answers } : {}),
        ...(entering ? { status: "in_progress", startedAt: new Date() } : {}),
      },
    });
    session = await loadSession(session.id);
    return res.json({
      session: formatSession(session, { role: "student", me: req.user.id }),
    });
  } catch (error) {
    console.error("Heartbeat live session error:", error);
    return res.status(500).json({ message: "Không thể cập nhật trạng thái" });
  }
}

async function reportViolation(req, res) {
  try {
    const session = await expireIfNeeded(await loadSession(req.params.id));
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    const participant = session.participants.find((item) => item.userId === req.user.id);
    if (!participant) {
      return res.status(403).json({ message: "Bạn chưa tham gia phòng thi này" });
    }
    if (session.status !== "live" || ["submitted", "quit"].includes(participant.status)) {
      return res.json({
        violationCount: participant.violationCount,
        session: formatSession(session, { role: "student", me: req.user.id }),
      });
    }
    const updated = await prisma.liveExamParticipant.update({
      where: { id: participant.id },
      data: {
        violationCount: { increment: 1 },
        lastSeenAt: new Date(),
      },
    });
    const next = await loadSession(session.id);
    return res.json({
      violationCount: updated.violationCount,
      session: formatSession(next, { role: "student", me: req.user.id }),
    });
  } catch (error) {
    console.error("Report violation error:", error);
    return res.status(500).json({ message: "Không thể ghi nhận vi phạm" });
  }
}

async function submitLiveExam(req, res) {
  try {
    let session = await expireIfNeeded(await loadSession(req.params.id));
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    const participant = session.participants.find((item) => item.userId === req.user.id);
    if (!participant) {
      return res.status(403).json({ message: "Bạn chưa tham gia phòng thi này" });
    }
    if (["submitted", "quit"].includes(participant.status)) {
      return res.json({
        session: formatSession(session, { role: "student", me: req.user.id }),
      });
    }
    const quit = Boolean(req.body.quit);
    await finalizeParticipant(participant, session.exam.questions || [], {
      quit,
      answers: req.body.answers,
    });
    if (!quit) {
      await prisma.exam.update({
        where: { id: session.examId },
        data: { attemptCount: { increment: 1 } },
      });
    }
    session = await loadSession(session.id);
    return res.json({
      message: quit ? "Đã thoát bài thi. Điểm của bạn là 0." : "Đã nộp bài",
      session: formatSession(session, { role: "student", me: req.user.id }),
    });
  } catch (error) {
    console.error("Submit live exam error:", error);
    return res.status(500).json({ message: "Không thể nộp bài" });
  }
}

async function getParticipantPaper(req, res) {
  try {
    const session = await expireIfNeeded(await loadSession(req.params.id));
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    if (session.hostId !== req.user.id) {
      return res.status(403).json({ message: "Chỉ giám thị mới xem được bài làm chi tiết" });
    }
    const participant = session.participants.find(
      (item) => item.id === Number(req.params.participantId)
    );
    if (!participant) {
      return res.status(404).json({ message: "Không tìm thấy thí sinh" });
    }
    const answers = normalizeAnswers(participant.answers);
    const questions = (session.exam.questions || []).map((question) => {
      const given = answers[String(question.id)]?.value || "";
      const expected = question.correctKey || "";
      const auto = isAutoGradable(question);
      const correct =
        auto && expected
          ? Array.isArray(question.options) && question.options.length
            ? given.toUpperCase() === expected.toUpperCase()
            : given.toLowerCase() === expected.toLowerCase()
          : null;
      return {
        ...formatQuestionPrivate(question),
        studentAnswer: given,
        isCorrect: correct,
        isManual: isManualQuestion(question),
        maxManualScore: essayMaxScore(question),
      };
    });
    const auto = gradeAnswers(session.exam.questions || [], answers);
    return res.json({
      participant: formatParticipant(participant, session, {
        includeAnswers: true,
        includeGrading: true,
      }),
      exam: {
        id: session.exam.id,
        title: session.exam.title,
        grade: session.exam.grade,
      },
      session: {
        id: session.id,
        code: session.code,
        status: session.status,
      },
      questions,
      grading: sanitizeGrading(participant.grading, session.exam.questions || [], auto),
    });
  } catch (error) {
    console.error("Get participant paper error:", error);
    return res.status(500).json({ message: "Không thể tải bài làm" });
  }
}

function assertAllManualScored(questions, grading) {
  const missing = (questions || []).filter((question) => {
    if (!isManualQuestion(question)) return false;
    const item = grading.items?.[String(question.id)];
    return item == null || item.score == null;
  });
  return missing;
}

async function saveParticipantGrade(req, res) {
  try {
    const session = await loadSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    if (session.hostId !== req.user.id) {
      return res.status(403).json({ message: "Chỉ giám thị mới chấm được bài" });
    }
    const participant = session.participants.find(
      (item) => item.id === Number(req.params.participantId)
    );
    if (!participant) return res.status(404).json({ message: "Không tìm thấy thí sinh" });
    if (!["submitted", "quit"].includes(participant.status)) {
      return res.status(400).json({ message: "Thí sinh chưa nộp bài" });
    }
    const questions = session.exam.questions || [];
    const auto = gradeAnswers(questions, participant.answers);
    const grading = sanitizeGrading(req.body.grading, questions, auto);
    if (participant.gradingStatus === "published") {
      grading.publishedAt = participant.grading?.publishedAt || new Date().toISOString();
    }
    await prisma.liveExamParticipant.update({
      where: { id: participant.id },
      data: {
        grading,
        gradingStatus: participant.gradingStatus === "published" ? "published" : "pending",
      },
    });
    const next = await loadSession(session.id);
    const updated = next.participants.find((item) => item.id === participant.id);
    return res.json({
      message: "Đã lưu nhận xét",
      participant: formatParticipant(updated, next, { includeGrading: true }),
      grading: sanitizeGrading(updated.grading, questions, auto),
    });
  } catch (error) {
    console.error("Save participant grade error:", error);
    return res.status(500).json({ message: "Không thể lưu điểm" });
  }
}

async function publishParticipantGrade(req, res) {
  try {
    const session = await loadSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    if (session.hostId !== req.user.id) {
      return res.status(403).json({ message: "Chỉ giám thị mới công bố được điểm" });
    }
    const participant = session.participants.find(
      (item) => item.id === Number(req.params.participantId)
    );
    if (!participant) return res.status(404).json({ message: "Không tìm thấy thí sinh" });
    if (!["submitted", "quit"].includes(participant.status)) {
      return res.status(400).json({ message: "Thí sinh chưa nộp bài" });
    }
    const questions = session.exam.questions || [];
    const auto = gradeAnswers(questions, participant.answers);
    const grading = sanitizeGrading(req.body.grading, questions, auto);
    const missing = assertAllManualScored(questions, grading);
    if (missing.length) {
      return res.status(400).json({
        message: `Vui lòng nhập điểm cho ${missing.length} câu tự luận còn thiếu.`,
      });
    }
    const totals = totalsFromGrading(grading);
    grading.publishedAt = new Date().toISOString();
    await prisma.liveExamParticipant.update({
      where: { id: participant.id },
      data: {
        grading,
        gradingStatus: "published",
        score: totals.totalScore,
        maxScore: totals.totalMax,
      },
    });

    const examTitle = session.exam?.title || "đề thi";
    await prisma.appNotification.create({
      data: {
        userId: participant.userId,
        type: "exam_graded",
        title: "Bài thi đã được chấm điểm",
        body: `Bài thi ${examTitle} của bạn đã được chấm điểm. Bấm vào đây để xem chi tiết nhận xét.`,
        link: `/live/${session.id}/feedback`,
        meta: {
          sessionId: session.id,
          participantId: participant.id,
          examId: session.examId,
        },
      },
    });

    const next = await loadSession(session.id);
    const updated = next.participants.find((item) => item.id === participant.id);
    return res.json({
      message: "Đã công bố điểm và gửi thông báo cho học sinh",
      participant: formatParticipant(updated, next, { includeGrading: true }),
      grading: sanitizeGrading(updated.grading, questions, auto),
      session: formatSession(next, { role: "host", me: req.user.id }),
    });
  } catch (error) {
    console.error("Publish participant grade error:", error);
    return res.status(500).json({ message: "Không thể công bố điểm" });
  }
}

async function getMyFeedback(req, res) {
  try {
    const session = await loadSession(req.params.id);
    if (!session) return res.status(404).json({ message: "Không tìm thấy phòng thi" });
    const participant = session.participants.find((item) => item.userId === req.user.id);
    if (!participant) {
      return res.status(403).json({ message: "Bạn chưa tham gia phòng thi này" });
    }
    if (resolveGradingStatus(participant, session.exam.questions || []) !== "published") {
      return res.status(403).json({
        message: "Bài thi của bạn đang chờ giáo viên chấm điểm.",
        pending: true,
      });
    }
    const answers = normalizeAnswers(participant.answers);
    const questions = (session.exam.questions || []).map((question) => {
      const given = answers[String(question.id)]?.value || "";
      return {
        ...formatQuestionPublic(question),
        studentAnswer: given,
        isManual: isManualQuestion(question),
        maxManualScore: essayMaxScore(question),
      };
    });
    const auto = gradeAnswers(session.exam.questions || [], answers);
    return res.json({
      participant: formatParticipant(participant, session, { includeGrading: true }),
      exam: { id: session.exam.id, title: session.exam.title, grade: session.exam.grade },
      session: { id: session.id, code: session.code, status: session.status },
      questions,
      grading: sanitizeGrading(participant.grading, session.exam.questions || [], auto),
    });
  } catch (error) {
    console.error("Get my feedback error:", error);
    return res.status(500).json({ message: "Không thể tải nhận xét" });
  }
}

module.exports = {
  createLiveSession,
  joinLiveSession,
  getLiveSession,
  startLiveSession,
  endLiveSession,
  getLivePaper,
  heartbeatLiveSession,
  reportViolation,
  submitLiveExam,
  getParticipantPaper,
  saveParticipantGrade,
  publishParticipantGrade,
  getMyFeedback,
};
