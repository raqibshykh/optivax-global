import { SidebarProvider, useSidebar } from "../context/SidebarContext";
import { Outlet } from "react-router-dom";
import AppHeader from "./AppHeader";
import Backdrop from "./Backdrop";
import AppSidebar from "./AppSidebar";
import { ErrorBoundary } from "../components/ErrorBoundary";

const LayoutContent: React.FC = () => {
  const { isExpanded, isHovered } = useSidebar();

  return (
    <div className="min-h-screen lg:flex overflow-x-hidden">
      <div className="flex-shrink-0">
        <AppSidebar />
        <Backdrop />
      </div>
      <div
        className={`flex-1 min-w-0 transition-all duration-300 ease-in-out ${
          isExpanded || isHovered ? "lg:ml-[290px]" : "lg:ml-[90px]"
        }`}
      >
        <AppHeader />
        <div className="p-4 mx-auto max-w-[--breakpoint-2xl] md:p-6">
          {/* Scoped to just the routed page content — a crash in one page
              no longer has to take the sidebar/header down with it; the
              top-level boundary in App.tsx remains as the outer safety net
              for anything outside this layout (e.g. AppSidebar itself). */}
          <ErrorBoundary>
            <Outlet />
          </ErrorBoundary>
        </div>
      </div>
    </div>
  );
};

const AppLayout: React.FC = () => {
  return (
    <SidebarProvider>
      <LayoutContent />
    </SidebarProvider>
  );
};

export default AppLayout;
