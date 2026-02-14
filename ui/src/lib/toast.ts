import { toast as sonnerToast } from "sonner";

/** Notificación de éxito */
export function toastSuccess(message: string) {
  sonnerToast.success(message);
}

/** Notificación de error */
export function toastError(message: string) {
  sonnerToast.error(message);
}

/** Notificación informativa */
export function toastInfo(message: string) {
  sonnerToast.info(message);
}

/** Notificación de advertencia */
export function toastWarning(message: string) {
  sonnerToast.warning(message);
}

/** Toast de loading con callback para resolver */
export function toastLoading(message: string) {
  return sonnerToast.loading(message);
}

/** Dismiss a toast by id */
export function toastDismiss(id: string | number) {
  sonnerToast.dismiss(id);
}

/** Toast con promesa (loading → success/error) */
export function toastPromise<T>(
  promise: Promise<T>,
  opts: { loading: string; success: string; error: string }
) {
  return sonnerToast.promise(promise, opts);
}
