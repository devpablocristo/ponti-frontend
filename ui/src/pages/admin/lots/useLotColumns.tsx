import { useMemo } from "react";

import { LotsData } from "../../../hooks/useLots/types";
import { formatProperName } from "../../../lib/properName";
import { cropColors } from "../colors";
import { Column } from "../types";
import { formatISODate, formatNumberAr } from "../utils";
import { EditableTonsCell } from "./components/EditableTonsCell";

type UseLotColumnsArgs = {
  getFilterOptionsForColumn: (columnKey: keyof LotsData) => string[];
  onSuccessEdit: () => void;
};

const formatNumericValue = (value: unknown) =>
  formatNumberAr(typeof value === "string" || typeof value === "number" ? value : 0);

const latestDateValue = (
  dates: LotsData["dates"],
  key: "sowing_date" | "harvest_date"
) => {
  for (let index = dates.length - 1; index >= 0; index -= 1) {
    const value = dates[index]?.[key];
    if (value) return value;
  }
  return "";
};

const latestHarvestDateValue = (lot: LotsData, value: unknown) => {
  const latestDate = latestDateValue(lot.dates ?? [], "harvest_date");
  if (latestDate) return formatISODate(latestDate);

  const fallbackDate = value || lot.harvest_date;
  return fallbackDate ? formatISODate(String(fallbackDate)) : "";
};

export function useLotColumns({
  getFilterOptionsForColumn,
  onSuccessEdit,
}: UseLotColumnsArgs) {
  return useMemo(() => {
    const baseColumns: Column<LotsData>[] = [
      {
        key: "project_name",
        header: "Proyecto",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("project_name"),
        render: (value, data) => (
          <strong className="text-blue-700">
            <a href={`/admin/database/customers/${data.project_id}`}>
              {formatProperName(value)}
            </a>
          </strong>
        ),
      },
      {
        key: "field_name",
        header: "Campo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("field_name"),
        render: (value) => formatProperName(value),
      },
      {
        key: "lot_name",
        header: "Lote",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("lot_name"),
        render: (value) => formatProperName(value),
      },
      {
        key: "previous_crop",
        header: "Cultivo Ant.",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("previous_crop"),
        render: (crop) => (
          <span className="text-gray-900 dark:text-gray-100">{formatProperName(crop)}</span>
        ),
      },
      {
        key: "current_crop",
        header: "Cultivo Act.",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("current_crop"),
        render: (crop) => {
          const cropName = formatProperName(crop);
          return (
            <span
              className={`rounded-md px-2 py-1 text-[14px] ${
                cropColors[cropName] ||
                "border border-[#000000] bg-[#E5E7EB] text-[#000000]"
              }`}
            >
              {cropName}
            </span>
          );
        },
      },
      {
        key: "variety",
        header: "Variedad",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("variety"),
        render: (value) => <b>{formatProperName(value)}</b>,
      },
      {
        key: "hectares",
        header: "Sup. total",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("hectares"),
        render: (value) => (
          <b>
            {formatNumericValue(value)}{" "}
            <span className="text-xs font-normal">Has</span>
          </b>
        ),
      },
      {
        key: "dates",
        header: "Fecha Siembra",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("dates"),
        render: (value) =>
          Array.isArray(value) ? (
            <b>{formatISODate(latestDateValue(value, "sowing_date"))}</b>
          ) : (
            ""
          ),
      },
      {
        key: "cost_usd_per_ha",
        header: "Costo U$ /HA",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("cost_usd_per_ha"),
        render: (value) => <b>u$ {formatNumericValue(value)}</b>,
      },
    ];

    const harvestColumns: Column<LotsData>[] = [
      ...baseColumns,
      {
        key: "harvested_area",
        header: "Sup. Cosechada",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("harvested_area"),
        render: (value) => (
          <b>
            {formatNumericValue(value)}{" "}
            <span className="text-xs font-normal">Has</span>
          </b>
        ),
      },
      {
        key: "harvest_date",
        header: "Fecha Cosecha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("harvest_date"),
        render: (value, item) => <b>{latestHarvestDateValue(item, value)}</b>,
      },
      {
        key: "tons",
        header: "Toneladas",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("tons"),
        render: (value, item) => (
          <EditableTonsCell
            item={item}
            value={value == null ? "" : String(value)}
            onSuccessEdit={onSuccessEdit}
          />
        ),
      },
      {
        key: "yield_tn_per_ha",
        header: "Rendimiento",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("yield_tn_per_ha"),
        render: (value) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            {formatNumericValue(value)}{" "}
            <span className="text-xs font-normal text-gray-900 dark:text-gray-100">Tn/Has</span>
          </span>
        ),
      },
    ];

    const commercializationColumns: Column<LotsData>[] = [
      ...harvestColumns,
      {
        key: "income_net_per_ha",
        header: "Ingreso Neto",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("income_net_per_ha"),
        render: (value) => (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            u$ {formatNumericValue(value)}
          </span>
        ),
      },
      {
        key: "rent_per_ha",
        header: "Arriendo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("rent_per_ha"),
        render: (value) => (
          <span className="font-medium text-gray-900 dark:text-gray-100">
            u$ {formatNumericValue(value)}
          </span>
        ),
      },
      {
        key: "admin_cost",
        header: "Adm. Proyecto",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("admin_cost"),
        render: (value) => (
          <span className="font-medium text-gray-900 dark:text-gray-100">
            u$ {formatNumericValue(value)}
          </span>
        ),
      },
      {
        key: "active_total_per_ha",
        header: "Activo Total",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("active_total_per_ha"),
        render: (value) => (
          <span className="font-semibold text-gray-900 dark:text-gray-100">
            u$ {formatNumericValue(value)}
          </span>
        ),
      },
      {
        key: "operating_result_per_ha",
        header: "Resultado Operativo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("operating_result_per_ha"),
        render: (value) => (
          <span className="font-bold text-gray-900 dark:text-gray-100">
            u$ {formatNumericValue(value)}
          </span>
        ),
      },
    ];

    return { columns: baseColumns, harvestColumns, commercializationColumns };
  }, [getFilterOptionsForColumn, onSuccessEdit]);
}
