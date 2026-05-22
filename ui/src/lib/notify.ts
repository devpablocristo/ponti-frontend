import { createElement } from "react";
import { toast } from "sonner";

import { Notification, type NotificationVariant } from "../components/feedback/Notification";
import { NOTIFICATION_DURATION } from "../copy/notifications";

type NotifyOptions = {
  /** Override de duración en ms. Si no se pasa, se aplica el default por severidad. */
  duration?: number;
  /** Texto que precede al mensaje (ej: "Insumos pendientes:"). Casi nunca hace falta. */
  prefix?: string;
};

function show(variant: NotificationVariant, message: string, opts?: NotifyOptions) {
  const duration = opts?.duration ?? NOTIFICATION_DURATION[variant];
  return toast.custom(
    (id) =>
      createElement(Notification, {
        variant,
        message,
        prefix: opts?.prefix,
        elevated: true,
        onDismiss: () => toast.dismiss(id),
      }),
    { duration },
  );
}

/**
 * API programática de notificaciones (toasts). Reusa el componente
 * `<Notification>` para que la apariencia sea idéntica al banner in-page,
 * más sombra (`elevated`) que diferencia visualmente "flotante" de "inline".
 *
 * Duración por severidad: `success`/`info` cierran rápido (3.5–4s); `warning`
 * persiste medio (6s); `error` queda visible más tiempo (8s) porque suele
 * requerir lectura y acción.
 */
export const notify = {
  error: (message: string, opts?: NotifyOptions) => show("error", message, opts),
  warning: (message: string, opts?: NotifyOptions) => show("warning", message, opts),
  info: (message: string, opts?: NotifyOptions) => show("info", message, opts),
  success: (message: string, opts?: NotifyOptions) => show("success", message, opts),
};
