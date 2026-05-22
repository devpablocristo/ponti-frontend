import { InlineSpinner } from "../../../../components/feedback/InlineSpinner";
import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { Metrics } from "../../../../hooks/useWorkOrders/types";
import { formatNumberAr } from "../../utils";

type OrdersIndicatorsProps = {
  metrics: Metrics;
  processing: boolean;
  ordersAmount: number;
};

/**
 * Grid de KPIs encima de la tabla de WorkOrders: superficie, consumo (Lt/Kg),
 * costo directo, cantidad de órdenes. Si `processing=true` muestra spinner
 * inline en lugar de cards (mejor UX que cards en cero mientras carga).
 */
export function OrdersIndicators({ metrics, processing, ordersAmount }: OrdersIndicatorsProps) {
  return (
    <div>
      {processing ? (
        <InlineSpinner
          label="Cargando indicadores..."
          spinnerClassName="text-custom-btn"
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <IndicatorCard
            title="Sup. ejecutada"
            value={formatNumberAr(metrics.surface_ha) + " Has"}
            color="amber"
          />
          <IndicatorCard
            title="Consumo en litros"
            value={formatNumberAr(metrics.liters) + " Lt"}
            color="gray"
          />
          <IndicatorCard
            title="Consumo en kilos"
            value={formatNumberAr(metrics.kilograms) + " Kg"}
            color="gray"
          />
          <IndicatorCard
            title="Costos directos"
            value={"u$ " + formatNumberAr(metrics.direct_cost)}
            color="red"
          />
          <IndicatorCard
            title="Cantidad Total de Órdenes"
            value={formatNumberAr(ordersAmount)}
            color="blue"
          />
        </div>
      )}
    </div>
  );
}
