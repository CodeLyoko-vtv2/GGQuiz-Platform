import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ClipboardList,
  DoorOpen,
  FolderPlus,
  Layers3,
  Menu,
  NotebookPen,
  Plus,
  Search,
} from "lucide-react";
import { usePlannerNotifications } from "../../context/PlannerNotificationsContext";
import { useUserSettings } from "../../context/UserSettingsContext";
import AvatarMark from "../profile/AvatarMark";
import ProfileDropdown from "../profile/ProfileDropdown";
import JoinExamModal from "../exams/JoinExamModal";

function Topbar({
  onOpenMobileMenu = () => {},
  isCollapsed = false,
  aiOpen = false,
  aiSidebarWidth = 360,
}) {
  const navigate = useNavigate();
  const { user, openModal, isPremium, upgradePending } = useUserSettings();
  const [profileOpen, setProfileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const profileRef = useRef(null);
  const addRef = useRef(null);
  const bellRef = useRef(null);
  const plannerNotes = usePlannerNotifications();
  const unreadCount = plannerNotes?.unreadCount || 0;
  const notifications = plannerNotes?.notifications || [];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileRef.current && !profileRef.current.contains(event.target)) {
        setProfileOpen(false);
      }
      if (addRef.current && !addRef.current.contains(event.target)) {
        setAddOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(event.target)) {
        setBellOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearchKeyDown = (event) => {
    if (event.key !== "Enter") return;
    event.preventDefault();
    const q = searchQuery.trim();
    if (!q) return;
    navigate(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <header
      className={`fixed top-0 left-0 z-40 flex h-16 items-center gap-3 border-b border-gray-200 bg-white/90 px-3 backdrop-blur transition-all duration-300 sm:px-4 md:gap-4 md:px-6 dark:border-slate-800 dark:bg-slate-950/80 ${
        isCollapsed ? "md:left-20" : "md:left-64"
      }`}
      style={{
        right: aiOpen ? `min(${aiSidebarWidth}px, 100vw)` : 0,
      }}
    >
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-gray-700 transition hover:bg-gray-50 md:hidden"
        aria-label="Mở menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <div className="flex min-w-0 flex-1 justify-start">
        <div className="relative w-full max-w-md lg:max-w-lg">
          <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
            placeholder="Tìm học phần..."
            className="w-full rounded-full border border-gray-200 bg-gray-50 py-2.5 pr-4 pl-10 text-sm outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200"
          />
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={() => setJoinOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-2 text-sm font-semibold text-indigo-700 hover:bg-indigo-100 sm:px-4"
        >
          <DoorOpen className="h-4 w-4" />
          <span className="hidden sm:inline">Vào phòng thi</span>
        </button>
        <div className="relative" ref={addRef}>
          <button
            type="button"
            onClick={() => setAddOpen((open) => !open)}
            className="inline-flex items-center gap-1 rounded-full border border-gray-200 px-3 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 sm:px-4"
            aria-expanded={addOpen}
            aria-label="Tạo nhanh"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Thêm</span>
          </button>
          {addOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
              <Link
                to="/library?create=1"
                onClick={() => setAddOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-purple-50 hover:text-purple-700"
              >
                <FolderPlus className="h-4 w-4 text-gray-600" />
                Tạo thư mục
              </Link>
              <Link
                to="/create-set"
                onClick={() => setAddOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-purple-50 hover:text-purple-700"
              >
                <Layers3 className="h-4 w-4 text-gray-600" />
                Tạo học phần
              </Link>
              <Link
                to="/exams/create"
                onClick={() => setAddOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-purple-50 hover:text-purple-700"
              >
                <ClipboardList className="h-4 w-4 text-gray-600" />
                Tạo đề thi
              </Link>
              <Link
                to="/lesson-plans?create=1"
                onClick={() => setAddOpen(false)}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-gray-800 transition hover:bg-purple-50 hover:text-purple-700"
              >
                <NotebookPen className="h-4 w-4 text-gray-600" />
                Soạn giáo án
              </Link>
            </div>
          ) : null}
        </div>
        <JoinExamModal open={joinOpen} onClose={() => setJoinOpen(false)} />

        <button
          type="button"
          disabled={upgradePending && !isPremium}
          onClick={() => openModal("premium")}
          className={`hidden items-center whitespace-nowrap rounded-full px-5 py-2 text-sm font-bold shadow-sm transition lg:inline-flex lg:px-6 ${
            isPremium
              ? "bg-slate-900 text-amber-300"
              : upgradePending
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-gradient-to-r from-amber-400 via-yellow-400 to-orange-400 text-gray-900 shadow-[0_0_16px_rgba(251,191,36,0.45)] hover:brightness-105"
          }`}
        >
          {isPremium ? "Premium" : upgradePending ? "Đang xử lý" : "Nâng cấp Premium"}
        </button>
        <button
          type="button"
          disabled={upgradePending && !isPremium}
          onClick={() => openModal("premium")}
          className={`inline-flex whitespace-nowrap rounded-full px-3 py-2 text-xs font-bold shadow-sm lg:hidden ${
            isPremium
              ? "bg-slate-900 text-amber-300"
              : upgradePending
                ? "cursor-not-allowed bg-slate-200 text-slate-500"
                : "bg-gradient-to-r from-amber-400 to-orange-400 text-gray-900"
          }`}
        >
          {isPremium ? "Premium" : upgradePending ? "Chờ duyệt" : "Nâng cấp Premium"}
        </button>

        <div className="relative" ref={bellRef}>
          <button
            type="button"
            aria-label="Thông báo"
            onClick={() => {
              setBellOpen((open) => !open);
              if (typeof Notification !== "undefined" && Notification.permission === "default") {
                Notification.requestPermission().catch(() => {});
              }
            }}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 text-gray-700 hover:bg-gray-50"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            ) : null}
          </button>
          {bellOpen ? (
            <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
                <p className="text-sm font-extrabold text-gray-900">Thông báo</p>
                {unreadCount > 0 ? (
                  <button
                    type="button"
                    onClick={() => plannerNotes?.markAllRead?.()}
                    className="text-xs font-semibold text-blue-600 hover:underline"
                  >
                    Đánh dấu đã đọc
                  </button>
                ) : null}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-8 text-center text-sm text-gray-400">
                    Chưa có thông báo
                  </p>
                ) : (
                  notifications.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        plannerNotes?.markRead?.(item.id, item.source);
                        setBellOpen(false);
                        navigate(item.link || "/schedule");
                      }}
                      className={`block w-full border-b border-gray-50 px-4 py-3 text-left hover:bg-gray-50 ${
                        item.read ? "opacity-70" : ""
                      }`}
                    >
                      <p className="text-sm font-bold text-gray-900">{item.title}</p>
                      <p className="mt-0.5 text-xs text-gray-500">{item.body}</p>
                    </button>
                  ))
                )}
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative" ref={profileRef}>
          <button
            type="button"
            aria-label="Hồ sơ"
            aria-expanded={profileOpen}
            onClick={() => setProfileOpen((open) => !open)}
            className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-purple-600 text-sm font-bold text-white"
          >
            <AvatarMark user={user} />
          </button>
          <ProfileDropdown open={profileOpen} onClose={() => setProfileOpen(false)} />
        </div>
      </div>
    </header>
  );
}

export default Topbar;
