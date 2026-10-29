import { useEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  ChevronDown,
  CloudUpload,
  Copy,
  ExternalLink,
  FileText,
  Globe,
  Image as ImageIcon,
  Languages,
  Loader2,
  Mic,
  MicOff,
  Type,
  Volume2,
  X,
} from "lucide-react";
import api, { getApiErrorMessage } from "../api/client";
import { ALL_LANGUAGES, DETECT_LANG, getLanguageLabel } from "../data/languages";
import { speakText, stopSpeaking } from "../utils/speech";
import { fileToAttachment } from "./ai/aiAttachments";

const TABS = [
  { id: "text", label: "Văn bản", icon: Type },
  { id: "image", label: "Hình ảnh", icon: ImageIcon },
  { id: "document", label: "Tài liệu", icon: FileText },
  { id: "web", label: "Trang web", icon: Globe },
];

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif";
const DOC_ACCEPT =
  ".docx,.pdf,.pptx,.xlsx,.txt,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/plain";

function chipClass(active) {
  return `shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-semibold transition ${
    active
      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-200"
      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
  }`;
}

function normalizeTranslateSuggestions(payload) {
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.suggestions)
      ? payload.suggestions
      : [];
  return list
    .map((item) => {
      if (typeof item === "string") {
        return { text: item.trim(), translation: "" };
      }
      const text = String(item?.text || item?.word || "").trim();
      const translation = String(item?.translation || item?.meaning || "").trim();
      return text ? { text, translation } : null;
    })
    .filter(Boolean)
    .slice(0, 6);
}

