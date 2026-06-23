import { GetStockItems } from "@/hooks/useStock/types";

export const MULTIPLE_INVESTORS_LABEL = "+1 INV.";
export const MISSING_ENTRY_LABEL = "REV ING.";

/** Devuelve la etiqueta a mostrar para el inversor de un item de stock. */
export function getInvestorLabel(item: GetStockItems): string {
  if (String(item.investor_name ?? "").trim() === "") {
    return item.has_multiple_investors
      ? MULTIPLE_INVESTORS_LABEL
      : MISSING_ENTRY_LABEL;
  }
  return item.investor_name;
}

/** True si el item está marcado para revisión de ingreso ("REV ING."). */
export function isRevIng(item: GetStockItems): boolean {
  return (
    String(item.investor_name ?? "").trim() === "" &&
    !item.has_multiple_investors
  );
}
