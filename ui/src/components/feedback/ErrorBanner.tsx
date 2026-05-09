type ErrorBannerProps = {
  message: string | null | undefined;
  /** "simple" (default): caja roja con el mensaje, sin icono. "alert": con icono y opcional prefix. */
  variant?: "simple" | "alert";
  /** Texto que precede al mensaje en variant="alert" (ej: "Error:"). */
  prefix?: string;
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
  variant = "simple",
  prefix,
  onDismiss,
  className = "",
}: ErrorBannerProps) {
  if (!message) return null;

  if (variant === "simple") {
    return (
      <div
        className={`p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 whitespace-pre-line ${
          onDismiss ? "relative pr-12" : ""
        } ${className}`}
        role="alert"
      >
        <span className="font-medium">{message}</span>
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className="absolute top-2 right-2 text-red-600 hover:text-red-800"
            aria-label="Cerrar"
          >
            <svg
              className="w-4 h-4"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 14 14"
            >
              <path
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
              />
            </svg>
          </button>
        )}
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
        {message}
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 text-red-600 hover:text-red-800"
          aria-label="Cerrar"
        >
          <svg
            className="w-4 h-4"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
        </button>
      )}
    </div>
  );
}

export default ErrorBanner;
