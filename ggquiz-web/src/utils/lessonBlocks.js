export const SUBJECTS = ["Tiếng Anh", "Ngữ văn", "Toán", "Khoa học", "Sử - Địa", "Khác"];
export const GRADES = ["Lớp 6", "Lớp 7", "Lớp 8", "Lớp 9", "Lớp 10", "Lớp 11", "Lớp 12", "Đại học"];

export function createBlock(type, extra = {}) {
  return {
    id: `b-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    type,
    text: "",
    items: [],
    data: {},
    ...extra,
  };
}

export function emptyLesson(title = "Giáo án mới") {
  return [
    createBlock("heading1", { text: title }),
    createBlock("paragraph", { text: "Gõ / để chèn tiêu đề, bảng, hình ảnh hoặc công cụ GGQuiz." }),
  ];
}

export const SLASH_ITEMS = [
  { id: "heading1", group: "Cơ bản", label: "Tiêu đề 1", hint: "Tiêu đề lớn", aliases: ["h1", "title"] },
  { id: "heading2", group: "Cơ bản", label: "Tiêu đề 2", hint: "Tiêu đề vừa", aliases: ["h2"] },
  { id: "heading3", group: "Cơ bản", label: "Tiêu đề 3", hint: "Tiêu đề nhỏ", aliases: ["h3"] },
  { id: "paragraph", group: "Cơ bản", label: "Đoạn văn", hint: "Văn bản thường", aliases: ["text", "p"] },
  { id: "bullet", group: "Cơ bản", label: "Danh sách bullet", hint: "• Mục", aliases: ["ul", "list"] },
  { id: "numbered", group: "Cơ bản", label: "Danh sách số", hint: "1. Mục", aliases: ["ol"] },
  { id: "table", group: "Cơ bản", label: "Bảng biểu", hint: "Bảng 2 cột", aliases: ["grid"] },
  { id: "image", group: "Đa phương tiện", label: "Hình ảnh", hint: "Kéo thả hoặc tải lên", aliases: ["img", "photo"] },
  { id: "video", group: "Đa phương tiện", label: "Video YouTube", hint: "Dán link", aliases: ["youtube"] },
  { id: "audio", group: "Đa phương tiện", label: "Audio", hint: "File nghe", aliases: ["mp3"] },
  { id: "callout", group: "Định dạng", label: "Khung chú ý", hint: "Callout", aliases: ["note", "tip"] },
  { id: "quote", group: "Định dạng", label: "Trích dẫn", hint: "Quote", aliases: ["blockquote"] },
  { id: "code", group: "Định dạng", label: "Mã code", hint: "Code block", aliases: ["pre"] },
  { id: "flashcard", group: "Công cụ GGQuiz", label: "/flashcard", hint: "Nhúng thẻ ghi nhớ", aliases: ["the", "card"] },
  { id: "exam", group: "Công cụ GGQuiz", label: "/exam", hint: "Nhúng đề thi", aliases: ["de", "quiz"] },
  { id: "dict", group: "Công cụ GGQuiz", label: "/dict", hint: "Khung tra từ điển", aliases: ["tudien"] },
];

export function filterSlashItems(query) {
  const q = String(query || "").replace(/^\//, "").trim().toLowerCase();
  if (!q) return SLASH_ITEMS;
  return SLASH_ITEMS.filter((item) => {
    const hay = `${item.id} ${item.label} ${item.hint} ${(item.aliases || []).join(" ")}`.toLowerCase();
    return hay.includes(q);
  });
}

export function youtubeId(url) {
  const value = String(url || "");
  const match = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{6,})/i);
  return match?.[1] || "";
}

export function slidesFromBlocks(blocks) {
  const list = Array.isArray(blocks) ? blocks : [];
  const slides = [];
  let current = { title: "Mở đầu", blocks: [] };
  list.forEach((block) => {
    if (block.type === "heading1" || block.type === "heading2") {
      if (current.blocks.length || slides.length === 0) {
        if (current.blocks.length || current.title !== "Mở đầu") slides.push(current);
      }
      current = { title: block.text || "Slide", blocks: [] };
    } else {
      current.blocks.push(block);
    }
  });
  if (current.blocks.length || current.title || !slides.length) slides.push(current);
  return slides.filter((slide) => slide.blocks.length || slide.title);
}

export function formatRelative(date) {
  if (!date) return "Chưa cập nhật";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return "Chưa cập nhật";
  return value.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function printLessonPlan(plan) {
  const blocks = Array.isArray(plan?.content) ? plan.content : [];
  const body = blocks
    .map((block) => {
      if (block.type === "heading1") return `<h1>${escapeHtml(block.text)}</h1>`;
      if (block.type === "heading2") return `<h2>${escapeHtml(block.text)}</h2>`;
      if (block.type === "heading3") return `<h3>${escapeHtml(block.text)}</h3>`;
      if (block.type === "quote") return `<blockquote>${escapeHtml(block.text)}</blockquote>`;
      if (block.type === "code") return `<pre>${escapeHtml(block.text)}</pre>`;
      if (block.type === "callout") return `<p><strong>💡</strong> ${escapeHtml(block.text)}</p>`;
      if (block.type === "bullet") {
        return `<ul>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
      }
      if (block.type === "numbered") {
        return `<ol>${(block.items || []).map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ol>`;
      }
      if (block.type === "table" || block.type === "vocab") {
        const rows = block.rows || block.data?.rows || [];
        return `<table>${rows
          .map((row) => {
            const cells = Array.isArray(row) ? row : [row.word, row.meaning, row.example];
            return `<tr>${cells.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`;
          })
          .join("")}</table>`;
      }
      if (block.type === "image" && block.data?.src) {
        return `<img src="${escapeHtml(block.data.src)}" style="max-width:100%" />`;
      }
      if (block.type === "flashcard") return `<p>[Thẻ ghi nhớ] ${escapeHtml(block.data?.title)}</p>`;
      if (block.type === "exam") return `<p>[Đề thi] ${escapeHtml(block.data?.title)}</p>`;
      if (block.type === "dict") return `<p>[Từ điển nhanh]</p>`;
      if (block.type === "quiz") {
        return (block.data?.questions || [])
          .map((q, i) => `<p><strong>${i + 1}. ${escapeHtml(q.prompt)}</strong></p>`)
          .join("");
      }
      return `<p>${escapeHtml(block.text)}</p>`;
    })
    .join("");

  const popup = window.open("", "_blank", "noopener,width=900,height=700");
  if (!popup) return;
  popup.document.write(`<!DOCTYPE html><html><head><title>${escapeHtml(plan.title || "Giáo án")}</title>
    <style>
      body{font-family:Inter,system-ui,sans-serif;padding:40px;max-width:800px;margin:auto;color:#0f172a;line-height:1.6}
      h1{font-size:28px} h2{font-size:22px;margin-top:28px} h3{font-size:18px}
      table{border-collapse:collapse;width:100%} td,th{border:1px solid #cbd5e1;padding:8px}
      blockquote{border-left:4px solid #94a3b8;padding-left:12px;color:#475569}
      pre{background:#0f172a;color:#bbf7d0;padding:12px;border-radius:8px}
    </style></head><body>
    <p style="color:#64748b;font-size:12px">${escapeHtml(plan.subject || "")} · ${escapeHtml(plan.grade || "")}</p>
    <h1>${escapeHtml(plan.title || "Giáo án")}</h1>
    ${body}
    </body></html>`);
  popup.document.close();
  popup.focus();
  popup.print();
}