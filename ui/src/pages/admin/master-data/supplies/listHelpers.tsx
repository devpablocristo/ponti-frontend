import type { Supply } from "../../../../hooks/useSupplies/types";

/**
 * Helpers del List de supplies (editor 1 fila + import). Solo renderPriceCell
 * vive en tsx por usar JSX; el factory `newSupply` se queda acá por cohesión.
 */

export const renderPriceCell = (value: unknown, row: Supply) => (
  <div className="flex items-center gap-2">
    <strong>{String(value)}</strong>
    {row.is_partial_price ? (
      <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-300">
        Parcial
      </span>
    ) : null}
  </div>
);

export const newSupply = (): Supply => ({
  id: 0,
  name: "",
  price: "",
  is_partial_price: false,
  unit_id: 0,
  unit_name: "",
  type_id: 0,
  type_name: "",
  category_id: 0,
  category_name: "",
});
