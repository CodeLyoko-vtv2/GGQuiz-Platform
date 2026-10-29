import { useMemo } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Breadcrumb, Dropdown, Layout, Menu, Typography } from "antd";
import {
  AlertOutlined,
  BookOutlined,
  CrownOutlined,
  GlobalOutlined,
  DashboardOutlined,
  FileTextOutlined,
  LogoutOutlined,
  TeamOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useAuth } from "../auth/AuthContext";

const { Header, Sider, Content } = Layout;

const ITEMS = [
  { key: "/", icon: <DashboardOutlined />, label: "Tổng quan" },
  { key: "/curriculum", icon: <BookOutlined />, label: "Giáo trình" },
  { key: "/solutions", icon: <FileTextOutlined />, label: "Lời giải" },
  { key: "/specialized", icon: <GlobalOutlined />, label: "Ngoại ngữ chuyên ngành" },
  { key: "/users", icon: <TeamOutlined />, label: "Người dùng" },
  { key: "/upgrades", icon: <CrownOutlined />, label: "Quản lý Nâng cấp" },
  { key: "/reports", icon: <AlertOutlined />, label: "Báo cáo" },
];

const TITLES = {
  "/": "Tổng quan",
  "/curriculum": "Quản lý giáo trình",
  "/solutions": "Quản lý lời giải",
  "/specialized": "Ngoại ngữ chuyên ngành",
  "/users": "Quản lý người dùng",
  "/upgrades": "Quản lý Nâng cấp",
  "/reports": "Báo cáo & vi phạm",
};

export default function AdminLayout() {
  const { user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const selected = ITEMS.find((item) =>
    item.key === "/" ? location.pathname === "/" : location.pathname.startsWith(item.key)
  )?.key || "/";

  const menuItems = useMemo(
    () =>
      ITEMS.filter((item) => isAdmin || !["/users", "/upgrades", "/reports"].includes(item.key)).map((item) => ({
        ...item,
        label: <Link to={item.key}>{item.label}</Link>,
      })),
    [isAdmin]
  );

  return (
    <Layout className="admin-layout">
      <Sider className="admin-sider" width={236} breakpoint="sm" collapsedWidth={72}>
        <div className="admin-logo">
          GGQuiz <span>Admin</span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selected]}
          items={menuItems}
          style={{ background: "transparent", borderInlineEnd: 0 }}
        />
      </Sider>
      <Layout>
        <Header className="admin-header">
          <Breadcrumb
            items={[
              { title: "Quản trị" },
              { title: TITLES[selected] || "Trang" },
            ]}
          />
          <Dropdown
            menu={{
              items: [
                {
                  key: "logout",
                  icon: <LogoutOutlined />,
                  label: "Đăng xuất",
                  onClick: () => {
                    logout();
                    navigate("/login");
                  },
                },
              ],
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
              <Avatar src={user?.avatar || undefined} icon={<UserOutlined />} />
              <div>
                <Typography.Text strong>{user?.name || "Admin"}</Typography.Text>
                <div style={{ fontSize: 12, color: "#64748b" }}>{user?.role}</div>
              </div>
            </div>
          </Dropdown>
        </Header>
        <Content className="admin-content">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
