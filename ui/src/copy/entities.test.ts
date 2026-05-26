import { describe, expect, it } from "vitest";
import {
  ENTITIES_BY_KEY,
  genderSuffix,
  indefiniteArticle,
  isFeminine,
  lookupBackendEntity,
  objectPronoun,
  withArticle,
  withArticleCap,
} from "./entities";

describe("isFeminine", () => {
  it("detecta femenino por artículo 'la'", () => {
    expect(isFeminine(ENTITIES_BY_KEY.labor)).toBe(true);
    expect(isFeminine(ENTITIES_BY_KEY.campaign)).toBe(true);
  });

  it("detecta masculino por artículo 'el'", () => {
    expect(isFeminine(ENTITIES_BY_KEY.customer)).toBe(false);
    expect(isFeminine(ENTITIES_BY_KEY.lot)).toBe(false);
  });
});

describe("helpers de concordancia", () => {
  it("genderSuffix devuelve 'a' para femenino y 'o' para masculino", () => {
    expect(genderSuffix(ENTITIES_BY_KEY.lot)).toBe("o");
    expect(genderSuffix(ENTITIES_BY_KEY.labor)).toBe("a");
  });

  it("objectPronoun devuelve 'la' para femenino y 'lo' para masculino", () => {
    expect(objectPronoun(ENTITIES_BY_KEY.lot)).toBe("lo");
    expect(objectPronoun(ENTITIES_BY_KEY.labor)).toBe("la");
  });

  it("indefiniteArticle devuelve 'uno'/'una' según género", () => {
    expect(indefiniteArticle(ENTITIES_BY_KEY.lot)).toBe("uno");
    expect(indefiniteArticle(ENTITIES_BY_KEY.labor)).toBe("una");
  });

  it("withArticle compone artículo + singular", () => {
    expect(withArticle(ENTITIES_BY_KEY.lot)).toBe("el lote");
    expect(withArticle(ENTITIES_BY_KEY.labor)).toBe("la labor");
  });

  it("withArticleCap capitaliza el artículo", () => {
    expect(withArticleCap(ENTITIES_BY_KEY.lot)).toBe("El lote");
    expect(withArticleCap(ENTITIES_BY_KEY.labor)).toBe("La labor");
  });
});

describe("lookupBackendEntity", () => {
  it("resuelve nombres en inglés del BE", () => {
    expect(lookupBackendEntity("lot")).toEqual(ENTITIES_BY_KEY.lot);
    expect(lookupBackendEntity("work order")).toEqual(ENTITIES_BY_KEY.workOrder);
    expect(lookupBackendEntity("lease type")).toEqual(ENTITIES_BY_KEY.leaseType);
  });

  it("es case-insensitive y tolera whitespace", () => {
    expect(lookupBackendEntity("  LOT  ")).toEqual(ENTITIES_BY_KEY.lot);
    expect(lookupBackendEntity("Work Order")).toEqual(ENTITIES_BY_KEY.workOrder);
  });

  it("devuelve undefined para nombres no registrados", () => {
    expect(lookupBackendEntity("unknown")).toBeUndefined();
    expect(lookupBackendEntity("")).toBeUndefined();
  });
});
