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
  className?: string;
};

const VARIANT_CLASSES: Record<
  NotificationVariant,
  { bg: string; border: string; text: string; icon: string; close: string }
> = {
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-800",
    icon: "text-red-500",
    close: "text-red-600 hover:text-red-800",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-800",
    icon: "text-amber-500",
    close: "text-amber-600 hover:text-amber-800",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-800",
    icon: "text-blue-500",
    close: "text-blue-600 hover:text-blue-800",
  },
  success: {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-800",
    icon: "text-green-500",
    close: "text-green-600 hover:text-green-800",
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
 */
export function Notification({
  variant,
  message,
  children,
  prefix,
  onDismiss,
  size = "md",
  className = "",
}: NotificationProps) {
  if (!message && !children) return null;
  const body = children ?? message;
  const v = VARIANT_CLASSES[variant];
  const Icon = ICONS[variant];
  const padding = size === "sm" ? "p-3 text-sm" : "p-4 text-sm";

  return (
    <div
      className={`relative flex items-start gap-3 ${padding} rounded-xl border ${v.bg} ${v.border} ${v.text} shadow-sm whitespace-pre-line ${
        onDismiss ? "pr-12" : ""
      } ${className}`}
      role={ROLE[variant]}
    >
      <Icon className={`h-5 w-5 flex-shrink-0 mt-0.5 ${v.icon}`} aria-hidden="true" />
      <div className="flex-1">
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
