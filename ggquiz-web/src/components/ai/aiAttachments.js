export const MAX_ATTACHMENTS = 15;
const MAX_BYTES = {
  image: 8 * 1024 * 1024,
  audio: 12 * 1024 * 1024,
  pdf: 10 * 1024 * 1024,
  doc: 6 * 1024 * 1024,
  text: 2 * 1024 * 1024,
};

export const FILE_ACCEPT =
  "image/*,audio/*,.pdf,.txt,.md,.csv,.docx,.pptx,.xlsx,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.presentationml.presentation,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export function classifyFile(file) {
  if (!file) return null;
  const name = String(file.name || "tep");
  const type = String(file.type || "").toLowerCase();

  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|heif|bmp)$/i.test(name)) {
    return "image";
  }
  if (
    type.startsWith("audio/") ||
    /\.(mp3|wav|m4a|aac|ogg|flac|webm|aiff)$/i.test(name)
  ) {
    return "audio";
  }
  if (type === "application/pdf" || /\.pdf$/i.test(name)) return "pdf";
  if (
    type.includes("wordprocessingml") ||
    type.includes("presentationml") ||
    type.includes("spreadsheetml") ||
    type === "application/msword" ||
    /\.(docx?|pptx?|xlsx?)$/i.test(name)
  ) {
    return "doc";
  }
  if (type.startsWith("text/") || /\.(txt|md|csv|json)$/i.test(name)) return "text";
  return null;
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Không đọc được tệp"));
    reader.readAsDataURL(file);
  });
}

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("Không đọc được tệp"));
    reader.readAsText(file);
  });
}

export function stripDataUrl(dataUrl) {
  const value = String(dataUrl || "");
  const comma = value.indexOf(",");
  return comma >= 0 ? value.slice(comma + 1) : value;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

async function compressImageFile(file) {
  try {
    if (typeof createImageBitmap !== "function") return file;
    const bitmap = await createImageBitmap(file);
    const maxEdge = 1600;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await canvasToBlob(canvas, "image/jpeg", 0.82);
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
      type: "image/jpeg",
    });
  } catch (error) {
    console.warn("Image compress skipped:", error);
    return file;
  }
}

async function makeThumbnail(file) {
  try {
    if (typeof createImageBitmap !== "function") return null;
    const bitmap = await createImageBitmap(file);
    const maxEdge = 96;
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height, 1));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    return canvas.toDataURL("image/jpeg", 0.7);
  } catch {
    return null;
  }
}

export async function fileToAttachment(file) {
  if (!file) {
    throw new Error("Không đọc được tệp.");
  }
  const kind = classifyFile(file);
  if (!kind) {
    throw new Error("Định dạng chưa hỗ trợ. Hãy dùng ảnh, audio, PDF, Word hoặc văn bản.");
  }

  const limit = MAX_BYTES[kind] || MAX_BYTES.text;
  if (file.size > limit) {
    throw new Error(`Tệp "${file.name}" quá lớn (tối đa ${Math.round(limit / 1024 / 1024)}MB).`);
  }

  const id = `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const name = file.name || `tep-${kind}`;

  if (kind === "text") {
    const text = await readAsText(file);
    return {
      id,
      name,
      kind,
      mimeType: file.type || "text/plain",
      text: String(text || "").slice(0, 20000),
      previewUrl: null,
    };
  }

  if (kind === "image") {
    const compact = await compressImageFile(file);
    const dataUrl = await readAsDataUrl(compact);
    const previewUrl = (await makeThumbnail(compact)) || null;
    return {
      id,
      name,
      kind,
      mimeType: compact.type || "image/jpeg",
      data: stripDataUrl(dataUrl),
      previewUrl,
    };
  }

  const dataUrl = await readAsDataUrl(file);
  return {
    id,
    name,
    kind,
    mimeType: file.type || (kind === "pdf" ? "application/pdf" : file.type || "application/octet-stream"),
    data: stripDataUrl(dataUrl),
    previewUrl: null,
  };
}

export function textToAttachment(text, name = "van-ban-dan.txt") {
  const trimmed = String(text || "").trim();
  if (!trimmed) return null;
  return {
    id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name,
    kind: "text",
    mimeType: "text/plain",
    text: trimmed.slice(0, 20000),
    previewUrl: null,
  };
}

export function mergeAttachments(current, incoming) {
  const next = Array.isArray(current) ? [...current] : [];
  let skipped = 0;
  for (const item of incoming || []) {
    if (!item || typeof item !== "object") continue;
    if (next.length >= MAX_ATTACHMENTS) {
      skipped += 1;
      continue;
    }
    next.push(item);
  }
  return { items: next, skipped };
}

export function toApiAttachments(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      name: String(item.name || "tep"),
      mimeType: String(item.mimeType || ""),
      kind: String(item.kind || ""),
      data: item.data || null,
      text: item.text || null,
    }));
}

function viewUrlFromItem(item) {
  if (item?.kind !== "image") return null;
  if (
    typeof item.viewUrl === "string" &&
    item.viewUrl.startsWith("data:image") &&
    item.viewUrl.length < 2_500_000
  ) {
    return item.viewUrl;
  }
  if (item.data && item.mimeType) {
    const built = `data:${item.mimeType};base64,${item.data}`;
    return built.length < 2_500_000 ? built : null;
  }
  return null;
}

export function toMessageAttachments(items) {
  return (Array.isArray(items) ? items : [])
    .filter((item) => item && typeof item === "object")
    .map((item) => ({
      name: String(item.name || "Tệp"),
      kind: String(item.kind || "file"),
      mimeType: item.mimeType || "",
      previewUrl:
        item.kind === "image" &&
        typeof item.previewUrl === "string" &&
        item.previewUrl.startsWith("data:image") &&
        item.previewUrl.length < 120000
          ? item.previewUrl
          : null,
      viewUrl: viewUrlFromItem(item),
    }));
}

export function sanitizeChats(chats) {
  const list = Array.isArray(chats) ? chats : [];
  return list.slice(0, 20).map((chat) => ({
    id: chat?.id || `chat-${Date.now()}`,
    title: String(chat?.title || "Cuộc trò chuyện").slice(0, 80),
    updatedAt: chat?.updatedAt || new Date().toISOString(),
    messages: (Array.isArray(chat?.messages) ? chat.messages : [])
      .filter(Boolean)
      .slice(-40)
      .map((msg) => ({
        id: msg.id,
        role: msg.role === "user" ? "user" : "assistant",
        content: String(msg.content || ""),
        createdAt: msg.createdAt || new Date().toISOString(),
        attachments: toMessageAttachments(msg.attachments).map((item) => ({
          name: item.name,
          kind: item.kind,
          previewUrl: item.previewUrl,
        })),
      })),
  }));
}

export function persistChats(key, chats) {
  const clean = sanitizeChats(chats);
  try {
    localStorage.setItem(key, JSON.stringify(clean));
    return;
  } catch (error) {
    console.warn("AI chat persist failed, shrinking history:", error);
  }
  const slim = clean.map((chat) => ({
    ...chat,
    messages: chat.messages.map((msg) => ({
      ...msg,
      attachments: (msg.attachments || []).map((item) => ({
        ...item,
        previewUrl: null,
      })),
    })),
  }));
  try {
    localStorage.setItem(key, JSON.stringify(slim.slice(0, 8)));
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
  }
}

export function looksLikePastedDocument(text) {
  const value = String(text || "");
  if (value.length >= 180) return true;
  return value.split(/\r?\n/).filter((line) => line.trim()).length >= 4;
}
