import { createElement } from "react";
import { toast } from "sonner";

import { Notification, type NotificationVariant } from "../components/feedback/Notification";

type NotifyOptions = {
  duration?: number;
  prefix?: string;
};

function show(variant: NotificationVariant, message: string, opts?: NotifyOptions) {
  return toast.custom(
    (id) =>
      createElement(Notification, {
        variant,
        message,
        prefix: opts?.prefix,
        onDismiss: () => toast.dismiss(id),
      }),
    { duration: opts?.duration },
  );
}

/**
 * API programática de notificaciones. Reusa el componente <Notification/>
 * para que el shape sea idéntico al banner in-page.
 */
export const notify = {
  error: (message: string, opts?: NotifyOptions) => show("error", message, opts),
  warning: (message: string, opts?: NotifyOptions) => show("warning", message, opts),
  info: (message: string, opts?: NotifyOptions) => show("info", message, opts),
  success: (message: string, opts?: NotifyOptions) => show("success", message, opts),
};
