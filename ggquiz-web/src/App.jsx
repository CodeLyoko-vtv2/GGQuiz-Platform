import { useEffect } from "react";
import {
  BrowserRouter,
  Navigate,
  Outlet,
  Route,
  Routes,
  useNavigate,
  useSearchParams,
} from "react-router-dom";
import { Toaster } from "react-hot-toast";
import toast from "react-hot-toast";
import MainLayout from "./components/layout/MainLayout";
import { clearAuthSession, isTokenValid, saveAuthSession } from "./api/client";
import CreateSet from "./pages/CreateSet";
import EditSet from "./pages/EditSet";
import SpecializedHub from "./pages/specialized/SpecializedHub";
import SpecializedRoadmap from "./pages/specialized/SpecializedRoadmap";
import SpecializedLesson from "./pages/specialized/SpecializedLesson";
import Home from "./pages/Home";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import FolderDetail from "./pages/FolderDetail";
import MyLibrary from "./pages/MyLibrary";
import PlaceholderPage from "./pages/PlaceholderPage";
import QuizMode from "./pages/QuizMode";
import Register from "./pages/Register";
import SearchResults from "./pages/SearchResults";
import StudySetDetail from "./pages/StudySetDetail";
import UserProfile from "./pages/UserProfile";
import VerifyEmail from "./pages/VerifyEmail";
import ExamList from "./pages/exams/ExamList";
import CreateExam from "./pages/exams/CreateExam";
import ExamDetail from "./pages/exams/ExamDetail";
import EditExam from "./pages/exams/EditExam";
import ExamTaking from "./pages/exams/ExamTaking";
import LiveExamHost from "./pages/exams/LiveExamHost";
import LiveExamTaking from "./pages/exams/LiveExamTaking";
import LiveExamGrading from "./pages/exams/LiveExamGrading";
import LiveExamFeedback from "./pages/exams/LiveExamFeedback";
import StudyPlanner from "./pages/StudyPlanner";
import CalendarSettings from "./pages/CalendarSettings";
import FlashcardDashboard from "./pages/FlashcardDashboard";
import { UserSettingsProvider } from "./context/UserSettingsContext";
import ProfileHost from "./components/profile/ProfileHost";
import LessonPlanHub from "./pages/lessonPlans/LessonPlanHub";
import LessonPlanEditor from "./pages/lessonPlans/LessonPlanEditor";
import LessonPlanViewer from "./pages/lessonPlans/LessonPlanViewer";
import LessonPlanPresent from "./pages/lessonPlans/LessonPlanPresent";
import TextbookHub from "./pages/textbooks/TextbookHub";
import TextbookSeries from "./pages/textbooks/TextbookSeries";
import TextbookReader from "./pages/textbooks/TextbookReader";
import ExplanationHub from "./pages/explanations/ExplanationHub";
import ExplanationSeries from "./pages/explanations/ExplanationSeries";
import ExplanationToc from "./pages/explanations/ExplanationToc";
import ExplanationDetail from "./pages/explanations/ExplanationDetail";

function isAuthenticated() {
  const token = localStorage.getItem("token");
  if (!token) return false;
  if (!isTokenValid(token)) {
    clearAuthSession();
    return false;
  }
  return true;
}

function decodeJwtPayload(token) {
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

function AuthTokenHandler() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  useEffect(() => {
    // Dọn token hết hạn còn sót trong localStorage
    const existing = localStorage.getItem("token");
    if (existing && !isTokenValid(existing)) {
      clearAuthSession();
    }

    const authToken = searchParams.get("auth_token");
    if (!authToken) return;

    const payload = decodeJwtPayload(authToken);
    saveAuthSession({
      token: authToken,
      user: {
        id: payload?.userId,
        email: payload?.email,
        role: payload?.role || "STUDENT",
        name: payload?.name || "Người dùng",
      },
    });

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("auth_token");
    setSearchParams(nextParams, { replace: true });
    toast.success("Email đã xác nhận! Chào mừng bạn đến GGQuiz.");
    navigate("/", { replace: true });
    window.location.replace("/");
  }, [searchParams, setSearchParams, navigate]);

  return null;
}

function RootRoute() {
  if (!isAuthenticated()) {
    return <Landing />;
  }

  return (
    <MainLayout>
      <Home />
    </MainLayout>
  );
}

