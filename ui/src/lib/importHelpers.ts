export type ParsedPartialPrice = {
  provided: boolean;
  valid: boolean;
  value: boolean;
};

// Versi\u00f3n simple: solo strip diacritics + lowercase + whitespace \u2192 `_`.
// Mantiene caracteres especiales (`$`, `/`, etc.) \u2014 \u00fatil cuando los aliases
// dependen de ellos (ej. el alias `"u$s"` en labor headers).
export function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

// Versi\u00f3n estricta para normalizar headers de CSV: adem\u00e1s strippea cualquier
// caracter no-alfanum + colapsa `_`. Usar cuando los CSVs traen headers con
// puntuaci\u00f3n variable (`"COSTO U$ /HA"`, `"u$s"`, etc.) y se quiere matchear
// agresivamente. Difiere de `normalizeText` en que ESTE convierte
// `"u$s" \u2192 "us"` (pierde `$`); el simple lo conserva.
export function normalizeHeader(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/[\s./-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
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
