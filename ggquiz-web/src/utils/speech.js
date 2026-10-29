const API_BASE = "http://localhost:5000/api";

let currentAudio = null;

function loadVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis.getVoices() || [];
}

export function isSpeechSupported() {
  return typeof window !== "undefined" && (Boolean(window.Audio) || "speechSynthesis" in window);
}

export function detectSpeechLang(text) {
  const value = String(text || "").trim();
  if (!value) return "auto";
  if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(value)) {
    return "vi";
  }
  return "auto";
}

export function stopSpeaking() {
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = "";
    currentAudio = null;
  }

  if (typeof window !== "undefined" && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}

async function speakWithGoogleTTS(text, lang = "auto") {
  const params = new URLSearchParams({
    text: String(text).trim(),
    lang: lang || "auto",
  });

  const response = await fetch(`${API_BASE}/tts?${params.toString()}`);
  if (!response.ok) {
    let message = "Không tạo được âm thanh";
    try {
      const data = await response.json();
      message = data.message || message;
    } catch {
      // ignore json parse errors
    }
    throw new Error(message);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  return new Promise((resolve, reject) => {
    const audio = new Audio(objectUrl);
    currentAudio = audio;

    const cleanup = () => {
      URL.revokeObjectURL(objectUrl);
      if (currentAudio === audio) currentAudio = null;
    };

    audio.onended = () => {
      cleanup();
      resolve(true);
    };
    audio.onerror = () => {
      cleanup();
      reject(new Error("Không phát được tệp âm thanh"));
    };

    audio.play().catch((error) => {
      cleanup();
      reject(error);
    });
  });
}

function speakWithWebSpeech(text, lang = "auto") {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return Promise.resolve(false);
  }

  const value = String(text || "").trim();
  if (!value) return Promise.resolve(false);

  const resolvedLang =
    !lang || lang === "auto"
      ? /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(value)
        ? "vi-VN"
        : "en-US"
      : lang.includes("-")
        ? lang
        : `${lang}-${lang.toUpperCase()}`;

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(value);
    utterance.lang = resolvedLang;
    utterance.rate = 0.95;

    const voices = loadVoices();
    const voice =
      voices.find((item) => item.lang === resolvedLang) ||
      voices.find((item) =>
        item.lang.toLowerCase().startsWith(String(resolvedLang).split("-")[0].toLowerCase())
      );
    if (voice) utterance.voice = voice;

    utterance.onend = () => resolve(true);
    utterance.onerror = () => resolve(false);

    window.speechSynthesis.resume();
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Ưu tiên Google Translate TTS (đa ngôn ngữ), fallback Web Speech API.
 */
export async function speakText(text, options = {}) {
  const value = String(text || "").trim();
  if (!value) return false;

  stopSpeaking();

  const lang = options.lang || "auto";

  try {
    await speakWithGoogleTTS(value, lang);
    return true;
  } catch (error) {
    console.warn("Google TTS failed, fallback to Web Speech:", error.message);
    return speakWithWebSpeech(value, lang);
  }
}
