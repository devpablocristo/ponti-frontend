import type { ReactNode } from "react";
import { AlertCircle } from "lucide-react";

import { DismissButton } from "./DismissButton";

type WarningBannerProps = {
  message?: string | null;
  /** Slot opcional para contenido enriquecido. */
  children?: ReactNode;
  /** Texto que precede al mensaje (ej: "Atención:"). */
  prefix?: string;
  /** Si se pasa, muestra botón X para cerrar. */
  onDismiss?: () => void;
  className?: string;
};

/**
 * Banner inline de warning (amber). Estilo `outlined` consistente con la
 * variante outlined de Error/SuccessBanner: rounded-xl + border + AlertCircle.
 */
export function WarningBanner({
  message,
  children,
  prefix,
  onDismiss,
  className = "",
}: WarningBannerProps) {
  if (!message && !children) return null;
  const body = children ?? message;

  return (
    <div
      className={`relative flex items-center gap-3 p-4 mb-4 text-sm text-amber-800 rounded-xl border border-amber-200 bg-amber-50 whitespace-pre-line ${
        onDismiss ? "pr-12" : ""
      } ${className}`}
      role="alert"
    >
      <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500" aria-hidden="true" />
      <div className="flex-1">
        {prefix && <span className="font-semibold">{prefix} </span>}
        {body}
      </div>
      {onDismiss && <DismissButton tone="amber" onClick={onDismiss} />}
    </div>
  );
}

