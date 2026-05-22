import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { Summary } from "@/api/types";
import { formatNumberAr } from "../../utils";

type StockIndicatorsProps = { summary: Summary };

/**
 * Grid de 3 KPIs encima de la grilla de stock: total Kg, total Lt, total USD.
 */
export function StockIndicators({ summary }: StockIndicatorsProps) {
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IndicatorCard
          title="Total invertido Kg"
          value={formatNumberAr(summary.total_kg) + " Kg"}
          color="gray"
        />
        <IndicatorCard
          title="Total invertido Lt"
          value={formatNumberAr(summary.total_lt) + " Lt"}
          color="gray"
        />
        <IndicatorCard
          title="Total u$ / Neto"
          value={"u$ " + formatNumberAr(summary.total_usd)}
          color="red"
        />
      </div>
    </div>
  );
}
