import { useEffect, useState } from "react";
import { ImagePlus, Moon, Sun, Trash2, X } from "lucide-react";
import toast from "react-hot-toast";
import api, { getApiErrorMessage } from "../../api/client";
import { useUserSettings } from "../../context/UserSettingsContext";
import {
  DEFAULT_AVATARS,
  WALLPAPERS,
  parseBackgroundInput,
  resizeImageFile,
} from "../../utils/appearance";
import AvatarMark from "./AvatarMark";

const TABS = [
  { id: "profile", label: "Hồ sơ" },
  { id: "look", label: "Giao diện & nền" },
  { id: "security", label: "Bảo mật" },
];

function SettingsModal() {
  const settings = useUserSettings();
  const { modal, closeModal, user, persist, theme, setTheme, language, setLanguage, background, setBackground, logout } =
    settings;
  const [tab, setTab] = useState("profile");
  const [name, setName] = useState(user?.name || "");
  const [birthday, setBirthday] = useState(user?.birthday ? String(user.birthday).slice(0, 10) : "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [bgInput, setBgInput] = useState(background?.url || background?.videoId || "");
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [confirmDelete, setConfirmDelete] = useState("");
  const [busy, setBusy] = useState("");

  useEffect(() => {
    if (modal !== "settings") return;
    setName(user?.name || "");
    setBirthday(user?.birthday ? String(user.birthday).slice(0, 10) : "");
    setAvatar(user?.avatar || "");
    setBgInput(background?.url || background?.videoId || "");
  }, [modal, user, background]);

  if (modal !== "settings") return null;

  const saveProfile = async () => {
    setBusy("profile");
    try {
      await persist({ name, birthday: birthday || null, avatar });
      toast.success("Đã lưu hồ sơ");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pw.newPassword !== pw.confirm) {
      toast.error("Xác nhận mật khẩu không khớp");
      return;
    }
    setBusy("pw");
    try {
      await api.put("/users/me/password", pw);
      toast.success("Đã đổi mật khẩu");
      setPw({ currentPassword: "", newPassword: "", confirm: "" });
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  const removeAccount = async () => {
    setBusy("del");
    try {
      await api.delete("/users/me", { data: { confirm: confirmDelete } });
      toast.success("Tài khoản đã xóa");
      logout();
      window.location.assign("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4" onClick={closeModal}>
      <div
        className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <h2 className="text-lg font-extrabold text-slate-900 dark:text-white">Cài đặt tài khoản</h2>
          <button type="button" onClick={closeModal} className="rounded-full p-2 hover:bg-slate-100 dark:hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="flex gap-2 border-b border-slate-100 px-5 py-2 dark:border-slate-800">
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-bold ${
                tab === item.id ? "bg-indigo-600 text-white" : "text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {tab === "profile" ? (
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <AvatarMark user={{ ...user, avatar }} size="xl" />
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold dark:border-slate-700">
                  <ImagePlus className="h-4 w-4" />
                  Tải ảnh từ máy
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setAvatar(await resizeImageFile(file));
                      } catch (err) {
                        toast.error(err.message);
                      }
                    }}
                  />
                </label>
              </div>
              <div>
                <p className="mb-2 text-xs font-bold tracking-wide text-slate-400 uppercase">Avatar mặc định · Esports</p>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {DEFAULT_AVATARS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      title={`${item.name} · ${item.game}`}
                      onClick={() => setAvatar(item.src)}
                      className={`rounded-2xl p-1 ring-2 ${
                        avatar === item.src ? "ring-indigo-500" : "ring-transparent hover:ring-slate-200"
                      }`}
                    >
                      <img src={item.src} alt={item.name} className="h-14 w-14 rounded-xl bg-slate-100 object-cover" />
                      <span className="mt-1 block text-center text-[10px] font-bold text-slate-500">{item.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <label className="block text-sm font-semibold">
                Tên người dùng
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 font-medium outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="block text-sm font-semibold">
                Ngày sinh
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 outline-none dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <label className="block text-sm font-semibold">
                Email
                <input
                  value={user?.email || ""}
                  readOnly
                  className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-slate-500 dark:border-slate-700 dark:bg-slate-800"
                />
              </label>
              <button
                type="button"
                disabled={busy === "profile"}
                onClick={saveProfile}
                className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
              >
                {busy === "profile" ? "Đang lưu..." : "Lưu hồ sơ"}
              </button>
            </div>
          ) : null}

          {tab === "look" ? (
            <div className="space-y-6">
              <div>
                <p className="text-sm font-bold">Giao diện</p>
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme("light")}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                      theme === "light" ? "bg-indigo-600 text-white" : "border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Sun className="h-4 w-4" /> Sáng
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme("dark")}
                    className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold ${
                      theme === "dark" ? "bg-indigo-600 text-white" : "border border-slate-200 dark:border-slate-700"
                    }`}
                  >
                    <Moon className="h-4 w-4" /> Tối
                  </button>
                </div>
              </div>
              <label className="block text-sm font-bold">
                Ngôn ngữ hệ thống
                <select
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </label>
              <div>
                <p className="text-sm font-bold">Hình nền (chuẩn OpenQuiz)</p>
                <p className="text-xs text-slate-500">Dán link ảnh .jpg/.png/.gif hoặc link YouTube để làm live wallpaper.</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={bgInput}
                    onChange={(e) => setBgInput(e.target.value)}
                    placeholder="https://... hoặc youtube.com/watch?v="
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none dark:border-slate-700 dark:bg-slate-800"
                  />
                  <button
                    type="button"
                    onClick={() => setBackground(parseBackgroundInput(bgInput))}
                    className="rounded-xl bg-indigo-600 px-3 py-2 text-sm font-bold text-white"
                  >
                    Áp dụng
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setBgInput("");
                    setBackground({ type: "none" });
                  }}
                  className="mt-2 text-xs font-semibold text-slate-500 hover:text-red-600"
                >
                  Gỡ hình nền
                </button>
                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {WALLPAPERS.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setBackground(item);
                        setBgInput(item.url || `https://youtu.be/${item.videoId}`);
                      }}
                      className="overflow-hidden rounded-2xl text-left ring-2 ring-transparent hover:ring-indigo-400"
                    >
                      <img
                        src={item.thumb || item.url}
                        alt={item.name}
                        className="h-20 w-full object-cover"
                      />
                      <span className="block px-2 py-1.5 text-xs font-bold">
                        {item.name}
                        {item.type === "youtube" ? " · Live" : ""}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {tab === "security" ? (
            <div className="space-y-8">
              <form onSubmit={changePassword} className="space-y-3">
                <p className="text-sm font-bold">Đổi mật khẩu</p>
                <input
                  type="password"
                  placeholder="Mật khẩu hiện tại"
                  value={pw.currentPassword}
                  onChange={(e) => setPw((s) => ({ ...s, currentPassword: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="password"
                  placeholder="Mật khẩu mới"
                  value={pw.newPassword}
                  onChange={(e) => setPw((s) => ({ ...s, newPassword: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <input
                  type="password"
                  placeholder="Nhập lại mật khẩu mới"
                  value={pw.confirm}
                  onChange={(e) => setPw((s) => ({ ...s, confirm: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
                />
                <button
                  type="submit"
                  disabled={busy === "pw"}
                  className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white"
                >
                  {busy === "pw" ? "Đang đổi..." : "Cập nhật mật khẩu"}
                </button>
              </form>
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/30">
                <p className="inline-flex items-center gap-2 text-sm font-extrabold text-red-700 dark:text-red-300">
                  <Trash2 className="h-4 w-4" />
                  Vùng nguy hiểm
                </p>
                <p className="mt-1 text-xs text-red-600/80">Xóa tài khoản sẽ xóa thẻ, đề thi và giáo án. Không hoàn tác được.</p>
                <input
                  value={confirmDelete}
                  onChange={(e) => setConfirmDelete(e.target.value)}
                  placeholder='Gõ "XÓA" để xác nhận'
                  className="mt-3 w-full rounded-xl border border-red-200 px-3 py-2 text-sm dark:bg-slate-900"
                />
                <button
                  type="button"
                  disabled={busy === "del"}
                  onClick={removeAccount}
                  className="mt-3 rounded-xl bg-red-600 px-4 py-2 text-sm font-bold text-white"
                >
                  Xóa tài khoản
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default SettingsModal;
