import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

type StatusBadgeProps = {
  status: "ok" | "error" | "existing";
  reasons: string[];
};

/**
 * Badge de estado de fila en el preview del importador. 3 estados con copy
 * en español:
 *   - ok: verde, sin tooltip.
 *   - error: rojo, tooltip con razones de validación.
 *   - existing: amarillo, indica duplicado (no se importa por regla
 *     "imports nunca pisan registros existentes").
 */
export function StatusBadge({ status, reasons }: StatusBadgeProps) {
  if (status === "error") {
    return (
      <span
        title={reasons.join("; ")}
        className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700"
      >
        <XCircle className="h-3 w-3" /> Error
      </span>
    );
  }
  if (status === "existing") {
    return (
      <span
        title="Ya existe un movimiento con este remito + insumo en el proyecto"
        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700"
      >
        <AlertTriangle className="h-3 w-3" /> Ya existe
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Ok
    </span>
  );
}
