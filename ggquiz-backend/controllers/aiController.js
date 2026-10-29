const { GoogleGenerativeAI } = require("@google/generative-ai");

function splitIntoSentences(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?。！？])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean)
    .map((sentence) => sentence.replace(/[.!?。！？]+$/g, "").trim())
    .filter((sentence) => sentence.length >= 12);
}

function pickSentences(sentences) {
  if (sentences.length === 0) return [];

  const shuffled = [...sentences].sort(() => Math.random() - 0.5);
  const targetCount = Math.min(5, Math.max(3, shuffled.length));
  const mediumPreferred = shuffled.filter(
    (sentence) => sentence.length >= 20 && sentence.length <= 180
  );

  const pool = mediumPreferred.length >= 3 ? mediumPreferred : shuffled;
  return pool.slice(0, Math.min(targetCount, pool.length));
}

function splitSentenceToCard(sentence) {
  const words = sentence.split(" ").filter(Boolean);

  if (words.length < 2) {
    const mid = Math.max(1, Math.floor(sentence.length / 2));
    return {
      term: sentence.slice(0, mid).trim(),
      definition: sentence.slice(mid).trim() || sentence.slice(0, mid).trim(),
    };
  }

  const minCut = 1;
  const maxCut = words.length - 1;
  const cutAt = Math.floor(Math.random() * (maxCut - minCut + 1)) + minCut;

  return {
    term: words.slice(0, cutAt).join(" "),
    definition: words.slice(cutAt).join(" "),
  };
}

const GEMINI_MODELS = [
  process.env.GEMINI_MODEL,
  // Ưu tiên model còn phục vụ generateContent ổn định trên key hiện tại
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash-lite",
  "gemini-3.6-flash",
  "gemini-flash-latest",
  "gemini-2.5-flash-lite",
].filter(Boolean);

const LANG_NAME_MAP = {
  auto: "tự nhận diện",
  en: "Tiếng Anh",
  vi: "Tiếng Việt",
  ko: "Tiếng Hàn",
  ja: "Tiếng Nhật",
  zh: "Tiếng Trung",
  fr: "Tiếng Pháp",
  es: "Tiếng Tây Ban Nha",
  de: "Tiếng Đức",
  pt: "Tiếng Bồ Đào Nha",
  it: "Tiếng Ý",
  ru: "Tiếng Nga",
  ar: "Tiếng Ả Rập",
  hi: "Tiếng Hindi",
  th: "Tiếng Thái",
  id: "Tiếng Indonesia",
  ms: "Tiếng Mã Lai",
  tl: "Tiếng Filipino",
  nl: "Tiếng Hà Lan",
  pl: "Tiếng Ba Lan",
  tr: "Tiếng Thổ Nhĩ Kỳ",
  uk: "Tiếng Ukraina",
  sv: "Tiếng Thụy Điển",
  no: "Tiếng Na Uy",
  da: "Tiếng Đan Mạch",
  fi: "Tiếng Phần Lan",
  cs: "Tiếng Séc",
  el: "Tiếng Hy Lạp",
  he: "Tiếng Do Thái",
  ro: "Tiếng Romania",
  hu: "Tiếng Hungary",
};

function resolveLangCode(raw, fallback = "auto") {
  const code = String(raw || fallback).trim().toLowerCase();
  if (!code) return fallback;
  if (code === "auto" || code === "detect") return "auto";
  return code.split("-")[0];
}

function langDisplayName(code) {
  const normalized = resolveLangCode(code, "auto");
  return LANG_NAME_MAP[normalized] || normalized;
}

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("MISSING_GEMINI_KEY");
  }
  return new GoogleGenerativeAI(apiKey);
}

