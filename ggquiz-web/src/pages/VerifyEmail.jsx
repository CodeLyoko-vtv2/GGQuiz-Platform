import { Link, useLocation, useNavigate } from "react-router-dom";
import { Mail } from "lucide-react";

function VerifyEmail() {
  const navigate = useNavigate();
  const location = useLocation();
  const email = location.state?.email || "";

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-lg">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100 text-purple-600">
          <Mail className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900">
          Xác nhận email của bạn để tiếp tục
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Hệ thống đã gửi liên kết xác nhận đến{" "}
          <span className="font-semibold text-purple-700">
            {email || "email của bạn"}
          </span>
          . Hãy mở hộp thư (và kiểm tra cả mục Spam) rồi nhấn nút{" "}
          <strong>Xác nhận</strong> trong email.
        </p>

        <button
          type="button"
          onClick={() => navigate("/register")}
          className="mt-8 w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-800 transition hover:bg-gray-50"
        >
          Thay đổi email
        </button>

        <p className="mt-4 text-sm text-gray-500">
          Đã xác nhận xong?{" "}
          <Link to="/login" className="font-semibold text-purple-600 hover:text-purple-700">
            Đăng nhập
          </Link>
        </p>
      </div>
    </div>
  );
}

export default VerifyEmail;
