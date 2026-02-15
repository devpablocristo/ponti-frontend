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