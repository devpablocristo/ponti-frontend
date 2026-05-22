import { Toaster } from "sonner";

import { useTheme } from "@/lib/theme";

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
export function AppToaster() {
  const { resolvedTheme } = useTheme();
  return <Toaster position="top-right" closeButton theme={resolvedTheme} />;
}
