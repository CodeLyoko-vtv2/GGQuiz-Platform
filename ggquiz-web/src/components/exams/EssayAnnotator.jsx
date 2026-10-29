import { useEffect, useRef, useState } from "react";
import { MessageSquarePlus, X } from "lucide-react";

function renderParts(text, comments) {
  const marks = [...(comments || [])]
    .filter((item) => Number(item.end) > Number(item.start))
    .sort((a, b) => a.start - b.start);
  const parts = [];
  let cursor = 0;
  marks.forEach((item) => {
    const start = Math.max(cursor, Math.min(text.length, item.start));
    const end = Math.min(text.length, Math.max(start, item.end));
    if (start > cursor) parts.push({ key: `t-${cursor}`, text: text.slice(cursor, start) });
    if (end > start) {
      parts.push({
        key: item.id,
        text: text.slice(start, end),
        comment: item,
      });
    }
    cursor = Math.max(cursor, end);
  });
  if (cursor < text.length) parts.push({ key: `t-${cursor}`, text: text.slice(cursor) });
  return parts;
}

function EssayAnnotator({
  text,
  comments = [],
  onAdd,
  onRemove,
  readOnly = false,
}) {
  const containerRef = useRef(null);
  const [draft, setDraft] = useState(null);
  const [note, setNote] = useState("");
  const [openForm, setOpenForm] = useState(false);

  useEffect(() => {
    if (readOnly) return undefined;
    const onMouseUp = () => {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !containerRef.current) {
        return;
      }
      if (!containerRef.current.contains(selection.anchorNode)) return;
      const range = selection.getRangeAt(0);
      const pre = range.cloneRange();
      pre.selectNodeContents(containerRef.current);
      pre.setEnd(range.startContainer, range.startOffset);
      const start = pre.toString().length;
      const quote = selection.toString();
      const end = start + quote.length;
      if (!quote.trim()) return;
      const rect = range.getBoundingClientRect();
      const box = containerRef.current.getBoundingClientRect();
      setDraft({
        start,
        end,
        quote,
        top: rect.top - box.top + containerRef.current.scrollTop - 8,
        left: Math.min(box.width - 180, Math.max(8, rect.left - box.left)),
      });
      setNote("");
      setOpenForm(false);
    };
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [readOnly]);

  const parts = renderParts(text || "", comments);

  return (
    <div className="relative">
      <div
        ref={containerRef}
        className="min-h-[240px] rounded-2xl border border-slate-200 bg-white px-5 py-4 text-[15px] leading-7 whitespace-pre-wrap text-slate-800 select-text"
      >
        {(text || "").trim() ? (
          parts.map((part) =>
            part.comment ? (
              <mark
                key={part.key}
                title={part.comment.text}
                className="rounded bg-amber-200/80 px-0.5 text-slate-900 decoration-clone"
              >
                {part.text}
              </mark>
            ) : (
              <span key={part.key}>{part.text}</span>
            )
          )
        ) : (
          <span className="text-slate-400">Thí sinh chưa viết nội dung.</span>
        )}
      </div>

      {draft && !readOnly ? (
        <div
          className="absolute z-20 rounded-xl border border-slate-200 bg-white p-2 shadow-xl"
          style={{ top: draft.top, left: draft.left }}
        >
          {openForm ? (
            <div className="w-72 p-1">
              <p className="mb-2 line-clamp-2 text-xs text-slate-500">“{draft.quote}”</p>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Gõ lỗi sai / nhận xét cho đoạn này..."
                className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
              />
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setDraft(null)}
                  className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-100"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!note.trim()) return;
                    onAdd?.({
                      id: `c-${Date.now()}`,
                      start: draft.start,
                      end: draft.end,
                      quote: draft.quote,
                      text: note.trim(),
                    });
                    setDraft(null);
                    setNote("");
                    setOpenForm(false);
                    window.getSelection()?.removeAllRanges();
                  }}
                  className="rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
                >
                  Lưu nhận xét
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setOpenForm(true)}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
            >
              <MessageSquarePlus className="h-3.5 w-3.5" />
              Thêm nhận xét
            </button>
          )}
        </div>
      ) : null}

      {comments.length ? (
        <div className="mt-3 space-y-2">
          {comments.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2.5"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-xs font-semibold text-amber-800">“{item.quote}”</p>
                {readOnly ? null : (
                  <button
                    type="button"
                    onClick={() => onRemove?.(item.id)}
                    className="rounded p-1 text-amber-700 hover:bg-amber-100"
                    aria-label="Xóa nhận xét"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-700">{item.text}</p>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export default EssayAnnotator;
