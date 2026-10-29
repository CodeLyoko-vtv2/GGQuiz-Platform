import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, MoreHorizontal, Pencil, Share2, Trash2 } from "lucide-react";

function MenuRow({ as: Component = "button", className = "", children, ...props }) {
  return (
    <Component
      className={`flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm ${className}`}
      {...props}
    >
      {children}
    </Component>
  );
}

function ContentActionsMenu({
  ariaLabel = "Menu",
  isSaved = false,
  onToggleSave,
  onShare,
  isOwner = false,
  editTo,
  onEdit,
  onDelete,
  deleting = false,
}) {
  const menuRef = useRef(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onDocClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  return (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white hover:text-gray-900"
        aria-label={ariaLabel}
        title="Thêm"
      >
        <MoreHorizontal className="h-5 w-5" />
      </button>
      {open ? (
        <div className="absolute right-0 z-30 mt-1 w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <MenuRow
            type="button"
            onClick={() => {
              setOpen(false);
              onToggleSave?.();
            }}
            className="text-slate-700 hover:bg-slate-50"
          >
            <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
            {isSaved ? "Bỏ lưu" : "Lưu"}
          </MenuRow>
          <MenuRow
            type="button"
            onClick={() => {
              setOpen(false);
              onShare?.();
            }}
            className="text-slate-700 hover:bg-slate-50"
          >
            <Share2 className="h-4 w-4" />
            Chia sẻ
          </MenuRow>
          {isOwner && editTo ? (
            <MenuRow
              as={Link}
              to={editTo}
              onClick={() => setOpen(false)}
              className="text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              Chỉnh sửa
            </MenuRow>
          ) : (
            <MenuRow
              type="button"
              disabled={!isOwner}
              onClick={() => {
                if (!isOwner) return;
                setOpen(false);
                onEdit?.();
              }}
              className={
                isOwner
                  ? "text-slate-700 hover:bg-slate-50"
                  : "cursor-not-allowed text-slate-400"
              }
            >
              <Pencil className="h-4 w-4" />
              Chỉnh sửa
            </MenuRow>
          )}
          <MenuRow
            type="button"
            disabled={deleting || !isOwner}
            onClick={() => {
              if (!isOwner) return;
              setOpen(false);
              onDelete?.();
            }}
            className={
              isOwner
                ? "text-red-600 hover:bg-red-50 disabled:opacity-60"
                : "cursor-not-allowed text-slate-400"
            }
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Đang xóa..." : "Xóa"}
          </MenuRow>
        </div>
      ) : null}
    </div>
  );
}

export default ContentActionsMenu;
