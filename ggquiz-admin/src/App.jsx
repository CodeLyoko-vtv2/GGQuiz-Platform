import { Navigate, Route, Routes } from "react-router-dom";
import { Spin } from "antd";
import { useAuth } from "./auth/AuthContext";
import AdminLayout from "./layout/AdminLayout";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CurriculumPage from "./pages/CurriculumPage";
import BookStudioPage from "./pages/BookStudioPage";
import SolutionsPage from "./pages/SolutionsPage";
import SolutionsBookPage from "./pages/SolutionsBookPage";
import UsersPage from "./pages/UsersPage";
import UpgradeRequestsPage from "./pages/UpgradeRequestsPage";
import SpecializedFieldsPage from "./pages/SpecializedFieldsPage";
import SpecializedBuilderPage from "./pages/SpecializedBuilderPage";
import ReportsPage from "./pages/ReportsPage";

function Protected({ children, adminOnly = false }) {
  const { user, loading, isAdmin } = useAuth();
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <Spin size="large" />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (adminOnly && !isAdmin) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <Protected>
            <AdminLayout />
          </Protected>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="curriculum" element={<CurriculumPage />} />
        <Route path="curriculum/books/:id" element={<BookStudioPage />} />
        <Route path="solutions" element={<SolutionsPage />} />
        <Route path="solutions/books/:id" element={<SolutionsBookPage />} />
        <Route
          path="users"
          element={
            <Protected adminOnly>
              <UsersPage />
            </Protected>
          }
        />
        <Route path="specialized">
          <Route index element={<SpecializedFieldsPage />} />
          <Route path=":id" element={<SpecializedBuilderPage />} />
        </Route>
        <Route
          path="upgrades"
          element={
            <Protected adminOnly>
              <UpgradeRequestsPage />
            </Protected>
          }
        />
        <Route
          path="reports"
          element={
            <Protected adminOnly>
              <ReportsPage />
            </Protected>
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
