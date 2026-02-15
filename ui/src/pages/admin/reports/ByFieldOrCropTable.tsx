import { useState } from "react";
import { FieldCropReportData, RowToRender } from "../../../hooks/useReporting/types.ts";
import { cropColors } from "../colors";
import { ChevronDown, ChevronRight } from "lucide-react";

const CropBadge = ({ cropName }: { cropName: string }) => (
  <span
    className={`px-2 py-0.5 text-xs font-medium rounded-md whitespace-nowrap ${cropColors[cropName] || "bg-[#E5E7EB] text-[#000000] border border-[#000000]"
      }`}
  >
    {cropName}
  </span>
);

const COLLAPSIBLE_KEYS = [
  "production",
  "yield",
  "gross_price",
  "freight_cost",
  "commercial_cost",
  "net_price",
  "net_income",
];

// --- VALUE CELL (Tu versión original) ---
const ValueCell = ({ value, isCentered }: { value: string, isCentered: boolean }) => {
  const match = value.match(/^([\d.,-]+)\s*(.*)$/);

  if (!match) {
    return (
      <div
        className={`inline-flex w-full ${
          isCentered ? "justify-center" : "justify-start pl-8"
        }`}
      >
        <span>{value}</span>
      </div>
    );
  }

  const [, numberPart, unitPart] = match;

  return (
    <div
      className={`inline-flex items-center gap-1 ${
        isCentered ? "justify-center" : "justify-start pl-8"
      }`}
    >
      <span className="text-right font-medium">{numberPart}</span>
      <span className="text-left text-xs opacity-90">{unitPart}</span>
    </div>
  );
};

export const ByFieldOrCropTable = ({
  data,
  rows,
}: {
  data: FieldCropReportData | null;
  rows?: RowToRender[];
}) => {
  const [isEconomicsOpen, setIsEconomicsOpen] = useState(false);

  if (!data || !data.columns) {
    return (
      <div className="p-4 text-sm text-gray-600 rounded-lg bg-gray-50">
        No hay datos disponibles
      </div>
    );
  }

  // Detectamos si es una sola columna o varias
  const isSingleColumn = data.columns.length === 1;

  const getValue = (rowKey: string, columnId: string) => {
    const row = data.rows.find((r) => r.key === rowKey);
    if (!row || !row.values[columnId]) {
      return 0;
    }
    return parseFloat(row.values[columnId].number) || 0;
  };

  const indicatorBackgroundColor = (value: number) => {
    if (value > 0) {
      return value < 6 ? "bg-[#FACA15]" : "bg-[#31C48D]";
    } else {
      return "bg-[#F98080]";
    }
  };

  return (
    <div className="overflow-x-auto">
      <div
        style={{
          width: `${data.columns.length * 360}px`,
        }}
      >
        <table className="text-sm bg-white border border-gray-300">
        <thead>
          <tr className="h-14">
            <th></th>
            {data.columns &&
              data.columns.map((row) => (
                <>
                  <th className="w-2"></th>
                  {/* --- MODIFICACIÓN DEL ENCABEZADO --- */}
                  <th className="p-2 align-middle w-[165px]">
                    <div
                      className={`flex flex-col gap-1 `}
                    >
                      <span className="uppercase font-medium text-gray-700 whitespace-nowrap">
                        {row.field_name}
                      </span>
                      <CropBadge cropName={row.crop_name} />
                    </div>
                  </th>
                </>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row) => {
            const { key } = row;
            const isToggleRow = key === "surface";

            if (COLLAPSIBLE_KEYS.includes(key) && !isEconomicsOpen) {
              return null;
            }

            return renderRow(row, isToggleRow);
          })}
        </tbody>
        </table>
      </div>
    </div>
  );

  function renderRow(
    {
      label,
      key,
      valueFormat,
      classNameRows = "",
      classNameHeader = "",
      showIndicator,
    }: RowToRender,
    isToggleRow: boolean = false
  ) {
    return (
      <tr key={key} className={classNameHeader}>
        {/* Columna de etiquetas (Siempre a la izquierda) */}
        <th
          className={
            [
              !classNameHeader.includes("text-") && "text-gray-600",
              !classNameHeader.includes("font-") && "font-light",
              classNameHeader,
            ]
              .filter(Boolean)
              .join(" ") +
            " p-1 text-left w-[210px] border-t border-t-gray-300 " +
            (isToggleRow ? "cursor-pointer hover:bg-gray-50" : "")
          }
          onClick={
            isToggleRow ? () => setIsEconomicsOpen(!isEconomicsOpen) : undefined
          }
        >
          {isToggleRow ? (
            <div className="flex items-center gap-2 select-none pl-2">
              {isEconomicsOpen ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              {label}
            </div>
          ) : (
            <span className="pl-2">{label}</span>
          )}
        </th>

        {/* Columnas de datos */}
        {data!.columns.map((column, index) => {
          const finalRowClasses = [
            !classNameRows.includes("text-") && "text-gray-600",
            !classNameRows.includes("bg-"),
            !classNameRows.includes("font-") && "font-light",
            classNameRows,
          ]
            .filter(Boolean)
            .join(" ");

          const rowValue = getValue(key, column.id);
          const formattedValue = valueFormat.crop(rowValue);

          return (
            <>
              <td className="w-2 bg-white"></td>
              {showIndicator ? (
                <td
                  key={index}
                  className={`${finalRowClasses} border-t border-t-gray-300 p-0`}
                >
                  <div className="flex items-center justify-center h-full w-full gap-1">
                    <ValueCell value={formattedValue} isCentered={!isSingleColumn} />

                    {/* Semáforo */}
                    <div className="relative h-4 w-4 ml-1">
                      <div
                        className={`absolute inset-0 rounded-full opacity-30 ${indicatorBackgroundColor(
                          rowValue
                        )}`}
                      ></div>
                      <div
                        className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full ${indicatorBackgroundColor(
                          rowValue
                        )}`}
                      ></div>
                    </div>
                  </div>
                </td>
              ) : (
                <td
                  key={index}
                  className={`${finalRowClasses} border-t border-t-gray-300 p-0`}
                >
                  <div className="flex items-center justify-center h-full w-full">
                    <ValueCell value={formattedValue} isCentered={!isSingleColumn} />
                  </div>
                </td>
              )}
            </>
          );
        })}
      </tr>
    );
  }
};