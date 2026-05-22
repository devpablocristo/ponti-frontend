import { GetStockItems } from "../../../hooks/useStock/types";

/**
 * Labels que se muestran cuando `investor_name` es vacío:
 *   - "+1 INV." si has_multiple_investors es true (significa que el insumo
 *     tiene >1 inversor asignado).
 *   - "REV ING." si falta un ingreso del insumo (revisar ingreso).
 */
export const MULTIPLE_INVESTORS_LABEL = "+1 INV.";
export const MISSING_ENTRY_LABEL = "REV ING.";

export function getStockFilterValue(item: GetStockItems, key: keyof GetStockItems) {
  const value = item[key];

  if (key === "investor_name" && String(value ?? "").trim() === "") {
    return item.has_multiple_investors ? MULTIPLE_INVESTORS_LABEL : MISSING_ENTRY_LABEL;
  }

  return String(value ?? "");
}
