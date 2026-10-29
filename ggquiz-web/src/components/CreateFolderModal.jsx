import { useEffect, useState } from "react";
import { Folder } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../api/client";

function CreateFolderModal({ open, onClose, onCreated, onUpdated, folder = null }) {
  const isEdit = Boolean(folder?.id);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setLoading(false);
      return;
    }
    setName(folder?.name || "");
    setLoading(false);
  }, [open, folder]);

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const canSubmit = name.trim().length > 0 && !loading;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      if (isEdit) {
        const folderId = Number(folder.id);
        if (!Number.isInteger(folderId) || folderId <= 0) {
          toast.error("Không xác định được thư mục cần sửa.");
          return;
        }
        const { data } = await api.put(`/folders/${folderId}`, { name: name.trim() });
        toast.success("Đã cập nhật thư mục!");
        onUpdated?.(data.folder);
      } else {
        const { data } = await api.post("/folders", { name: name.trim() });
        toast.success("Đã tạo thư mục!");
        onCreated?.(data.folder);
      }
      onClose?.();
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/40 px-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEdit ? "Chỉnh sửa thư mục" : "Tạo thư mục"}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
      >
        <div className="mb-5 flex justify-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 text-gray-600">
            <Folder className="h-8 w-8" />
          </div>
        </div>

        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleSubmit();
            }
          }}
          placeholder="Đặt tên cho thư mục của bạn"
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-center text-base text-gray-900 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
          autoFocus
        />

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-200"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="rounded-full bg-purple-600 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
          >
            {loading
              ? isEdit
                ? "Đang lưu..."
                : "Đang tạo..."
              : isEdit
                ? "Lưu"
                : "Tạo"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateFolderModal;
