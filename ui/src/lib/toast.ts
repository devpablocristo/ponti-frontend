import { toast as sonnerToast } from "sonner";

/** Notificación de éxito */
export function toastSuccess(message: string) {
  sonnerToast.success(message);
}

/** Notificación de error */
export function toastError(message: string) {
  sonnerToast.error(message);
}

/** Notificación de advertencia */
export function toastWarning(message: string) {
  sonnerToast.warning(message);
}

