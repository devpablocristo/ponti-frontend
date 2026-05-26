import type { LaborInfo } from "../../../../hooks/useLabors/types";

/**
 * Helpers + types puros del LaborsCatalog (bulk-add con CSV import).
 */

export interface Labor {
  id: number;
  name: string;
  category: string;
  price: string;
  contractor: string;
  is_partial_price: boolean;
}

export interface PendingLaborImport {
  newRows: Labor[];
  duplicates: { existing: LaborInfo; updated: LaborInfo }[];
  warnings: string[];
}

export const emptyRow = (id: number): Labor => ({
  id,
  name: "",
  category: "",
  price: "",
  contractor: "",
  is_partial_price: false,
});
