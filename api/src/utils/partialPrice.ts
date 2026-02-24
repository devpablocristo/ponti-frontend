const TRUTHY_VALUES = new Set([
  "1",
  "true",
  "yes",
  "y",
  "si",
  "sí",
  "on",
  "parcial",
  "tentativo",
  "checked",
  "check",
  "x",
]);

const FALSY_VALUES = new Set([
  "0",
  "false",
  "no",
  "n",
  "off",
  "final",
  "",
]);

export function parsePartialPriceFlag(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (TRUTHY_VALUES.has(normalized)) {
      return true;
    }
    if (FALSY_VALUES.has(normalized)) {
      return false;
    }
  }

  return false;
}