function withTimeout(promise, ms, label = "timeout") {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(label)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

async function fetchJson(url, { timeoutMs = 8000 } = {}) {
  const response = await withTimeout(fetch(url), timeoutMs, `Fetch timeout: ${url}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }
  return response.json();
}

/** Chuẩn hóa mọi kiểu trả về của AI thành mảng tối đa 3 chuỗi. */
function normalizeSuggestionList(value) {
  if (value == null) return [];

  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item.trim();
        if (item && typeof item === "object") {
          return String(
            item.text || item.word || item.suggestion || item.definition || item.meaning || ""
          ).trim();
        }
        return String(item || "").trim();
      })
      .filter(Boolean)
      .slice(0, 3);
  }

  if (typeof value === "object") {
    return normalizeSuggestionList(
      value.suggestions || value.data || value.items || value.results || value.meanings
    );
  }

  const text = String(value).trim();
  if (!text) return [];

  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : text).trim();

  try {
    return normalizeSuggestionList(JSON.parse(candidate));
  } catch {
    // continue
  }

  const arrayMatch = candidate.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return normalizeSuggestionList(JSON.parse(arrayMatch[0]));
    } catch {
      // continue
    }
  }

  // Plain text / bullet / numbered lines
  const lines = candidate
    .split(/\r?\n|,|;|\|/)
    .map((line) => line.replace(/^\s*[-*•\d]+[.)]\s*/, "").replace(/^["']|["']$/g, "").trim())
    .filter((line) => line && line.length < 120 && !/^[\[\{]/.test(line));

  return lines.slice(0, 3);
}

function extractJsonArray(text) {
  return normalizeSuggestionList(text);
}

async function askGeminiForArray(prompt) {
  const genAI = getGenAI();
  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 256,
            responseMimeType: "application/json",
          },
        }),
        8000,
        `Gemini timeout (${modelName})`
      );
      const text = result?.response?.text?.() || "";
      console.log(`[suggest] Gemini ${modelName} raw:`, String(text).slice(0, 200));
      const parsed = extractJsonArray(text);
      if (parsed.length) return parsed;
      console.warn(`[suggest] Gemini ${modelName} returned unparseable text`);
    } catch (error) {
      lastError = error;
      console.warn(`Gemini model failed (${modelName}):`, error.message);
      // 404/404-like: thử model khác ngay
      if (/404|not found|NOT_FOUND/i.test(String(error.message || ""))) {
        continue;
      }
    }
  }

  if (lastError) throw lastError;
  return [];
}

async function suggestTermsFromDatamuse(query) {
  const url = `https://api.datamuse.com/sug?s=${encodeURIComponent(query)}&max=8`;
  const data = await fetchJson(url, { timeoutMs: 6000 });
  if (!Array.isArray(data)) return [];

  const suggestions = data
    .map((item) => String(item?.word || "").trim())
    .filter(Boolean);

  const normalizedQuery = query.toLowerCase();
  const unique = [];
  for (const word of suggestions) {
    if (!unique.some((item) => item.toLowerCase() === word.toLowerCase())) {
      unique.push(word);
    }
  }

  if (!unique.some((item) => item.toLowerCase() === normalizedQuery)) {
    unique.unshift(query);
  }

  return unique.slice(0, 3);
}

async function suggestDefsFromDictionary(term) {
  const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(term)}`;
  const data = await fetchJson(url, { timeoutMs: 7000 });
  if (!Array.isArray(data) || data.length === 0) return [];

  const meanings = data[0]?.meanings || [];
  const defs = [];

  for (const meaning of meanings) {
    const part = meaning.partOfSpeech ? `(${meaning.partOfSpeech}) ` : "";
    for (const def of meaning.definitions || []) {
      const text = String(def.definition || "").trim();
      if (!text) continue;
      defs.push(`${part}${text}`.trim());
      if (defs.length >= 3) return defs;
    }
  }

  return defs.slice(0, 3);
}

/** Fallback dịch nghĩa đa ngôn ngữ khi Gemini lỗi */
async function suggestDefsViaMyMemory(term, sourceLang, targetLang) {
  const src = sourceLang === "auto" ? "en" : sourceLang;
  const tgt = targetLang === "auto" ? "vi" : targetLang;
  if (src === tgt) return [];

  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    term
  )}&langpair=${encodeURIComponent(`${src}|${tgt}`)}`;

  const data = await fetchJson(url, { timeoutMs: 8000 });
  const translated = String(data?.responseData?.translatedText || "").trim();
  if (!translated || /INVALID|MYMEMORY WARNING/i.test(translated)) return [];

  const matches = Array.isArray(data?.matches) ? data.matches : [];
  const extras = matches
    .map((item) => String(item?.translation || "").trim())
    .filter(
      (text) =>
        text &&
        text.toLowerCase() !== translated.toLowerCase() &&
        text.toLowerCase() !== term.toLowerCase()
    );

  return normalizeSuggestionList([translated, ...extras]);
}

exports.generateCardsFromText = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();

    if (!text) {
      return res.status(400).json({ message: "Vui lòng nhập đoạn văn bản để phân tích" });
    }

    if (text.length < 30) {
      return res.status(400).json({
        message: "Văn bản quá ngắn. Hãy dán ít nhất vài câu để AI tạo thẻ.",
      });
    }

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const sentences = splitIntoSentences(text);
    let selected = pickSentences(sentences);

    if (selected.length === 0) {
      const chunks = text
        .split(/[,;\n]+/)
        .map((chunk) => chunk.trim())
        .filter((chunk) => chunk.length >= 12);
      selected = pickSentences(chunks);
    }

    if (selected.length === 0) {
      return res.status(400).json({
        message: "Không tách được câu phù hợp từ văn bản. Hãy thử đoạn khác.",
      });
    }

    const cards = selected.map((sentence) => splitSentenceToCard(sentence));

    return res.status(200).json({
      message: "AI đã phân tích xong",
      cards,
    });
  } catch (error) {
    console.error("AI generate error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi chạy AI" });
  }
};

