import { Shield, X } from "lucide-react";
import toast from "react-hot-toast";
import { useUserSettings } from "../../context/UserSettingsContext";

const ROWS = [
  { key: "profilePublic", title: "Hồ sơ công khai", hint: "Người khác có thể xem trang hồ sơ của bạn." },
  { key: "showOnLeaderboard", title: "Hiện trên bảng xếp hạng", hint: "XP và rank xuất hiện ở leaderboard (sắp ra mắt)." },
  { key: "hideEmail", title: "Ẩn email", hint: "Email không hiển thị với người khác." },
  { key: "allowFriendRequests", title: "Cho phép kết bạn", hint: "Mở để nhận lời mời học nhóm sau này." },
];

function PrivacyModal() {
  const { modal, closeModal, privacy, setPrivacy } = useUserSettings();
  if (modal !== "privacy") return null;

  const toggle = async (key) => {
    const next = { ...privacy, [key]: !privacy[key] };
    await setPrivacy(next);
    toast.success("Đã lưu quyền riêng tư");
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-4" onClick={closeModal}>
      <div
        className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="inline-flex items-center gap-1.5 text-xs font-bold tracking-wide text-indigo-600 uppercase">
              <Shield className="h-3.5 w-3.5" />
              Quyền riêng tư
            </p>
            <h2 className="mt-1 text-xl font-extrabold text-slate-900 dark:text-white">Kiểm soát những gì người khác thấy</h2>
          </div>
          <button type="button" onClick={closeModal} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="mt-5 space-y-3">
          {ROWS.map((row) => (
            <label
              key={row.key}
              className="flex cursor-pointer items-start justify-between gap-4 rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-700"
            >
              <span>
                <span className="block text-sm font-bold text-slate-900 dark:text-white">{row.title}</span>
                <span className="block text-xs text-slate-500">{row.hint}</span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(privacy?.[row.key])}
                onChange={() => toggle(row.key)}
                className="mt-1 h-4 w-4 accent-indigo-600"
              />
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

export default PrivacyModal;
