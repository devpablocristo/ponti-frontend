type SuccessBannerProps = {
  message: string | null | undefined;
  compact?: boolean;
  onDismiss?: () => void;
  className?: string;
};

export function SuccessBanner({
  message,
  compact = false,
  onDismiss,
  className = "",
}: SuccessBannerProps) {
  if (!message) return null;

  if (compact) {
    return (
      <div
        className={`p-3 rounded bg-green-50 text-green-700 text-sm ${className}`}
        role="status"
      >
        {message}
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
      <div className="flex-1">
        <span className="font-medium">{message}</span>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          className="absolute top-2 right-2 text-green-600 hover:text-green-800"
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

export default SuccessBanner;
