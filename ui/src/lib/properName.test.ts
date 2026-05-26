import { describe, expect, it } from "vitest";

import {
  canonicalizeName,
  collapseInternalSpaces,
  formatEntityDisplayName,
  formatProperName,
  formatTitleCase,
} from "./properName";

describe("collapseInternalSpaces", () => {
  it("collapses multiple spaces between words to a single space", () => {
    expect(collapseInternalSpaces("agro    lajitas")).toBe("agro lajitas");
    expect(collapseInternalSpaces("a  b  c")).toBe("a b c");
  });

  it("preserves a single trailing space (still typing a new word)", () => {
    expect(collapseInternalSpaces("agro ")).toBe("agro ");
  });

  it("preserves a single leading space (does not trim while typing)", () => {
    expect(collapseInternalSpaces(" agro")).toBe(" agro");
  });

  it("collapses leading / trailing double-or-more spaces to a single one", () => {
    expect(collapseInternalSpaces("   agro")).toBe(" agro");
    expect(collapseInternalSpaces("agro   ")).toBe("agro ");
  });

  it("returns empty for non-string input", () => {
    expect(collapseInternalSpaces(undefined as unknown as string)).toBe("");
  });
});

describe("canonicalizeName", () => {
  it("lowercases ASCII input and trims edges", () => {
    expect(canonicalizeName("  AGRO LAJITAS  ")).toBe("agro lajitas");
  });

  it("strips diacritics", () => {
    expect(canonicalizeName("María Ángeles")).toBe("maria angeles");
  });

  it("preserves ñ while stripping other diacritics", () => {
    expect(canonicalizeName("EL SUEÑO")).toBe("el sueño");
    expect(canonicalizeName("ÑANDÚ")).toBe("ñandu");
  });

  it("collapses dots and other punctuation into single spaces", () => {
    expect(canonicalizeName("AGRO LAJITAS S.R.L.")).toBe("agro lajitas s r l");
  });

  it("treats dashes between alphanumerics as separators", () => {
    expect(canonicalizeName("JIMENES 25-26")).toBe("jimenes 25 26");
  });

  it("expands initials with adjacent letters into separate words", () => {
    expect(canonicalizeName("E.VEDOYA")).toBe("e vedoya");
    expect(canonicalizeName("J.M. PEREZ")).toBe("j m perez");
  });

  it("collapses repeated whitespace", () => {
    expect(canonicalizeName("  doble   espacio  ")).toBe("doble espacio");
  });

  it("ignores non-string inputs", () => {
    expect(canonicalizeName(null)).toBe("");
    expect(canonicalizeName(undefined)).toBe("");
    expect(canonicalizeName(42)).toBe("");
  });

  it("returns empty string when nothing alphanumeric is left", () => {
    expect(canonicalizeName("///")).toBe("");
    expect(canonicalizeName("")).toBe("");
  });
});

describe("formatProperName", () => {
  it("title-cases canonical input and uppercases legal suffixes", () => {
    expect(formatProperName("agro lajitas srl")).toBe("Agro Lajitas SRL");
  });

  it("title-cases legacy uppercase input by canonicalizing first", () => {
    expect(formatProperName("AGRO LAJITAS SRL")).toBe("Agro Lajitas SRL");
  });

  it("uppercases known acronyms (SA, SAS, SH, INTA)", () => {
    expect(formatProperName("soalen sa")).toBe("Soalen SA");
    expect(formatProperName("perez y gomez sh")).toBe("Perez y Gomez SH");
    expect(formatProperName("inta pergamino")).toBe("INTA Pergamino");
  });

  it("keeps Spanish connectors in lowercase except when first", () => {
    expect(formatProperName("juan de la torre")).toBe("Juan de la Torre");
    expect(formatProperName("y griega")).toBe("Y Griega");
  });

  it("strips diacritics for display (matches storage)", () => {
    expect(formatProperName("María Ángeles")).toBe("Maria Angeles");
  });

  it("preserves ñ for display", () => {
    expect(formatProperName("EL SUEÑO")).toBe("El Sueño");
    expect(formatProperName("ÑANDÚ")).toBe("Ñandu");
  });

  it("handles initials by splitting on the dot", () => {
    expect(formatProperName("E.VEDOYA")).toBe("E Vedoya");
    expect(formatProperName("J.M. Perez")).toBe("J M Perez");
  });

  it("formats names with numeric tokens", () => {
    expect(formatProperName("JIMENES 25-26")).toBe("Jimenes 25 26");
    expect(formatProperName("LOTE 1")).toBe("Lote 1");
  });

  it("returns empty string for empty / non-string input", () => {
    expect(formatProperName("")).toBe("");
    expect(formatProperName(null)).toBe("");
    expect(formatProperName(undefined)).toBe("");
  });
});

describe("formatEntityDisplayName", () => {
  it("formats entity names while preserving contribution suffixes", () => {
    expect(formatEntityDisplayName("soalen srl 2")).toBe("Soalen SRL 2");
    expect(formatEntityDisplayName("conrado - 100%")).toBe("Conrado - 100%");
    expect(formatEntityDisplayName("soalen srl - 70%; bian - 30%")).toBe(
      "Soalen SRL - 70%; Bian - 30%",
    );
  });
});

describe("formatTitleCase", () => {
  it("title-cases short UI labels while keeping connectors lowercase", () => {
    expect(formatTitleCase("proyectos archivados")).toBe("Proyectos Archivados");
    expect(formatTitleCase("cantidad de campañas")).toBe("Cantidad de Campañas");
    expect(formatTitleCase("inversores y aportes")).toBe("Inversores y Aportes");
    expect(formatTitleCase("proyecto origen")).toBe("Proyecto Origen");
  });

  it("preserves codes, punctuation and already-numeric labels", () => {
    expect(formatTitleCase("2026-2027")).toBe("2026-2027");
    expect(formatTitleCase("1 - 100%")).toBe("1 - 100%");
    expect(formatTitleCase("Cliente/Sociedad")).toBe("Cliente/Sociedad");
  });
});
