import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Card, Form, Input, Typography, message } from "antd";
import { useAuth } from "../auth/AuthContext";

export default function LoginPage() {
  const { user, login, errorMessage } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  if (user) return <Navigate to="/" replace />;

  return (
    <div className="login-shell">
      <section className="login-hero">
        <Typography.Text style={{ color: "#93c5fd", letterSpacing: 2 }}>
          GGQUIZ CONTROL CENTER
        </Typography.Text>
        <h1>Hệ thống quản trị nội dung chính quy</h1>
        <p>
          Điều khiển giáo trình, lời giải, người dùng và báo cáo vi phạm trên toàn bộ
          hệ sinh thái GGQuiz.
        </p>
      </section>
      <section className="login-form">
        <Card className="login-card page-card" title="Đăng nhập Admin">
          <Form
            layout="vertical"
            onFinish={async (values) => {
              setSubmitting(true);
              try {
                await login(values.email, values.password);
                message.success("Đăng nhập thành công");
                navigate("/");
              } catch (error) {
                message.error(errorMessage(error));
              } finally {
                setSubmitting(false);
              }
            }}
          >
            <Form.Item
              label="Email"
              name="email"
              rules={[{ required: true, message: "Nhập email quản trị" }]}
            >
              <Input size="large" placeholder="admin@ggquiz.local" />
            </Form.Item>
            <Form.Item
              label="Mật khẩu"
              name="password"
              rules={[{ required: true, message: "Nhập mật khẩu" }]}
            >
              <Input.Password size="large" placeholder="••••••••" />
            </Form.Item>
            <Button type="primary" htmlType="submit" size="large" block loading={submitting}>
              Vào bảng điều khiển
            </Button>
          </Form>
        </Card>
      </section>
    </div>
  );
}
