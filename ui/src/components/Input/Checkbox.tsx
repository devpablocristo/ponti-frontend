import type { InputHTMLAttributes } from "react";

type Tone = "select" | "form" | "warning";

const TONE_CLASS: Record<Tone, string> = {
  select: "border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer",
  form: "border-gray-300 text-blue-600 focus:ring-blue-500",
  warning: "border-gray-300 text-yellow-600 focus:ring-yellow-500",
};

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  /**
   * "select" (default): para multi-select de tablas (slate-300 + cursor-pointer).
   * "form": checkbox standard de formularios (gray-300 + blue).
   * "warning": checkbox para toggles de "estado parcial" / advertencia (gray-300 + yellow).
   */
  tone?: Tone;
};

/**
 * Checkbox base estandarizado. Reemplaza el JSX `<input type="checkbox" className="h-4 w-4 ...">`
 * que aparecía en 9+ archivos con tres variantes de color (select / form / warning).
 *
 * Para selección múltiple en tablas usar tono "select" — los helpers
 * `makeSelectColumn` y `BulkSelectionPanel` ya lo aplican internamente.
 */
export function Checkbox({ tone = "select", className = "", ...rest }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      className={`h-4 w-4 rounded ${TONE_CLASS[tone]} ${className}`}
      {...rest}
    />
  );
}

