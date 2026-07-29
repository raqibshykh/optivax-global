import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { AppWrapper } from "./components/common/PageMeta";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ActivityProvider } from "./context/ActivityContext";
import { ToastProvider } from "./context/ToastContext";
import { DepartmentProvider } from "./context/DepartmentContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
      <ToastProvider>
        <AuthProvider>
          <DepartmentProvider>
            <ActivityProvider>
              <ThemeProvider>
                <AppWrapper>
                  <App />
                </AppWrapper>
              </ThemeProvider>
            </ActivityProvider>
          </DepartmentProvider>
        </AuthProvider>
      </ToastProvider>
  </StrictMode>,
);
