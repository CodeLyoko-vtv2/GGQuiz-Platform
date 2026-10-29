const QUESTION_SPLIT = /(?=^(?:Câu|Question|Q)\s*\d+\s*[:.]\s*)/im;
const QUESTION_HEAD = /^(?:Câu|Question|Q)\s*\d+\s*[:.]\s*/i;
const EXPLAIN_HEAD = /^(?:\*{2}\s*|Lời giải\s*:\s*|Giải thích\s*:\s*|Explanation\s*:\s*)/i;
const ANSWER_HEAD = /^(?:Đáp án|Answer|Gợi ý)\s*:\s*/i;

function cleanLine(line) {
  return String(line || "").replace(/\u00a0/g, " ").replace(/[ \t]+$/g, "").trim();
}

function takeCorrectMark(text) {
  const value = String(text || "").trim();
  if (!value) return { text: "", correct: false };
  if (/\*{2,}\s*$/.test(value)) {
    return { text: value.replace(/\*+\s*$/g, "").trim(), correct: false };
  }
  if (/\*\s*$/.test(value)) {
    return { text: value.replace(/\*+\s*$/g, "").trim(), correct: true };
  }
  return { text: value, correct: false };
}

function parseInlineOptions(line) {
  const source = String(line || "");
  const starts = [...source.matchAll(/\b([A-D])[.)]\s*/gi)];
  if (starts.length < 2) return { lead: source, options: [] };

  const options = starts.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < starts.length ? starts[index + 1].index : source.length;
    const marked = takeCorrectMark(source.slice(start, end).replace(/\s+/g, " "));
    return {
      key: match[1].toUpperCase(),
      text: marked.text,
      correct: marked.correct,
    };
  });

  return {
    lead: source.slice(0, starts[0].index).replace(/\s+/g, " ").trim(),
    options: options.filter((opt) => opt.text),
  };
}

function looksLikeTrueFalse(line) {
  return /^(?:[A-D][.)]\s*)?(true|false)\b/i.test(line);
}

function parseTrueFalseToken(line) {
  const marked = takeCorrectMark(line.replace(/^[A-D][.)]\s*/i, ""));
  const isTrue = /^true\b/i.test(marked.text);
  const isFalse = /^false\b/i.test(marked.text);
  if (!isTrue && !isFalse) return null;
  return {
    key: isTrue ? "A" : "B",
    text: isTrue ? "True" : "False",
    correct: marked.correct,
  };
}

function splitExplain(lines) {
  const promptLines = [];
  const explainLines = [];
  let inExplain = false;

  for (const line of lines) {
    if (!inExplain && (EXPLAIN_HEAD.test(line) || line === "**")) {
      inExplain = true;
      const rest = stripExplainPrefix(line);
      if (rest) explainLines.push(rest);
      continue;
    }
    if (inExplain) {
      explainLines.push(line);
      continue;
    }
    promptLines.push(line);
  }

  return {
    bodyLines: promptLines,
    explanation: explainLines.join("\n").trim(),
  };
}

function stripExplainPrefix(line) {
  if (line === "**") return "";
  return line.replace(EXPLAIN_HEAD, "").trim();
}

function parseChoiceBlock(lines, formatType) {
  const { bodyLines, explanation } = splitExplain(lines);
  const promptLines = [];
  const optionMap = new Map();
  let correctKey = "";

  const addOption = (opt) => {
    if (!opt?.text) return;
    optionMap.set(opt.key, opt.text);
    if (opt.correct) correctKey = opt.key;
  };

  for (const line of bodyLines) {
    const inline = parseInlineOptions(line);
    if (inline.options.length >= 2) {
      if (inline.lead) promptLines.push(inline.lead);
      inline.options.forEach(addOption);
      continue;
    }

    const tf = parseTrueFalseToken(line);
    if (tf && (formatType === "listening_tf" || looksLikeTrueFalse(line))) {
      addOption(tf);
      continue;
    }

    const single = line.match(/^([A-D])[.)]\s*(.*)$/i);
    if (single) {
      const marked = takeCorrectMark(single[2]);
      addOption({
        key: single[1].toUpperCase(),
        text: marked.text,
        correct: marked.correct,
      });
      continue;
    }

    promptLines.push(line);
  }

  const labeled = promptLines.join("\n").trim();
  let prompt = labeled.replace(QUESTION_HEAD, "").trim() || labeled;
  if (/^(?:Câu|Question|Q)\s*\d+\s*[:.]?$/i.test(prompt)) {
    const number = prompt.match(/\d+/);
    if (number) prompt = `(${number[0]})`;
  }

  const keys = formatType === "listening_tf" ? ["A", "B"] : ["A", "B", "C", "D"];
  let options = keys
    .filter((key) => optionMap.has(key))
    .map((key) => ({ key, text: optionMap.get(key) }));

  if (formatType === "listening_tf" && options.length === 0) {
    options = [
      { key: "A", text: "True" },
      { key: "B", text: "False" },
    ];
  }

  if (!correctKey && options.length) {
    const starred = options.find((opt) => /\*$/.test(opt.text));
    if (starred) {
      correctKey = starred.key;
      starred.text = takeCorrectMark(starred.text).text;
    }
  }

  if (!prompt && options.length === 0) return null;
  return { prompt, options, correctKey, explanation, starter: "" };
}

