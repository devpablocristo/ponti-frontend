export type ParsedPartialPrice = {
  provided: boolean;
  valid: boolean;
  value: boolean;
};

export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export function parsePartialPrice(rawValue: string): ParsedPartialPrice {
  const raw = (rawValue ?? "").trim();
  if (!raw) {
    return { provided: false, valid: true, value: false };
  }

  const normalized = normalizeText(raw).replace(/_/g, "");
  const partialValues = new Set([
    "parcial",
    "tentativo",
    "si",
    "true",
    "1",
    "x",
    "check",
    "checked",
  ]);
  const finalValues = new Set(["final", "no", "false", "0"]);

  if (partialValues.has(normalized)) {
    return { provided: true, valid: true, value: true };
  }
  if (finalValues.has(normalized)) {
    return { provided: true, valid: true, value: false };
  }

  return { provided: true, valid: false, value: false };
}
