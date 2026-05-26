import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle, Info, X } from "lucide-react";

export type NotificationVariant = "error" | "warning" | "info" | "success";

export type NotificationProps = {
  variant: NotificationVariant;
  message?: string | null;
  /** Slot para contenido enriquecido (listas, JSX). */
  children?: ReactNode;
  /** Texto que precede al mensaje (ej: "Error:", "Atención:"). */
  prefix?: string;
  /** Si se pasa, muestra botón X para cerrar. */
  onDismiss?: () => void;
  /** "sm" = compacto (p-3 text-sm). "md" (default) = banner principal (p-4). */
  size?: "sm" | "md";
  /**
   * `true` para toasts (vía `notify.*`): agrega sombra elevada y animación de
   * entrada. `false`/`undefined` para banners in-page (sin elevación). El
   * helper `notify` siempre la pasa en `true`.
   */
  elevated?: boolean;
  className?: string;
};

const VARIANT_CLASSES: Record<
  NotificationVariant,
  { bg: string; border: string; text: string; icon: string; close: string }
> = {
  error: {
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-900/60",
    text: "text-red-800 dark:text-red-200",
    icon: "text-red-500 dark:text-red-400",
    close: "text-red-600 hover:text-red-800 dark:text-red-300 dark:hover:text-red-100",
  },
  warning: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-900/60",
    text: "text-amber-800 dark:text-amber-200",
    icon: "text-amber-500 dark:text-amber-400",
    close: "text-amber-600 hover:text-amber-800 dark:text-amber-300 dark:hover:text-amber-100",
  },
  info: {
    bg: "bg-blue-50 dark:bg-blue-950/40",
    border: "border-blue-200 dark:border-blue-900/60",
    text: "text-blue-800 dark:text-blue-100",
    icon: "text-blue-500 dark:text-blue-400",
    close: "text-blue-600 hover:text-blue-800 dark:text-blue-300 dark:hover:text-blue-100",
  },
  success: {
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-200 dark:border-green-900/60",
    text: "text-green-800 dark:text-green-200",
    icon: "text-green-500 dark:text-green-400",
    close: "text-green-600 hover:text-green-800 dark:text-green-300 dark:hover:text-green-100",
  },
};

const ICONS: Record<NotificationVariant, typeof AlertCircle> = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
  success: CheckCircle,
};

const ROLE: Record<NotificationVariant, "alert" | "status"> = {
  error: "alert",
  warning: "alert",
  info: "status",
  success: "status",
};

/**
 * Banner único de notificación. Cubre las 4 categorías (error/warning/info/success)
 * con el mismo shape: rounded + border + icono circular + texto + X opcional.
 * Sirve para banners in-page y, vía `lib/notify`, para toasts flotantes.
 *
 * `elevated` diferencia toast (sombra + animación + responsive a viewport)
 * de banner in-page (estático).
 */
export function Notification({
  variant,
  message,
  children,
  prefix,
  onDismiss,
  size = "md",
  elevated = false,
  className = "",
}: NotificationProps) {
  if (!message && !children) return null;
  const body = children ?? message;
  const v = VARIANT_CLASSES[variant];
  const Icon = ICONS[variant];
  const padding = size === "sm" ? "p-3 text-sm" : "p-4 text-sm";

  // Elevated = toast: sombra fuerte, animación, max-w responsive para que en
  // mobile no se desborde. Inline = banner estático sin sombra.
  const elevation = elevated
    ? "shadow-lg max-w-md w-[calc(100vw-2rem)] sm:w-auto animate-in slide-in-from-right-5 fade-in duration-200"
    : "shadow-sm";

  return (
    <div
      className={`relative flex items-start gap-3 ${padding} rounded-xl border ${v.bg} ${v.border} ${v.text} ${elevation} whitespace-pre-line ${
        onDismiss ? "pr-12" : ""
      } ${className}`}
      role={ROLE[variant]}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${v.icon}`} aria-hidden="true" />
      <div className="flex-1 break-words">
        {prefix && <span className="font-semibold">{prefix} </span>}
        {body}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className={`absolute top-2 right-2 ${v.close}`}
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
