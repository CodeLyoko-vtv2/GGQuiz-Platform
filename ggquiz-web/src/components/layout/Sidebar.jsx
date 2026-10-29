import { Link, NavLink } from "react-router-dom";
import {
  BookOpen,
  Bot,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Home,
  Languages,
  Layers3,
  Library,
  Lightbulb,
  NotebookPen,
  X,
} from "lucide-react";

const primaryItems = [
  { to: "/", label: "Trang chủ", icon: Home },
  { to: "/library", label: "Thư viện", icon: Library },
];

const studyItems = [
  { to: "/flashcards", label: "Thẻ ghi nhớ", icon: Layers3 },
  { to: "/practice-tests", label: "Đề thi", icon: ClipboardList },
  { to: "/lesson-plans", label: "Giáo án", icon: NotebookPen },
  { to: "/textbooks", label: "Giáo trình", icon: BookOpen },
  { to: "/explanations", label: "Lời giải", icon: Lightbulb },
];

const toolItems = [
  {
    id: "translate",
    label: "Từ điển",
    icon: Languages,
    action: "open-translate",
  },
  {
    id: "ai-assistant",
    label: "Trợ thủ AI",
    icon: Bot,
    action: "open-ai",
  },
  { to: "/schedule", label: "Thời khóa biểu", icon: CalendarDays },
];

