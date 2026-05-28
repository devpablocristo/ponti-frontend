import { LoaderCircle } from "lucide-react";

import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { formatNumberAr } from "../../utils";
import { LotIndicatorValues } from "../lotTableUtils";

type LegacyLotsIndicatorsProps = {
  kpis: LotIndicatorValues;
  processing: boolean;
  error: string | null;
};

export function LegacyLotsIndicators({
  kpis,
  processing,
  error,
}: LegacyLotsIndicatorsProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50/60 p-4">
      {processing ? (
        <div className="flex items-center justify-center py-4">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin text-custom-btn" />
          <span className="text-sm font-medium text-gray-500">
            Cargando indicadores...
          </span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-sm font-medium text-red-600">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <IndicatorCard
            title="Sup. sembrada"
            value={`${formatNumberAr(kpis.seeded_area)} Has`}
            color="amber"
          />
          <IndicatorCard
            title="Sup. cosechada"
            value={`${formatNumberAr(kpis.harvested_area)} Has`}
            color="amber"
          />
          <IndicatorCard
            title="Tn / hectárea"
            value={`${formatNumberAr(kpis.yield_tn_per_ha)} Tn`}
            color="green"
          />
          <IndicatorCard
            title="Costo / hectárea"
            value={`u$ ${formatNumberAr(kpis.cost_per_hectare)}`}
            color="red"
          />
          <IndicatorCard
            title="Superficie total"
            value={`${formatNumberAr(kpis.superficie_total)} Has`}
            color="amber"
          />
        </div>
      )}
    </div>
  );
}