exports.suggestTerms = async (req, res) => {
  try {
    const query = String(req.body?.query || "").trim();
    const lang = resolveLangCode(req.body?.lang, "auto");

    if (!query) {
      return res.status(200).json({ suggestions: [] });
    }

    // Datamuse chỉ mạnh với tiếng Anh — dùng khi auto hoặc en
    if (lang === "auto" || lang === "en") {
      try {
        const fromDatamuse = await suggestTermsFromDatamuse(query);
        const looksLatin = /^[a-zA-Z0-9\s'\-.,!?]+$/.test(query);
        if (fromDatamuse.length > 0 && (lang === "en" || looksLatin)) {
          return res.status(200).json({ suggestions: fromDatamuse });
        }
      } catch (datamuseError) {
        console.warn("Datamuse suggest error:", datamuseError.message);
      }
    }

    const prompt =
      lang === "auto"
        ? `Bạn là trợ lý gợi ý từ vựng cho học flashcard.
Người dùng đang gõ: "${query}"
Hãy TỰ NHẬN DIỆN ngôn ngữ của chuỗi đang gõ, rồi trả về đúng 3 từ/cụm từ gợi ý CÙNG ngôn ngữ đó (autocomplete tự nhiên).
Ví dụ: gõ "ăn" (tiếng Việt) -> ["ăn","ăn uống","ăn mặc"]
Ví dụ: gõ "hou" (tiếng Anh) -> ["house","housing","household"]
BẮT BUỘC trả về DUY NHẤT một JSON array gồm đúng 3 chuỗi. Không giải thích, không markdown.`
        : `Bạn là trợ lý gợi ý từ vựng cho học flashcard.
Người dùng đang gõ: "${query}"
Ngôn ngữ BẮT BUỘC của gợi ý: ${langDisplayName(lang)} (mã: ${lang}).
CHỈ được trả về từ/cụm thuộc đúng ngôn ngữ này, không được trộn ngôn ngữ khác.
Hãy trả về đúng 3 từ/cụm gần nhất để điền vào trường "Thuật ngữ".
BẮT BUỘC trả về DUY NHẤT một JSON array gồm đúng 3 chuỗi. Không giải thích, không markdown.`;

    try {
      const suggestions = await askGeminiForArray(prompt);
      if (suggestions.length) {
        return res.status(200).json({ suggestions });
      }
    } catch (geminiError) {
      console.warn("Gemini suggest-term error:", geminiError.message);
    }

    // Fallback cuối: trả chính từ đang gõ để UI không trống
    return res.status(200).json({ suggestions: [query] });
  } catch (error) {
    console.error("Suggest terms error:", error);
    return res.status(200).json({
      suggestions: [String(req.body?.query || "").trim()].filter(Boolean),
    });
  }
};

exports.suggestTranslate = async (req, res) => {
  try {
    const query = String(req.body?.query || "").trim();
    const sourceLang = resolveLangCode(req.body?.sourceLang || req.body?.lang, "auto");
    const targetLang = resolveLangCode(req.body?.targetLang, "vi");
    const effectiveTarget = targetLang === "auto" ? "vi" : targetLang;

    if (!query) {
      return res.status(200).json({ suggestions: [] });
    }

    const { matchTranslatePhrases } = require("../data/translatePhrases");
    let rows = matchTranslatePhrases(query, sourceLang, effectiveTarget);

    const needsGemini = rows.length < 3 || rows.every((item) => item.text.toLowerCase() === query.toLowerCase());
    if (needsGemini) {
      const sourceName = langDisplayName(sourceLang);
      const targetName = langDisplayName(effectiveTarget);
      const prompt = `Bạn là gợi ý autocomplete của Google Dịch.
Người dùng đang gõ: "${query}"
Ngôn ngữ nguồn: ${sourceName}
Ngôn ngữ đích: ${targetName}
Hãy trả về 4 gợi ý KẾT HỢP: từ đơn trùng/gần với chuỗi đang gõ VÀ các cụm từ/câu giao tiếp phổ biến bắt đầu bằng hoặc chứa từ đó.
Ví dụ query="where" ->
[{"text":"where are you from","translation":"Bạn đến từ đâu"},{"text":"where","translation":"Ở đâu"},{"text":"where are you","translation":"Bạn ở đâu"}]
BẮT BUỘC trả về DUY NHẤT JSON array các object {text, translation}. Không markdown.`;
      try {
        const genAI = getGenAI();
        for (const modelName of GEMINI_MODELS) {
          try {
            const model = genAI.getGenerativeModel({ model: modelName });
            const result = await withTimeout(
              model.generateContent({
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  temperature: 0.3,
                  maxOutputTokens: 400,
                  responseMimeType: "application/json",
                },
              }),
              7000,
              `Gemini timeout (${modelName})`
            );
            const raw = String(result?.response?.text?.() || "").trim();
            const parsed = JSON.parse((raw.match(/\[[\s\S]*\]/) || [raw])[0]);
            if (Array.isArray(parsed) && parsed.length) {
              const extra = parsed
                .map((item) => ({
                  text: String(item?.text || item?.word || "").trim(),
                  translation: String(item?.translation || item?.meaning || "").trim(),
                }))
                .filter((item) => item.text);
              const seen = new Set(rows.map((item) => item.text.toLowerCase()));
              for (const item of extra) {
                if (seen.has(item.text.toLowerCase())) continue;
                seen.add(item.text.toLowerCase());
                rows.push(item);
              }
              break;
            }
          } catch (error) {
            if (/404|not found|NOT_FOUND/i.test(String(error.message || ""))) continue;
            console.warn("Gemini suggest-translate error:", error.message);
            break;
          }
        }
      } catch (error) {
        console.warn("Gemini suggest-translate skipped:", error.message);
      }
    }

    const unique = [];
    const seen = new Set();
    for (const item of rows) {
      const key = String(item.text || "").trim().toLowerCase();
      if (!key || seen.has(key)) continue;
      seen.add(key);
      unique.push({
        text: String(item.text).trim(),
        translation: String(item.translation || "").trim(),
      });
    }

    const missing = unique.filter((item) => !item.translation).slice(0, 5);
    if (missing.length) {
      await Promise.all(
        missing.map(async (item) => {
          try {
            const translated = await translateViaMyMemory(item.text, sourceLang, effectiveTarget);
            if (translated?.translatedText) item.translation = translated.translatedText;
          } catch {
            /* keep empty */
          }
        })
      );
    }

    return res.status(200).json({ suggestions: unique.slice(0, 5) });
  } catch (error) {
    console.error("Suggest translate error:", error);
    const query = String(req.body?.query || "").trim();
    return res.status(200).json({
      suggestions: query ? [{ text: query, translation: "" }] : [],
    });
  }
};

