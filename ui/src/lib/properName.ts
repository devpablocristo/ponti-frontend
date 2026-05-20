// Canonical-storage and display formatting for entity names (customer,
// project, manager, investor, field, lot, crop, season, actor display name).
//
// Storage form (canonicalizeName): lowercase ASCII, only [a-z0-9 ]. Diacritics
// stripped, every non-alphanumeric character collapses to a single space, then
// internal whitespace is collapsed. The DB stores this canonical form.
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
]);

const DIACRITICS = /[̀-ͯ]/g;
const NON_CANONICAL = /[^a-z0-9 ]+/g;
const WHITESPACE = /\s+/g;

export function canonicalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NON_CANONICAL, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

export function formatProperName(value: unknown): string {
  const canonical = canonicalizeName(value);
  if (!canonical) return "";
  return canonical
    .split(" ")
    .map((word, index) => formatWord(word, index))
    .join(" ");
}

function formatWord(word: string, index: number): string {
  if (!word) return word;
  if (UPPERCASE_TOKENS.has(word)) return word.toUpperCase();
  if (index > 0 && CONNECTORS.has(word)) return word;
  return word.charAt(0).toUpperCase() + word.slice(1);
}
