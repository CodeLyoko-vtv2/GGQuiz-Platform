import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { clearAuthSession, getStoredUser, saveAuthSession } from "../api/client";
import { COPY, DEFAULT_PRIVACY } from "../utils/appearance";

const PREFS_KEY = "ggquiz-appearance";
const UserSettingsContext = createContext(null);

function readPrefs() {
  try {
    return JSON.parse(localStorage.getItem(PREFS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePrefs(prefs) {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
}

export function UserSettingsProvider({ children }) {
  const stored = getStoredUser();
  const local = readPrefs();
  const [user, setUser] = useState(stored);
  const [theme, setTheme] = useState(local.theme || stored?.theme || "light");
  const [language, setLanguage] = useState(local.language || stored?.language || "vi");
  const [background, setBackground] = useState(local.background || { type: "none" });
  const [privacy, setPrivacy] = useState(local.privacy || DEFAULT_PRIVACY);
  const [plan, setPlan] = useState(stored?.plan || "free");
  const [upgradePending, setUpgradePending] = useState(Boolean(stored?.upgradePending));
  const [modal, setModal] = useState("");

  const applyUser = (next) => {
    if (!next) return;
    setUser(next);
    if (next.theme) setTheme(next.theme);
    if (next.language) setLanguage(next.language);
    if (next.background) setBackground(next.background);
    if (next.privacy) setPrivacy(next.privacy);
    if (next.plan) setPlan(next.plan);
    if (next.upgradePending != null) setUpgradePending(Boolean(next.upgradePending));
    const token = localStorage.getItem("token");
    saveAuthSession({ token, user: { ...getStoredUser(), ...next } });
  };

  useEffect(() => {
    writePrefs({ theme, language, background, privacy });
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.classList.toggle("has-wallpaper", background?.type && background.type !== "none");
    document.documentElement.lang = language === "en" ? "en" : "vi";
  }, [theme, language, background, privacy]);

  useEffect(() => {
    if (!localStorage.getItem("token")) return undefined;
    let cancelled = false;
    const load = () =>
      api
        .get("/users/me")
        .then(({ data }) => {
          if (!cancelled && data.user) applyUser(data.user);
        })
        .catch(() => {});
    load();
    const timer = window.setInterval(load, upgradePending ? 12000 : 60000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [upgradePending]);

  const persist = async (patch) => {
    const { data } = await api.put("/users/me", patch);
    applyUser(data.user);
    return data.user;
  };

  const value = useMemo(
    () => ({
      user,
      theme,
      language,
      background,
      privacy,
      plan,
      upgradePending,
      isPremium: plan === "premium",
      copy: COPY[language] || COPY.vi,
      modal,
      openModal: (name) => setModal(name),
      closeModal: () => setModal(""),
      setTheme: async (next) => {
        setTheme(next);
        if (localStorage.getItem("token")) persist({ theme: next }).catch(() => {});
      },
      setLanguage: async (next) => {
        setLanguage(next);
        if (localStorage.getItem("token")) persist({ language: next }).catch(() => {});
      },
      setBackground: async (next) => {
        setBackground(next);
        if (localStorage.getItem("token")) persist({ background: next }).catch(() => {});
      },
      setPrivacy: async (next) => {
        setPrivacy(next);
        if (localStorage.getItem("token")) persist({ privacy: next }).catch(() => {});
      },
      setPlan: async (next) => {
        setPlan(next);
      },
      persist,
      applyUser,
      logout: () => {
        clearAuthSession();
        setUser(null);
        setModal("");
      },
    }),
    [user, theme, language, background, privacy, plan, upgradePending, modal]
  );

  return <UserSettingsContext.Provider value={value}>{children}</UserSettingsContext.Provider>;
}

export function useUserSettings() {
  const ctx = useContext(UserSettingsContext);
  if (!ctx) throw new Error("useUserSettings must be used within UserSettingsProvider");
  return ctx;
}
