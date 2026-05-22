import { CropItem, DashboardData } from "../../../hooks/useDashboard/types";
import { cropColors } from "../colors.ts";

interface CostByCropTableProps {
  dashboard: DashboardData | null;
}

export function CostByCropTable({ dashboard }: CostByCropTableProps) {
  if (!dashboard || !dashboard.crop_incidence.items?.length) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 w-full">
        <h3 className="font-semibold text-[#020617] font-sans mb-4">
          Incidencia de Costos por Cultivo
        </h3>
        <div className="p-4 text-sm text-gray-600 dark:text-gray-300 rounded-lg bg-gray-50 dark:bg-slate-900">
          No hay datos de cultivos disponibles
        </div>
      </div>
    );
  }

  const { crop_incidence } = dashboard;
  const crops = aggregateCrops(crop_incidence.items).sort(
    (a, b) => a.crop_id - b.crop_id,
  );
  const totalHectares = crops.reduce(
    (sum, crop) => sum + Number(crop.hectares || 0),
    0,
  );
  const totalCost = crops.reduce(
    (sum, crop) =>
      sum + Number(crop.cost_per_ha_usd || 0) * Number(crop.hectares || 0),
    0,
  );

  const getCropBackgroundClass = (cropName: string) => {
    if (!cropName || !cropColors[cropName]) return "bg-gray-50 dark:bg-slate-900";
    const match = cropColors[cropName].match(/bg-\[[^\]]+]/);
    return match ? match[0] : "bg-gray-50 dark:bg-slate-900";
  };

  const totalRotationPct = Math.round(
    (crops.reduce((sum, crop) => sum + Number(crop.hectares || 0), 0) /
      Number(totalHectares || 1)) *
      100
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 w-full">
      <h3 className="font-medium text-[#020617] font-sans mb-4 text-xl">
        Incidencia de Costos por Cultivo
      </h3>

      <div className="grid grid-cols-4 text-sm font-semibold mb-2">
        <div></div>
        <div className="bg-[#E5E7EB] text-gray-900 dark:text-gray-100 mx-1 rounded h-[43px] text-center flex justify-center items-center">
          Superficie Has
        </div>
        <div className="bg-[#E5E7EB] text-gray-900 dark:text-gray-100 mx-1 rounded text-center flex justify-center items-center">
          % Rotación
        </div>
        <div className="bg-[#E5E7EB] text-gray-900 dark:text-gray-100 mx-1 rounded text-center flex justify-center items-center">
          Costo u$/Ha
        </div>
      </div>

      {crops.map((crop) => (
        <div
          key={crop.crop_id}
          className="grid grid-cols-4 text-sm my-2"
        >
          <div className={`${getCropBackgroundClass(crop.name)} h-[45px] font-semibold content-center pl-5 rounded-l-[5px]`}>{crop.name}</div>
          <div className={`${getCropBackgroundClass(crop.name)} h-[45px] text-center content-center`}>{crop.hectares} Has</div>
          <div className={`${getCropBackgroundClass(crop.name)} h-[45px] text-center content-center mr-1 rounded-r-[5px]`}>{crop.incidence_pct}%</div>
          <div className={`${getCropBackgroundClass(crop.name)} text-center content-center ml-1 rounded-[5px]`}>{crop.cost_per_ha_usd} u$/Ha</div>
        </div>
      ))}

      <div className="grid grid-cols-4 text-sm font-semibold text-slate-700 dark:text-slate-200 mt-1 rounded">
        <div className="h-[45px]"></div>
        <div className="bg-[#E5E7EB] h-[45px] text-center content-center rounded-l-[5px]">{Math.round(totalHectares)} Has</div>
        <div className="bg-[#E5E7EB] h-[45px] text-center content-center">
          {totalRotationPct}%
        </div>
        <div className="bg-[#E5E7EB] h-[45px] text-center content-center rounded-r-[5px]">{Math.round(totalHectares > 0 ? totalCost / totalHectares : 0)} u$/Ha</div>
      </div>
    </div>
  );
}

function aggregateCrops(items: CropItem[]): CropItem[] {
  const byCrop = new Map<number, { item: CropItem; totalCost: number }>();
  let totalHectares = 0;

  for (const item of items) {
    const hectares = Number(item.hectares || 0);
    const costPerHa = Number(item.cost_per_ha_usd || 0);
    totalHectares += hectares;
    const current = byCrop.get(item.crop_id);
    if (!current) {
      byCrop.set(item.crop_id, {
        item: { ...item, hectares: String(hectares) },
        totalCost: costPerHa * hectares,
      });
      continue;
    }
    const currentHectares = Number(current.item.hectares || 0) + hectares;
    current.item.hectares = String(currentHectares);
    current.totalCost += costPerHa * hectares;
  }

  return Array.from(byCrop.values()).map(({ item, totalCost }) => {
    const hectares = Number(item.hectares || 0);
    return {
      ...item,
      hectares: String(Math.round(hectares)),
      incidence_pct: String(
        Math.round(totalHectares > 0 ? (hectares / totalHectares) * 100 : 0),
      ),
      cost_per_ha_usd: String(Math.round(hectares > 0 ? totalCost / hectares : 0)),
    };
  });
}
