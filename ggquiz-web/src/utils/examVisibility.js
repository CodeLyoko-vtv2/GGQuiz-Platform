export const EXAM_VISIBILITY = {
  public: "public",
  private: "private",
  unlisted: "unlisted",
};

export const EXAM_VISIBILITY_OPTIONS = [
  {
    id: "public",
    label: "Công khai",
    hint: "Hiện trên trang Đề thi. Mọi người đều xem được.",
  },
  {
    id: "private",
    label: "Riêng tư",
    hint: "Chỉ bạn mới xem, thi thử và tổ chức thi được.",
  },
  {
    id: "unlisted",
    label: "Bất kỳ ai có đường liên kết",
    hint: "Không hiện trên trang Đề thi. Ai có link thì vào được.",
  },
];

export function visibilityLabel(value) {
  return EXAM_VISIBILITY_OPTIONS.find((item) => item.id === value)?.label || "Quyền riêng tư";
}
