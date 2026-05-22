// Configuración compartida de notificaciones (toasts vía `notify.*`).
//
// La duración por severidad sigue el principio "más crítico = más persistente":
// el usuario tiene más tiempo de leer un error que un éxito. Si un caller
// necesita override, puede pasar `opts.duration` a `notify.X(...)`.

import type { NotificationVariant } from "../components/feedback/Notification";

/**
 * Tiempo en ms que cada tipo de toast permanece visible antes del auto-close.
 * Errors persisten ~2x lo que success — el usuario los lee con calma o usa
 * la X para cerrarlos. Si en el futuro queremos que un error sea sticky,
 * se pasa `duration: Infinity` en el caller particular.
 */
export const NOTIFICATION_DURATION: Record<NotificationVariant, number> = {
  success: 3500,
  info: 4000,
  warning: 6000,
  error: 8000,
};
