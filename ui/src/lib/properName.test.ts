import { describe, expect, it } from "vitest";

import { canonicalizeName, formatProperName } from "./properName";

describe("canonicalizeName", () => {
  it("lowercases ASCII input and trims edges", () => {
    expect(canonicalizeName("  AGRO LAJITAS  ")).toBe("agro lajitas");
  });

  it("strips diacritics", () => {
    expect(canonicalizeName("María Ángeles")).toBe("maria angeles");
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
