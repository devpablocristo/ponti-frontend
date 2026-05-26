import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { Summary } from "@/api/types";
import { formatNumberAr } from "../../utils";

type SupplyMovementsIndicatorsProps = { summary?: Summary };

/**
 * Grid de 3 KPIs (Kg, Lt, USD) para la tabla de supply movements.
 * Maneja `summary === undefined` con defaults a 0.
 */
export function SupplyMovementsIndicators({ summary }: SupplyMovementsIndicatorsProps) {
  const safeSummary = summary ?? {
    total_kg: 0,
    total_lt: 0,
    total_usd: 0,
  };
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IndicatorCard
          title="Total invertido Kg"
          value={formatNumberAr(safeSummary.total_kg) + " Kg"}
          color="gray"
        />
        <IndicatorCard
          title="Total invertido Lt"
          value={formatNumberAr(safeSummary.total_lt) + " Lt"}
          color="gray"
        />
        <IndicatorCard
          title="Total u$ / Neto"
          value={"u$ " + formatNumberAr(safeSummary.total_usd)}
          color="red"
        />
      </div>
    </div>
  );
}
