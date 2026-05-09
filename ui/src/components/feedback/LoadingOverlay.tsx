import { LoaderCircle } from "lucide-react";

type LoadingOverlaySize = "sm" | "md" | "lg";

const SIZES: Record<LoadingOverlaySize, string> = {
  sm: "h-6 w-6",
  md: "h-10 w-10",
  lg: "h-14 w-14",
};

type LoadingOverlayProps = {
  show?: boolean;
  size?: LoadingOverlaySize;
  fullScreen?: boolean;
  className?: string;
};

export function LoadingOverlay({
  show = true,
  size = "md",
  fullScreen = false,
  className = "",
}: LoadingOverlayProps) {
  if (!show) return null;

  const positionClass = fullScreen ? "fixed" : "absolute";

  return (
    <div
      className={`${positionClass} inset-0 z-10 flex items-center justify-center bg-white bg-opacity-70 backdrop-blur-sm ${className}`}
      role="status"
      aria-live="polite"
    >
      <LoaderCircle className={`${SIZES[size]} animate-spin text-blue-600`} />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}

export default LoadingOverlay;