function parseOpenBlock(lines, formatType) {
  const { bodyLines, explanation } = splitExplain(lines);
  let starter = "";
  const promptLines = [];
  let answer = "";

  for (const line of bodyLines) {
    if (/^Gợi ý\s*:/i.test(line)) {
      starter = line.replace(/^Gợi ý\s*:\s*/i, "").trim();
      continue;
    }
    if (ANSWER_HEAD.test(line)) {
      answer = line.replace(ANSWER_HEAD, "").trim();
      continue;
    }
    promptLines.push(line);
  }

  const labeled = promptLines.join("\n").trim();
  const prompt = labeled.replace(QUESTION_HEAD, "").trim() || labeled;
  if (!prompt) return null;

  return {
    prompt,
    options: [],
    correctKey: answer,
    explanation,
    starter,
    typeHint: formatType,
  };
}

function parseOneBlock(block, formatType) {
  const lines = String(block || "")
    .split("\n")
    .map(cleanLine)
    .filter(Boolean);
  if (lines.length === 0) return null;

  if (
    formatType === "word_form" ||
    formatType === "sentence_rewrite" ||
    formatType === "writing" ||
    formatType === "speaking"
  ) {
    return parseOpenBlock(lines, formatType);
  }
  return parseChoiceBlock(lines, formatType);
}

export function parseSmartExam(raw, formatType = "mcq") {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return { passage: "", questions: [] };

  const marker = text.search(/^(?:Câu|Question|Q)\s*\d+\s*[:.]/im);
  if (marker < 0) {
    const only = parseOneBlock(text, formatType);
    return { passage: "", questions: only ? [only] : [] };
  }

  const passage = marker > 0 ? text.slice(0, marker).trim() : "";
  const chunks = text
    .slice(marker)
    .split(QUESTION_SPLIT)
    .map((chunk) => chunk.trim())
    .filter(Boolean);

  return {
    passage,
    questions: chunks.map((chunk) => parseOneBlock(chunk, formatType)).filter(Boolean),
  };
}

export function countParsedQuestions(raw, formatType = "mcq") {
  return parseSmartExam(raw, formatType).questions.length;
}

function expandTask(task, section) {
  const type = String(task.type || "mcq");
  const parsed = parseSmartExam(task.body, type);
  const instruction = String(task.instruction || "").trim();
  const sectionTitle = String(section.sectionTitle || "").trim();
  const needsPassage = type === "cloze" || type === "reading";
  let passage = parsed.passage;
  if (needsPassage && !passage && instruction) {
    passage = instruction;
  }

  return parsed.questions.map((item) => ({
    prompt: item.prompt,
    type,
    audioUrl: task.audioUrl || null,
    passage: needsPassage ? passage || null : null,
    options: item.options || [],
    correctKey: item.correctKey || "",
    explanation: item.explanation || "",
    meta: {
      sectionId: section.id,
      taskId: task.id,
      sectionTitle,
      instruction,
      starter: item.starter || "",
      expectedAnswer: item.correctKey || "",
    },
  }));
}

function normalizeSectionTasks(section) {
  if (Array.isArray(section?.tasks) && section.tasks.length > 0) {
    return section.tasks;
  }
  return [
    {
      id: section?.id,
      type: section?.type || "mcq",
      instruction: section?.instruction || "",
      body: section?.body || "",
      audioUrl: section?.audioUrl || null,
    },
  ];
}

export function expandSection(section) {
  return normalizeSectionTasks(section).flatMap((task) => expandTask(task, section));
}