exports.suggestDefinitions = async (req, res) => {
  try {
    const term = String(req.body?.term || "").trim();
    const targetLang = resolveLangCode(req.body?.lang || req.body?.targetLang, "vi");
    const sourceLang = resolveLangCode(req.body?.sourceLang, "auto");

    if (!term) {
      return res.status(200).json({ suggestions: [] });
    }

    const effectiveTarget = targetLang === "auto" ? "vi" : targetLang;
    const targetName = langDisplayName(effectiveTarget);
    const sourceHint =
      sourceLang === "auto"
        ? "tự nhận diện ngôn ngữ của thuật ngữ"
        : langDisplayName(sourceLang);

    const prompt = `Bạn là từ điển đa ngôn ngữ cho học flashcard.
Thuật ngữ nguồn: "${term}"
Ngôn ngữ nguồn: ${sourceHint}
Ngôn ngữ đích (Định nghĩa): ${targetName} (mã: ${effectiveTarget})
Hãy DỊCH / giải nghĩa thuật ngữ sang đúng ngôn ngữ đích và trả về tối đa 3 nghĩa/định nghĩa ngắn gọn nhất.
Ví dụ: term="house", đích=Tiếng Việt -> ["(n) ngôi nhà","nhà ở","căn nhà"]
Ví dụ: term="Eat", đích=Tiếng Việt -> ["(v) ăn","dùng bữa","ăn uống"]
Có thể kèm loại từ ngắn nếu hữu ích, ví dụ "(v) ăn".
BẮT BUỘC trả về DUY NHẤT một JSON array gồm tối đa 3 chuỗi bằng ngôn ngữ đích.
Không giải thích, không markdown, không object.`;

    try {
      const suggestions = await askGeminiForArray(prompt);
      if (suggestions.length) {
        return res.status(200).json({ suggestions });
      }
    } catch (geminiError) {
      console.warn("Gemini suggest-def error:", geminiError.message);
    }

    // Fallback từ điển tiếng Anh khi đích là en
    if (effectiveTarget === "en") {
      try {
        const fromDictionary = await suggestDefsFromDictionary(term);
        if (fromDictionary.length > 0) {
          return res.status(200).json({ suggestions: fromDictionary });
        }
      } catch (dictionaryError) {
        console.warn("Dictionary suggest error:", dictionaryError.message);
      }
    }

    // Fallback dịch MyMemory cho mọi ngôn ngữ đích khác
    try {
      const translated = await suggestDefsViaMyMemory(term, sourceLang, effectiveTarget);
      if (translated.length > 0) {
        return res.status(200).json({ suggestions: translated });
      }
    } catch (translateError) {
      console.warn("MyMemory suggest error:", translateError.message);
    }

    // Nếu đích en và chưa thử dictionary ở trên do nhánh khác — đã thử.
    // Fallback cuối: vẫn trả mảng rỗng có message để FE hiện lỗi rõ
    return res.status(200).json({
      suggestions: [],
      message: "Không tạo được gợi ý định nghĩa. Thử lại hoặc nhập thủ công.",
    });
  } catch (error) {
    console.error("Suggest definitions error:", error);
    return res.status(200).json({
      suggestions: [],
      message: "Lỗi máy chủ khi gợi ý định nghĩa.",
    });
  }
};

async function translateViaMyMemory(text, sourceLang, targetLang) {
  const src = sourceLang === "auto" ? "Autodetect" : sourceLang;
  const tgt = targetLang === "auto" ? "vi" : targetLang;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
    text
  )}&langpair=${encodeURIComponent(`${src}|${tgt}`)}`;

  const data = await fetchJson(url, { timeoutMs: 10000 });
  const translated = String(data?.responseData?.translatedText || "").trim();
  if (!translated || /INVALID|MYMEMORY WARNING/i.test(translated)) {
    return null;
  }

  const detectedRaw =
    data?.responseData?.detectedLanguage || data?.matches?.[0]?.source || null;
  const detectedSourceLang =
    sourceLang === "auto"
      ? detectedRaw
        ? String(detectedRaw).split("-")[0].toLowerCase()
        : null
      : sourceLang;

  return {
    translatedText: translated,
    detectedSourceLang,
    provider: "mymemory",
  };
}

async function translateViaGemini(text, sourceLang, targetLang) {
  const sourceHint =
    sourceLang === "auto"
      ? "tự nhận diện ngôn ngữ nguồn"
      : langDisplayName(sourceLang);
  const targetName = langDisplayName(targetLang === "auto" ? "vi" : targetLang);

  const prompt = `Bạn là máy dịch chuyên nghiệp.
