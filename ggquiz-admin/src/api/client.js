import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export function decodeJwtPayload(token) {
  try {
    const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(base64)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join("")
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isTokenValid(token = localStorage.getItem("admin_token")) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
  return true;
}

export function clearAuthSession() {
  localStorage.removeItem("admin_token");
  localStorage.removeItem("admin_user");
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("admin_token");
  if (token && isTokenValid(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (token && !isTokenValid(token)) {
    clearAuthSession();
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = String(error.config?.url || "");
    if (status === 401 && !url.includes("/admin/login")) {
      clearAuthSession();
      if (!window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }
    return Promise.reject(error);
  }
);

export function getApiErrorMessage(error) {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    (Array.isArray(error.response?.data?.errors)
      ? error.response.data.errors.join(", ")
      : null) ||
    error.message ||
    "Đã xảy ra lỗi. Vui lòng thử lại."
  );
}

export function saveAuthSession({ token, user }) {
  if (token) {
    localStorage.setItem("admin_token", token);
  }
  if (user) {
    localStorage.setItem("admin_user", JSON.stringify(user));
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("admin_user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export const API_ORIGIN = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/api\/?$/, "");

export function mediaUrl(path) {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path)) return path;
  return `${API_ORIGIN}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function uploadAdminFile(kind, file) {
  const form = new FormData();
  form.append("file", file);
  const { data } = await api.post("/admin/upload", form, {
    params: { kind },
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export default api;
