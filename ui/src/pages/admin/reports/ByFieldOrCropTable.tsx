import { useState } from "react";
import { FieldCropReportData, RowToRender } from "../../../hooks/useReporting/types.ts";
import { cropColors } from "../colors";
import { ChevronDown, ChevronRight } from "lucide-react";

const CropBadge = ({ cropName }: { cropName: string }) => (
  <span
    className={`px-2 py-1 text-xs font-medium rounded-md flex justify-start ${
      cropColors[cropName] || "bg-[#E5E7EB] text-[#000000] border border-[#000000]"
    }`}
  >
    {cropName}
  </span>
);

// Ahora "production" está en la lista de ocultables, porque "surface" es la que manda.
const COLLAPSIBLE_KEYS = [
  "production",
  "yield",
  "gross_price",
  "freight_cost",
  "commercial_cost",
  "net_price",
  "net_income",
];

export const ByFieldOrCropTable = ({
  data,
  rows,
}: {
  data: FieldCropReportData | null;
  rows?: RowToRender[];
}) => {
  // Estado para controlar si el grupo está abierto o cerrado
  const [isEconomicsOpen, setIsEconomicsOpen] = useState(false);

  if (!data || !data.columns) {
    return (
      <div className="p-4 text-sm text-gray-600 rounded-lg bg-gray-50">
        No hay datos disponibles
      </div>
    );
  }

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
    <div className="overflow-x-auto flex justify-between">
      <table className="w-full text-sm bg-white border border-gray-300">
        <thead>
          <tr className="h-14">
            <th></th>
            {data.columns &&
              data.columns.map((row) => (
                <>
                  <th className="w-2"></th>
                  <th className="p-2 flex flex-col items-start">
                    <p className="mb-2 text-left uppercase font-medium">
                      {row.field_name}
                    </p>
                    <hr className="mb-3 w-full" />
                    <CropBadge cropName={row.crop_name} />
                  </th>
                </>
              ))}
          </tr>
        </thead>
        <tbody>
          {rows?.map((row) => {
            const { key } = row;
            // Ahora la fila que tiene el control es "surface"
            const isToggleRow = key === "surface";

            // Si la fila está en la lista de ocultables y el grupo está cerrado, no la mostramos.
            if (COLLAPSIBLE_KEYS.includes(key) && !isEconomicsOpen) {
              return null;
            }

            return renderRow(row, isToggleRow);
          })}
        </tbody>
      </table>
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
        <th
          className={
            [
              !classNameHeader.includes("text-") && "text-gray-600",
              !classNameHeader.includes("font-") && "font-light",
              classNameHeader,
            ]
              .filter(Boolean)
              .join(" ") +
            " p-2 text-left w-1/5 border-t border-t-gray-300 " +
            (isToggleRow ? "cursor-pointer hover:bg-gray-50" : "")
          }
          onClick={isToggleRow ? () => setIsEconomicsOpen(!isEconomicsOpen) : undefined}
        >
          {isToggleRow ? (
            <div className="flex items-center gap-2 select-none">
              {isEconomicsOpen ? (
                <ChevronDown size={16} className="text-gray-500" />
              ) : (
                <ChevronRight size={16} className="text-gray-500" />
              )}
              {label}
            </div>
          ) : (
            label
          )}
        </th>

        {/* Celdas de Datos (Derecha) */}
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

          return (
            <>
              <td className="w-2 bg-white"></td>
              {showIndicator ? (
                <td
                  key={index}
                  className={`${finalRowClasses} p-1 text-left flex justify-start items-center h-14 border-t border-t-gray-300`}
                >
                  {valueFormat.crop(rowValue)}
                  <div className="relative h-6 w-6 ml-1">
                    <div
                      className={`absolute inset-0 rounded-full opacity-30 ${indicatorBackgroundColor(
                        rowValue
                      )}`}
                    ></div>
                    <div
                      className={`absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full ${indicatorBackgroundColor(
                        rowValue
                      )}`}
                    ></div>
                  </div>
                </td>
              ) : (
                <td
                  key={index}
                  className={`${finalRowClasses} p-1 text-left border-t h-3 border-t-gray-300`}
                >
                  {valueFormat.crop(rowValue)}
                </td>
              )}
            </>
          );
        })}
      </tr>
    );
  }
};