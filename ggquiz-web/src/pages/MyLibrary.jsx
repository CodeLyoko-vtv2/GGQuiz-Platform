import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Folder, MoreHorizontal, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../api/client";

function resolveFolderId(folder) {
  const id = Number(folder?.id);
  return Number.isInteger(id) && id > 0 ? id : null;
}
import CreateFolderModal from "../components/CreateFolderModal";
import LibraryFilterDropdown, {
  FOLDER_SORT_OPTIONS,
} from "../components/LibraryFilterDropdown";

function folderActivityTime(folder) {
  const candidates = [folder.lastAccessedAt, folder.updatedAt, folder.createdAt]
    .filter(Boolean)
    .map((v) => new Date(v).getTime())
    .filter((n) => !Number.isNaN(n));
  return candidates.length ? Math.max(...candidates) : 0;
}

function sortFolders(folders, sortKey) {
  const list = [...folders];
  if (sortKey === "name") {
    return list.sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""), "vi", {
        sensitivity: "base",
        numeric: true,
      })
    );
  }
  // Gần đây (mặc định): mới tạo / vừa thao tác lên đầu
  return list.sort((a, b) => folderActivityTime(b) - folderActivityTime(a));
}

function FolderCard({ item, menuOpen, onToggleMenu, onShare, onEdit, onDelete }) {
  const menuRef = useRef(null);
  const panelRef = useRef(null);
  const [menuPos, setMenuPos] = useState(null);

  useEffect(() => {
    if (!menuOpen) {
      setMenuPos(null);
      return undefined;
    }

    const updatePosition = () => {
      const button = menuRef.current;
      if (!button) return;
      const rect = button.getBoundingClientRect();
      setMenuPos({
        top: rect.bottom + 4,
        left: Math.max(8, rect.right - 192),
      });
    };

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDocClick = (event) => {
      const target = event.target;
      if (menuRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      onToggleMenu(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [menuOpen, onToggleMenu]);

  return (
    <div
      className={`relative rounded-2xl border border-slate-200/80 bg-white shadow-sm transition hover:border-purple-200 hover:shadow-md ${
        menuOpen ? "z-[70]" : "z-0 hover:-translate-y-0.5"
      }`}
    >
      <Link to={`/folder/${item.id}`} className="block cursor-pointer p-5 pr-14">
        <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-700">
          <Folder className="h-5 w-5" />
        </div>
        <h3 className="line-clamp-2 text-lg font-bold text-slate-900">{item.name}</h3>
        <p className="mt-3 text-sm text-slate-500">{item.itemCount || 0} tài liệu</p>
      </Link>

      <div className="absolute top-3 right-3 z-[80]" ref={menuRef}>
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onToggleMenu(!menuOpen);
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-50 text-gray-600 shadow-sm transition hover:border-gray-300 hover:bg-white hover:text-gray-900"
          aria-label="Menu thư mục"
          title="Thêm"
        >
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {menuOpen && menuPos
        ? createPortal(
            <div
              ref={panelRef}
              className="fixed z-[200] w-48 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleMenu(false);
                  onShare(item);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <Share2 className="h-4 w-4" />
                Chia sẻ
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleMenu(false);
                  onEdit(item);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                Chỉnh sửa
              </button>
              <button
                type="button"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  onToggleMenu(false);
                  onDelete(item);
                }}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-red-600 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
                Xóa
              </button>
            </div>,
            document.body
          )
        : null}
    </div>
  );
}

function MyLibrary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const createFolder = searchParams.get("create") === "1";

  const [folders, setFolders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(createFolder);
  const [editingFolder, setEditingFolder] = useState(null);
  const [menuFolderId, setMenuFolderId] = useState(null);
  const [sort, setSort] = useState("recent");

  useEffect(() => {
    setCreateOpen(createFolder);
  }, [createFolder]);

  useEffect(() => {
    let cancelled = false;

    const fetchFolders = async () => {
      setLoading(true);
      setError("");
      try {
        const { data } = await api.get("/folders/me");
        if (!cancelled) setFolders(data.folders || []);
      } catch (err) {
        if (!cancelled) setError(getApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchFolders();
    return () => {
      cancelled = true;
    };
  }, []);

  const sortedFolders = useMemo(
    () => sortFolders(folders, sort),
    [folders, sort]
  );

  const closeFolderModal = () => {
    setCreateOpen(false);
    setEditingFolder(null);
    const next = new URLSearchParams(searchParams);
    next.delete("create");
    next.delete("tab");
    setSearchParams(next, { replace: true });
  };

  const handleFolderCreated = (folder) => {
    setFolders((prev) => [folder, ...prev.filter((item) => item.id !== folder.id)]);
    closeFolderModal();
    navigate(`/folder/${folder.id}`);
  };

  const handleFolderUpdated = (folder) => {
    setFolders((prev) =>
      prev.map((item) => (item.id === folder.id ? { ...item, ...folder } : item))
    );
    closeFolderModal();
  };

  const handleShareFolder = async (folder) => {
    try {
      const url = `${window.location.origin}/folder/${folder.id}`;
      await navigator.clipboard.writeText(url);
      toast.success("Đã sao chép liên kết!");
    } catch {
      toast.error("Không thể sao chép liên kết. Hãy thử lại.");
    }
  };

  const handleEditFolder = (folder) => {
    setCreateOpen(false);
    setEditingFolder(folder);
  };

  const handleDeleteFolder = async (folder) => {
    const folderId = resolveFolderId(folder);
    if (!folderId) {
      toast.error("Không xác định được thư mục cần xóa.");
      return;
    }

    const confirmed = window.confirm(`Bạn có chắc chắn muốn xóa thư mục "${folder.name}"?`);
    if (!confirmed) return;

    try {
      await api.delete(`/folders/${folderId}`);
      setFolders((prev) => prev.filter((item) => Number(item.id) !== folderId));
      toast.success("Đã xóa thư mục.");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-purple-50 via-white to-violet-50/40 px-4 py-8 sm:px-8">
      <div className="mx-auto max-w-5xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              Thư viện
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
              Sắp xếp thẻ ghi nhớ, đề thi, giáo án và thuật ngữ Esports vào thư mục —
              mọi thứ gọn gàng để bạn học tập tập trung hơn mỗi ngày.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setEditingFolder(null);
              setCreateOpen(true);
            }}
            className="inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-xl bg-purple-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-purple-700"
          >
            <Plus className="h-4 w-4" />
            Tạo thư mục
          </button>
        </header>

        {!loading && !error && folders.length > 0 ? (
          <div className="mb-6">
            <LibraryFilterDropdown
              value={sort}
              onChange={setSort}
              options={FOLDER_SORT_OPTIONS}
              prefix="Sắp xếp:"
            />
          </div>
        ) : null}

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="h-36 animate-pulse rounded-2xl bg-slate-200/70"
              />
            ))}
          </div>
        ) : error ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </p>
        ) : folders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white/70 px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-purple-50 text-purple-600">
              <Folder className="h-7 w-7" />
            </div>
            <p className="text-lg font-bold text-slate-900">Bạn chưa có thư mục nào</p>
            <p className="mt-2 text-sm text-slate-500">
              Tạo thư mục đầu tiên để nhóm tài liệu học tập của bạn.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditingFolder(null);
                setCreateOpen(true);
              }}
              className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-purple-700"
            >
              <Plus className="h-4 w-4" />
              Tạo thư mục
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {sortedFolders.map((item) => (
              <FolderCard
                key={item.id}
                item={item}
                menuOpen={menuFolderId === item.id}
                onToggleMenu={(open) => setMenuFolderId(open ? item.id : null)}
                onShare={handleShareFolder}
                onEdit={handleEditFolder}
                onDelete={handleDeleteFolder}
              />
            ))}
          </div>
        )}
      </div>

      <CreateFolderModal
        open={createOpen || Boolean(editingFolder)}
        folder={editingFolder}
        onClose={closeFolderModal}
        onCreated={handleFolderCreated}
        onUpdated={handleFolderUpdated}
      />
    </div>
  );
}

export default MyLibrary;