/** Thanh ngôn ngữ gọn: [Phát hiện?] + 1 nút ngôn ngữ + dropdown */
function LangChipBar({
  value,
  chipLang,
  onSelectDetect,
  onSelectChip,
  onPickLanguage,
  allowDetect = false,
  align = "left",
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return undefined;
    }
    const onPointerDown = (event) => {
      if (rootRef.current && !rootRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return ALL_LANGUAGES;
    return ALL_LANGUAGES.filter(
      (lang) =>
        lang.name.toLowerCase().includes(q) || lang.code.toLowerCase().includes(q)
    );
  }, [query]);

  const chipActive = value === chipLang;
  const detectActive = allowDetect && value === "auto";

  return (
    <div
      className="relative flex min-w-0 flex-1 flex-nowrap items-center gap-1"
      ref={rootRef}
    >
      {allowDetect ? (
        <button
          type="button"
          onClick={() => onSelectDetect?.()}
          className={chipClass(detectActive)}
        >
          <span className="inline-flex items-center gap-1">
            <Languages className="h-3.5 w-3.5 shrink-0" />
            {DETECT_LANG.name}
          </span>
        </button>
      ) : null}

      <button
        type="button"
        onClick={() => onSelectChip?.(chipLang)}
        className={chipClass(chipActive)}
      >
        {getLanguageLabel(chipLang)}
      </button>

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
        aria-label="Chọn ngôn ngữ khác"
        title="Thay đổi ngôn ngữ"
      >
        <ChevronDown className={`h-4 w-4 transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open ? (
        <div
          className={`absolute top-full z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="border-b border-gray-100 p-2">
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm ngôn ngữ..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
              autoFocus
            />
          </div>
          <ul className="max-h-64 overflow-y-auto py-1">
            {allowDetect ? (
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onSelectDetect?.();
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-blue-50 ${
                    detectActive ? "bg-blue-50 font-semibold text-blue-700" : "text-gray-700"
                  }`}
                >
                  {DETECT_LANG.name}
                  {detectActive ? <Check className="h-4 w-4" /> : null}
                </button>
              </li>
            ) : null}
            {filtered.map((lang) => (
              <li key={lang.code}>
                <button
                  type="button"
                  onClick={() => {
                    onPickLanguage?.(lang.code);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-sm transition hover:bg-blue-50 ${
                    chipLang === lang.code && !detectActive
                      ? "bg-blue-50 font-semibold text-blue-700"
                      : "text-gray-700"
                  }`}
                >
                  {lang.name}
                  {chipLang === lang.code && !detectActive ? (
                    <Check className="h-4 w-4" />
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

function TranslateDropzone({
  accept,
  formats,
  onFile,
  loading,
  leftLabel = "Kéo và thả",
}) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const dragCount = useRef(0);

  const handleFiles = (list) => {
    const file = list?.[0];
    if (!file) return;
    onFile(file);
  };

  return (
    <div className="grid min-h-[320px] flex-1 gap-0 md:grid-cols-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragEnter={(event) => {
          event.preventDefault();
          dragCount.current += 1;
          setDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          event.preventDefault();
          dragCount.current = Math.max(0, dragCount.current - 1);
          if (dragCount.current === 0) setDragging(false);
        }}
        onDrop={(event) => {
          event.preventDefault();
          dragCount.current = 0;
          setDragging(false);
          handleFiles(event.dataTransfer?.files);
        }}
        className={`flex min-h-[280px] flex-col items-center justify-center gap-4 border-b border-gray-100 px-6 py-10 text-center transition md:border-r md:border-b-0 ${
          dragging ? "bg-blue-50" : "bg-white hover:bg-slate-50"
        }`}
      >
        <span className="flex h-28 w-28 items-center justify-center rounded-full bg-blue-50 text-blue-400">
          <CloudUpload className="h-16 w-16" strokeWidth={1.25} />
        </span>
        <p className="text-lg font-medium text-slate-500">{leftLabel}</p>
      </button>

      <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 px-6 py-10 text-center">
        <p className="text-lg font-medium text-slate-600">Hoặc chọn một tệp</p>
        <button
          type="button"
          disabled={loading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center rounded-md bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? "Đang xử lý..." : "Duyệt qua các tệp"}
        </button>
        <p className="max-w-xs text-xs leading-relaxed text-slate-400">{formats}</p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        className="hidden"
        onChange={(event) => {
          handleFiles(event.target.files);
          event.target.value = "";
        }}
      />
    </div>
  );
}

function ResultActions({ text, lang, onCopy, copied }) {
  const speak = async () => {
    if (!text?.trim()) return;
    try {
      await speakText(text, { lang });
    } catch {
      toast.error("Không phát âm được lúc này");
    }
  };

  return (
    <div className="flex items-center justify-end gap-1 px-3 pb-3 sm:px-4">
      <button
        type="button"
        onClick={onCopy}
        disabled={!text?.trim()}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        title="Sao chép"
        aria-label="Sao chép bản dịch"
      >
        {copied ? <Check className="h-5 w-5 text-green-600" /> : <Copy className="h-5 w-5" />}
      </button>
      <button
        type="button"
        onClick={speak}
        disabled={!text?.trim()}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-white hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
        title="Phát âm"
        aria-label="Phát âm bản dịch"
      >
        <Volume2 className="h-5 w-5" />
      </button>
    </div>
  );
}

function TranslateModal({ open, onClose }) {
  const [tab, setTab] = useState("text");
  const [sourceLang, setSourceLang] = useState("auto");
  const [sourceChipLang, setSourceChipLang] = useState("en");
  const [targetLang, setTargetLang] = useState("vi");
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [detectedLang, setDetectedLang] = useState(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [copied, setCopied] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState("");
  const [extractedText, setExtractedText] = useState("");
  const [webUrl, setWebUrl] = useState("");
  const [webResult, setWebResult] = useState(null);

  const requestIdRef = useRef(0);
  const suggestIdRef = useRef(0);
  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);
  const suggestRef = useRef(null);

  useEffect(() => {
    if (!open) {
      stopSpeaking();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
      setListening(false);
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || tab !== "text") return undefined;

    const text = sourceText.trim();
    if (!text) {
      requestIdRef.current += 1;
      setTranslatedText("");
      setDetectedLang(null);
      setLoading(false);
      return undefined;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      const requestId = ++requestIdRef.current;
      try {
        const { data } = await api.post(
          "/ai/translate",
          { text, sourceLang, targetLang },
          { timeout: 25000 }
        );
        if (requestId !== requestIdRef.current) return;
        setTranslatedText(String(data.translatedText || ""));
        setDetectedLang(data.detectedSourceLang || null);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        setTranslatedText("");
        toast.error(getApiErrorMessage(error));
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    }, 450);

    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang, open, tab]);

  useEffect(() => {
    if (!open || tab !== "text") {
      setSuggestions([]);
      setSuggestOpen(false);
      return undefined;
    }

    const text = sourceText.trim();
    const shouldSuggest = text.length >= 1 && text.length <= 60 && !sourceText.includes("\n");
    if (!shouldSuggest) {
      suggestIdRef.current += 1;
      setSuggestions([]);
      setSuggestOpen(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      const requestId = ++suggestIdRef.current;
      try {
        const { data } = await api.post(
          "/ai/suggest-translate",
          { query: text, sourceLang, targetLang },
          { timeout: 12000 }
        );
        if (requestId !== suggestIdRef.current) return;
        const next = normalizeTranslateSuggestions(data);
        setSuggestions(next);
        setSuggestOpen(next.length > 0);
      } catch {
        if (requestId !== suggestIdRef.current) return;
        setSuggestions([]);
        setSuggestOpen(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [sourceText, sourceLang, targetLang, open, tab]);

  useEffect(() => {
    const onPointerDown = (event) => {
      if (suggestRef.current && !suggestRef.current.contains(event.target)) {
        setSuggestOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const swapLanguages = () => {
    const nextSource = sourceLang === "auto" ? sourceChipLang : sourceLang;
    const nextTarget = targetLang;
    setSourceChipLang(nextTarget);
    setSourceLang(nextTarget);
    setTargetLang(nextSource);
    if (tab === "text") {
      setSourceText(translatedText);
      setTranslatedText(sourceText);
    }
    setDetectedLang(null);
  };

  const clearSource = () => {
    setSourceText("");
    setTranslatedText("");
    setDetectedLang(null);
    setSuggestions([]);
    textareaRef.current?.focus();
  };

  const copyText = async (value) => {
    if (!String(value || "").trim()) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.success("Đã sao chép bản dịch");
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error("Không sao chép được văn bản");
    }
  };

  const speakSource = async () => {
    if (!sourceText.trim()) return;
    try {
      await speakText(sourceText, { lang: sourceLang === "auto" ? detectedLang || "auto" : sourceLang });
    } catch {
      toast.error("Không phát âm được lúc này");
    }
  };

  const toggleMic = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Trình duyệt không hỗ trợ nhận diện giọng nói");
      return;
    }

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    const langCode = sourceLang === "auto" ? "vi-VN" : `${sourceLang}-${sourceLang.toUpperCase()}`;
    recognition.lang =
      sourceLang === "en"
        ? "en-US"
        : sourceLang === "vi"
          ? "vi-VN"
          : sourceLang === "auto"
            ? navigator.language || "vi-VN"
            : langCode;

    let finalChunk = sourceText;

    recognition.onstart = () => setListening(true);
    recognition.onerror = (event) => {
      setListening(false);
      if (event.error !== "aborted" && event.error !== "no-speech") {
        toast.error("Không dùng được micro. Kiểm tra quyền truy cập.");
      }
    };
    recognition.onend = () => {
      setListening(false);
      recognitionRef.current = null;
    };
    recognition.onresult = (event) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const transcript = event.results[i][0]?.transcript || "";
        if (event.results[i].isFinal) {
          finalChunk = `${finalChunk}${finalChunk && !finalChunk.endsWith(" ") ? " " : ""}${transcript}`.trimStart();
          setSourceText(finalChunk);
        } else {
          interim += transcript;
        }
      }
      if (interim) {
        const preview = `${finalChunk}${finalChunk && !finalChunk.endsWith(" ") ? " " : ""}${interim}`;
        setSourceText(preview);
      }
    };

    recognitionRef.current = recognition;
    try {
      recognition.start();
    } catch {
      toast.error("Không khởi động được micro");
      setListening(false);
    }
  };

  const resetMedia = () => {
    setMediaFile(null);
    setMediaPreview("");
    setExtractedText("");
    setTranslatedText("");
    setWebResult(null);
  };

  const handleTabClick = (id) => {
    setTab(id);
    setSuggestOpen(false);
    if (id !== "text") {
      resetMedia();
    }
  };

  const handleMediaFile = async (file, expected) => {
    try {
      const attachment = await fileToAttachment(file);
      if (expected === "image" && attachment.kind !== "image") {
        toast.error("Hãy chọn tệp hình ảnh (JPG, PNG, WEBP).");
        return;
      }
      if (expected === "document" && attachment.kind === "image") {
        toast.error("Hãy chọn tài liệu (PDF, Word, PowerPoint, Excel).");
        return;
      }
      setMediaFile(attachment);
      setMediaPreview(
        attachment.kind === "image" && attachment.data
          ? `data:${attachment.mimeType};base64,${attachment.data}`
          : ""
      );
      setLoading(true);
      setExtractedText("");
      setTranslatedText("");
      const { data } = await api.post(
        "/ai/translate-media",
        {
          sourceLang,
          targetLang,
          attachment: {
            name: attachment.name,
            mimeType: attachment.mimeType,
            kind: attachment.kind,
            data: attachment.data || null,
            text: attachment.text || null,
          },
        },
        { timeout: 70000 }
      );
      setExtractedText(String(data.extractedText || ""));
      setTranslatedText(String(data.translatedText || ""));
      setDetectedLang(data.detectedSourceLang || null);
    } catch (error) {
      toast.error(getApiErrorMessage(error) || error.message);
      setMediaFile(null);
      setMediaPreview("");
    } finally {
      setLoading(false);
    }
  };

  const handleWebTranslate = async () => {
    const value = webUrl.trim();
    if (!value) {
      toast.error("Đầu vào phải là một URL web không trống, có định dạng đáp ứng yêu cầu.");
      return;
    }
    setLoading(true);
    setWebResult(null);
    setTranslatedText("");
    try {
      const { data } = await api.post(
        "/ai/translate-web",
        { url: value, sourceLang, targetLang },
        { timeout: 45000 }
      );
      setWebResult(data);
      setTranslatedText(String(data.translatedText || ""));
      setExtractedText(String(data.extractedText || ""));
      setDetectedLang(data.detectedSourceLang || null);
    } catch (error) {
      toast.error(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const detectedLabel =
    sourceLang === "auto" && detectedLang
      ? `Phát hiện: ${getLanguageLabel(detectedLang)}`
      : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-6">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-[2px]"
        aria-label="Đóng overlay"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Từ điển"
        className="relative z-10 flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-blue-600 text-white shadow-sm">
              <Languages className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-extrabold tracking-tight text-gray-900">Từ điển</h2>
              <p className="text-xs text-gray-500">Dịch văn bản, ảnh, tài liệu và trang web</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="border-b border-gray-100 px-3 pt-3 sm:px-6">
          <div className="flex gap-1 overflow-x-auto pb-0">
            {TABS.map((item) => {
              const Icon = item.icon;
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleTabClick(item.id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
                    active
                      ? "bg-blue-50 text-blue-700 ring-1 ring-blue-100 ring-inset"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex items-center gap-2 border-b border-gray-100 px-3 py-3 sm:px-6">
          <LangChipBar
            value={sourceLang}
            chipLang={sourceChipLang}
            allowDetect
            align="left"
            onSelectDetect={() => setSourceLang("auto")}
            onSelectChip={(code) => setSourceLang(code)}
            onPickLanguage={(code) => {
              setSourceChipLang(code);
              setSourceLang(code);
            }}
          />

          <button
            type="button"
            onClick={swapLanguages}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            title="Hoán đổi ngôn ngữ"
            aria-label="Hoán đổi ngôn ngữ"
          >
            <ArrowLeftRight className="h-4 w-4" />
          </button>

          <LangChipBar
            value={targetLang}
            chipLang={targetLang}
            align="right"
            onSelectChip={(code) => setTargetLang(code)}
            onPickLanguage={(code) => setTargetLang(code)}
          />
        </div>

        {tab === "text" ? (
          <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
            <div className="relative flex min-h-[280px] flex-col border-b border-gray-100 md:border-r md:border-b-0">
              {detectedLabel ? (
                <p className="px-4 pt-3 text-xs font-medium text-blue-600 sm:px-5">{detectedLabel}</p>
              ) : null}
              <div className="relative flex min-h-0 flex-1 flex-col" ref={suggestRef}>
                <textarea
                  ref={textareaRef}
                  value={sourceText}
                  onChange={(e) => setSourceText(e.target.value.slice(0, 5000))}
                  onFocus={() => setSuggestOpen(suggestions.length > 0)}
                  placeholder="Nhập văn bản cần dịch..."
                  maxLength={5000}
                  rows={suggestOpen ? 2 : 8}
                  className={`w-full resize-none bg-white px-4 py-4 text-lg leading-relaxed text-gray-900 outline-none placeholder:text-gray-400 sm:px-5 sm:text-xl ${
                    suggestOpen ? "min-h-[72px]" : "min-h-[220px] flex-1"
                  }`}
                />
                {suggestOpen && suggestions.length > 0 ? (
                  <ul className="min-h-0 flex-1 overflow-y-auto bg-white">
                    {suggestions.map((item) => (
                      <li
                        key={item.text}
                        className="border-b border-slate-100 last:border-b-0"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSourceText(item.text);
                            setSuggestOpen(false);
                          }}
                          className="block w-full px-5 py-3.5 text-left transition-colors hover:bg-slate-50"
                        >
                          <span className="block text-[17px] leading-snug font-medium text-slate-900">
                            {item.text}
                          </span>
                          {item.translation ? (
                            <span className="mt-1 block text-[13px] leading-snug text-slate-400">
                              {item.translation}
                            </span>
                          ) : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="flex items-center justify-between px-3 pb-3 sm:px-4">
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`inline-flex h-10 w-10 items-center justify-center rounded-full transition ${
                      listening
                        ? "bg-red-500 text-white shadow-md shadow-red-200"
                        : "text-gray-500 hover:bg-blue-50 hover:text-blue-700"
                    }`}
                    title={listening ? "Dừng thu âm" : "Thu âm giọng nói"}
                    aria-label={listening ? "Dừng thu âm" : "Thu âm giọng nói"}
                  >
                    {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                  </button>
                  <button
                    type="button"
                    onClick={speakSource}
                    disabled={!sourceText.trim()}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
                    title="Phát âm văn bản nguồn"
                    aria-label="Phát âm văn bản nguồn"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>
                <div className="flex items-center gap-1">
                  <span className="mr-2 text-xs text-gray-400">
                    {sourceText.length}/5000
                  </span>
                  {sourceText ? (
                    <button
                      type="button"
                      onClick={clearSource}
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
                      title="Xóa văn bản"
                      aria-label="Xóa văn bản"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="relative flex min-h-[280px] flex-col bg-slate-50">
              <div className="min-h-[220px] flex-1 overflow-y-auto px-4 py-4 sm:px-5">
                {loading ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Đang dịch...
                  </div>
                ) : translatedText ? (
                  <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-900 sm:text-xl">
                    {translatedText}
                  </p>
                ) : (
                  <p className="text-lg text-gray-400 sm:text-xl">Bản dịch sẽ hiện ở đây</p>
                )}
              </div>
              <ResultActions
                text={translatedText}
                lang={targetLang}
                copied={copied}
                onCopy={() => copyText(translatedText)}
              />
            </div>
          </div>
        ) : null}

        {tab === "image" ? (
          mediaFile || loading ? (
            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
              <div className="flex min-h-[280px] flex-col border-b border-gray-100 p-4 md:border-r md:border-b-0">
                {mediaPreview ? (
                  <img
                    src={mediaPreview}
                    alt={mediaFile?.name || "Ảnh tải lên"}
                    className="mx-auto max-h-[52vh] w-auto max-w-full object-contain"
                  />
                ) : (
                  <p className="text-sm text-slate-500">{mediaFile?.name}</p>
                )}
                <button
                  type="button"
                  onClick={resetMedia}
                  className="mt-4 self-start text-sm font-semibold text-blue-600 hover:underline"
                >
                  Chọn ảnh khác
                </button>
              </div>
              <div className="flex min-h-[280px] flex-col bg-slate-50">
                <div className="min-h-[220px] flex-1 overflow-y-auto px-4 py-4">
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang đọc chữ trong ảnh và dịch...
                    </div>
                  ) : (
                    <>
                      {extractedText ? (
                        <p className="mb-3 text-xs font-medium text-slate-400">
                          Chữ trong ảnh: {extractedText.slice(0, 180)}
                          {extractedText.length > 180 ? "…" : ""}
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap text-lg leading-relaxed text-gray-900">
                        {translatedText || "Không tìm thấy chữ để dịch."}
                      </p>
                    </>
                  )}
                </div>
                <ResultActions
                  text={translatedText}
                  lang={targetLang}
                  copied={copied}
                  onCopy={() => copyText(translatedText)}
                />
              </div>
            </div>
          ) : (
            <TranslateDropzone
              accept={IMAGE_ACCEPT}
              formats="Các loại tệp hỗ trợ: jpg, jpeg, png, webp. Tìm hiểu thêm"
              onFile={(file) => handleMediaFile(file, "image")}
              loading={loading}
            />
          )
        ) : null}

        {tab === "document" ? (
          mediaFile || loading ? (
            <div className="grid min-h-0 flex-1 gap-0 overflow-hidden md:grid-cols-2">
              <div className="flex min-h-[280px] flex-col items-center justify-center gap-3 border-b border-gray-100 p-6 md:border-r md:border-b-0">
                <FileText className="h-12 w-12 text-blue-500" />
                <p className="text-center text-sm font-semibold text-slate-700">{mediaFile?.name}</p>
                <button
                  type="button"
                  onClick={resetMedia}
                  className="text-sm font-semibold text-blue-600 hover:underline"
                >
                  Chọn tệp khác
                </button>
              </div>
              <div className="flex min-h-[280px] flex-col bg-slate-50">
                <div className="min-h-[220px] flex-1 overflow-y-auto px-4 py-4">
                  {loading ? (
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Đang trích xuất và dịch tài liệu...
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap text-base leading-relaxed text-gray-900">
                      {translatedText || "Không đọc được nội dung tài liệu."}
                    </p>
                  )}
                </div>
                <ResultActions
                  text={translatedText}
                  lang={targetLang}
                  copied={copied}
                  onCopy={() => copyText(translatedText)}
                />
              </div>
            </div>
          ) : (
            <TranslateDropzone
              accept={DOC_ACCEPT}
              formats="Các loại tệp được hỗ trợ: .docx, .pdf, .pptx, .xlsx. Tìm hiểu thêm"
              onFile={(file) => handleMediaFile(file, "document")}
              loading={loading}
            />
          )
        ) : null}

        {tab === "web" ? (
          <div className="flex min-h-[320px] flex-1 flex-col items-center justify-center px-4 py-10">
            <form
              className="flex w-full max-w-xl items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                handleWebTranslate();
              }}
            >
              <input
                type="url"
                value={webUrl}
                onChange={(e) => setWebUrl(e.target.value)}
                placeholder="Trang web"
                className="h-12 flex-1 rounded-full border border-blue-200 px-5 text-base text-slate-800 outline-none ring-blue-100 placeholder:text-slate-400 focus:border-blue-500 focus:ring-4"
              />
              <button
                type="submit"
                disabled={loading}
                className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
                aria-label="Dịch trang web"
                title="Dịch trang web"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ArrowRight className="h-5 w-5" />}
              </button>
            </form>
            <p className="mt-3 text-xs text-slate-400">
              Dán vào phải là một URL web không trống, có định dạng đáp ứng yêu cầu
            </p>

            {webResult ? (
              <div className="mt-8 w-full max-w-3xl rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-800">{webResult.title || "Trang web"}</p>
                    <p className="text-xs text-slate-400">{webResult.url}</p>
                  </div>
                  {webResult.viewerUrl ? (
                    <a
                      href={webResult.viewerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-full bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                    >
                      Mở trang đã dịch
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  ) : null}
                </div>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                  {translatedText}
                </p>
                <ResultActions
                  text={translatedText}
                  lang={targetLang}
                  copied={copied}
                  onCopy={() => copyText(translatedText)}
                />
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default TranslateModal;