function GuestOnlyRoute({ children }) {
  if (isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function ProtectedRoute() {
  if (!isAuthenticated()) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}

function App() {
  return (
    <BrowserRouter>
      <UserSettingsProvider>
      <ProfileHost />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            background: "#0f172a",
            color: "#ffffff",
            border: "1px solid rgba(168, 85, 247, 0.55)",
            boxShadow: "0 0 20px rgba(147, 51, 234, 0.25)",
          },
          success: {
            iconTheme: {
              primary: "#a855f7",
              secondary: "#0f172a",
            },
          },
          error: {
            iconTheme: {
              primary: "#ef4444",
              secondary: "#0f172a",
            },
          },
        }}
      />
      <AuthTokenHandler />
      <Routes>
        <Route path="/" element={<RootRoute />} />
        <Route
          path="/login"
          element={
            <GuestOnlyRoute>
              <Login />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/register"
          element={
            <GuestOnlyRoute>
              <Register />
            </GuestOnlyRoute>
          }
        />
        <Route
          path="/verify-email"
          element={
            <GuestOnlyRoute>
              <VerifyEmail />
            </GuestOnlyRoute>
          }
        />

        <Route element={<MainLayout />}>
          <Route path="/set/:id" element={<StudySetDetail />} />
          <Route path="/set/:id/quiz" element={<QuizMode />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<MainLayout />}>
            <Route path="/create-set" element={<CreateSet />} />
            <Route path="/edit-set/:id" element={<EditSet />} />
            <Route path="/library" element={<MyLibrary />} />
            <Route path="/folder/:id" element={<FolderDetail />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/search" element={<SearchResults />} />
            <Route path="/esports" element={<Navigate to="/specialized" replace />} />
            <Route path="/esports-terms" element={<Navigate to="/specialized" replace />} />
            <Route path="/flashcards" element={<FlashcardDashboard />} />
            <Route path="/textbooks" element={<TextbookHub />} />
            <Route path="/textbooks/:seriesId" element={<TextbookSeries />} />
            <Route path="/explanations" element={<ExplanationHub />} />
            <Route path="/explanations/book/:bookId" element={<ExplanationToc />} />
            <Route path="/explanations/lesson/:lessonId" element={<ExplanationDetail />} />
            <Route path="/explanations/:seriesId" element={<ExplanationSeries />} />
            <Route path="/practice-tests" element={<ExamList />} />
            <Route path="/exams" element={<Navigate to="/practice-tests" replace />} />
            <Route path="/exams/create" element={<CreateExam />} />
            <Route path="/exams/:id/edit" element={<EditExam />} />
            <Route path="/exams/:id" element={<ExamDetail />} />
            <Route path="/live/:id" element={<LiveExamHost />} />
            <Route path="/live/:id/feedback" element={<LiveExamFeedback />} />
            <Route path="/schedule" element={<StudyPlanner />} />
            <Route path="/schedule/settings" element={<CalendarSettings />} />
            <Route path="/dictionary" element={<Navigate to="/" replace />} />
            <Route path="/ai-generator" element={<Navigate to="/" replace />} />
            <Route path="/lesson-plans" element={<LessonPlanHub />} />
            <Route
              path="/create-folder"
              element={<Navigate to="/library?create=1" replace />}
            />
            <Route path="/solutions" element={<Navigate to="/explanations" replace />} />
            <Route path="/ai" element={<Navigate to="/ai-generator" replace />} />
          </Route>

          {/* Phòng thi full-bleed — không sidebar/topbar */}
          <Route path="/exams/:id/take" element={<ExamTaking />} />
          <Route path="/live/:id/take" element={<LiveExamTaking />} />
          <Route path="/live/:id/grade/:participantId" element={<LiveExamGrading />} />
          <Route path="/specialized">
            <Route index element={<SpecializedHub />} />
            <Route path=":fieldId" element={<SpecializedRoadmap />} />
            <Route path=":fieldId/lessons/:lessonId" element={<SpecializedLesson />} />
          </Route>
          <Route path="/lesson-plans/:id/edit" element={<LessonPlanEditor />} />
          <Route path="/textbooks/read/:bookId" element={<TextbookReader />} />
        </Route>
        <Route path="/lesson-plans/:id/present" element={<LessonPlanPresent />} />
        <Route path="/lesson-plans/:id" element={<LessonPlanViewer />} />
      </Routes>
      </UserSettingsProvider>
    </BrowserRouter>
  );
}

export default App;
