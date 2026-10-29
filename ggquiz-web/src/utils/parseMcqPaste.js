function cleanLine(line) {
  return String(line || "").replace(/\u00a0/g, " ").replace(/[ \t]+$/g, "").trim();
}

function parseInlineOptions(line) {
  const source = String(line || "");
  const starts = [...source.matchAll(/\b([A-D])[\.\)\:]\s*/gi)];
  if (starts.length < 2) return { lead: source, options: [] };

  const options = starts.map((match, index) => {
    const start = match.index + match[0].length;
    const end = index + 1 < starts.length ? starts[index + 1].index : source.length;
    return {
      key: match[1].toUpperCase(),
      text: source.slice(start, end).replace(/\s+/g, " ").trim(),
    };
  });

  return {
    lead: source.slice(0, starts[0].index).replace(/\s+/g, " ").trim(),
    options: options.filter((opt) => opt.text),
  };
}

function looksLikeTrueFalse(line) {
  return /\btrue\b/i.test(line) && /\bfalse\b/i.test(line);
}

function extractLeadingPassage(text) {
  const match = text.match(/(?:^|\n)(?:Question|Câu|Q)\s*\d+/im);
  if (!match || match.index == null) return { passage: "", rest: text };
  const head = text.slice(0, match.index).trim();
  const rest = text.slice(match.index).trim();
  if (head.length >= 80 || head.split("\n").filter(Boolean).length >= 3) {
    return { passage: head, rest };
  }
  return { passage: "", rest: text };
}

function splitQuestionChunks(text) {
  const { passage, rest } = extractLeadingPassage(text);
  const chunks = rest
    .split(/(?=^(?:Question|Câu|Q)\s*\d+\s*[:\.]?\s*)/im)
    .map((chunk) => chunk.trim())
    .filter(Boolean);
  return { passage, chunks: chunks.length ? chunks : rest ? [rest] : [] };
}

function parseBlock(block) {
  const lines = String(block || "")
    .split(/\n/)
    .map(cleanLine)
    .filter(Boolean);

  const promptLines = [];
  const optionMap = new Map();

  for (const line of lines) {
    const inline = parseInlineOptions(line);
    if (inline.options.length >= 2) {
      if (inline.lead) promptLines.push(inline.lead);
      inline.options.forEach((opt) => optionMap.set(opt.key, opt.text));
      continue;
    }

    if (looksLikeTrueFalse(line)) {
      const lead = line
        .replace(/\b(?:[A-D][\.\)\:]\s*)?(true|false)\b/gi, "")
        .replace(/\s+/g, " ")
        .trim();
      if (lead) promptLines.push(lead);
      optionMap.set("A", "True");
      optionMap.set("B", "False");
      continue;
    }

    const single = line.match(/^([A-D]|True|False)\s*[\.\)\:\-]\s*(.*)$/i);
    if (single) {
      let key = single[1].toUpperCase();
      let text = single[2].trim();
      if (key === "TRUE") {
        key = "A";
        text = text || "True";
      } else if (key === "FALSE") {
        key = "B";
        text = text || "False";
      }
      if (text) optionMap.set(key, text);
      continue;
    }

    promptLines.push(line);
  }

  const labeled = promptLines.join("\n").trim();
  let prompt =
    labeled.replace(/^(?:Question|Câu|Q)\s*\d+\s*[:\.]?\s*/i, "").trim() || labeled;
  if (/^(?:Question|Câu|Q)\s*\d+\s*[:\.]?$/i.test(prompt)) {
    const number = prompt.match(/\d+/);
    if (number) prompt = `(${number[0]})`;
  }

  const options = ["A", "B", "C", "D"]
    .filter((key) => optionMap.has(key))
    .map((key) => ({ key, text: optionMap.get(key) }));

  if (!prompt && options.length === 0) return null;
  return { prompt, options };
}

export function parseMcqPaste(raw) {
  const text = String(raw || "").replace(/\r\n/g, "\n").trim();
  if (!text) return { passage: "", questions: [] };

  const { passage, chunks } = splitQuestionChunks(text);
  const questions = chunks.map(parseBlock).filter(Boolean);
  return { passage, questions };
}

export function applyParsedQuestions(current, parsed, formatType) {
  const list = parsed?.questions || [];
  if (list.length === 0) return null;

  const mergeOptions = (base, incoming) => {
    if (!incoming.length) return base;
    if (incoming.length === 2 && formatType === "listening_tf") {
      return [
        { key: "A", text: incoming[0]?.text || "True" },
        { key: "B", text: incoming[1]?.text || "False" },
      ];
    }
    const map = new Map((base || []).map((opt) => [opt.key, opt.text]));
    incoming.forEach((opt) => map.set(opt.key, opt.text));
    const keys = formatType === "listening_tf" ? ["A", "B"] : ["A", "B", "C", "D"];
    return keys.map((key) => ({ key, text: map.get(key) || "" }));
  };

  const first = list[0];
  const updated = {
    ...current,
    prompt: first.prompt || current.prompt,
    options: mergeOptions(current.options, first.options),
  };
  if (parsed.passage) updated.passage = parsed.passage;

  return { current: updated, extras: list.slice(1), passage: parsed.passage || "" };
}
