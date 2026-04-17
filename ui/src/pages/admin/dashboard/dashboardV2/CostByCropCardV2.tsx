import { Wheat } from "lucide-react";
import type { DashboardData } from "../../../../hooks/useDashboard/types";
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

  const crops = [...dashboard.crop_incidence.items].sort(
    (a, b) => a.crop_id - b.crop_id,
  );
  const totalHa = n(dashboard.crop_incidence.total.hectares);

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
          {formatNumberAr(dashboard.crop_incidence.total.hectares)} Ha
        </span>
        <span
          className="text-right text-sm font-bold tabular-nums"
          style={{ fontFamily: SORA }}
        >
          u$s {formatNumberAr(dashboard.crop_incidence.total.avg_cost_per_ha_usd)}
        </span>
      </div>
    </div>
  );
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
