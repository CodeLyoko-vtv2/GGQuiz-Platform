import { useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  Code2,
  Heading1,
  Heading2,
  Heading3,
  ImagePlus,
  Languages,
  Layers3,
  List,
  ListOrdered,
  Quote,
  Table2,
  Type,
  Video,
  Volume2,
  Zap,
} from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";
import { createBlock, filterSlashItems, youtubeId } from "../../utils/lessonBlocks";
import DictEmbed from "./DictEmbed";
import ExamEmbed from "./ExamEmbed";
import FlashcardEmbed from "./FlashcardEmbed";

const TEXT_TYPES = new Set([
  "paragraph",
  "heading1",
  "heading2",
  "heading3",
  "callout",
  "quote",
  "code",
]);

const SLASH_ICONS = {
  heading1: Heading1,
  heading2: Heading2,
  heading3: Heading3,
  paragraph: Type,
  bullet: List,
  numbered: ListOrdered,
  table: Table2,
  image: ImagePlus,
  video: Video,
  audio: Volume2,
  callout: Zap,
  quote: Quote,
  code: Code2,
  flashcard: Layers3,
  exam: BookOpen,
  dict: Languages,
};

function EmbedPicker({ kind, onPick, onClose }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const url = kind === "flashcard" ? "/studysets/me" : "/folders/exams/me";
        const { data } = await api.get(url);
        if (cancelled) return;
        setItems(kind === "flashcard" ? data.studySets || [] : data.exams || []);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [kind]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/40 px-4" onClick={onClose}>
      <div
        className="max-h-[70vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-sm font-extrabold text-slate-900">
          {kind === "flashcard" ? "Chọn bộ thẻ ghi nhớ" : "Chọn đề thi"}
        </p>
        {loading ? (
          <p className="mt-4 text-sm text-slate-400">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Chưa có nội dung để nhúng.</p>
        ) : (
          <div className="mt-3 space-y-1">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onPick(item)}
                className="block w-full rounded-xl px-3 py-2.5 text-left hover:bg-indigo-50"
              >
                <p className="text-sm font-bold text-slate-800">{item.title}</p>
                <p className="text-xs text-slate-400">{item.grade || item.description || ""}</p>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function BlockView({
  block,
  selected,
  onChange,
  onFocus,
  onKeyDown,
  onSelectText,
  inputRef,
  readOnly,
}) {
  const common =
    "w-full bg-transparent outline-none placeholder:text-slate-300";

  if (block.type === "heading1") {
    return (
      <input
        ref={inputRef}
        value={block.text}
        readOnly={readOnly}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onSelect={onSelectText}
        placeholder="Tiêu đề"
        className={`${common} text-3xl font-black text-slate-900`}
      />
    );
  }
  if (block.type === "heading2") {
    return (
      <input
        ref={inputRef}
        value={block.text}
        readOnly={readOnly}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onSelect={onSelectText}
        placeholder="Tiêu đề 2"
        className={`${common} text-2xl font-extrabold text-slate-800`}
      />
    );
  }
  if (block.type === "heading3") {
    return (
      <input
        ref={inputRef}
        value={block.text}
        readOnly={readOnly}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onSelect={onSelectText}
        placeholder="Tiêu đề 3"
        className={`${common} text-xl font-bold text-slate-800`}
      />
    );
  }
  if (block.type === "quote") {
    return (
      <textarea
        ref={inputRef}
        value={block.text}
        readOnly={readOnly}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onSelect={onSelectText}
        rows={2}
        placeholder="Trích dẫn..."
        className={`${common} resize-none border-l-4 border-slate-300 pl-4 text-lg italic text-slate-600`}
      />
    );
  }
  if (block.type === "code") {
    return (
      <textarea
        ref={inputRef}
        value={block.text}
        readOnly={readOnly}
        onChange={(e) => onChange({ ...block, text: e.target.value })}
        onFocus={onFocus}
        onKeyDown={onKeyDown}
        onSelect={onSelectText}
        rows={4}
        spellCheck={false}
        placeholder="// code"
        className="w-full resize-y rounded-xl bg-slate-900 px-4 py-3 font-mono text-sm text-emerald-200 outline-none"
      />
    );
  }
  if (block.type === "callout") {
    return (
      <div className="flex gap-3 rounded-2xl bg-amber-50 px-4 py-3">
        <span className="text-xl">{block.data?.emoji || "💡"}</span>
        <textarea
          ref={inputRef}
          value={block.text}
          readOnly={readOnly}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          onFocus={onFocus}
          onKeyDown={onKeyDown}
          onSelect={onSelectText}
          rows={2}
          placeholder="Ghi chú quan trọng..."
          className={`${common} resize-none text-sm font-medium text-amber-950`}
        />
      </div>
    );
  }
  if (block.type === "bullet" || block.type === "numbered") {
    const items = block.items?.length ? block.items : [""];
    return (
      <div className="space-y-1.5">
        {items.map((item, index) => (
          <div key={`${block.id}-${index}`} className="flex items-start gap-2">
            <span className="mt-2 w-5 text-sm font-bold text-slate-400">
              {block.type === "numbered" ? `${index + 1}.` : "•"}
            </span>
            <input
              value={item}
              readOnly={readOnly}
              onChange={(e) => {
                const next = [...items];
                next[index] = e.target.value;
                onChange({ ...block, items: next });
              }}
              onFocus={onFocus}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  const next = [...items];
                  next.splice(index + 1, 0, "");
                  onChange({ ...block, items: next });
                }
                if (e.key === "Backspace" && !item && items.length > 1) {
                  e.preventDefault();
                  onChange({ ...block, items: items.filter((_, i) => i !== index) });
                }
              }}
              className={`${common} text-base text-slate-800`}
              placeholder="Mục danh sách"
            />
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "table") {
    const rows = block.rows?.length ? block.rows : [["", ""], ["", ""]];
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse overflow-hidden rounded-xl border border-slate-200">
          <tbody>
            {rows.map((row, r) => (
              <tr key={`${block.id}-r${r}`}>
                {row.map((cell, c) => (
                  <td key={`${block.id}-${r}-${c}`} className="border border-slate-200 p-0">
                    <input
                      value={cell}
                      readOnly={readOnly}
                      onChange={(e) => {
                        const next = rows.map((line) => [...line]);
                        next[r][c] = e.target.value;
                        onChange({ ...block, rows: next });
                      }}
                      onFocus={onFocus}
                      className="w-full px-3 py-2 text-sm outline-none"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }
  if (block.type === "image") {
    return (
      <div>
        {block.data?.src ? (
          <img src={block.data.src} alt="" className="max-h-80 rounded-2xl object-contain" />
        ) : readOnly ? (
          <p className="text-sm text-slate-400">Chưa có ảnh.</p>
        ) : (
          <label
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const file = e.dataTransfer.files?.[0];
              if (!file || !file.type.startsWith("image/")) return;
              const reader = new FileReader();
              reader.onload = () =>
                onChange({ ...block, data: { src: String(reader.result), name: file.name } });
              reader.readAsDataURL(file);
            }}
            className="flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 px-4 py-10 text-sm text-slate-500 hover:bg-slate-50"
          >
            <ImagePlus className="mb-2 h-6 w-6" />
            Kéo thả hoặc bấm để tải ảnh
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () =>
                  onChange({ ...block, data: { src: String(reader.result), name: file.name } });
                reader.readAsDataURL(file);
              }}
            />
          </label>
        )}
      </div>
    );
  }
  if (block.type === "video") {
    const id = youtubeId(block.data?.url);
    return (
      <div>
        {!readOnly ? (
          <input
            value={block.data?.url || ""}
            onChange={(e) => onChange({ ...block, data: { url: e.target.value } })}
            onFocus={onFocus}
            placeholder="Dán link YouTube..."
            className="mb-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none"
          />
        ) : null}
        {id ? (
          <div className="aspect-video overflow-hidden rounded-2xl bg-black">
            <iframe
              title="YouTube"
              src={`https://www.youtube.com/embed/${id}`}
              className="h-full w-full"
              allowFullScreen
            />
          </div>
        ) : null}
      </div>
    );
  }
  if (block.type === "audio") {
    return (
      <div>
        {block.data?.src ? (
          <audio controls src={block.data.src} className="w-full" />
        ) : readOnly ? null : (
          <input
            type="file"
            accept="audio/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => onChange({ ...block, data: { src: String(reader.result) } });
              reader.readAsDataURL(file);
            }}
          />
        )}
      </div>
    );
  }
  if (block.type === "flashcard") {
    return <FlashcardEmbed setId={block.data?.setId} title={block.data?.title} />;
  }
  if (block.type === "exam") {
    return <ExamEmbed examId={block.data?.examId} title={block.data?.title} />;
  }
  if (block.type === "dict") {
    return <DictEmbed />;
  }
  if (block.type === "quiz") {
    const questions = block.data?.questions || [];
    return (
      <div className="space-y-3 rounded-2xl border border-indigo-100 bg-white p-4">
        <p className="text-xs font-bold text-indigo-600 uppercase">Câu hỏi do AI tạo</p>
        {questions.map((q, i) => (
          <div key={`${block.id}-q${i}`} className="text-sm">
            <p className="font-semibold text-slate-800">
              {i + 1}. {q.prompt}
            </p>
            <ul className="mt-1 space-y-0.5 text-slate-600">
              {(q.options || []).map((opt, oi) => (
                <li key={opt} className={oi === q.correct ? "font-bold text-emerald-700" : ""}>
                  {String.fromCharCode(65 + oi)}. {String(opt).replace(/^[A-D][.)]\s*/i, "")}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }
  if (block.type === "vocab") {
    const rows = block.data?.rows || [];
    return (
      <div className="overflow-x-auto rounded-2xl border border-slate-200">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs font-bold text-slate-500 uppercase">
            <tr>
              <th className="px-3 py-2">Word</th>
              <th className="px-3 py-2">Meaning</th>
              <th className="px-3 py-2">Example</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={`${block.id}-v${i}`} className="border-t border-slate-100">
                <td className="px-3 py-2 font-bold">{row.word}</td>
                <td className="px-3 py-2">{row.meaning}</td>
                <td className="px-3 py-2 italic text-slate-500">{row.example}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <textarea
      ref={inputRef}
      value={block.text}
      readOnly={readOnly}
      onChange={(e) => onChange({ ...block, text: e.target.value })}
      onFocus={onFocus}
      onKeyDown={onKeyDown}
      rows={2}
      placeholder={selected ? "Gõ / để chèn khối..." : ""}
      onSelect={onSelectText}
      className={`${common} resize-none text-base leading-7 text-slate-800`}
    />
  );
}

function BlockEditor({ blocks, onChange, readOnly = false }) {
  const [focusId, setFocusId] = useState(null);
  const [slash, setSlash] = useState(null);
  const [picker, setPicker] = useState(null);
  const [aiBar, setAiBar] = useState(null);
  const [aiBusy, setAiBusy] = useState("");
  const inputRefs = useRef({});

  const slashItems = useMemo(() => filterSlashItems(slash?.query || ""), [slash]);

  const updateAt = (index, next) => {
    onChange(blocks.map((item, i) => (i === index ? next : item)));
  };

  const insertAfter = (index, block) => {
    const next = [...blocks];
    next.splice(index + 1, 0, block);
    onChange(next);
    setFocusId(block.id);
  };

  const applySlash = (index, type) => {
    setSlash(null);
    if (type === "flashcard" || type === "exam") {
      setPicker({ kind: type, index });
      return;
    }
    const next = createBlock(type, type === "table" ? { rows: [["", ""], ["", ""]] } : {});
    if (type === "dict") {
      updateAt(index, { ...blocks[index], ...next, id: blocks[index].id, type: "dict" });
      return;
    }
    const current = blocks[index];
    if (TEXT_TYPES.has(current.type) && String(current.text || "").startsWith("/")) {
      updateAt(index, { ...current, ...next, id: current.id, type, text: "" });
    } else {
      insertAfter(index, next);
    }
  };

  const runAi = async (action) => {
    if (!aiBar?.text) return;
    setAiBusy(action);
    try {
      const { data } = await api.post("/lesson-plans/transform", {
        action,
        text: aiBar.text,
      });
      const index = blocks.findIndex((item) => item.id === aiBar.blockId);
      insertAfter(index < 0 ? blocks.length - 1 : index, data.block);
      toast.success("AI đã chèn khối mới bên dưới.");
      setAiBar(null);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setAiBusy("");
    }
  };

  return (
    <div
      className="mx-auto max-w-3xl space-y-2 pb-24"
      onMouseUp={() => {
        if (readOnly) return;
        const active = document.activeElement;
        let text = "";
        let rect = null;
        if (
          active &&
          (active.tagName === "TEXTAREA" || active.tagName === "INPUT") &&
          typeof active.selectionStart === "number" &&
          active.selectionEnd > active.selectionStart
        ) {
          text = String(active.value || "").slice(active.selectionStart, active.selectionEnd).trim();
          rect = active.getBoundingClientRect();
        } else {
          const selection = window.getSelection();
          text = selection?.toString().trim() || "";
          if (text && selection.rangeCount) rect = selection.getRangeAt(0).getBoundingClientRect();
        }
        if (!text || text.length < 6 || !rect) {
          setAiBar(null);
          return;
        }
        setAiBar({
          text,
          blockId: focusId,
          top: rect.top + window.scrollY - 48,
          left: rect.left + window.scrollX,
        });
      }}
    >
      {blocks.map((block, index) => (
        <div
          key={block.id}
          className={`group relative rounded-xl px-2 py-1 ${
            focusId === block.id ? "bg-slate-50" : ""
          }`}
        >
          <BlockView
            block={block}
            selected={focusId === block.id}
            readOnly={readOnly}
            inputRef={(el) => {
              inputRefs.current[block.id] = el;
            }}
            onFocus={() => setFocusId(block.id)}
            onSelectText={(e) => {
              if (readOnly) return;
              const el = e.target;
              if (typeof el.selectionStart !== "number" || el.selectionEnd <= el.selectionStart) return;
              const text = String(el.value || "").slice(el.selectionStart, el.selectionEnd).trim();
              if (text.length < 6) return;
              const rect = el.getBoundingClientRect();
              setAiBar({
                text,
                blockId: block.id,
                top: rect.top + window.scrollY - 48,
                left: rect.left + window.scrollX,
              });
            }}
            onChange={(next) => {
              updateAt(index, next);
              if (TEXT_TYPES.has(next.type) && next.text.startsWith("/")) {
                setSlash({ index, query: next.text, top: 0 });
              } else if (slash?.index === index) {
                setSlash(null);
              }
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && TEXT_TYPES.has(block.type)) {
                e.preventDefault();
                const created = createBlock("paragraph");
                insertAfter(index, created);
              }
              if (e.key === "Backspace" && !block.text && blocks.length > 1 && TEXT_TYPES.has(block.type)) {
                e.preventDefault();
                onChange(blocks.filter((item) => item.id !== block.id));
              }
              if (e.key === "Escape") setSlash(null);
              if (e.key === "Enter" && slash && slashItems[0]) {
                e.preventDefault();
                applySlash(index, slashItems[0].id);
              }
            }}
          />
          {slash?.index === index && slashItems.length ? (
            <div className="absolute left-4 z-30 mt-1 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white py-2 shadow-xl">
              {["Cơ bản", "Đa phương tiện", "Định dạng", "Công cụ GGQuiz"].map((group) => {
                const items = slashItems.filter((item) => item.group === group);
                if (!items.length) return null;
                return (
                  <div key={group}>
                    <p className="px-3 pt-2 pb-1 text-[10px] font-bold tracking-wide text-slate-400 uppercase">
                      {group}
                    </p>
                    {items.map((item) => {
                      const Icon = SLASH_ICONS[item.id] || Type;
                      return (
                      <button
                        key={item.id}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          applySlash(index, item.id);
                        }}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-indigo-50"
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span>
                          <span className="block text-sm font-bold text-slate-800">{item.label}</span>
                          <span className="block text-[11px] text-slate-400">{item.hint}</span>
                        </span>
                      </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ) : null}
        </div>
      ))}

      {!readOnly ? (
        <button
          type="button"
          onClick={() => onChange([...blocks, createBlock("paragraph")])}
          className="text-sm font-semibold text-slate-400 hover:text-indigo-600"
        >
          + Thêm khối
        </button>
      ) : null}

      {picker ? (
        <EmbedPicker
          kind={picker.kind}
          onClose={() => setPicker(null)}
          onPick={(item) => {
            const type = picker.kind;
            const next = createBlock(type, {
              data:
                type === "flashcard"
                  ? { setId: item.id, title: item.title }
                  : { examId: item.id, title: item.title },
            });
            const current = blocks[picker.index];
            if (TEXT_TYPES.has(current?.type) && String(current?.text || "").startsWith("/")) {
              updateAt(picker.index, { ...current, ...next, id: current.id });
            } else {
              insertAfter(picker.index, next);
            }
            setPicker(null);
          }}
        />
      ) : null}

      {aiBar ? (
        <div
          className="fixed z-[60] flex items-center gap-1 rounded-full border border-slate-200 bg-white px-2 py-1.5 shadow-xl"
          style={{ top: Math.max(8, aiBar.top - window.scrollY), left: aiBar.left }}
        >
          <Zap className="h-4 w-4 text-amber-500" />
          {[
            { id: "questions", label: "Sinh câu hỏi" },
            { id: "vocab", label: "Trích từ vựng" },
            { id: "summarize", label: "Tóm tắt" },
            { id: "translate", label: "Dịch" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              disabled={Boolean(aiBusy)}
              onClick={() => runAi(item.id)}
              className="rounded-full px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 disabled:opacity-40"
            >
              {aiBusy === item.id ? "..." : item.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default BlockEditor;
