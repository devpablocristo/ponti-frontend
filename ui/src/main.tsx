import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import "./index.css";
import routes from "./router";
import { ConfirmDialogProvider } from "./hooks/useConfirmDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider, useTheme } from "./lib/theme";

/**
 * Toaster único de toda la app. `position` y `closeButton` son globales;
 * la duración la define cada toast individual via `notify.X` según su
 * severidad (ver `src/copy/notifications.ts`). No usamos `richColors`
 * porque nuestros toasts pasan por `toast.custom` con el componente
 * `<Notification>`, no por los toast.success/error nativos de Sonner.
 *
 * `theme` se sincroniza con el ThemeProvider global: cuando el user toggle
 * dark mode, el Toaster también se ve dark sin reload.
 */
function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster position="top-right" closeButton theme={resolvedTheme} />;
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ThemeProvider>
      <ConfirmDialogProvider>
        <RouterProvider router={createBrowserRouter(routes)} />
        <AppToaster />
      </ConfirmDialogProvider>
    </ThemeProvider>
  </ErrorBoundary>
);
