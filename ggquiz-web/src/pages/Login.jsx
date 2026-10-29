import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { getApiErrorMessage, saveAuthSession } from "../api/client";

const AUTH_BASE = "http://localhost:5000/api/auth";

function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const verify = searchParams.get("verify");
    if (verify === "invalid" || verify === "missing") {
      toast.error("Liên kết xác nhận không hợp lệ hoặc đã hết hạn.");
    } else if (verify === "error") {
      toast.error("Có lỗi khi xác nhận email. Vui lòng thử lại.");
    }
  }, [searchParams]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const { data } = await axios.post(`${AUTH_BASE}/login`, {
        email: form.email,
        password: form.password,
      });

      saveAuthSession({ token: data.token, user: data.user });
      toast.success("Đăng nhập thành công!");
      const next = searchParams.get("next");
      navigate(next && next.startsWith("/") ? next : "/");
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-gray-900 outline-none transition focus:border-purple-500 focus:bg-white focus:ring-2 focus:ring-purple-200";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="relative w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">
        <Link
          to="/"
          aria-label="Quay về trang chủ"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition hover:bg-gray-100 hover:text-gray-700"
        >
          <X className="h-5 w-5" />
        </Link>

        <div className="mb-8 text-center">
          <p className="mb-2 text-xs font-bold tracking-[0.25em] text-purple-600 uppercase">
            GGQuiz
          </p>
          <h1 className="text-2xl font-bold text-gray-900">Đăng nhập</h1>
          <p className="mt-2 text-sm text-gray-500">
            Tiếp tục hành trình chinh phục kiến thức
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="ban@email.com"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700">
              Mật khẩu
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Nhập mật khẩu"
              className={inputClass}
              required
            />
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                className="text-sm font-medium text-purple-600 hover:text-purple-700"
              >
                Quên mật khẩu?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-purple-600 px-4 py-3 font-semibold tracking-wide text-white uppercase shadow-md transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Đang đăng nhập..." : "Đăng nhập"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Mới sử dụng GGQuiz?{" "}
          <Link to="/register" className="font-semibold text-purple-600 hover:text-purple-700">
            Tạo tài khoản
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
