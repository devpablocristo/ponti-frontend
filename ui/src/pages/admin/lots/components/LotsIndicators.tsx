import { InlineSpinner } from "../../../../components/feedback/InlineSpinner";
import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { formatNumberAr } from "../../utils";
import { LotIndicatorValues } from "../lotTableUtils";

type LotsIndicatorsProps = {
  kpis: LotIndicatorValues;
  fieldsAmount: number;
  lotsAmount: number;
  processing: boolean;
  error: string | null;
};

export function LotsIndicators({
  kpis,
  fieldsAmount,
  lotsAmount,
  processing,
  error,
}: LotsIndicatorsProps) {
  return (
    <div>
      {processing ? (
        <InlineSpinner
          label="Cargando indicadores..."
          spinnerClassName="text-custom-btn"
        />
      ) : error ? (
        <div className="flex items-center gap-2 text-sm font-medium text-red-600">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
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
          <IndicatorCard
            title="Cantidad Total de Campos"
            value={formatNumberAr(fieldsAmount)}
            color="blue"
          />
          <IndicatorCard
            title="Cantidad de Lotes por Campo"
            value={formatNumberAr(lotsAmount)}
            color="blue"
          />
        </div>
      )}
    </div>
  );
}
