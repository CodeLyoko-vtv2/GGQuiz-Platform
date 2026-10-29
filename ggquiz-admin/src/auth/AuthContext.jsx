import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, {
  clearAuthSession,
  getApiErrorMessage,
  getStoredUser,
  isTokenValid,
  saveAuthSession,
} from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => (isTokenValid() ? getStoredUser() : null));
  const [loading, setLoading] = useState(Boolean(isTokenValid()));

  useEffect(() => {
    if (!isTokenValid()) {
      clearAuthSession();
      setUser(null);
      setLoading(false);
      return;
    }

    api
      .get("/admin/me")
      .then(({ data }) => {
        setUser(data.user);
        saveAuthSession({ user: data.user });
      })
      .catch(() => {
        clearAuthSession();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin: user?.role === "ADMIN",
      async login(email, password) {
        const { data } = await api.post("/admin/login", { email, password });
        saveAuthSession({ token: data.token, user: data.user });
        setUser(data.user);
        return data.user;
      },
      logout() {
        clearAuthSession();
        setUser(null);
      },
      errorMessage: getApiErrorMessage,
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
