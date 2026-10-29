import { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";

/** Chuẩn hóa URL ảnh (Pixabay đôi khi trả //cdn... hoặc thiếu https). */
export function normalizeImageSrc(value) {
  if (value == null) return "";
  const src = String(value).trim();
  if (!src) return "";
  if (src.startsWith("//")) return `https:${src}`;
  return src;
}

export function createImageObjectUrl(file) {
  if (!file) throw new Error("Không có file");
  if (!file.type?.startsWith("image/")) {
    throw new Error("Vui lòng chọn file hình ảnh.");
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Ảnh tối đa 2MB.");
  }
  return URL.createObjectURL(file);
}

/** Đọc file thành data URL (lưu DB / gửi API). */
export function readImageFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("Không có file"));
      return;
    }
    if (!file.type.startsWith("image/")) {
      reject(new Error("Vui lòng chọn file hình ảnh."));
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      reject(new Error("Ảnh tối đa 2MB."));
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Không đọc được ảnh."));
    reader.readAsDataURL(file);
  });
}

/** Blob URL → data URL trước khi lưu học phần. */
export async function resolveImageForSave(value) {
  const src = normalizeImageSrc(value);
  if (!src) return null;
  if (!src.startsWith("blob:")) return src;

  const response = await fetch(src);
  const blob = await response.blob();
  return readImageFileAsDataUrl(
    new File([blob], "card-image.jpg", { type: blob.type || "image/jpeg" })
  );
}

function CardImageField({
  image,
  onChange,
  onOpenPicker,
  size = "md",
  active = false,
}) {
  const [broken, setBroken] = useState(false);
  const prevBlobRef = useRef(null);

  const src = normalizeImageSrc(image);

  useEffect(() => {
    setBroken(false);
  }, [src]);

  useEffect(() => {
    // Thu hồi blob URL cũ khi đổi/xóa ảnh để tránh rò rỉ bộ nhớ
    if (prevBlobRef.current && prevBlobRef.current !== src) {
      if (String(prevBlobRef.current).startsWith("blob:")) {
        URL.revokeObjectURL(prevBlobRef.current);
      }
    }
    prevBlobRef.current = src.startsWith("blob:") ? src : null;

    return () => {
      if (prevBlobRef.current?.startsWith("blob:")) {
        // Không revoke ở unmount nếu parent vẫn giữ URL — chỉ revoke khi component
        // sở hữu URL qua onChange null. Parent quản lý lifecycle chính.
      }
    };
  }, [src]);

  const boxClass =
    size === "sm"
      ? "h-[72px] w-[72px]"
      : "h-[88px] w-[88px] sm:h-[96px] sm:w-[96px]";

  const handleRemove = (event) => {
    event.stopPropagation();
    if (src.startsWith("blob:")) {
      URL.revokeObjectURL(src);
    }
    onChange?.(null);
  };

  if (src && !broken) {
    return (
      <div className={`relative shrink-0 overflow-hidden rounded-md ${boxClass}`}>
        <button
          type="button"
          onClick={onOpenPicker}
          className="h-full w-full overflow-hidden rounded-md bg-gray-100"
          title="Đổi ảnh"
        >
          <img
            src={src}
            alt="Ảnh thẻ"
            referrerPolicy="no-referrer"
            className="h-full w-full object-cover"
            onError={() => setBroken(true)}
          />
        </button>
        <button
          type="button"
          onClick={handleRemove}
          className="absolute top-1 right-1 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-black/70 text-white shadow-sm transition hover:bg-black/85"
          aria-label="Xóa ảnh"
          title="Xóa ảnh"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={onOpenPicker}
        className={`${boxClass} flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed bg-gray-50 text-gray-500 transition hover:border-purple-400 hover:bg-purple-50 hover:text-purple-700 ${
          active ? "border-purple-400 bg-purple-50 text-purple-700" : "border-gray-300"
        }`}
      >
        <ImagePlus className="h-5 w-5" />
        <span className="text-[11px] font-semibold">
          {broken ? "Lỗi ảnh" : "Hình ảnh"}
        </span>
      </button>
    </div>
  );
}

export default CardImageField;
