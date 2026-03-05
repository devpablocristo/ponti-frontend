export const formatNumberAr = (value: number | string) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 2 }).format(
    Number(value) || 0
  );

/** Normalize a date string to YYYY-MM-DD format. Handles DD/MM/YYYY and ISO strings. */
export const normalizeDate = (date: string): string => {
  if (!date) return "";
  return date.includes("/")
    ? date.split("/").reverse().join("-") // DD/MM/YYYY → YYYY-MM-DD
    : date.split("T")[0]; // ISO → YYYY-MM-DD
};

/** Format an ISO date string (or YYYY-MM-DD) to DD/MM/YYYY for display. */
export const formatISODate = (dateString: string): string => {
  if (!dateString) return "";
  const datePart = String(dateString).split("T")[0];
  const [year, month, day] = datePart.split("-").map(Number);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};

/**
 * Parse a localized numeric value (es-AR format with dots as thousand
 * separators and commas as decimal separators) into a plain number.
 * Returns NaN when the input cannot be interpreted as a number.
 */
export const normalizeNumber = (val: unknown): number => {
  if (typeof val === "number") {
    return Number.isFinite(val) ? val : NaN;
  }

  const rawText = String(val ?? "").trim();
  if (!rawText) return NaN;

  const cleaned = rawText
    .replace(/\s/g, "")
    .replace(/[^\d,.-]/g, "");

  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");

  let normalized = cleaned;

  if (hasComma && hasDot) {
    normalized = cleaned.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    normalized = cleaned.replace(/,/g, ".");
  }

  const parsed = Number(normalized);
  return Number.isNaN(parsed) ? NaN : parsed;
};

/** Remove trailing zeros from a fixed-point string (e.g. "1.200" → "1.2", "3.000" → "3"). */
export const trimTrailingZeros = (value: string) =>
  value.replace(/\.?0+$/, "");

/** Default number of empty item rows shown in order / product forms. */
export const DEFAULT_ITEM_ROW_COUNT = 7;

/** Replace numeric supply IDs in error messages with their human-readable names. */
export const replaceSupplyIdsWithNames = (
  message: string,
  supplies: { id: number; name: string }[]
): string => {
  if (!message) return message;
  return message.replace(/\binsumo\s+(\d+)\b/gi, (_match, idText: string) => {
    const supply = supplies.find((entry) => entry.id === Number(idText));
    return supply ? `insumo ${supply.name}` : `insumo ${idText}`;
  });
};

/**
 * Normalize a value for filter comparison:
 * - trim/lowercase for strings
 * - canonical numeric form for numbers (e.g. "017" → "17", "17,0" → "17")
 */
export const normalizeFilterComparable = (value: unknown): string => {
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "") return "";
  const canonical = s.replace(",", ".");
  if (/^[+-]?\d+(\.\d+)?$/.test(canonical)) {
    const n = Number(canonical);
    if (!Number.isNaN(n)) return String(n);
  }
  return s;
};