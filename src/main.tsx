import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "swiper/swiper-bundle.css";
import "flatpickr/dist/flatpickr.css";
import App from "./App";
import { AppWrapper } from "./components/common/PageMeta";
import { ThemeProvider } from "./context/ThemeContext";
import { AuthProvider } from "./context/AuthContext";
import { ActivityProvider } from "./context/ActivityContext";
import { ToastProvider } from "./context/ToastContext";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
      <ToastProvider>
        <AuthProvider>
          <ActivityProvider>
            <ThemeProvider>
              <AppWrapper>
                <App />
              </AppWrapper>
            </ThemeProvider>
          </ActivityProvider>
        </AuthProvider>
      </ToastProvider>
  </StrictMode>,
);
