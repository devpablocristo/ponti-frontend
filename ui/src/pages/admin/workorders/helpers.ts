import { OrdersData } from "../../../hooks/useWorkOrders/types";

/**
 * Constantes y funciones puras del módulo de WorkOrders. Sin React,
 * sin side-effects, todas testeables.
 */

/**
 * Mapa de filtros que se invalidan en cascada. Si el usuario cambia el
 * `project_name`, los filtros `field_name` y `lot_name` se resetean (porque
 * apuntan a entidades que dependen del project).
 */
export const FILTER_HIERARCHY: Record<string, string[]> = {
  project_name: ["field_name", "lot_name"],
  field_name: ["lot_name"],
};

/** Clasifica la unidad de consumo de una orden (litros, kilos, o null si no se puede determinar). */
export function classifyConsumptionUnit(order: OrdersData): "liter" | "kilo" | null {
  const consumption = String(order.consumption || "").trim().toUpperCase();
  const typeName = String(order.type_name || "").toUpperCase();
  const categoryName = String(order.category_name || "").toUpperCase();
  const supplyName = String(order.supply_name || "").toUpperCase();

  if (consumption.includes("L") || consumption.includes("LT")) return "liter";
  if (consumption.includes("KG") || consumption.includes("K")) return "kilo";

  if (typeName.includes("AGROQUÍMICO") || typeName.includes("AGROQUIMICO")) return "liter";
  if (typeName.includes("SEMILLA")) return "kilo";

  const LITER_CATEGORIES = ["HERBICIDA", "COADYUVANTE", "CURASEMILLA", "INSECTICIDA", "FUNGICIDA"];
  const KILO_CATEGORIES = ["SEMILLA", "FERTILIZANTE"];
  if (LITER_CATEGORIES.some((k) => categoryName.includes(k))) return "liter";
  if (KILO_CATEGORIES.some((k) => categoryName.includes(k))) return "kilo";

  const LITER_SUPPLIES = ["HERBICIDA", "ACEITE", "INSECTICIDA", "FUNGICIDA", "LITRO"];
  const KILO_SUPPLIES = ["SEMILLA", "FERTILIZANTE", "KILO"];
  if (LITER_SUPPLIES.some((k) => supplyName.includes(k))) return "liter";
  if (KILO_SUPPLIES.some((k) => supplyName.includes(k))) return "kilo";

  return null;
}

export function getStatusLabel(status: string) {
  return status === "draft" ? "Abierta" : "Cerrada";
}

export function isPendingSupplyPublishError(message: string) {
  const normalized = message.toLowerCase();
  return (
    (normalized.includes("insumo") ||
      normalized.includes("supply") ||
      normalized.includes("supplies")) &&
    (normalized.includes("pendiente") ||
      normalized.includes("pending") ||
      normalized.includes("incompleto") ||
      normalized.includes("complete"))
  );
}

export function translatePendingSupplyPublishError(message: string) {
  const normalized = message.toLowerCase();
  const englishPrefix = "cannot publish work order draft with pending supplies:";

  if (normalized.startsWith(englishPrefix)) {
    const pendingSupplies = message.slice(englishPrefix.length).trim();

    return pendingSupplies
      ? `No se puede publicar la orden porque tiene insumos pendientes de completar: ${pendingSupplies}`
      : "No se puede publicar la orden porque tiene insumos pendientes de completar.";
  }

  return message;
}

export function mapStatusFilterLabelToApi(value: string) {
  if (value === "Abierta") return "draft";
  if (value === "Cerrada") return "published";
  return value;
}

export function getStatusBadgeClass(status: string) {
  return status === "draft"
    ? "bg-amber-100 text-amber-800 border border-amber-200"
    : "bg-emerald-100 text-emerald-800 border border-emerald-200";
}

export function isDigitalOrder(order: OrdersData) {
  return order.is_digital === true;
}

export function getOrderBaseNumber(orderNumber: string | number) {
  return String(orderNumber).trim().split(".")[0];
}

export function countUniqueOrderBaseNumbers(orders: OrdersData[]) {
  return new Set(
    orders
      .map((order) => getOrderBaseNumber(order.number))
      .filter(Boolean)
  ).size;
}

/** Tipo de respuesta del endpoint /work-orders cuando se usa el formato `rows`. */
export type WorkOrdersListResponse = {
  success: true;
  data: {
    rows?: OrdersData[];
  };
};