Dịch đoạn văn sau sang ${targetName}.
Ngôn ngữ nguồn: ${sourceHint}.
Giữ nguyên ý nghĩa, tên riêng, và định dạng dòng nếu có.
CHỈ trả về văn bản đã dịch, không giải thích, không markdown, không dấu ngoặc kép bao quanh toàn bộ.

Văn bản:
${text}`;

  const genAI = getGenAI();
  let lastError = null;

  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        }),
        12000,
        `Gemini timeout (${modelName})`
      );
      const translated = String(result?.response?.text?.() || "")
        .trim()
        .replace(/^```[\s\S]*?\n/, "")
        .replace(/```$/, "")
        .trim();
      if (translated) {
        return {
          translatedText: translated,
          detectedSourceLang: sourceLang === "auto" ? null : sourceLang,
          provider: `gemini:${modelName}`,
        };
      }
    } catch (error) {
      lastError = error;
      console.warn(`Gemini translate failed (${modelName}):`, error.message);
      if (/404|not found|NOT_FOUND/i.test(String(error.message || ""))) continue;
    }
  }

  if (lastError) throw lastError;
  return null;
}

function stripBase64Prefix(value) {
  const raw = String(value || "").trim();
  const comma = raw.indexOf(",");
  if (raw.startsWith("data:") && comma >= 0) return raw.slice(comma + 1);
  return raw.replace(/\s+/g, "");
}

function normalizeGeminiMime(mimeType, kind, name) {
  const mime = String(mimeType || "").toLowerCase();
  const fileName = String(name || "").toLowerCase();

  if (kind === "image" || mime.startsWith("image/")) {
    if (mime === "image/jpg") return "image/jpeg";
    return mime || "image/png";
  }
  if (kind === "audio" || mime.startsWith("audio/")) {
    if (mime === "audio/mpeg" || fileName.endsWith(".mp3")) return "audio/mp3";
    if (mime === "audio/x-wav" || mime === "audio/wave") return "audio/wav";
    if (mime === "audio/x-m4a" || mime === "audio/mp4") return "audio/aac";
    if (mime === "audio/webm") return "audio/ogg";
    return mime || "audio/mp3";
  }
  if (kind === "pdf" || mime === "application/pdf" || fileName.endsWith(".pdf")) {
    return "application/pdf";
  }
  return mime || "application/octet-stream";
}

async function extractDocxText(base64Data) {
  const JSZip = require("jszip");
  const buffer = Buffer.from(stripBase64Prefix(base64Data), "base64");
  const zip = await JSZip.loadAsync(buffer);
  const xml = await zip.file("word/document.xml")?.async("string");
  if (!xml) return "";
  return xml
    .replace(/<w:tab\/>/g, "\t")
    .replace(/<\/w:p>/g, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function buildUserParts(message, attachments) {
  const list = Array.isArray(attachments) ? attachments.filter(Boolean) : [];
  const parts = [];
  const prompt =
    message ||
    (list.length
      ? "Hãy phân tích và giải thích nội dung các tệp đính kèm bằng tiếng Việt."
      : "");

  if (prompt) parts.push({ text: prompt });

  const GEMINI_MAX_ATTACHMENTS = 15;
  const MAX_INLINE_CHARS = 6_000_000;
  for (const item of list.slice(0, GEMINI_MAX_ATTACHMENTS)) {
    const name = String(item?.name || "tep").slice(0, 180);
    const kind = String(item?.kind || "").toLowerCase();
    const mimeType = String(item?.mimeType || "");
    const data = stripBase64Prefix(item?.data);
    const text = String(item?.text || "").trim();

    if (kind === "text" || mimeType.startsWith("text/") || text) {
      const body = text || (data ? Buffer.from(data, "base64").toString("utf8") : "");
      if (body) {
        parts.push({
          text: `\n\n[Tệp văn bản: ${name}]\n${body.slice(0, 20000)}`,
        });
      }
      continue;
    }

    if (kind === "doc" || /\.docx$/i.test(name) || mimeType.includes("wordprocessingml")) {
      try {
        const extracted = await extractDocxText(data);
        parts.push({
          text: `\n\n[Tệp Word: ${name}]\n${extracted.slice(0, 20000) || "(Không đọc được nội dung Word)"}`,
        });
      } catch (error) {
        console.warn("Extract docx failed:", error.message);
        parts.push({ text: `\n\n[Tệp Word: ${name} — không đọc được nội dung]` });
      }
      continue;
    }

    if (!data || data.length > MAX_INLINE_CHARS) {
      parts.push({
        text: `\n\n[Tệp ${name} bị bỏ qua vì thiếu dữ liệu hoặc quá lớn.]`,
      });
      continue;
    }

    const geminiMime = normalizeGeminiMime(mimeType, kind, name);
    if (!geminiMime) continue;
    parts.push({
      inlineData: {
        mimeType: geminiMime,
        data,
      },
    });
    parts.push({ text: `[Đính kèm: ${name}]` });
  }

  return parts;
}

exports.chatAssistant = async (req, res) => {
  try {
    const message = String(req.body?.message || "").trim();
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const attachments = Array.isArray(req.body?.attachments) ? req.body.attachments : [];

    if (!message && attachments.length === 0) {
      return res.status(400).json({ message: "Vui lòng nhập câu hỏi hoặc đính kèm tệp." });
    }

    if (message.length > 4000) {
      return res.status(400).json({
        message: "Câu hỏi quá dài. Vui lòng rút gọn dưới 4000 ký tự.",
      });
    }

    const systemInstruction = `Bạn là "Trợ thủ AI GGQuiz" — trợ lý học tập thân thiện, vui vẻ, phù hợp học sinh/sinh viên Việt Nam.
Nhiệm vụ: giải thích từ vựng, ngữ pháp, gợi ý học flashcard, luyện đề, dịch thuật ngắn, mẹo ghi nhớ.
Bạn có thể phân tích ảnh, PDF, văn bản Word và tệp âm thanh người dùng gửi kèm.
Quy tắc trả lời:
- Ưu tiên tiếng Việt (trừ khi người dùng yêu cầu ngôn ngữ khác).
- Dùng Markdown rõ ràng: **in đậm**, danh sách -, xuống dòng hợp lý.
- Ngắn gọn, dễ hiểu, có ví dụ khi cần.
- Không bịa nguồn không chắc chắn; nếu không chắc hãy nói rõ.`;

    const contents = [];
    for (const item of history.slice(-12)) {
      const role = item?.role === "assistant" ? "model" : "user";
      const text = String(item?.content || "").trim();
      if (!text) continue;
      // Bỏ qua welcome cứng phía client nếu có
      if (role === "model" && /Xin chào! Mình là Trợ thủ AI/i.test(text) && contents.length === 0) {
        continue;
      }
      contents.push({ role, parts: [{ text }] });
    }

    const userParts = await buildUserParts(message, attachments);
    if (userParts.length === 0) {
      return res.status(400).json({ message: "Vui lòng nhập câu hỏi hoặc đính kèm tệp." });
    }
    contents.push({ role: "user", parts: userParts });

    const genAI = getGenAI();
    let lastError = null;
    let replyText = "";
    const timeoutMs = attachments.length ? (attachments.length > 5 ? 60000 : 45000) : 25000;

    for (const modelName of GEMINI_MODELS) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          systemInstruction,
        });
        const result = await withTimeout(
          model.generateContent({
            contents,
            generationConfig: {
              temperature: 0.7,
              maxOutputTokens: 2048,
            },
          }),
          timeoutMs,
          `Gemini timeout (${modelName})`
        );
        replyText = String(result?.response?.text?.() || "").trim();
        if (replyText) {
          return res.status(200).json({
            reply: replyText,
            model: modelName,
          });
        }
      } catch (error) {
        lastError = error;
        console.warn(`Gemini chat failed (${modelName}):`, error.message);
        if (/404|not found|NOT_FOUND/i.test(String(error.message || ""))) continue;
      }
    }

    console.error("Chat assistant failed:", lastError?.message);
    return res.status(502).json({
      message:
        lastError?.message?.includes("MISSING_GEMINI_KEY")
          ? "Chưa cấu hình GEMINI_API_KEY trên server."
          : "Không nhận được phản hồi từ Gemini. Thử lại sau.",
    });
  } catch (error) {
    console.error("Chat assistant error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi chat với AI" });
  }
};

exports.translateText = async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim();
    const sourceLang = resolveLangCode(req.body?.sourceLang, "auto");
    const targetLang = resolveLangCode(req.body?.targetLang || req.body?.lang, "vi");

    if (!text) {
      return res.status(200).json({
        translatedText: "",
        detectedSourceLang: null,
        sourceLang,
        targetLang,
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        message: "Văn bản quá dài. Vui lòng dịch tối đa 5000 ký tự mỗi lần.",
      });
    }

    const effectiveTarget = targetLang === "auto" ? "vi" : targetLang;

    if (sourceLang !== "auto" && sourceLang === effectiveTarget) {
      return res.status(200).json({
        translatedText: text,
        detectedSourceLang: sourceLang,
        sourceLang,
        targetLang: effectiveTarget,
        provider: "passthrough",
      });
    }

    // Ưu tiên MyMemory (nhanh), Gemini là dự phòng chất lượng
    try {
      const fromMemory = await translateViaMyMemory(text, sourceLang, effectiveTarget);
      if (fromMemory?.translatedText) {
        return res.status(200).json({
          ...fromMemory,
          sourceLang,
          targetLang: effectiveTarget,
        });
      }
    } catch (error) {
      console.warn("MyMemory translate error:", error.message);
    }

    try {
      const fromGemini = await translateViaGemini(text, sourceLang, effectiveTarget);
      if (fromGemini?.translatedText) {
        return res.status(200).json({
          ...fromGemini,
          sourceLang,
          targetLang: effectiveTarget,
        });
      }
    } catch (error) {
      console.warn("Gemini translate error:", error.message);
    }

    return res.status(502).json({
      message: "Không dịch được văn bản lúc này. Vui lòng thử lại sau.",
    });
  } catch (error) {
    console.error("Translate error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi dịch văn bản" });
  }
};

function parseTranslateJson(text) {
  const raw = String(text || "").trim();
  if (!raw) return null;
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const tryParse = (value) => {
    try {
      const parsed = JSON.parse(value);
      if (!parsed || typeof parsed !== "object") return null;
      return {
        extractedText: String(parsed.extractedText || parsed.sourceText || "").trim(),
        translatedText: String(parsed.translatedText || parsed.translation || "").trim(),
        detectedSourceLang: parsed.detectedSourceLang
          ? String(parsed.detectedSourceLang).split("-")[0].toLowerCase()
          : null,
      };
    } catch {
      return null;
    }
  };
  return tryParse(candidate) || tryParse((candidate.match(/\{[\s\S]*\}/) || [])[0] || "");
}

async function extractOfficeText(name, mimeType, base64Data) {
  const fileName = String(name || "").toLowerCase();
  const mime = String(mimeType || "").toLowerCase();
  if (fileName.endsWith(".docx") || mime.includes("wordprocessingml")) {
    return extractDocxText(base64Data);
  }

  const JSZip = require("jszip");
  const zip = await JSZip.loadAsync(Buffer.from(stripBase64Prefix(base64Data), "base64"));

  if (fileName.endsWith(".pptx") || mime.includes("presentationml")) {
    const slides = Object.keys(zip.files)
      .filter((item) => /^ppt\/slides\/slide\d+\.xml$/i.test(item))
      .sort();
    const chunks = [];
    for (const slide of slides) {
      const xml = await zip.file(slide)?.async("string");
      if (!xml) continue;
      const text = xml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (text) chunks.push(text);
    }
    return chunks.join("\n");
  }

  if (fileName.endsWith(".xlsx") || mime.includes("spreadsheetml")) {
    const shared = await zip.file("xl/sharedStrings.xml")?.async("string");
    return shared ? shared.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : "";
  }

  return "";
}

function htmlToPlainText(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function isSafePublicUrl(raw) {
  try {
    const url = new URL(String(raw || "").trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "0.0.0.0") return false;
    if (/^127\.|^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    return true;
  } catch {
    return false;
  }
}

async function translateLongText(text, sourceLang, targetLang) {
  const value = String(text || "").trim();
  if (!value) return { translatedText: "", detectedSourceLang: null };
  const max = 4500;
  const chunks = [];
  for (let i = 0; i < value.length && chunks.length < 4; i += max) {
    chunks.push(value.slice(i, i + max));
  }

  const translated = [];
  let detected = null;
  for (const chunk of chunks) {
    let result = null;
    try {
      result = await translateViaMyMemory(chunk, sourceLang, targetLang);
    } catch (error) {
      console.warn("MyMemory long-translate error:", error.message);
    }
    if (!result?.translatedText) {
      try {
        result = await translateViaGemini(chunk, sourceLang, targetLang);
      } catch (error) {
        console.warn("Gemini long-translate error:", error.message);
      }
    }
    if (result?.translatedText) translated.push(result.translatedText);
    if (!detected && result?.detectedSourceLang) detected = result.detectedSourceLang;
  }

  return {
    translatedText: translated.join("\n\n"),
    detectedSourceLang: detected,
  };
}

async function translateWithGeminiParts(parts, sourceLang, targetLang) {
  const sourceName = langDisplayName(sourceLang);
  const targetName = langDisplayName(targetLang);
  const prompt = `Bạn là công cụ dịch thuật.
Ngôn ngữ nguồn: ${sourceName}
Ngôn ngữ đích: ${targetName}
Hãy trích toàn bộ chữ nhìn thấy / nội dung văn bản, rồi dịch sang ngôn ngữ đích.
Chỉ trả về JSON object: {"extractedText":"...","translatedText":"...","detectedSourceLang":"xx"}
Không markdown, không giải thích.`;

  const genAI = getGenAI();
  let lastError = null;
  for (const modelName of GEMINI_MODELS) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const result = await withTimeout(
        model.generateContent({
          contents: [{ role: "user", parts: [{ text: prompt }, ...parts] }],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
          },
        }),
        45000,
        `Gemini timeout (${modelName})`
      );
      const parsed = parseTranslateJson(result?.response?.text?.() || "");
      if (parsed?.translatedText || parsed?.extractedText) {
        return { ...parsed, provider: modelName };
      }
    } catch (error) {
      lastError = error;
      console.warn(`Gemini media translate failed (${modelName}):`, error.message);
      if (/404|not found|NOT_FOUND/i.test(String(error.message || ""))) continue;
    }
  }
  if (lastError) throw lastError;
  return null;
}

exports.translateMedia = async (req, res) => {
  try {
    const sourceLang = resolveLangCode(req.body?.sourceLang, "auto");
    const targetLang = resolveLangCode(req.body?.targetLang || req.body?.lang, "vi");
    const effectiveTarget = targetLang === "auto" ? "vi" : targetLang;
    const attachment = req.body?.attachment || {};
    const name = String(attachment.name || "tep").slice(0, 180);
    const kind = String(attachment.kind || "").toLowerCase();
    const mimeType = String(attachment.mimeType || "");
    const data = stripBase64Prefix(attachment.data);
    const text = String(attachment.text || "").trim();

    if (!data && !text) {
      return res.status(400).json({ message: "Vui lòng tải lên một tệp để dịch." });
    }

    const isImage = kind === "image" || mimeType.startsWith("image/");
    const isPdf = kind === "pdf" || mimeType === "application/pdf" || /\.pdf$/i.test(name);

    if (isImage || isPdf) {
      if (!data || data.length > 6_000_000) {
        return res.status(400).json({ message: "Tệp quá lớn hoặc thiếu dữ liệu." });
      }
      const geminiMime = normalizeGeminiMime(mimeType, kind, name);
      const fromGemini = await translateWithGeminiParts(
        [{ inlineData: { mimeType: geminiMime, data } }],
        sourceLang,
        effectiveTarget
      );
      if (fromGemini?.translatedText || fromGemini?.extractedText) {
        return res.status(200).json({
          extractedText: fromGemini.extractedText || "",
          translatedText: fromGemini.translatedText || fromGemini.extractedText || "",
          detectedSourceLang: fromGemini.detectedSourceLang || null,
          sourceLang,
          targetLang: effectiveTarget,
          fileName: name,
        });
      }
    }

    let extracted = text;
    if (!extracted && data) {
      if (kind === "text" || mimeType.startsWith("text/") || /\.(txt|md|csv)$/i.test(name)) {
        extracted = Buffer.from(data, "base64").toString("utf8");
      } else {
        try {
          extracted = await extractOfficeText(name, mimeType, data);
        } catch (error) {
          console.warn("Office extract failed:", error.message);
        }
      }
    }

    extracted = String(extracted || "").trim().slice(0, 18000);
    if (!extracted) {
      return res.status(400).json({
        message: "Không đọc được nội dung tệp. Hãy dùng PDF, Word, PowerPoint, Excel hoặc ảnh có chữ.",
      });
    }

    const translated = await translateLongText(extracted, sourceLang, effectiveTarget);
    if (!translated.translatedText) {
      return res.status(502).json({ message: "Không dịch được tài liệu lúc này. Thử lại sau." });
    }

    return res.status(200).json({
      extractedText: extracted,
      translatedText: translated.translatedText,
      detectedSourceLang: translated.detectedSourceLang,
      sourceLang,
      targetLang: effectiveTarget,
      fileName: name,
    });
  } catch (error) {
    console.error("Translate media error:", error);
    return res.status(500).json({
      message:
        error.message === "MISSING_GEMINI_KEY"
          ? "Chưa cấu hình GEMINI_API_KEY trên server."
          : "Lỗi máy chủ khi dịch tệp.",
    });
  }
};

exports.translateWeb = async (req, res) => {
  try {
    const sourceLang = resolveLangCode(req.body?.sourceLang, "auto");
    const targetLang = resolveLangCode(req.body?.targetLang || req.body?.lang, "vi");
    const effectiveTarget = targetLang === "auto" ? "vi" : targetLang;
    const rawUrl = String(req.body?.url || "").trim();

    if (!isSafePublicUrl(rawUrl)) {
      return res.status(400).json({
        message: "Đầu vào phải là một URL web không trống, có định dạng đáp ứng yêu cầu.",
      });
    }

    const pageUrl = new URL(rawUrl).toString();
    let html = "";
    try {
      const response = await withTimeout(
        fetch(pageUrl, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            Accept: "text/html,application/xhtml+xml",
          },
          redirect: "follow",
        }),
        12000,
        "Không tải được trang web"
      );
      if (!response.ok) {
        return res.status(502).json({ message: `Không mở được trang web (mã ${response.status}).` });
      }
      html = await response.text();
    } catch (error) {
      return res.status(502).json({
        message: error.message || "Không tải được trang web. Kiểm tra URL rồi thử lại.",
      });
    }

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = htmlToPlainText(titleMatch?.[1] || "").slice(0, 180);
    const extracted = htmlToPlainText(html).slice(0, 12000);
    if (!extracted) {
      return res.status(400).json({ message: "Trang web không có nội dung chữ để dịch." });
    }

    const translated = await translateLongText(extracted, sourceLang, effectiveTarget);
    const sl = sourceLang === "auto" ? "auto" : sourceLang;
    const viewerUrl = `https://translate.google.com/translate?sl=${encodeURIComponent(sl)}&tl=${encodeURIComponent(effectiveTarget)}&u=${encodeURIComponent(pageUrl)}`;

    return res.status(200).json({
      url: pageUrl,
      title,
      extractedText: extracted.slice(0, 4000),
      translatedText: translated.translatedText || extracted.slice(0, 4000),
      detectedSourceLang: translated.detectedSourceLang,
      sourceLang,
      targetLang: effectiveTarget,
      viewerUrl,
    });
  } catch (error) {
    console.error("Translate web error:", error);
    return res.status(500).json({ message: "Lỗi máy chủ khi dịch trang web." });
  }
};
