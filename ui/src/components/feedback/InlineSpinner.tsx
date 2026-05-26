import { LoaderCircle } from "lucide-react";

type InlineSpinnerProps = {
  /** Texto opcional al lado del spinner (ej: "Cargando indicadores..."). */
  label?: string;
  /** Tamaño en Tailwind (defecto: "sm" = w-5 h-5; "md" = w-8 h-8; "lg" = w-10 h-10). */
  size?: "sm" | "md" | "lg";
  /** Altura del contenedor (ej: "py-4" para indicadores, "h-48" para tablas). */
  containerClassName?: string;
  /** Clase del spinner (color por defecto azul). */
  spinnerClassName?: string;
};

const SIZE_MAP = {
  sm: "h-5 w-5",
  md: "h-8 w-8",
  lg: "h-10 w-10",
};

/**
 * Spinner inline (no overlay). Reusable para zonas en-flujo donde no aplica
 * `<LoadingOverlay>`: filas de tabla, secciones colapsables, KPI cards en
 * carga inicial. Para overlays con backdrop usar `<LoadingOverlay>`.
 */
export function InlineSpinner({
  label,
  size = "sm",
  containerClassName = "flex items-center justify-center py-4",
  spinnerClassName = "text-blue-600",
}: InlineSpinnerProps) {
  return (
    <div className={containerClassName}>
      <LoaderCircle
        className={`animate-spin ${SIZE_MAP[size]} ${spinnerClassName} ${label ? "mr-2" : ""}`}
      />
      {label && (
        <span className="text-sm text-gray-500 font-medium">{label}</span>
      )}
    </div>
  );
}

