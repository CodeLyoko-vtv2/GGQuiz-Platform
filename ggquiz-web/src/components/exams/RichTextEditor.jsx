import { useEffect, useRef } from "react";
import { Bold, Italic, Underline } from "lucide-react";

function RichTextEditor({
  value,
  onChange,
  placeholder = "Nhập nội dung...",
  minHeight = "140px",
  className = "",
  readOnly = false,
}) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerHTML !== (value || "")) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const run = (command) => {
    if (readOnly) return;
    ref.current?.focus();
    document.execCommand(command, false, null);
    onChange?.(ref.current?.innerHTML || "");
  };

  return (
    <div className={`overflow-hidden rounded-xl border border-gray-200 bg-white ${className}`}>
      {readOnly ? null : (
      <div className="flex items-center gap-1 border-b border-gray-100 bg-gray-50 px-2 py-1.5">
        {[
          { cmd: "bold", icon: Bold, label: "In đậm" },
          { cmd: "italic", icon: Italic, label: "In nghiêng" },
          { cmd: "underline", icon: Underline, label: "Gạch chân" },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.cmd}
              type="button"
              title={item.label}
              onMouseDown={(event) => {
                event.preventDefault();
                run(item.cmd);
              }}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-600 transition hover:bg-white hover:text-purple-700"
            >
              <Icon className="h-4 w-4" />
            </button>
          );
        })}
      </div>
      )}
      <div
        ref={ref}
        contentEditable={!readOnly}
        role="textbox"
        aria-readonly={readOnly}
        aria-label={placeholder}
        data-placeholder={placeholder}
        onInput={() => {
          if (readOnly) return;
          onChange?.(ref.current?.innerHTML || "");
        }}
        className="exam-rich-text min-h-[140px] px-4 py-3 text-sm leading-relaxed text-gray-900 outline-none empty:before:pointer-events-none empty:before:text-gray-400 empty:before:content-[attr(data-placeholder)]"
        style={{ minHeight }}
      />
    </div>
  );
}

export default RichTextEditor;
