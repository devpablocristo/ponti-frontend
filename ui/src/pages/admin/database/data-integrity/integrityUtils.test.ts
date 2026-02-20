import { describe, expect, it } from "vitest";

import {
  sortIntegrityChecks,
  hasRecalcBData,
  type IntegrityCheck,
} from "./integrityUtils";

const makeCheck = (controlNumber: number, withRecalcB = false): IntegrityCheck => ({
  control_number: controlNumber,
  data_to_verify: `Dato ${controlNumber}`,
  description: "desc",
  control_rule: "rule",
  system_calculation: "S",
  system_value: "1",
  system_source: "system",
  system_meaning: "meaning-system",
  recalc_a_calculation: "A",
  recalc_a_value: "1",
  recalc_a_source: "recalc-a",
  recalc_a_meaning: "meaning-a",
  recalc_b_calculation: withRecalcB ? "B" : undefined,
  recalc_b_value: withRecalcB ? "2" : undefined,
  recalc_b_source: withRecalcB ? "recalc-b" : undefined,
  recalc_b_meaning: withRecalcB ? "meaning-b" : undefined,
  difference_a: "0",
  difference_b: withRecalcB ? "-1" : undefined,
  status: "OK",
  tolerance: "0",
});

describe("integrity renderer helpers", () => {
  it("ordena correctamente 14 checks por control_number", () => {
    const checks = Array.from({ length: 14 }, (_, i) => makeCheck(14 - i));
    const sorted = sortIntegrityChecks(checks);

    expect(sorted).toHaveLength(14);
    expect(sorted[0].control_number).toBe(1);
    expect(sorted[13].control_number).toBe(14);
  });

  it("detecta recalc_b_* opcional", () => {
    expect(hasRecalcBData(makeCheck(1, false))).toBe(false);
    expect(hasRecalcBData(makeCheck(2, true))).toBe(true);
  });
});
