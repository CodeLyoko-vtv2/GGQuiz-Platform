import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { GripVertical, Import, Plus, Trash2, X } from "lucide-react";
import CardImageField, {
  createImageObjectUrl,
  normalizeImageSrc,
  resolveImageForSave,
} from "../components/CardImageField";
import ImageSuggestPanel from "../components/ImageSuggestPanel";
import LanguagePairBar from "../components/LanguagePairBar";
import { resolveBrowserLanguage } from "../data/languages";
import api, { getApiErrorMessage } from "../api/client";

function createEmptyCard(entering = false) {
  return {
    localId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: null,
    term: "",
    definition: "",
    image: null,
    termImage: null,
    entering,
  };
}

function cardsFromSet(studySet) {
  const list = Array.isArray(studySet?.cards) ? studySet.cards : [];
  if (list.length === 0) return [createEmptyCard()];

  return list.map((card) => ({
    localId: card.id
      ? `saved-${card.id}`
      : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    id: card.id || null,
    term: card.term || "",
    definition: card.definition || "",
    image: card.image || null,
    termImage: card.termImage || null,
  }));
}

function parseImportText(text, termSeparator, cardSeparator) {
  const raw = String(text || "").trim();
  if (!raw) return [];

  let chunks = [];
  if (cardSeparator === "semicolon") {
    chunks = raw.split(";").map((chunk) => chunk.trim()).filter(Boolean);
  } else {
    chunks = raw.split(/\r?\n/).map((chunk) => chunk.trim()).filter(Boolean);
  }

  return chunks
    .map((chunk) => {
      let term = "";
      let definition = "";

      if (termSeparator === "comma") {
        const idx = chunk.indexOf(",");
        if (idx === -1) {
          term = chunk;
        } else {
          term = chunk.slice(0, idx).trim();
          definition = chunk.slice(idx + 1).trim();
        }
      } else {
        const parts = chunk.split("\t");
        if (parts.length === 1) {
          term = parts[0].trim();
        } else {
          term = parts[0].trim();
          definition = parts.slice(1).join("\t").trim();
        }
      }

      return { term, definition };
    })
    .filter((card) => card.term || card.definition);
}

function highlightMatch(text, query) {
  const value = String(text || "");
  const q = String(query || "").trim();
  if (!q) return value;

  const lowerValue = value.toLowerCase();
  const lowerQuery = q.toLowerCase();
  const index = lowerValue.indexOf(lowerQuery);
  if (index === -1) return value;

  return (
    <>
      {value.slice(0, index)}
      <span className="font-bold text-gray-900">{value.slice(index, index + q.length)}</span>
      {value.slice(index + q.length)}
    </>
  );
}

function normalizeSuggestions(payload) {
  if (payload == null) return [];
  const raw = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.suggestions)
      ? payload.suggestions
      : Array.isArray(payload.data)
        ? payload.data
        : typeof payload === "string"
          ? (() => {
              try {
                const parsed = JSON.parse(payload);
                return Array.isArray(parsed) ? parsed : [];
              } catch {
                return payload
                  .split(/\r?\n|,/)
                  .map((line) => line.trim())
                  .filter(Boolean);
              }
            })()
          : [];

  return raw
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

function SuggestionList({
  items,
  loading,
  onPick,
  emptyText,
  errorText,
  highlightQuery = "",
}) {
  if (loading) {
    return (
      <div className="absolute top-full right-0 left-0 z-20 mt-1.5 space-y-1.5">
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-500 shadow-md">
          Đang gợi ý...
        </div>
      </div>
    );
  }

  if (errorText) {
    return (
      <div className="absolute top-full right-0 left-0 z-20 mt-1.5">
        <div className="rounded-xl border border-red-200 bg-white px-3 py-2.5 text-sm text-red-500 shadow-md">
          {errorText}
        </div>
      </div>
    );
  }

  if (!items?.length) {
    if (!emptyText) return null;
    return (
      <div className="absolute top-full right-0 left-0 z-20 mt-1.5">
        <div className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-400 shadow-md">
          {emptyText}
        </div>
      </div>
    );
  }

  return (
    <ul className="absolute top-full right-0 left-0 z-20 mt-1.5 space-y-1.5">
      {items.map((item) => (
        <li key={item}>
          <button
            type="button"
            onMouseDown={(event) => {
              event.preventDefault();
              onPick(item);
            }}
            className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left text-sm text-gray-800 shadow-md transition hover:border-purple-300 hover:bg-purple-50 hover:text-purple-700"
          >
            {highlightMatch(item, highlightQuery)}
          </button>
        </li>
      ))}
    </ul>
  );
}

