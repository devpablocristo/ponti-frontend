import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { DismissButton } from "./DismissButton";

type ErrorBannerProps = {
  message?: string | null;
  /** Slot opcional para contenido enriquecido (lista de errores, JSX). */
  children?: ReactNode;
  /**
   * "simple" (default): caja roja con el mensaje, sin icono.
   * "alert": con icono Flowbite y opcional prefix (estilo formularios).
   * "outlined": con borde + icono lucide AlertCircle (estilo active lists).
   */
  variant?: "simple" | "alert" | "outlined";
  /** Texto que precede al mensaje en variant="alert"|"outlined" (ej: "Error:"). */
  prefix?: string;
  /**
   * "default": p-4 + rounded-lg + text-red-800 + mb-4 (banner principal).
   * "sm": p-3 + rounded + text-red-700 + sin margin (mini-banner inline en
   *   forms/drawers donde el padre controla el spacing).
   * Sólo aplica a variant="simple".
   */
  size?: "default" | "sm";
  /** Si se pasa, muestra botón X para cerrar. */
  onDismiss?: () => void;
  className?: string;
};

/**
 * Banner inline de error. Reemplaza el JSX duplicado en 20+ páginas:
 *   <div className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
 *     <span className="font-medium">{error}</span>
 *   </div>
 *
 * Por defecto usa la variante "simple" (sin icono) — la dominante en el
 * codebase. Para banners más enfáticos (con icono y prefix "Error:") usar
 * `variant="alert"`.
 */
export function ErrorBanner({
  message,
  children,
  variant = "simple",
  prefix,
  size = "default",
  onDismiss,
  className = "",
}: ErrorBannerProps) {
  if (!message && !children) return null;
  const body = children ?? message;
  const simpleSizeClass =
    size === "sm"
      ? "p-3 text-sm text-red-700 rounded bg-red-50"
      : "p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50";

  if (variant === "outlined") {
    return (
      <div
        className={`relative flex items-center gap-3 p-4 mb-4 text-sm text-red-800 rounded-xl border border-red-200 bg-red-50 whitespace-pre-line ${
          onDismiss ? "pr-12" : ""
        } ${className}`}
        role="alert"
      >
        <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" aria-hidden="true" />
        <div className="flex-1">
          {prefix && <span className="font-semibold">{prefix} </span>}
          {body}
        </div>
        {onDismiss && <DismissButton tone="red" onClick={onDismiss} />}
      </div>
    );
  }

  if (variant === "simple") {
    return (
      <div
        className={`${simpleSizeClass} whitespace-pre-line ${
          onDismiss ? "relative pr-12" : ""
        } ${className}`}
        role="alert"
      >
        {children ? body : <span className="font-medium">{message}</span>}
        {onDismiss && <DismissButton tone="red" onClick={onDismiss} />}
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-start p-4 ${onDismiss ? "pr-12" : ""} mb-4 text-sm text-red-800 rounded-lg bg-red-50 ${className}`}
      role="alert"
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
      <span className="sr-only">Error</span>
      <div className="flex-1 whitespace-pre-line">
        {prefix && <span className="font-medium">{prefix} </span>}
        {body}
      </div>
      {onDismiss && <DismissButton tone="red" onClick={onDismiss} />}
    </div>
  );
}

export default ErrorBanner;
