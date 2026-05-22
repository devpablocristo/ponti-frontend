import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";

import "./index.css";
import routes from "./router";
import { ConfirmDialogProvider } from "./hooks/useConfirmDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ThemeProvider } from "./lib/theme";
import { AppToaster } from "./components/AppToaster";

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
