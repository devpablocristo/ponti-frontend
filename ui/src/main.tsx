import { createRoot } from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Toaster } from "sonner";

import "./index.css";
import routes from "./router";
import { ConfirmDialogProvider } from "./hooks/useConfirmDialog";
import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <ConfirmDialogProvider>
      <RouterProvider router={createBrowserRouter(routes)} />
      <Toaster position="top-right" richColors closeButton duration={4000} />
    </ConfirmDialogProvider>
  </ErrorBoundary>
);
