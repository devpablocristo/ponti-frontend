import { Wheat } from "lucide-react";
import type { CropItem, DashboardData } from "../../../../hooks/useDashboard/types";
import { formatNumberAr } from "../../utils";
import { CropBadgeV2 } from "../../reports/reportV2/CropBadgeV2";
import { ProgressBar } from "./ProgressBar";

const SORA = "Sora, ui-sans-serif, system-ui, sans-serif";

function n(v: string | number | undefined | null): number {
  return Number(v) || 0;
}

export function CostByCropCardV2({ dashboard }: { dashboard: DashboardData | null }) {
  if (!dashboard?.crop_incidence?.items?.length) {
    return <EmptyCard />;
  }

  const crops = aggregateCrops(dashboard.crop_incidence.items).sort(
    (a, b) => a.crop_id - b.crop_id,
  );
  const totalHa = crops.reduce((sum, crop) => sum + n(crop.hectares), 0);
  const totalCost = crops.reduce(
    (sum, crop) => sum + n(crop.cost_per_ha_usd) * n(crop.hectares),
    0,
  );

  return (
    <div
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-4 flex items-center gap-2">
        <Wheat className="h-4 w-4 text-slate-500" />
        <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: SORA }}>
          Incidencia de costos por cultivo
        </h3>
      </header>

      <div className="grid grid-cols-[1.4fr_0.9fr_0.9fr] gap-3 pb-2 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <div>Cultivo</div>
        <div className="text-right">Superficie</div>
        <div className="text-right">Costo u$s/Ha</div>
      </div>

      <ul className="divide-y divide-slate-100">
        {crops.map((crop) => {
          const pct = totalHa > 0 ? (n(crop.hectares) / totalHa) * 100 : 0;
          return (
            <li
              key={crop.crop_id}
              className="grid grid-cols-[1.4fr_0.9fr_0.9fr] gap-3 items-center py-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <CropBadgeV2 cropName={crop.name} />
                  <span className="text-[11px] font-semibold tabular-nums text-slate-600">
                    {pct.toFixed(0)}% rotación
                  </span>
                </div>
                <ProgressBar value={pct} color="#10B981" height="sm" />
              </div>
              <span
                className="text-right text-sm font-semibold tabular-nums text-slate-800"
                style={{ fontFamily: SORA }}
              >
                {formatNumberAr(crop.hectares)} Ha
              </span>
              <span
                className="text-right text-sm font-semibold tabular-nums text-slate-800"
                style={{ fontFamily: SORA }}
              >
                u$s {formatNumberAr(crop.cost_per_ha_usd)}
              </span>
            </li>
          );
        })}
      </ul>

      <div className="mt-3 grid grid-cols-[1.4fr_0.9fr_0.9fr] gap-3 items-center rounded-lg bg-slate-900 text-white px-3 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wider">Total</span>
        <span
          className="text-right text-sm font-bold tabular-nums"
          style={{ fontFamily: SORA }}
        >
          {formatNumberAr(totalHa)} Ha
        </span>
        <span
          className="text-right text-sm font-bold tabular-nums"
          style={{ fontFamily: SORA }}
        >
          u$s {formatNumberAr(totalHa > 0 ? totalCost / totalHa : 0)}
        </span>
      </div>
    </div>
  );
}

function aggregateCrops(items: CropItem[]): CropItem[] {
  const byCrop = new Map<number, { item: CropItem; totalCost: number }>();

  for (const item of items) {
    const hectares = n(item.hectares);
    const costPerHa = n(item.cost_per_ha_usd);
    const current = byCrop.get(item.crop_id);
    if (!current) {
      byCrop.set(item.crop_id, {
        item: { ...item, hectares: String(hectares) },
        totalCost: costPerHa * hectares,
      });
      continue;
    }
    current.item.hectares = String(n(current.item.hectares) + hectares);
    current.totalCost += costPerHa * hectares;
  }

  return Array.from(byCrop.values()).map(({ item, totalCost }) => {
    const hectares = n(item.hectares);
    return {
      ...item,
      hectares: String(hectares),
      cost_per_ha_usd: String(hectares > 0 ? totalCost / hectares : 0),
    };
  });
}

function EmptyCard() {
  return (
    <div
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-3 flex items-center gap-2">
        <Wheat className="h-4 w-4 text-slate-500" />
        <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: SORA }}>
          Incidencia de costos por cultivo
        </h3>
      </header>
      <p className="text-sm text-slate-500">No hay datos de cultivos disponibles</p>
    </div>
  );
}
