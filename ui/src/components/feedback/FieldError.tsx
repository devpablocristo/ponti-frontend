// FieldError — componente oficial para mostrar errores de validación
// inline pegados a un campo de formulario.
//
// Por qué existe: las validaciones de campo NO van por `notify` (sería
// molesto disparar un toast por cada keypress inválido). Van inline, debajo
// del input. Antes cada page renderizaba `<p className="text-xs text-red-600">`
// suelto — eso choca con la regla "todo feedback va por el módulo unificado"
// y con la salvaguardia `lint:notify-leaks`. Este componente es la única
// API permitida para errores inline de form.
//
// Para errores globales / acciones async fallidas, usar `notify.error` o el
// `<Notification>` banner. NO usar `FieldError` para esos casos.

import type { ReactNode } from "react";

type FieldErrorProps = {
  /** Si vacío / null / undefined, NO renderiza nada. */
  message?: ReactNode;
  /** Override de className extra, sólo para spacing (mt-*, mb-*). */
  className?: string;
};

export function FieldError({ message, className = "mt-1" }: FieldErrorProps) {
  if (!message) return null;
  return (
    <p
      className={`text-xs text-red-600 dark:text-red-400 ${className}`.trim()}
      role="alert"
    >
      {message}
    </p>
  );
}