function ImportModal({ open, onClose, onImport }) {
  const [text, setText] = useState("");
  const [termSeparator, setTermSeparator] = useState("tab");
  const [cardSeparator, setCardSeparator] = useState("newline");

  const preview = useMemo(
    () => parseImportText(text, termSeparator, cardSeparator),
    [text, termSeparator, cardSeparator]
  );

  useEffect(() => {
    if (!open) {
      setText("");
      setTermSeparator("tab");
      setCardSeparator("newline");
    }
  }, [open]);

  if (!open) return null;

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
        <div>
          <h2 className="text-xl font-extrabold text-gray-900">Nhập thẻ ghi nhớ</h2>
          <p className="mt-0.5 text-sm text-gray-500">
            Dán danh sách từ theo định dạng đã chọn bên dưới
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100"
          aria-label="Đóng"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="grid min-h-0 flex-1 gap-6 overflow-hidden p-6 lg:grid-cols-2">
        <div className="flex min-h-0 flex-col">
          <label className="mb-2 text-sm font-semibold text-gray-700">
            Dán dữ liệu của bạn
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              event.preventDefault();
              event.stopPropagation();
              const el = event.currentTarget;
              const start = el.selectionStart ?? text.length;
              const end = el.selectionEnd ?? text.length;
              const next = `${text.slice(0, start)}\t${text.slice(end)}`;
              setText(next);
              const caret = start + 1;
              requestAnimationFrame(() => {
                el.focus();
                el.setSelectionRange(caret, caret);
              });
            }}
            placeholder={"Thuật ngữ 1\tĐịnh nghĩa 1\nThuật ngữ 2\tĐịnh nghĩa 2"}
            autoComplete="off"
            name="flashcard-import-text"
            className="min-h-[280px] flex-1 resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 font-mono text-sm text-gray-900 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
          />

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <fieldset>
              <legend className="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
                Giữa thuật ngữ và định nghĩa
              </legend>
              <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="termSeparator"
                  checked={termSeparator === "tab"}
                  onChange={() => setTermSeparator("tab")}
                />
                Tab
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="termSeparator"
                  checked={termSeparator === "comma"}
                  onChange={() => setTermSeparator("comma")}
                />
                Dấu phẩy
              </label>
            </fieldset>

            <fieldset>
              <legend className="mb-2 text-xs font-bold tracking-wide text-gray-500 uppercase">
                Giữa các thẻ
              </legend>
              <label className="mb-2 flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="cardSeparator"
                  checked={cardSeparator === "newline"}
                  onChange={() => setCardSeparator("newline")}
                />
                Dòng mới
              </label>
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="radio"
                  name="cardSeparator"
                  checked={cardSeparator === "semicolon"}
                  onChange={() => setCardSeparator("semicolon")}
                />
                Dấu chấm phẩy
              </label>
            </fieldset>
          </div>
        </div>

        <div className="flex min-h-0 flex-col">
          <p className="mb-2 text-sm font-semibold text-gray-700">
            Xem trước ({preview.length} thẻ)
          </p>
          <div className="min-h-0 flex-1 overflow-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-gray-50 text-xs font-bold tracking-wide text-gray-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Thuật ngữ</th>
                  <th className="px-4 py-3">Định nghĩa</th>
                </tr>
              </thead>
              <tbody>
                {preview.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-gray-400">
                      Chưa có dữ liệu để xem trước
                    </td>
                  </tr>
                ) : (
                  preview.map((card, index) => (
                    <tr key={`${card.term}-${index}`} className="border-t border-gray-100">
                      <td className="px-4 py-3 align-top font-medium text-gray-900">
                        {card.term || "—"}
                      </td>
                      <td className="px-4 py-3 align-top text-gray-700">
                        {card.definition || "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 border-t border-gray-200 px-6 py-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
        >
          Hủy nhập
        </button>
        <button
          type="button"
          disabled={preview.length === 0}
          onClick={() => onImport(preview)}
          className="rounded-xl bg-purple-600 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Nhập
        </button>
      </div>
    </div>
  );
}

function StudySetEditor({ mode = "create", studySetId = null, initialSet = null }) {
  const isEdit = mode === "edit";
  const navigate = useNavigate();
  const [title, setTitle] = useState(initialSet?.title || "");
  const [description, setDescription] = useState(initialSet?.description || "");
  const [termLang, setTermLang] = useState(initialSet?.termLang || "auto");
  const [defLang, setDefLang] = useState(
    () => initialSet?.defLang || resolveBrowserLanguage("vi")
  );
  const [cards, setCards] = useState(() =>
    isEdit ? cardsFromSet(initialSet) : [createEmptyCard(), createEmptyCard()]
  );
  const [loading, setLoading] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [activeSuggest, setActiveSuggest] = useState(null);
  const [termSuggestions, setTermSuggestions] = useState([]);
  const [defSuggestions, setDefSuggestions] = useState([]);
  const [termSuggestLoading, setTermSuggestLoading] = useState(false);
  const [defSuggestLoading, setDefSuggestLoading] = useState(false);
  const [termSuggestError, setTermSuggestError] = useState("");
  const [defSuggestError, setDefSuggestError] = useState("");
  const termDebounceRef = useRef(null);
  const defDebounceRef = useRef(null);
  const termRequestIdRef = useRef(0);
  const defRequestIdRef = useRef(0);
  const termLangRef = useRef(termLang);
  const defLangRef = useRef(defLang);
  const dragIndexRef = useRef(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [imagePicker, setImagePicker] = useState(null); // { index, field }

  useEffect(() => {
    termLangRef.current = termLang;
  }, [termLang]);

  useEffect(() => {
    defLangRef.current = defLang;
  }, [defLang]);

  useEffect(() => {
    return () => {
      if (termDebounceRef.current) clearTimeout(termDebounceRef.current);
      if (defDebounceRef.current) clearTimeout(defDebounceRef.current);
      termRequestIdRef.current += 1;
      defRequestIdRef.current += 1;
      setTermSuggestLoading(false);
      setDefSuggestLoading(false);
    };
  }, []);

  const handleCardChange = (index, field, value) => {
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, [field]: value } : card))
    );
  };

  const addCard = () => {
    setCards((prev) => [...prev, createEmptyCard(true)]);
  };

  const removeCard = (index) => {
    const visibleCount = cards.filter((card) => !card.exiting).length;
    if (visibleCount <= 1) return;
    const target = cards[index];
    if (!target || target.exiting) return;

    setImagePicker((prev) => (prev?.index === index ? null : prev));
    setActiveSuggest((prev) => (prev?.index === index ? null : prev));
    setCards((prev) =>
      prev.map((card, i) => (i === index ? { ...card, exiting: true } : card))
    );
  };

  const finishRemove = (localId) => {
    setCards((prev) => {
      const next = prev.filter((card) => card.localId !== localId);
      return next.length > 0 ? next : [createEmptyCard()];
    });
  };

  const openImagePicker = (index, field) => {
    setImagePicker((prev) =>
      prev?.index === index && prev?.field === field ? null : { index, field }
    );
  };

  const applyPickedImage = async (fileOrUrl) => {
    if (!imagePicker) return;
    const { index, field } = imagePicker;

    if (typeof fileOrUrl === "string") {
      const url = normalizeImageSrc(fileOrUrl);
      if (!url) {
        toast.error("URL ảnh không hợp lệ.");
        return;
      }
      handleCardChange(index, field, url);
      setImagePicker(null);
      return;
    }

    try {
      const objectUrl = createImageObjectUrl(fileOrUrl);
      handleCardChange(index, field, objectUrl);
      setImagePicker(null);
    } catch (error) {
      toast.error(error.message || "Không tải được ảnh.");
    }
  };

  const handleImport = (importedCards) => {
    const mapped = importedCards.map((card) => ({
      ...createEmptyCard(),
      term: card.term,
      definition: card.definition,
    }));

    setCards((prev) => {
      const kept = prev.filter(
        (card) =>
          card.term.trim() || card.definition.trim() || card.image || card.termImage
      );
      const next = [...kept, ...mapped];
      return next.length > 0 ? next : [createEmptyCard()];
    });
    setImportOpen(false);
    toast.success(`Đã nhập ${mapped.length} thẻ`);
  };

  const insertCardAt = (index) => {
    setCards((prev) => {
      const next = [...prev];
      next.splice(index, 0, createEmptyCard(true));
      return next;
    });
  };

  const handleCardAnimationEnd = (card) => {
    if (card.exiting) {
      finishRemove(card.localId);
      return;
    }
    if (card.entering) {
      setCards((prev) =>
        prev.map((item) =>
          item.localId === card.localId && item.entering
            ? { ...item, entering: false }
            : item
        )
      );
    }
  };

  const clearSuggestions = () => {
    if (termDebounceRef.current) clearTimeout(termDebounceRef.current);
    if (defDebounceRef.current) clearTimeout(defDebounceRef.current);
    termRequestIdRef.current += 1;
    defRequestIdRef.current += 1;
    setTermSuggestions([]);
    setDefSuggestions([]);
    setTermSuggestError("");
    setDefSuggestError("");
    setTermSuggestLoading(false);
    setDefSuggestLoading(false);
  };

  const moveCard = (fromIndex, toIndex) => {
    if (fromIndex === toIndex || fromIndex < 0 || toIndex < 0) return;
    setCards((prev) => {
      if (fromIndex >= prev.length || toIndex >= prev.length) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const fetchTermSuggestions = (index, query) => {
    if (termDebounceRef.current) clearTimeout(termDebounceRef.current);

    const q = String(query || "").trim();
    if (q.length < 1) {
      termRequestIdRef.current += 1;
      setTermSuggestions([]);
      setTermSuggestError("");
      setTermSuggestLoading(false);
      return;
    }

    setActiveSuggest({ index, field: "term" });
    setTermSuggestLoading(true);
    setTermSuggestError("");

    termDebounceRef.current = setTimeout(async () => {
      const requestId = ++termRequestIdRef.current;
      const lang = termLangRef.current || "auto";
      try {
        const { data } = await api.post(
          "/ai/suggest-term",
          { query: q, lang },
          { timeout: 20000 }
        );
        if (requestId !== termRequestIdRef.current) return;
        const suggestions = normalizeSuggestions(data);
        setTermSuggestions(suggestions);
        if (!suggestions.length) {
          setTermSuggestError(data?.message || "Không tìm thấy gợi ý thuật ngữ.");
        }
      } catch (err) {
        if (requestId !== termRequestIdRef.current) return;
        setTermSuggestions([]);
        const message = getApiErrorMessage(err);
        setTermSuggestError(message);
        console.error("[suggest-term]", message, err);
      } finally {
        if (requestId === termRequestIdRef.current) {
          setTermSuggestLoading(false);
        }
      }
    }, 280);
  };

  const fetchDefSuggestions = (index, termValue) => {
    if (defDebounceRef.current) clearTimeout(defDebounceRef.current);

    const term = String(termValue ?? cards[index]?.term ?? "").trim();
    const targetLang = defLangRef.current || resolveBrowserLanguage("vi");

    setActiveSuggest({ index, field: "definition" });
    setDefSuggestError("");

    if (!term) {
      defRequestIdRef.current += 1;
      setDefSuggestions([]);
      setDefSuggestLoading(false);
      return;
    }

    if (!targetLang) {
      defRequestIdRef.current += 1;
      setDefSuggestions([]);
      setDefSuggestLoading(false);
      return;
    }

    setDefSuggestLoading(true);
    setDefSuggestions([]);

    defDebounceRef.current = setTimeout(async () => {
      const requestId = ++defRequestIdRef.current;
      const sourceLang = termLangRef.current || "auto";
      try {
        const { data } = await api.post(
          "/ai/suggest-def",
          { term, lang: targetLang, sourceLang },
          { timeout: 25000 }
        );
        if (requestId !== defRequestIdRef.current) return;
        const suggestions = normalizeSuggestions(data);
        setDefSuggestions(suggestions);
        if (!suggestions.length) {
          setDefSuggestError(
            data?.message || "Không tìm thấy gợi ý cho từ này. Thử lại hoặc nhập thủ công."
          );
        }
      } catch (err) {
        if (requestId !== defRequestIdRef.current) return;
        setDefSuggestions([]);
        const message = getApiErrorMessage(err);
        setDefSuggestError(message);
        console.error("[suggest-def]", message, err);
      } finally {
        if (requestId === defRequestIdRef.current) {
          setDefSuggestLoading(false);
        }
      }
    }, 200);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const payloadCards = await Promise.all(
        cards
          .filter((card) => !card.exiting)
          .map(async ({ id, term, definition, image, termImage }) => ({
            id: isEdit && id ? id : undefined,
            term,
            definition,
            image: (await resolveImageForSave(image)) || null,
            termImage: (await resolveImageForSave(termImage)) || null,
          }))
      );

      if (isEdit) {
        if (!studySetId) {
          throw new Error("Thiếu mã học phần để cập nhật.");
        }
        await api.put(`/studysets/${studySetId}`, {
          title,
          description,
          termLang,
          defLang,
          cards: payloadCards,
        });
        toast.success("Đã lưu thay đổi học phần!");
        navigate(`/set/${studySetId}`);
        return;
      }

      const { data } = await api.post("/studysets", {
        title,
        description,
        termLang,
        defLang,
        cards: payloadCards,
      });
      toast.success("Tạo học phần thành công!");
      const createdId = data?.studySet?.id;
      navigate(createdId ? `/set/${createdId}` : "/flashcards");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative z-0 min-h-[calc(100vh-4rem)] bg-gray-50 px-8 py-8">
      {importOpen ? (
        <div className="mx-auto max-w-5xl">
          <ImportModal
            open
            onClose={() => setImportOpen(false)}
            onImport={handleImport}
          />
        </div>
      ) : (
      <form
        onSubmit={handleSubmit}
        autoComplete="off"
        className="mx-auto max-w-4xl"
      >
        <div className="mb-6 flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-gray-900">
              {isEdit ? "Chỉnh sửa học phần" : "Tạo học phần mới"}
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {isEdit
                ? "Cập nhật tiêu đề, mô tả và danh sách thẻ của bạn"
                : "Thêm tiêu đề và các thẻ thuật ngữ cho học phần của bạn"}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-white px-5 py-3 text-sm font-bold text-purple-700 shadow-sm transition hover:bg-purple-50"
            >
              <Import className="h-4 w-4" />
              Nhập
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold tracking-wide text-white uppercase shadow-md transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading
                ? isEdit
                  ? "Đang lưu..."
                  : "Đang tạo..."
                : isEdit
                  ? "LƯU THAY ĐỔI"
                  : "TẠO HỌC PHẦN"}
            </button>
          </div>
        </div>

        <section className="mb-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <input
            type="text"
            name="flashcard-set-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nhập tiêu đề học phần..."
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            className="w-full border-0 border-b-2 border-gray-200 bg-transparent pb-3 text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-400 focus:border-purple-600"
            required
          />
          <textarea
            name="flashcard-set-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Thêm mô tả (không bắt buộc)..."
            rows={2}
            autoComplete="off"
            className="mt-4 w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 outline-none focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
          />
        </section>

        <LanguagePairBar
          termLang={termLang}
          defLang={defLang}
          onTermLangChange={setTermLang}
          onDefLangChange={setDefLang}
        />

        <section className="space-y-3">
          {cards.map((card, index) => (
            <div
              key={card.localId}
              className={`relative ${
                card.exiting
                  ? "flashcard-row-exit"
                  : card.entering
                    ? "flashcard-row-enter"
                    : ""
              }`}
              onAnimationEnd={() => handleCardAnimationEnd(card)}
            >
              {index > 0 && !card.exiting ? (
                <div className="group/insert pointer-events-none absolute -top-5 right-0 left-0 z-20 flex h-10 items-center justify-center">
                  <div className="absolute inset-x-8 top-1/2 h-px -translate-y-1/2 bg-transparent transition group-hover/insert:bg-purple-200" />
                  <button
                    type="button"
                    onClick={() => insertCardAt(index)}
                    title="Thêm thẻ"
                    aria-label="Thêm thẻ ở giữa"
                    className="pointer-events-auto relative flex h-8 w-8 items-center justify-center rounded-full bg-purple-600 text-white opacity-0 shadow-md transition group-hover/insert:scale-100 group-hover/insert:opacity-100 hover:bg-purple-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              ) : null}

              <article
                onDragOver={(event) => {
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  if (dragOverIndex !== index) setDragOverIndex(index);
                }}
                onDrop={(event) => {
                  event.preventDefault();
                  const from = Number(
                    event.dataTransfer.getData("text/plain") || dragIndexRef.current
                  );
                  if (!Number.isInteger(from)) return;
                  moveCard(from, index);
                  dragIndexRef.current = null;
                  setDragOverIndex(null);
                }}
                className={`relative z-0 overflow-visible rounded-2xl border bg-white p-5 shadow-sm transition ${
                  dragOverIndex === index && dragIndexRef.current !== index
                    ? "border-purple-400 ring-2 ring-purple-200"
                    : "border-gray-200"
                }`}
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-sm font-bold text-gray-500">{index + 1}</span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      draggable
                      data-cursor="grab"
                      onDragStart={(event) => {
                        dragIndexRef.current = index;
                        setDragOverIndex(index);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(index));
                        const article = event.currentTarget.closest("article");
                        if (article) {
                          const rect = article.getBoundingClientRect();
                          event.dataTransfer.setDragImage(
                            article,
                            event.clientX - rect.left,
                            event.clientY - rect.top
                          );
                        }
                        event.currentTarget.classList.add("is-grabbing");
                      }}
                      onDragEnd={(event) => {
                        event.currentTarget.classList.remove("is-grabbing");
                        dragIndexRef.current = null;
                        setDragOverIndex(null);
                      }}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
                      aria-label="Kéo để sắp xếp thẻ"
                      title="Kéo để sắp xếp"
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeCard(index)}
                      disabled={cards.filter((item) => !item.exiting).length <= 1}
                      className="rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Xóa thẻ"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="relative">
                    <div className="flex items-start gap-3">
                      <CardImageField
                        image={card.termImage}
                        onChange={(value) => handleCardChange(index, "termImage", value)}
                        onOpenPicker={() => openImagePicker(index, "termImage")}
                        active={
                          imagePicker?.index === index &&
                          imagePicker?.field === "termImage"
                        }
                      />
                      <div className="relative min-w-0 flex-1">
                        <input
                          type="text"
                          name={`flashcard-term-${card.localId}`}
                          value={card.term}
                          onChange={(e) => {
                            handleCardChange(index, "term", e.target.value);
                            fetchTermSuggestions(index, e.target.value);
                          }}
                          onFocus={() => {
                            setActiveSuggest({ index, field: "term" });
                            if (card.term.trim()) {
                              fetchTermSuggestions(index, card.term);
                            } else {
                              clearSuggestions();
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setActiveSuggest((prev) =>
                                prev?.index === index && prev?.field === "term"
                                  ? null
                                  : prev
                              );
                            }, 150);
                          }}
                          placeholder="Thuật ngữ"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
                          required
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-1p-ignore="true"
                        />
                        <p className="mt-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase">
                          Thuật ngữ
                        </p>
                        {activeSuggest?.index === index &&
                        activeSuggest?.field === "term" &&
                        card.term.trim() ? (
                          <SuggestionList
                            items={termSuggestions}
                            loading={termSuggestLoading}
                            errorText={termSuggestError}
                            highlightQuery={card.term}
                            onPick={(value) => {
                              handleCardChange(index, "term", value);
                              setTermSuggestions([]);
                              setTermSuggestError("");
                              setActiveSuggest(null);
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="relative">
                    <div className="flex items-start gap-3">
                      <div className="relative min-w-0 flex-1">
                        <input
                          type="text"
                          name={`flashcard-definition-${card.localId}`}
                          value={card.definition}
                          onChange={(e) =>
                            handleCardChange(index, "definition", e.target.value)
                          }
                          onFocus={() => {
                            setActiveSuggest({ index, field: "definition" });
                            if (card.term.trim()) {
                              fetchDefSuggestions(index, card.term);
                            } else {
                              clearSuggestions();
                            }
                          }}
                          onBlur={() => {
                            setTimeout(() => {
                              setActiveSuggest((prev) =>
                                prev?.index === index && prev?.field === "definition"
                                  ? null
                                  : prev
                              );
                            }, 150);
                          }}
                          placeholder="Định nghĩa"
                          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
                          required
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck={false}
                          data-lpignore="true"
                          data-1p-ignore="true"
                        />
                        <p className="mt-1.5 text-xs font-medium tracking-wide text-gray-400 uppercase">
                          Định nghĩa
                        </p>
                        {activeSuggest?.index === index &&
                        activeSuggest?.field === "definition" &&
                        card.term.trim() ? (
                          <SuggestionList
                            items={defSuggestions}
                            loading={defSuggestLoading}
                            errorText={defSuggestError}
                            onPick={(value) => {
                              handleCardChange(index, "definition", value);
                              setDefSuggestions([]);
                              setDefSuggestError("");
                              setActiveSuggest(null);
                            }}
                            emptyText={
                              !card.term.trim()
                                ? "Nhập thuật ngữ trước để nhận gợi ý nghĩa"
                                : !defLang
                                  ? "Hãy chọn ngôn ngữ Định nghĩa ở thanh phía trên"
                                  : undefined
                            }
                          />
                        ) : null}
                      </div>
                      <CardImageField
                        image={card.image}
                        onChange={(value) => handleCardChange(index, "image", value)}
                        onOpenPicker={() => openImagePicker(index, "image")}
                        active={
                          imagePicker?.index === index && imagePicker?.field === "image"
                        }
                      />
                    </div>
                  </div>
                </div>

                {imagePicker?.index === index ? (
                  <ImageSuggestPanel
                    initialQuery={
                      imagePicker.field === "termImage"
                        ? card.term
                        : card.term || card.definition
                    }
                    onSelect={(url) => applyPickedImage(url)}
                    onUploadFile={(file) => applyPickedImage(file)}
                    onClose={() => setImagePicker(null)}
                  />
                ) : null}
              </article>
            </div>
          ))}
        </section>

        <div className="mt-6 flex flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={addCard}
            className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-purple-300 bg-white px-5 py-3 text-sm font-bold text-purple-700 transition hover:border-purple-500 hover:bg-purple-50"
          >
            <Plus className="h-4 w-4" />
            Thêm thẻ
          </button>

          <button
            type="submit"
            disabled={loading}
            className="rounded-xl bg-purple-600 px-8 py-4 text-base font-bold tracking-wide text-white uppercase shadow-lg transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading
              ? isEdit
                ? "Đang lưu..."
                : "Đang tạo..."
              : isEdit
                ? "LƯU THAY ĐỔI"
                : "Tạo học phần"}
          </button>
        </div>
      </form>
      )}
    </div>
  );
}

export default StudySetEditor;
