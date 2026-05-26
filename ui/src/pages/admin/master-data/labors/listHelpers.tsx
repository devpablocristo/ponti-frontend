import type { LaborInfo } from "../../../../hooks/useLabors/types";

/**
 * Helpers del List de labores (editor 1 fila + import). Solo renderPriceCell
 * vive en tsx por usar JSX; el factory `newLabor` se queda acá por cohesión.
 */

export function renderPriceCell(value: unknown, row: LaborInfo) {
  return (
    <div className="flex items-center gap-2">
      <strong>{String(value ?? "")}</strong>
      {row.is_partial_price ? (
        <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-300">
          Parcial
        </span>
      ) : null}
    </div>
  );
}

export const newLabor = (): LaborInfo => ({
  id: 0,
  name: "",
  category_id: 0,
  price: "",
  contractor_name: "",
  category_name: "",
  is_partial_price: false,
});
