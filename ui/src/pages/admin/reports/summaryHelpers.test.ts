import { describe, expect, it } from "vitest";

import { cropIdFromUnknown } from "./summaryHelpers";

describe("summary helpers", () => {
  it("maps all-crops labels to the unselected crop id", () => {
    expect(cropIdFromUnknown("Todos")).toBe("0");
    expect(cropIdFromUnknown("Todos los cultivos")).toBe("0");
    expect(cropIdFromUnknown("")).toBe("0");
  });

  it("extracts crop ids from filter options", () => {
    expect(cropIdFromUnknown({ id: 12, name: "Trigo" })).toBe("12");
    expect(cropIdFromUnknown({ target: { value: "8" } })).toBe("8");
  });
});
