import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import toast from "react-hot-toast";
import { X } from "lucide-react";
import { getApiErrorMessage, saveAuthSession } from "../api/client";

const AUTH_BASE = "http://localhost:5000/api/auth";

function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Mật khẩu nhập lại không khớp.");
      return;
    }

    if (form.password.length < 6) {
      toast.error("Mật khẩu phải có ít nhất 6 ký tự.");
      return;
    }

    setLoading(true);

    try {
      const { data } = await axios.post(`${AUTH_BASE}/register`, {
        name: form.name,
        email: form.email,
        password: form.password,
      });

      saveAuthSession({ token: data.token, user: data.user });
      toast.success("Đăng ký thành công!");
      navigate("/");
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
          <h1 className="text-2xl font-bold text-gray-900">Tạo tài khoản</h1>
          <p className="mt-2 text-sm text-gray-500">
            Tham gia đấu trường tri thức Esports
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
              Tên người dùng
            </label>
            <input
              id="name"
              name="name"
              type="text"
              autoComplete="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Nhập tên của bạn"
              className={inputClass}
              required
            />
          </div>

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
              autoComplete="new-password"
              value={form.password}
              onChange={handleChange}
              placeholder="Tối thiểu 6 ký tự"
              className={inputClass}
              required
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="mb-1.5 block text-sm font-medium text-gray-700"
            >
              Nhập lại mật khẩu
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={form.confirmPassword}
              onChange={handleChange}
              placeholder="Nhập lại mật khẩu"
              className={inputClass}
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full rounded-xl bg-purple-600 px-4 py-3 font-semibold tracking-wide text-white uppercase shadow-md transition hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? "Đang tạo tài khoản..." : "Đăng ký"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-600">
          Bạn đã có tài khoản rồi?{" "}
          <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-700">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
