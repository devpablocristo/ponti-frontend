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