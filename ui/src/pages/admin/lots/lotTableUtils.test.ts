import { describe, expect, it } from "vitest";
import { LotsData } from "../../../hooks/useLots/types";
import {
  calculateLotIndicators,
  filterLots,
  getLotFilterOptions,
  mapApiLotIndicators,
} from "./lotTableUtils";

const lot = (overrides: Partial<LotsData>): LotsData => ({
  id: 1,
  project_id: 30,
  field_id: 12,
  project_name: "JUJUY",
  field_name: "SJDD",
  lot_name: "LOTE 1",
  previous_crop: "Poroto rojo",
  previous_crop_id: 1,
  current_crop: "Poroto Mung",
  current_crop_id: 2,
  variety: "Mungo",
  hectares: "10",
  sowed_area: "10",
  harvest_date: null,
  harvested_area: "8",
  dates: [{ sowing_date: "2026-02-04", harvest_date: null, sequence: 1 }],
  tons: "12.5",
  yield_tn_per_ha: "1.56",
  income_net_per_ha: "0",
  cost_usd_per_ha: "363",
  rent_per_ha: "150",
  admin_cost: "50",
  active_total_per_ha: "433",
  operating_result_per_ha: "-433",
  season: "2025-2026",
  updated_at: "2026-04-29T00:00:00Z",
  ...overrides,
});

describe("lotTableUtils", () => {
  it("filters harvest dates from the dates contract instead of legacy aliases", () => {
    const data = [
      lot({
        id: 1,
        dates: [
          {
            sowing_date: "2026-02-04",
            harvest_date: "2026-04-20",
            sequence: 1,
          },
        ],
      }),
      lot({
        id: 2,
        dates: [
          {
            sowing_date: "2026-03-01",
            harvest_date: "2026-05-10",
            sequence: 1,
          },
        ],
      }),
    ];

    expect(getLotFilterOptions(data, {}, "harvest_date")).toEqual(["2026-05-10", "2026-04-20"]);
    expect(filterLots(data, { harvest_date: ["2026-05-10"] })).toHaveLength(1);
    expect(filterLots(data, { harvest_date: ["2026-05-10"] })[0].id).toBe(2);
  });

  it("falls back to the root harvest date when dates has no harvest date", () => {
    const data = [
      lot({
        harvest_date: "2026-05-20",
        dates: [{ sowing_date: "2026-02-04", harvest_date: null, sequence: 1 }],
      }),
    ];

    expect(getLotFilterOptions(data, {}, "harvest_date")).toEqual(["2026-05-20"]);
    expect(filterLots(data, { harvest_date: ["2026-05-20"] })).toHaveLength(1);
  });

  it("keeps commercialization values from real API fields as decimal strings", () => {
    const data = [
      lot({
        tons: "0.00",
        income_net_per_ha: "0",
        rent_per_ha: "150",
        active_total_per_ha: "433",
        operating_result_per_ha: "-433",
      }),
    ];

    expect(data[0].income_net_per_ha).toBe("0");
    expect(data[0].rent_per_ha).toBe("150");
    expect(data[0].active_total_per_ha).toBe("433");
    expect(data[0].operating_result_per_ha).toBe("-433");
  });

  it("calculates indicators from string decimals", () => {
    const indicators = calculateLotIndicators([
      lot({ hectares: "50", sowed_area: "50", harvested_area: "48", tons: "152.5" }),
      lot({ hectares: "50", sowed_area: "50", harvested_area: "45", tons: "152.5" }),
    ]);

    expect(indicators.seeded_area).toBe(100);
    expect(indicators.harvested_area).toBe(93);
    expect(indicators.yield_tn_per_ha).toBe(3.05);
  });

  it("maps API KPI strings to numeric display values", () => {
    expect(
      mapApiLotIndicators({
        seeded_area: "1700.7",
        harvested_area: "0",
        yield_tn_per_ha: "0",
        cost_per_hectare: "363.5",
        superficie_total: "1697.7",
      })
    ).toEqual({
      seeded_area: 1700.7,
      harvested_area: 0,
      yield_tn_per_ha: 0,
      cost_per_hectare: 363.5,
      superficie_total: 1697.7,
    });
  });
});
