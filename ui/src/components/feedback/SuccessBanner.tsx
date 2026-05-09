import type { ReactNode } from "react";
import { CheckCircle } from "lucide-react";

import { DismissButton } from "./DismissButton";

type SuccessBannerProps = {
  message?: string | null;
  /** Slot opcional para contenido enriquecido. */
  children?: ReactNode;
  /**
   * "simple" (default): caja verde con el mensaje.
   * "alert": con icono Flowbite (estilo formularios).
   * "outlined": con borde + icono lucide CheckCircle (estilo active lists).
   */
  variant?: "simple" | "alert" | "outlined";
  /** Texto que precede al mensaje en variant="outlined" (ej: "Listo:"). */
  prefix?: string;
  /**
   * "default": p-4 + rounded-lg + text-green-800 + mb-4 (banner principal).
   * "sm": p-3 + rounded + text-green-700 + sin margin (mini-banner inline en
   *   forms/drawers donde el padre controla el spacing).
   * Sólo aplica a variant="simple".
   */
  size?: "default" | "sm";
  onDismiss?: () => void;
  className?: string;
};

/**
 * Banner inline de éxito. Reemplaza el JSX duplicado en 16+ páginas para
 * mensajes de éxito persistentes (no toast). Para confirmaciones rápidas
 * preferir `toast.success(...)` desde lib/toast.
 */
export function SuccessBanner({
  message,
  children,
  variant = "simple",
  prefix,
  size = "default",
  onDismiss,
  className = "",
}: SuccessBannerProps) {
  if (!message && !children) return null;
  const body = children ?? message;
  const simpleSizeClass =
    size === "sm"
      ? "p-3 text-sm text-green-700 rounded bg-green-50"
      : "p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50";

  if (variant === "outlined") {
    return (
      <div
        className={`relative flex items-center gap-3 p-4 mb-4 text-sm text-green-800 rounded-xl border border-green-200 bg-green-50 whitespace-pre-line ${
          onDismiss ? "pr-12" : ""
        } ${className}`}
        role="status"
      >
        <CheckCircle className="h-5 w-5 flex-shrink-0 text-green-500" aria-hidden="true" />
        <div className="flex-1">
          {prefix && <span className="font-semibold">{prefix} </span>}
          {body}
        </div>
        {onDismiss && <DismissButton tone="green" onClick={onDismiss} />}
      </div>
    );
  }

  if (variant === "simple") {
    return (
      <div
        className={`${simpleSizeClass} whitespace-pre-line ${
          onDismiss ? "relative pr-12" : ""
        } ${className}`}
        role="status"
      >
        {children ? body : <span className="font-medium">{message}</span>}
        {onDismiss && <DismissButton tone="green" onClick={onDismiss} />}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-start p-4 ${onDismiss ? "pr-12" : ""} mb-4 text-sm text-green-800 rounded-lg bg-green-50 ${className}`}
      role="status"
    >
      <svg
        className="shrink-0 inline w-4 h-4 me-3 mt-0.5"
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        fill="currentColor"
        viewBox="0 0 20 20"
      >
        <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
      </svg>
      <span className="sr-only">Éxito</span>
      <div className="flex-1 whitespace-pre-line">
        {children ? body : <span className="font-medium">{message}</span>}
      </div>
      {onDismiss && <DismissButton tone="green" onClick={onDismiss} />}
    </div>
  );
}

export default SuccessBanner;
