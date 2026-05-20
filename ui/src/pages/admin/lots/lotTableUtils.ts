import { LotKPIs, LotsData } from "../../../hooks/useLots/types";

export type LotIndicatorValues = {
  seeded_area: number;
  harvested_area: number;
  yield_tn_per_ha: number;
  cost_per_hectare: number;
  superficie_total: number;
};

const emptyIndicators: LotIndicatorValues = {
  seeded_area: 0,
  harvested_area: 0,
  yield_tn_per_ha: 0,
  cost_per_hectare: 0,
  superficie_total: 0,
};

function toFiniteNumber(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function hasActiveLotFilters(filters: Record<string, unknown>): boolean {
  return Object.values(filters).some((value) => {
    if (Array.isArray(value)) return value.length > 0;
    return value !== undefined && value !== null && value !== "";
  });
}

function valuesForFilter(lot: LotsData, key: string): string[] {
  if (key === "dates") {
    return (lot.dates ?? [])
      .map((date) => date.sowing_date)
      .filter(Boolean)
      .map(String);
  }

  if (key === "harvest_date") {
    const dateValues = (lot.dates ?? [])
      .map((date) => date.harvest_date)
      .filter(Boolean)
      .map(String);

    if (dateValues.length > 0) return dateValues;
    return lot.harvest_date ? [String(lot.harvest_date)] : [];
  }

  return [String(lot[key as keyof LotsData] ?? "")];
}

function matchesFilterValue(cellValues: string[], filterValue: unknown): boolean {
  const normalizedCellValues = cellValues.map((value) => value.toLowerCase());

  if (Array.isArray(filterValue)) {
    return filterValue.some((option) => {
      const normalizedOption = String(option).toLowerCase();
      return normalizedCellValues.some((value) => value === normalizedOption);
    });
  }

  const normalizedFilter = String(filterValue).toLowerCase();
  return normalizedCellValues.some((value) => value.includes(normalizedFilter));
}

function lotMatchesFilters(
  lot: LotsData,
  filters: Record<string, unknown>,
  ignoredKey?: keyof LotsData
): boolean {
  return Object.entries(filters).every(([key, value]) => {
    if (key === ignoredKey) return true;
    if (!value || (Array.isArray(value) && value.length === 0)) return true;
    return matchesFilterValue(valuesForFilter(lot, key), value);
  });
}

export function filterLots(lots: LotsData[], filters: Record<string, unknown>): LotsData[] {
  return lots.filter((lot) => lotMatchesFilters(lot, filters));
}

export function getLotFilterOptions(
  lots: LotsData[],
  filters: Record<string, unknown>,
  columnKey: keyof LotsData
): string[] {
  const filteredData = lots.filter((lot) => lotMatchesFilters(lot, filters, columnKey));

  const options = filteredData.flatMap((lot) => valuesForFilter(lot, columnKey));
  return [...new Set(options)].filter(Boolean).sort().reverse();
}

export function calculateLotIndicators(lots: LotsData[]): LotIndicatorValues {
  if (lots.length === 0) return emptyIndicators;

  const totalSeededArea = lots.reduce((sum, lot) => sum + toFiniteNumber(lot.sowed_area), 0);
  const totalSurfaceArea = lots.reduce((sum, lot) => sum + toFiniteNumber(lot.hectares), 0);
  const totalHarvestedArea = lots.reduce((sum, lot) => sum + toFiniteNumber(lot.harvested_area), 0);
  const totalTons = lots.reduce((sum, lot) => sum + toFiniteNumber(lot.tons), 0);
  const weightedCost = lots.reduce(
    (sum, lot) => sum + toFiniteNumber(lot.cost_usd_per_ha) * toFiniteNumber(lot.hectares),
    0
  );

  return {
    seeded_area: totalSeededArea,
    harvested_area: totalHarvestedArea,
    yield_tn_per_ha: totalSeededArea > 0 ? totalTons / totalSeededArea : 0,
    cost_per_hectare: totalSurfaceArea > 0 ? weightedCost / totalSurfaceArea : 0,
    superficie_total: totalSurfaceArea,
  };
}

export function mapApiLotIndicators(kpis: LotKPIs): LotIndicatorValues {
  return {
    seeded_area: toFiniteNumber(kpis.seeded_area),
    harvested_area: toFiniteNumber(kpis.harvested_area),
    yield_tn_per_ha: toFiniteNumber(kpis.yield_tn_per_ha),
    cost_per_hectare: toFiniteNumber(kpis.cost_per_hectare),
    superficie_total: toFiniteNumber(kpis.superficie_total),
  };
}
