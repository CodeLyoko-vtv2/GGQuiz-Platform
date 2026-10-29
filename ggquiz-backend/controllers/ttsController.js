const googleTTS = require("google-tts-api");

const MAX_TEXT_LENGTH = 500;

async function detectLanguage(text) {
  const sample = String(text || "").trim().slice(0, 180);
  if (!sample) return "en";

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(sample)}`;
  const response = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    },
  });

  if (!response.ok) {
    throw new Error(`Language detect failed: ${response.status}`);
  }

  const data = await response.json();
  const detected = String(data?.[2] || "").trim().toLowerCase();
  return detected || "en";
}

async function fetchAudioBuffers(text, lang) {
  const urls = googleTTS.getAllAudioUrls(text, {
    lang,
    slow: false,
    host: "https://translate.google.com",
    splitPunct: ",.?!;:",
  });

  const buffers = [];

  for (const item of urls) {
    const response = await fetch(item.url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Referer: "https://translate.google.com/",
      },
    });

    if (!response.ok) {
      throw new Error(`TTS fetch failed: ${response.status}`);
    }

    buffers.push(Buffer.from(await response.arrayBuffer()));
  }

  return Buffer.concat(buffers);
}

exports.synthesizeSpeech = async (req, res) => {
  try {
    const text = String(req.query.text || req.body?.text || "")
      .replace(/\s+/g, " ")
      .trim();

    if (!text) {
      return res.status(400).json({ message: "Vui lòng cung cấp nội dung cần đọc" });
    }

    if (text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({
        message: `Nội dung quá dài (tối đa ${MAX_TEXT_LENGTH} ký tự)`,
      });
    }

    let lang = String(req.query.lang || req.body?.lang || "auto")
      .trim()
      .toLowerCase();

    if (!lang || lang === "auto") {
      try {
        lang = await detectLanguage(text);
      } catch (detectError) {
        console.warn("TTS language detect fallback:", detectError.message);
        lang = "en";
      }
    }

    const audio = await fetchAudioBuffers(text, lang);

    res.set({
      "Content-Type": "audio/mpeg",
      "Content-Length": audio.length,
      "Cache-Control": "public, max-age=86400",
      "X-Detected-Lang": lang,
    });

    return res.send(audio);
  } catch (error) {
    console.error("TTS error:", error);
    return res.status(500).json({
      message: "Không tạo được âm thanh. Vui lòng thử lại.",
    });
  }
};
