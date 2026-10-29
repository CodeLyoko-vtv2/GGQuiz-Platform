import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

let handlingUnauthorized = false;

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

export function isTokenValid(token = localStorage.getItem("token")) {
  if (!token) return false;
  const payload = decodeJwtPayload(token);
  if (!payload) return false;
  if (payload.exp && payload.exp * 1000 <= Date.now()) return false;
  return true;
}

export function clearAuthSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

export function handleUnauthorized(message) {
  if (handlingUnauthorized) return;
  handlingUnauthorized = true;
  clearAuthSession();

  const text =
    message || "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";

  import("react-hot-toast")
    .then(({ default: toast }) => toast.error(text))
    .catch(() => {});

  const path = window.location.pathname + window.location.search;
  const loginUrl =
    path && path !== "/login"
      ? `/login?next=${encodeURIComponent(path)}`
      : "/login";

  window.setTimeout(() => {
    handlingUnauthorized = false;
    if (!window.location.pathname.startsWith("/login")) {
      window.location.assign(loginUrl);
    }
  }, 300);
}

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token && isTokenValid(token)) {
    config.headers.Authorization = `Bearer ${token}`;
  } else if (token && !isTokenValid(token)) {
    // Token hết hạn phía client — xóa trước khi gọi API
    clearAuthSession();
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const message = error.response?.data?.message || "";
    const isAuthError =
      status === 401 ||
      /token|đăng nhập|unauthorized|hết hạn/i.test(String(message));

    if (isAuthError && !error.config?.skipAuthHandler) {
      handleUnauthorized(
        message || "Token không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại."
      );
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
    localStorage.setItem("token", token);
  }
  if (user) {
    localStorage.setItem("user", JSON.stringify(user));
  }
}

export function getStoredUser() {
  try {
    const raw = localStorage.getItem("user");
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

export default api;
