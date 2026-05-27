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
  "ot",
  "usd",
]);

const COMBINING_MARK = /[\u0300-\u036f]/;
const NON_CANONICAL = /[^a-z0-9 \u00f1]+/g;
const WHITESPACE = /\s+/g;

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

function canonicalizeName(value: unknown): string {
  if (typeof value !== "string") return "";
  return stripDiacriticsPreservingEnye(value)
    .toLocaleLowerCase("es-AR")
    .replace(NON_CANONICAL, " ")
    .replace(WHITESPACE, " ")
    .trim();
}

function formatWord(word: string, index: number): string {
  if (!word) return word;
  if (UPPERCASE_TOKENS.has(word)) return word.toUpperCase();
  if (index > 0 && CONNECTORS.has(word)) return word;
  return word.charAt(0).toLocaleUpperCase("es-AR") + word.slice(1);
}

export function formatProperName(value: unknown): string {
  const canonical = canonicalizeName(value);
  if (!canonical) return "";
  return canonical
    .split(" ")
    .map((word, index) => formatWord(word, index))
    .join(" ");
}

