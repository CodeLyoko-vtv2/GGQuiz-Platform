import { useEffect, useState } from "react";
import {
  Crown,
  HelpCircle,
  LogOut,
  Moon,
  Settings,
  Shield,
  Sun,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../api/client";
import { useUserSettings } from "../../context/UserSettingsContext";
import AvatarMark from "./AvatarMark";

const RANK_COLOR = {
  iron: "from-slate-400 to-slate-600",
  bronze: "from-orange-400 to-amber-700",
  silver: "from-slate-300 to-slate-500",
  gold: "from-amber-300 to-yellow-500",
  plat: "from-cyan-300 to-teal-500",
  diamond: "from-sky-300 to-indigo-500",
  challenger: "from-fuchsia-400 to-purple-600",
};

function ProfileDropdown({ open, onClose }) {
  const navigate = useNavigate();
  const { user, copy, theme, setTheme, openModal, logout, isPremium } = useUserSettings();
  const [stats, setStats] = useState(null);

  useEffect(() => {
    if (!open) return undefined;
    let cancelled = false;
    api
      .get("/users/profile/stats")
      .then(({ data }) => {
        if (!cancelled) setStats(data.stats);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [open]);

  if (!open) return null;
  const rank = stats?.rank;
  const badges = stats?.badges || [];

  const go = (name) => {
    onClose();
    openModal(name);
  };

  return (
    <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
      <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-500 px-4 py-4 text-white">
        <div className="flex items-center gap-3">
          <AvatarMark user={user} size="lg" className="ring-white/80" />
          <div className="min-w-0">
            <p className="truncate text-base font-extrabold">{user?.name || "Người dùng"}</p>
            <p className="truncate text-xs text-white/80">{user?.email}</p>
            {isPremium ? (
              <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-amber-300/90 px-2 py-0.5 text-[10px] font-black text-slate-900">
                <Crown className="h-3 w-3" /> PREMIUM
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 px-4 py-3 dark:border-slate-800">
        <p className="text-[10px] font-bold tracking-wide text-slate-400 uppercase">{copy.rank}</p>
        <div className="mt-1 flex items-center justify-between">
          <p className="text-sm font-extrabold text-slate-900 dark:text-white">{rank?.name || "Sắt"}</p>
          <p className="text-xs font-semibold text-slate-400">{rank?.xp || 0} XP</p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <div
            className={`h-full rounded-full bg-gradient-to-r ${RANK_COLOR[rank?.id] || RANK_COLOR.iron}`}
            style={{ width: `${rank?.progress || 8}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          {badges.map((badge) => (
            <span
              key={badge.id}
              title={badge.hint}
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                badge.earned
                  ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200"
                  : "bg-slate-100 text-slate-400 line-through dark:bg-slate-800"
              }`}
            >
              {badge.name}
            </span>
          ))}
        </div>
      </div>

      <div className="p-2">
        <button type="button" onClick={() => go("settings")} className="menu-row">
          <Settings className="h-4 w-4" /> {copy.settings}
        </button>
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="menu-row justify-between"
        >
          <span className="inline-flex items-center gap-2">
            {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
            {copy.appearance}
          </span>
          <span className="text-xs font-bold text-slate-400">{theme === "dark" ? copy.dark : copy.light}</span>
        </button>
        <button type="button" onClick={() => go("privacy")} className="menu-row">
          <Shield className="h-4 w-4" /> {copy.privacy}
        </button>
        <button type="button" onClick={() => go("help")} className="menu-row">
          <HelpCircle className="h-4 w-4" /> {copy.help}
        </button>
        <button type="button" onClick={() => go("premium")} className="menu-row text-amber-700">
          <Crown className="h-4 w-4" /> {copy.premium}
        </button>
        <button
          type="button"
          onClick={() => {
            logout();
            onClose();
            navigate("/login");
          }}
          className="menu-row text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40"
        >
          <LogOut className="h-4 w-4" /> {copy.logout}
        </button>
      </div>
    </div>
  );
}

export default ProfileDropdown;
