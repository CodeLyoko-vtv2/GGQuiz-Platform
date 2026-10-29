export const DETECT_LANG = {
  code: "auto",
  name: "Phát hiện ngôn ngữ",
};

export const POPULAR_LANGUAGES = [
  { code: "en", name: "Tiếng Anh" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "ko", name: "Tiếng Hàn" },
  { code: "ja", name: "Tiếng Nhật" },
  { code: "zh", name: "Tiếng Trung" },
  { code: "fr", name: "Tiếng Pháp" },
  { code: "es", name: "Tiếng Tây Ban Nha" },
  { code: "de", name: "Tiếng Đức" },
];

export const ALL_LANGUAGES = [
  { code: "en", name: "Tiếng Anh" },
  { code: "vi", name: "Tiếng Việt" },
  { code: "ko", name: "Tiếng Hàn" },
  { code: "ja", name: "Tiếng Nhật" },
  { code: "zh", name: "Tiếng Trung" },
  { code: "fr", name: "Tiếng Pháp" },
  { code: "es", name: "Tiếng Tây Ban Nha" },
  { code: "de", name: "Tiếng Đức" },
  { code: "pt", name: "Tiếng Bồ Đào Nha" },
  { code: "it", name: "Tiếng Ý" },
  { code: "ru", name: "Tiếng Nga" },
  { code: "ar", name: "Tiếng Ả Rập" },
  { code: "hi", name: "Tiếng Hindi" },
  { code: "th", name: "Tiếng Thái" },
  { code: "id", name: "Tiếng Indonesia" },
  { code: "ms", name: "Tiếng Mã Lai" },
  { code: "tl", name: "Tiếng Filipino" },
  { code: "nl", name: "Tiếng Hà Lan" },
  { code: "pl", name: "Tiếng Ba Lan" },
  { code: "tr", name: "Tiếng Thổ Nhĩ Kỳ" },
  { code: "uk", name: "Tiếng Ukraina" },
  { code: "sv", name: "Tiếng Thụy Điển" },
  { code: "no", name: "Tiếng Na Uy" },
  { code: "da", name: "Tiếng Đan Mạch" },
  { code: "fi", name: "Tiếng Phần Lan" },
  { code: "cs", name: "Tiếng Séc" },
  { code: "el", name: "Tiếng Hy Lạp" },
  { code: "he", name: "Tiếng Do Thái" },
  { code: "ro", name: "Tiếng Romania" },
  { code: "hu", name: "Tiếng Hungary" },
].sort((a, b) => a.name.localeCompare(b.name, "vi"));

export function getLanguageLabel(code, { placeholder = "CHỌN NGÔN NGỮ", allowDetect = false } = {}) {
  if (!code) return placeholder;
  if (code === DETECT_LANG.code) {
    return allowDetect || code === "auto" ? DETECT_LANG.name : placeholder;
  }
  const found =
    ALL_LANGUAGES.find((lang) => lang.code === code) ||
    POPULAR_LANGUAGES.find((lang) => lang.code === code);
  return found?.name || placeholder;
}

/** Map mã locale trình duyệt (vi-VN, en-US...) -> mã ngôn ngữ trong danh sách app */
export function resolveBrowserLanguage(fallback = "vi") {
  if (typeof navigator === "undefined") return fallback;

  const candidates = [
    ...(Array.isArray(navigator.languages) ? navigator.languages : []),
    navigator.language,
  ].filter(Boolean);

  const supported = new Set(ALL_LANGUAGES.map((lang) => lang.code));

  for (const locale of candidates) {
    const lower = String(locale).toLowerCase();
    const base = lower.split("-")[0];

    // zh-CN / zh-TW -> zh
    if (base === "zh" && supported.has("zh")) return "zh";
    if (supported.has(base)) return base;
  }

  return supported.has(fallback) ? fallback : "en";
}