function NavItem({
  item,
  onClose,
  isCollapsed,
  onOpenTranslate,
  onToggleAi,
  aiOpen,
}) {
  const Icon = item.icon;

  if (item.action === "open-translate" || item.action === "open-ai") {
    const isAi = item.action === "open-ai";
    return (
      <button
        type="button"
        onClick={() => {
          if (item.action === "open-translate") onOpenTranslate?.();
          if (isAi) onToggleAi?.();
          // Đóng menu mobile; trên desktop giữ sidebar trái
          if (!isAi || typeof window === "undefined" || window.innerWidth < 768) {
            onClose?.();
          }
        }}
        title={isCollapsed ? item.label : undefined}
        className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium transition ${
          isCollapsed ? "justify-center px-2" : "gap-3 px-3"
        } ${
          isAi && aiOpen
            ? "bg-purple-50 text-purple-800"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
        {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
      </button>
    );
  }

  return (
    <NavLink
      to={item.to}
      end={item.to === "/"}
      onClick={onClose}
      title={isCollapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center rounded-xl py-2.5 text-sm font-medium transition ${
          isCollapsed ? "justify-center px-2" : "gap-3 px-3"
        } ${
          isActive
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        }`
      }
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!isCollapsed ? <span className="truncate">{item.label}</span> : null}
    </NavLink>
  );
}

function SectionTitle({ children, isCollapsed }) {
  if (isCollapsed) return null;
  return (
    <p className="px-3 pt-3 pb-1 text-[11px] font-semibold tracking-wider text-gray-400 uppercase">
      {children}
    </p>
  );
}

function Divider({ isCollapsed }) {
  return <hr className={`my-3 border-gray-200 ${isCollapsed ? "mx-2" : "mx-3"}`} />;
}

function SpecializedNavLink({ onClose, isCollapsed }) {
  return (
    <NavLink
      to="/specialized"
      onClick={onClose}
      title={isCollapsed ? "Ngoại ngữ chuyên ngành" : undefined}
      className={({ isActive }) =>
        `esports-sig flex items-center rounded-xl py-2.5 text-sm font-semibold text-white ${
          isCollapsed ? "justify-center px-2" : "gap-3 px-3"
        } ${isActive ? "esports-sig--active" : ""}`
      }
    >
      <Languages className="h-5 w-5 shrink-0" strokeWidth={2} />
      {!isCollapsed ? (
        <span className="min-w-0 flex-1 leading-snug whitespace-normal">
          Ngoại ngữ chuyên ngành
        </span>
      ) : null}
    </NavLink>
  );
}

function SidebarNav({
  isCollapsed,
  onClose,
  showCloseButton,
  onToggleCollapse,
  showToggle,
  onOpenTranslate,
  onToggleAi,
  aiOpen,
}) {
  return (
    <>
      <div
        className={`flex h-16 items-center border-b border-gray-100 ${
          isCollapsed ? "justify-center px-2" : "justify-between gap-2 px-4"
        }`}
      >
        <Link
          to="/"
          onClick={onClose}
          title="Trang chủ"
          className={`flex min-w-0 items-center rounded-lg transition hover:opacity-90 ${
            isCollapsed ? "justify-center" : "gap-2"
          }`}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-purple-600 text-sm font-black text-white">
            GG
          </span>
          {!isCollapsed ? (
            <span className="truncate text-lg font-extrabold tracking-tight">GGQuiz</span>
          ) : null}
        </Link>

        {showCloseButton ? (
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 transition hover:bg-gray-100 md:hidden"
            aria-label="Đóng menu"
          >
            <X className="h-5 w-5" />
          </button>
        ) : null}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-2 py-3">
        {primaryItems.map((item) => (
          <NavItem
            key={item.to}
            item={item}
            onClose={onClose}
            isCollapsed={isCollapsed}
          />
        ))}

        <Divider isCollapsed={isCollapsed} />
        <SectionTitle isCollapsed={isCollapsed}>Học tập và luyện thi</SectionTitle>
        {studyItems.map((item) => (
          <NavItem
            key={item.to}
            item={item}
            onClose={onClose}
            isCollapsed={isCollapsed}
          />
        ))}

        <Divider isCollapsed={isCollapsed} />
        <SectionTitle isCollapsed={isCollapsed}>Bộ công cụ tiện ích</SectionTitle>
        {toolItems.map((item) => (
          <NavItem
            key={item.id || item.to}
            item={item}
            onClose={onClose}
            isCollapsed={isCollapsed}
            onOpenTranslate={onOpenTranslate}
            onToggleAi={onToggleAi}
            aiOpen={aiOpen}
          />
        ))}

        <Divider isCollapsed={isCollapsed} />

        <SpecializedNavLink onClose={onClose} isCollapsed={isCollapsed} />
      </nav>

      {showToggle ? (
        <div className={`border-t border-gray-100 p-2 ${isCollapsed ? "flex justify-center" : ""}`}>
          <button
            type="button"
            onClick={onToggleCollapse}
            className={`inline-flex items-center rounded-xl border border-gray-200 bg-white text-sm font-medium text-gray-600 transition hover:bg-gray-50 hover:text-purple-700 ${
              isCollapsed ? "h-10 w-10 justify-center" : "w-full justify-between gap-2 px-3 py-2.5"
            }`}
            aria-label={isCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
          >
            {!isCollapsed ? <span>Thu gọn</span> : null}
            {isCollapsed ? (
              <ChevronRight className="h-5 w-5" />
            ) : (
              <ChevronLeft className="h-5 w-5" />
            )}
          </button>
        </div>
      ) : null}
    </>
  );
}

function Sidebar({
  isMobileMenuOpen = false,
  onClose = () => {},
  isCollapsed = false,
  onToggleCollapse = () => {},
  onOpenTranslate = () => {},
  onToggleAi = () => {},
  aiOpen = false,
}) {
  return (
    <>
      <aside
        className={`gg-shell fixed top-0 left-0 z-40 hidden h-screen flex-col border-r border-gray-200 bg-white/90 backdrop-blur transition-all duration-300 md:flex dark:border-slate-800 dark:bg-slate-950/80 ${
          isCollapsed ? "w-20" : "w-64"
        }`}
      >
        <SidebarNav
          isCollapsed={isCollapsed}
          onClose={onClose}
          showCloseButton={false}
          onToggleCollapse={onToggleCollapse}
          showToggle
          onOpenTranslate={onOpenTranslate}
          onToggleAi={onToggleAi}
          aiOpen={aiOpen}
        />
      </aside>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Đóng overlay"
            onClick={onClose}
          />
          <aside className="gg-shell absolute top-0 left-0 flex h-full w-72 max-w-[85vw] translate-x-0 flex-col border-r border-gray-200 bg-white shadow-2xl transition-transform duration-300 dark:border-slate-800 dark:bg-slate-950">
            <SidebarNav
              isCollapsed={false}
              onClose={onClose}
              showCloseButton
              showToggle={false}
              onOpenTranslate={onOpenTranslate}
              onToggleAi={onToggleAi}
              aiOpen={aiOpen}
            />
          </aside>
        </div>
      ) : null}
    </>
  );
}

export default Sidebar;
