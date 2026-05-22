import { InlineSpinner } from "../../../../components/feedback/InlineSpinner";
import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { Metrics } from "../../../../hooks/useLabors/types";
import { formatNumberAr } from "../../utils";

type TasksIndicatorsProps = {
  metrics: Metrics;
  processing: boolean;
  laborsAmount: number;
};

/**
 * Grid de KPIs encima de la tabla de Labors: superficie, costo promedio/Ha,
 * total neto, cantidad de labores. Spinner inline mientras carga.
 */
export function TasksIndicators({ metrics, processing, laborsAmount }: TasksIndicatorsProps) {
  return (
    <div>
      {processing ? (
        <InlineSpinner
          label="Cargando indicadores..."
          spinnerClassName="text-custom-btn"
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <IndicatorCard
            title="Superficie total"
            value={formatNumberAr(metrics.surface_ha) + " Has"}
            color="amber"
          />
          <IndicatorCard
            title="Costo promedio / Ha"
            value={"u$ " + formatNumberAr(metrics.avg_cost_per_ha)}
            color="red"
          />
          <IndicatorCard
            title="Total u$ / Neto"
            value={"u$ " + formatNumberAr(metrics.net_total_cost)}
            color="red"
          />
          <IndicatorCard
            title="Cantidad Total de Labores"
            value={formatNumberAr(laborsAmount)}
            color="blue"
          />
        </div>
      )}
    </div>
  );
}
