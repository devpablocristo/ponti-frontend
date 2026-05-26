import { DEFAULT_ITEM_ROW_COUNT } from "../utils";

/**
 * Constantes y helpers puros del CreateSupplyMovement drawer. Lookup de
 * type options + parseo del entry_type del BE al option local.
 */

export const emptyItems = Array.from({ length: DEFAULT_ITEM_ROW_COUNT }, () => ({
  item: "",
  quantity: "",
}));

export const typeOptions = [
  { id: 1, name: "Stock inicial" },
  { id: 2, name: "Movimiento interno" },
  { id: 3, name: "Remito oficial" },
  { id: 4, name: "Devolución" },
];

export const DEVOLUTION_TYPE_ID = 4;

export function getMovementTypeValue(typeId?: number | null) {
  if (typeId === 1) return "Stock";
  return typeOptions.find((option) => option.id === typeId)?.name || "";
}

export function getTypeOptionFromEntryType(entryType?: string | null) {
  if (entryType === "Stock") {
    return typeOptions.find((option) => option.id === 1) || null;
  }
  return typeOptions.find((option) => option.name === entryType) || null;
}

export function formatAvailableQty(value: number) {
  return value.toFixed(2).replace(/\.?0+$/, "");
}
