import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import toast from "react-hot-toast";
import Markdown from "react-markdown";
import {
  ArrowLeft,
  Bot,
  FileText,
  History,
  Image as ImageIcon,
  MessageSquarePlus,
  Music,
  Paperclip,
  SendHorizontal,
  Trash2,
  X,
} from "lucide-react";
import api, { getApiErrorMessage } from "../../api/client";
import AiMascot from "./AiMascot";
import {
  FILE_ACCEPT,
  MAX_ATTACHMENTS,
  fileToAttachment,
  looksLikePastedDocument,
  mergeAttachments,
  persistChats,
  sanitizeChats,
  textToAttachment,
  toApiAttachments,
  toMessageAttachments,
} from "./aiAttachments";

const CHATS_KEY = "ggquiz_ai_chats_v1";
export const AI_SIDEBAR_WIDTH = 360;

function defaultWelcome() {
  return {
    id: `msg-welcome`,
    role: "assistant",
    content:
      "Xin chào! Mình là **Trợ thủ AI GGQuiz**. Hỏi mình về từ vựng, ngữ pháp, mẹo học flashcard hoặc luyện đề nhé!",
    createdAt: new Date().toISOString(),
  };
}

function createChat(title = "Cuộc trò chuyện mới") {
  return {
    id: `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title,
    updatedAt: new Date().toISOString(),
    messages: [defaultWelcome()],
  };
}

function loadChats() {
  try {
    const raw = localStorage.getItem(CHATS_KEY);
    if (!raw) return [createChat()];
    const parsed = JSON.parse(raw);
    const clean = sanitizeChats(parsed);
    return clean.length > 0 ? clean : [createChat()];
  } catch {
    try {
      localStorage.removeItem(CHATS_KEY);
    } catch {
      /* ignore */
    }
    return [createChat()];
  }
}

function attachmentIcon(kind) {
  if (kind === "image") return ImageIcon;
  if (kind === "audio") return Music;
  return FileText;
}

function imageSrc(item) {
  if (!item) return "";
  if (typeof item.viewUrl === "string" && item.viewUrl.startsWith("data:image")) {
    return item.viewUrl;
  }
  if (item.data && item.mimeType) {
    return `data:${item.mimeType};base64,${item.data}`;
  }
  return item.previewUrl || "";
}

function AttachmentChip({ item, onRemove, onPreview }) {
  const Icon = attachmentIcon(item.kind);
  const preview = item.previewUrl || imageSrc(item);
  const full = imageSrc(item) || item.previewUrl;
  const canPreview = item.kind === "image" && full;
  return (
    <div className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-purple-100 bg-purple-50/80 px-1.5 py-1 text-[11px] text-purple-800">
      {canPreview ? (
        <button
          type="button"
          onClick={() => onPreview?.({ src: full, alt: item.name })}
          className="shrink-0"
          title="Xem ảnh lớn"
        >
          <img
            src={preview}
            alt={item.name || ""}
            className="h-10 w-10 cursor-zoom-in rounded object-cover"
          />
        </button>
      ) : (
        <Icon className="h-3.5 w-3.5 shrink-0" />
      )}
      <span className="max-w-[8rem] truncate">{item.name}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={onRemove}
          className="rounded p-0.5 text-purple-400 hover:bg-white hover:text-purple-700"
          aria-label={`Gỡ ${item.name}`}
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </div>
  );
}

function ImageLightbox({ src, alt, onClose }) {
  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  if (!src) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4 sm:p-8"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Xem ảnh lớn"
    >
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur hover:bg-white/35"
        aria-label="Đóng"
      >
        <X className="h-5 w-5" />
      </button>
      <img
        src={src}
        alt={alt || ""}
        onClick={(event) => event.stopPropagation()}
        className="h-auto max-h-[92vh] w-auto max-w-[min(96vw,1400px)] rounded-lg object-contain object-center shadow-2xl"
        style={{ objectFit: "contain" }}
      />
    </div>,
    document.body
  );
}

function AiAssistantShell({ open, onClose }) {
  const [view, setView] = useState("chat");
  const [chats, setChats] = useState(() => loadChats());
  const [activeChatId, setActiveChatId] = useState(() => loadChats()[0]?.id);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [mood, setMood] = useState("idle");
  const [dragging, setDragging] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const listRef = useRef(null);
  const fileRef = useRef(null);
  const composerRef = useRef(null);
  const dragCountRef = useRef(0);
  const typingTimerRef = useRef(null);
  const happyTimerRef = useRef(null);

  const activeChat = useMemo(
    () => chats.find((c) => c.id === activeChatId) || chats[0],
    [chats, activeChatId]
  );

  const showMascotHero =
    view === "chat" &&
    (activeChat?.messages?.length || 0) <= 1 &&
    !sending;

  const canSend = Boolean(input.trim() || attachments.length) && !sending;

  useEffect(() => {
    persistChats(CHATS_KEY, chats);
  }, [chats]);

  useEffect(() => {
    if (!open || view !== "chat") return;
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [open, view, activeChat?.messages?.length, sending]);

  useEffect(() => {
    if (!open) {
      setView("chat");
      setMood("idle");
      setSending(false);
      setDragging(false);
      setLightbox(null);
      dragCountRef.current = 0;
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      if (happyTimerRef.current) clearTimeout(happyTimerRef.current);
    };
  }, []);

  const addIncomingFiles = async (fileList) => {
    const files = Array.from(fileList || []).filter(Boolean);
    if (files.length === 0) return;
    const incoming = [];
    const errors = [];
    for (const file of files) {
      try {
        incoming.push(await fileToAttachment(file));
      } catch (error) {
        errors.push(error.message || `Không đọc được ${file.name || "tệp"}`);
      }
    }
    if (incoming.length === 0) {
      toast.error(errors[0] || "Không thể đính kèm tệp.");
      return;
    }
    let skipped = 0;
    setAttachments((prev) => {
      const merged = mergeAttachments(prev, incoming);
      skipped = merged.skipped;
      return merged.items;
    });
    if (skipped > 0) {
      toast.error(`Chỉ đính kèm tối đa ${MAX_ATTACHMENTS} tệp mỗi lần gửi.`);
    }
    errors.forEach((message) => toast.error(message));
    setMood("listening");
  };

  const addPastedText = (text) => {
    const item = textToAttachment(text);
    if (!item) return;
    let skipped = 0;
    setAttachments((prev) => {
      const merged = mergeAttachments(prev, [item]);
      skipped = merged.skipped;
      return merged.items;
    });
    if (skipped > 0) {
      toast.error(`Chỉ đính kèm tối đa ${MAX_ATTACHMENTS} tệp mỗi lần gửi.`);
      return;
    }
    setMood("listening");
  };

  const startNewChat = () => {
    const chat = createChat();
    setChats((prev) => [chat, ...prev]);
    setActiveChatId(chat.id);
    setView("chat");
    setInput("");
    setAttachments([]);
    setMood("idle");
  };

  const deleteChat = (id) => {
    setChats((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (next.length === 0) {
        const fresh = createChat();
        setActiveChatId(fresh.id);
        return [fresh];
      }
      if (activeChatId === id) setActiveChatId(next[0].id);
      return next;
    });
  };

  const onInputChange = (value) => {
    setInput(value);
    if (sending) return;
    if (value.trim() || attachments.length) {
      setMood("listening");
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        if (!sending) setMood("idle");
      }, 1200);
    } else {
      setMood("idle");
    }
  };

  const handleSend = async () => {
    try {
    const text = input.trim();
    if ((!text && attachments.length === 0) || !activeChat || sending) return;

    const pending = attachments;
    const userMsg = {
      id: `msg-${Date.now()}-u`,
      role: "user",
      content: text,
      attachments: toMessageAttachments(pending),
      createdAt: new Date().toISOString(),
    };

    const historyForApi = [...(activeChat.messages || []), userMsg]
      .filter((m) => m.role === "user" || m.role === "assistant")
      .filter((m) => m.id !== "msg-welcome")
      .slice(0, -1)
      .map((m) => ({ role: m.role, content: m.content }));

    const titleSource = text || pending[0]?.name || "Tệp đính kèm";
    setInput("");
    setAttachments([]);
    setSending(true);
    setMood("thinking");
    setChats((prev) =>
      prev.map((chat) =>
        chat.id === activeChat.id
          ? {
              ...chat,
              title: chat.messages.length <= 1 ? titleSource.slice(0, 42) : chat.title,
              updatedAt: new Date().toISOString(),
              messages: [...chat.messages, userMsg],
            }
          : chat
      )
    );

    try {
      const { data } = await api.post(
        "/ai/chat",
        {
          message: text,
          history: historyForApi,
          attachments: toApiAttachments(pending),
        },
        { timeout: pending.length > 5 ? 90000 : 60000 }
      );
      const reply = {
        id: `msg-${Date.now()}-a`,
        role: "assistant",
        content: String(data.reply || "").trim() || "Mình chưa có câu trả lời phù hợp.",
        createdAt: new Date().toISOString(),
      };
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChat.id
            ? {
                ...chat,
                updatedAt: new Date().toISOString(),
                messages: [...chat.messages, reply],
              }
            : chat
        )
      );
      setMood("happy");
      if (happyTimerRef.current) clearTimeout(happyTimerRef.current);
      happyTimerRef.current = setTimeout(() => setMood("idle"), 2800);
    } catch (error) {
      const message = getApiErrorMessage(error);
      toast.error(message);
      setChats((prev) =>
        prev.map((chat) =>
          chat.id === activeChat.id
            ? {
                ...chat,
                messages: [
                  ...chat.messages,
                  {
                    id: `msg-${Date.now()}-err`,
                    role: "assistant",
                    content: `Xin lỗi, mình gặp lỗi: **${message}**`,
                    createdAt: new Date().toISOString(),
                  },
                ],
              }
            : chat
        )
      );
      setMood("idle");
    } finally {
      setSending(false);
    }
    } catch (error) {
      console.error("AI send crashed:", error);
      toast.error("Không gửi được tin nhắn. Hãy thử lại.");
      setSending(false);
      setMood("idle");
    }
  };

  const handleDragEnter = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current += 1;
    const types = event.dataTransfer?.types;
    const hasFiles =
      Boolean(types) &&
      (typeof types.includes === "function"
        ? types.includes("Files")
        : types.contains?.("Files"));
    if (hasFiles || event.dataTransfer?.files?.length) setDragging(true);
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current -= 1;
    if (dragCountRef.current <= 0) {
      dragCountRef.current = 0;
      setDragging(false);
    }
  };

  const handleDrop = async (event) => {
    event.preventDefault();
    event.stopPropagation();
    dragCountRef.current = 0;
    setDragging(false);
    await addIncomingFiles(event.dataTransfer?.files);
  };

  const handlePaste = async (event) => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const files = [];
    if (clipboard.items) {
      for (const item of clipboard.items) {
        if (item.kind === "file") {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
    }
    if (files.length === 0 && clipboard.files?.length) {
      files.push(...Array.from(clipboard.files));
    }

    if (files.length > 0) {
      event.preventDefault();
      await addIncomingFiles(files);
      return;
    }

    const pasted = clipboard.getData("text/plain");
    if (looksLikePastedDocument(pasted)) {
      event.preventDefault();
      addPastedText(pasted);
    }
  };

  return (
    <>
    <aside
      className={`fixed top-0 right-0 z-40 flex h-full flex-col border-l border-purple-100 bg-white shadow-lg transition-transform duration-300 ease-out ${
        open ? "translate-x-0 pointer-events-auto" : "translate-x-full pointer-events-none"
      }`}
      style={{ width: `min(${AI_SIDEBAR_WIDTH}px, 100vw)` }}
      aria-hidden={!open}
      role="complementary"
      aria-label="Trợ thủ AI"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="ai-library-bg absolute inset-0 opacity-90" />
      {dragging ? (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center border-4 border-dashed border-purple-400 bg-purple-50/80 px-6 text-center backdrop-blur-[2px]">
          <Paperclip className="mb-2 h-8 w-8 text-purple-600" />
          <p className="text-sm font-bold text-purple-800">Thả một hoặc nhiều tệp vào đây</p>
          <p className="mt-1 text-xs text-purple-600">
            Ảnh, PDF, Word, văn bản hoặc âm thanh · tối đa {MAX_ATTACHMENTS} tệp
          </p>
        </div>
      ) : null}
      <div className="relative z-10 flex h-full min-h-0 flex-col">
        <div className="flex items-center justify-between gap-2 border-b border-purple-100/80 bg-white/70 px-3 py-3 backdrop-blur">
          <div className="flex min-w-0 items-center gap-2">
            <Bot className="h-5 w-5 shrink-0 text-purple-700" strokeWidth={2} />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold text-gray-900">Trợ thủ AI</p>
              <p className="truncate text-[11px] text-purple-600/80">
                {view === "history" ? "Lịch sử trò chuyện" : "Thư viện học tập vui vẻ"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {view === "chat" ? (
              <>
                <button
                  type="button"
                  onClick={startNewChat}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-700"
                  title="Cuộc trò chuyện mới"
                >
                  <MessageSquarePlus className="h-5 w-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setView("history")}
                  className="rounded-lg p-2 text-gray-500 transition hover:bg-purple-50 hover:text-purple-700"
                  title="Lịch sử trò chuyện"
                >
                  <History className="h-5 w-5" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setView("chat")}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-bold text-purple-700 transition hover:bg-purple-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Quay lại
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 hover:text-gray-800"
              aria-label="Đóng"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {view === "history" ? (
          <div className="relative z-10 flex-1 overflow-y-auto px-3 py-3">
            <p className="mb-2 px-1 text-xs font-bold tracking-wide text-purple-500/80 uppercase">
              Các phiên gần đây
            </p>
            <ul className="space-y-2">
              {chats.map((chat) => (
                <li key={chat.id}>
                  <div className="group flex items-center gap-1 rounded-xl border border-white/80 bg-white/80 shadow-sm transition hover:border-purple-200">
                    <button
                      type="button"
                      onClick={() => {
                        setActiveChatId(chat.id);
                        setView("chat");
                      }}
                      className="min-w-0 flex-1 px-3 py-2.5 text-left"
                    >
                      <p className="truncate text-sm font-semibold text-gray-800">
                        {chat.title || "Không tiêu đề"}
                      </p>
                      <p className="mt-0.5 text-[11px] text-gray-400">
                        {new Date(chat.updatedAt).toLocaleString("vi-VN")}
                      </p>
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteChat(chat.id)}
                      className="mr-1 rounded-lg p-2 text-gray-400 transition hover:bg-red-50 hover:text-red-500"
                      aria-label="Xóa cuộc trò chuyện"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <div ref={listRef} className="relative z-10 flex-1 space-y-3 overflow-y-auto px-3 py-3">
              {showMascotHero ? (
                <div className="mb-2 rounded-2xl border border-white/70 bg-white/55 px-3 py-4 shadow-sm backdrop-blur-sm">
                  <AiMascot mood={mood} />
                </div>
              ) : (
                <div className="flex justify-center py-1">
                  <AiMascot mood={mood} compact className="!w-16" />
                </div>
              )}

              {(activeChat?.messages || []).map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[90%] rounded-2xl px-3.5 py-2.5 shadow-sm ${
                      msg.role === "user"
                        ? "rounded-br-md bg-purple-600 text-sm leading-relaxed text-white"
                        : "rounded-bl-md border border-white/80 bg-white/85"
                    }`}
                  >
                    {Array.isArray(msg.attachments) && msg.attachments.length ? (
                      <div className="mb-2 flex flex-wrap gap-1.5">
                        {msg.attachments.filter(Boolean).map((item, index) => (
                          <AttachmentChip
                            key={`${msg.id}-att-${index}`}
                            item={{
                              name: item?.name || "Tệp",
                              kind: item?.kind || "file",
                              mimeType: item?.mimeType || "",
                              previewUrl: item?.previewUrl || null,
                              viewUrl: item?.viewUrl || null,
                              data: item?.data || null,
                            }}
                            onPreview={setLightbox}
                          />
                        ))}
                      </div>
                    ) : null}
                    {msg.role === "user" ? (
                      msg.content ||
                      (msg.attachments?.length ? (
                        <span className="text-white/80 italic">Đã gửi tệp đính kèm</span>
                      ) : null)
                    ) : (
                      <div className="ai-chat-markdown">
                        <Markdown
                          components={{
                            img: ({ src, alt }) =>
                              src ? (
                                <button
                                  type="button"
                                  onClick={() => setLightbox({ src, alt: alt || "" })}
                                  className="my-1 block max-w-full"
                                >
                                  <img
                                    src={src}
                                    alt={alt || ""}
                                    className="max-h-48 max-w-full cursor-zoom-in rounded-lg object-contain"
                                  />
                                </button>
                              ) : null,
                          }}
                        >
                          {String(msg.content || "")}
                        </Markdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {sending ? (
                <div className="flex justify-start">
                  <div className="rounded-2xl rounded-bl-md border border-white/80 bg-white/85 px-3.5 py-2.5 text-sm text-purple-500 shadow-sm">
                    AI đang suy nghĩ...
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative z-10 border-t border-purple-100/80 bg-white/75 p-3 backdrop-blur">
              <div
                ref={composerRef}
                className="rounded-2xl border border-purple-100 bg-white/90 p-2 shadow-sm focus-within:border-purple-300 focus-within:ring-2 focus-within:ring-purple-100"
              >
                {attachments.length > 0 ? (
                  <div className="mb-1.5 flex flex-wrap gap-1.5 px-1">
                    {attachments.filter(Boolean).map((item) => (
                      <AttachmentChip
                        key={item.id || item.name}
                        item={item}
                        onPreview={setLightbox}
                        onRemove={() =>
                          setAttachments((prev) => prev.filter((att) => att.id !== item.id))
                        }
                      />
                    ))}
                  </div>
                ) : null}
                <textarea
                  value={input}
                  onChange={(e) => onInputChange(e.target.value)}
                  onPaste={handlePaste}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={2}
                  placeholder="Hỏi Trợ thủ AI..."
                  className="w-full resize-none bg-transparent px-2 py-1.5 text-sm text-gray-900 outline-none placeholder:text-gray-400"
                />
                <div className="mt-1 flex items-center justify-between px-1">
                  <div className="inline-flex items-center">
                    <input
                      ref={fileRef}
                      type="file"
                      accept={FILE_ACCEPT}
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        addIncomingFiles(e.target.files);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition hover:bg-purple-50 hover:text-purple-700"
                      title={`Đính kèm tệp (tối đa ${MAX_ATTACHMENTS})`}
                    >
                      <Paperclip className="h-5 w-5" />
                    </button>
                    {attachments.length > 0 ? (
                      <span className="ml-1 text-[11px] font-medium text-purple-500">
                        {attachments.length}/{MAX_ATTACHMENTS}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!canSend}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-2 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Gửi
                    <SendHorizontal className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </aside>
    {lightbox?.src ? (
      <ImageLightbox
        src={lightbox.src}
        alt={lightbox.alt}
        onClose={() => setLightbox(null)}
      />
    ) : null}
    </>
  );
}

export default AiAssistantShell;
