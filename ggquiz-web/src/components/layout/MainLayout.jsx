import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import TranslateModal from "../TranslateModal";
import AiAssistantShell, { AI_SIDEBAR_WIDTH } from "../ai/AiAssistantShell";
import AiErrorBoundary from "../ai/AiErrorBoundary";
import { PlannerNotificationsProvider } from "../../context/PlannerNotificationsContext";

function MainLayout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  useEffect(() => {
    const openAi = () => setAiOpen(true);
    window.addEventListener("ggquiz:open-ai", openAi);
    return () => window.removeEventListener("ggquiz:open-ai", openAi);
  }, []);

  return (
    <PlannerNotificationsProvider>
    <div className="gg-shell min-h-screen bg-gray-50 text-gray-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <Sidebar
        isMobileMenuOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        isCollapsed={isCollapsed}
        onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
        onOpenTranslate={() => setTranslateOpen(true)}
        onToggleAi={() => setAiOpen((prev) => !prev)}
        aiOpen={aiOpen}
      />
      <Topbar
        onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        isCollapsed={isCollapsed}
        aiOpen={aiOpen}
        aiSidebarWidth={AI_SIDEBAR_WIDTH}
      />
      <main
        className={`pt-16 transition-all duration-300 ${
          isCollapsed ? "md:ml-20" : "md:ml-64"
        }`}
        style={{
          marginRight: aiOpen ? `min(${AI_SIDEBAR_WIDTH}px, 100vw)` : 0,
        }}
      >
        {children || <Outlet />}
      </main>

      <TranslateModal open={translateOpen} onClose={() => setTranslateOpen(false)} />
      <AiErrorBoundary>
        <AiAssistantShell open={aiOpen} onClose={() => setAiOpen(false)} />
      </AiErrorBoundary>
    </div>
    </PlannerNotificationsProvider>
  );
}

export default MainLayout;
