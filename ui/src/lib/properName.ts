// Canonical-storage and display formatting for entity names (customer,
// project, manager, investor, field, lot, crop, season, actor display name).
//
// Storage form (canonicalizeName): lowercase Spanish text, only [a-z0-9ñ ].
// Diacritics are stripped except ñ/Ñ; every other non-alphanumeric character
// collapses to a single space, then internal whitespace is collapsed. The DB
// stores this canonical form.
//
// Display form (formatProperName): canonicalizes first, then title-cases each
// word except Spanish connectors (de, del, con, etc.) which stay lowercase
// unless they are the first word. Used by every list / table / dropdown that
// shows a name to the user — works equally for canonical-storage data and for
// legacy rows that still hold MAYUSCULAS / accented forms.
//
// Campaign codes (e.g. "2025-2026") are NOT routed through these helpers.

const CONNECTORS = new Set([
  "de",
  "del",
  "con",
  "sin",
  "a",
  "al",
  "y",
  "e",
  "o",
  "u",
  "en",
  "para",
  "por",
  "la",
  "el",
  "los",
  "las",
]);

// Tokens that render uppercase in display even though storage keeps them
// lowercase: legal-entity suffixes and common Argentine agro acronyms.
const UPPERCASE_TOKENS = new Set([
  "srl",
  "sa",
  "sas",
  "saci",
  "saca",
  "sac",
  "sh",
  "sc",
  "scs",
  "inta",
  "ypf",
  "afip",
  "arba",
  "csv",
  "pdf",
  "ot",
  "usd",
]);

const COMBINING_MARK = /[\u0300-\u036f]/;
const NON_CANONICAL = /[^a-z0-9 \u00f1]+/g;
const WHITESPACE = /\s+/g;

// Used by every input onChange to collapse consecutive spaces while the user
// is still typing — keeps "agro  lajitas" from staying in the draft. A
// trailing single space is preserved (it might be a word in progress).
export function collapseInternalSpaces(value: string): string {
  if (typeof value !== "string") return "";
  return value.replace(/ {2,}/g, " ");
}

export function canonicalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return stripDiacriticsPreservingEnye(value)
    .toLowerCase()
    .replace(NON_CANONICAL, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

function stripDiacriticsPreservingEnye(value: string): string {
  const out: string[] = [];
  for (const char of value.normalize("NFD")) {
    if (COMBINING_MARK.test(char)) {
      if (char === "\u0303" && out.length > 0) {
        const last = out[out.length - 1];
        if (last === "n") {
          out[out.length - 1] = "\u00f1";
          continue;
        }
        if (last === "N") {
          out[out.length - 1] = "\u00d1";
          continue;
        }
      }
      continue;
    }
    out.push(char);
  }
  return out.join("");
}

export function formatProperName(value: unknown): string {
  const canonical = canonicalizeName(value);
  if (!canonical) return "";
  return canonical
    .split(" ")
    .map((word, index) => formatWord(word, index))
    .join(" ");
}

export function formatEntityDisplayName(value: unknown): string {
  if (typeof value !== "string") return formatProperName(value);
  const raw = value.trim();
  if (!raw) return "";

  return raw
    .split(/([,;]+)/)
    .map((part) => {
      if (/^[,;]+$/.test(part)) return part;
      const entry = part.trim();
      if (!entry) return part;
      const withPercent = entry.match(
        /^(.+?)(\s*[-–—]\s*\d+(?:[.,]\d+)?\s*%.*)$/u,
      );
      if (withPercent) return `${formatProperName(withPercent[1])}${withPercent[2]}`;
      return formatProperName(entry);
    })
    .join("")
    .replace(/\s*([,;])\s*/g, "$1 ");
}

export function formatTitleCase(value: unknown): string {
  if (typeof value !== "string") return "";
  const raw = value.replace(WHITESPACE, " ").trim();
  if (!raw) return "";

  let wordIndex = 0;
  return raw.replace(/[\p{L}\p{N}]+/gu, (word) => {
    const lower = word.toLocaleLowerCase("es-AR");
    const formatted =
      wordIndex > 0 && CONNECTORS.has(lower)
        ? lower
        : UPPERCASE_TOKENS.has(lower)
          ? lower.toUpperCase()
          : lower.charAt(0).toLocaleUpperCase("es-AR") + lower.slice(1);
    wordIndex += 1;
    return formatted;
  });
}

function formatWord(word: string, index: number): string {
  if (!word) return word;
  if (UPPERCASE_TOKENS.has(word)) return word.toUpperCase();
  if (index > 0 && CONNECTORS.has(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}
