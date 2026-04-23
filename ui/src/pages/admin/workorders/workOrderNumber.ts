export const trimWorkOrderNumber = (value: string) => value.trim();

export const normalizeOfficialWorkOrderNumber = (value: string) =>
  value.replace(/\D/g, "");

export const isOfficialWorkOrderNumber = (value: string) =>
  /^\d+$/.test(trimWorkOrderNumber(value));

export const compareWorkOrderNumbers = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
