import { Fragment } from "react";
import { RowToRender, SummaryResultsReportData } from "../../../hooks/useReporting/types.ts";
import { cropColors } from "../colors";
import { formatNumberAr } from "../utils.ts";

const CropBadge = ({ cropName }: { cropName: string }) => (
  <span
    className={ `px-3 py-1 text-sm font-medium rounded-md whitespace-nowrap ${ cropColors[cropName] || "bg-[#E5E7EB] text-[#000000] border border-[#000000]" }` }>
    { cropName }
  </span>
);

const ValueCell = ({ value }: { value: string }) => {
  const match = value.match(/^([\d.,-]+)\s*(.*)$/);

  if (!match) {
    return (
      <div className="inline-flex w-full justify-center">
        <span>{ value }</span>
      </div>
    );
  }

  const [, numberPart, unitPart] = match;

  return (
    <div className="inline-flex items-center gap-1 justify-center">
      <span className="text-right font-medium">{ numberPart }</span>
      <span className="text-left text-xs opacity-90">{ unitPart }</span>
    </div>
  );
};

export const SummaryResultsTable = ({
                                      data,
                                      rows,
                                    }: {
  data: SummaryResultsReportData | null;
  rows?: RowToRender[];
}) => {
  if (!data) {
    return (
      <div className="p-4  text-gray-600 rounded-lg bg-gray-50">
        No hay datos disponibles
      </div>
    );
  }

  const getValue = (rowKey: string, cropId: number) => {
    const crop = data.crops.find(c => c.crop_id === cropId);
    if (!crop) return 0;

    return parseFloat(crop[rowKey as keyof typeof crop] as string) || 0;
  };


  const indicatorBackgroundColor = (value: string | number) => {
    const numericValue = Number(value);
    if (numericValue > 0) {
      return numericValue < 6 ? "bg-[#FACA15]" : "bg-[#31C48D]";
    } else {
      return "bg-[#F98080]";
    }
  }

  const isSingleColumn = data.crops.length === 1;

  return (
    <div className="overflow-x-auto">
      <div className="flex items-start gap-6 min-w-max">
      <table className=" text-base bg-white border border-gray-300">
        <thead>
        <tr className="h-16">
          <th></th>
          { data.crops.map((crop) => (
            <Fragment key={ crop.crop_id }>
              <th className="w-3"></th>
              <th className="p-3 align-middle w-[220px]">
                <CropBadge cropName={ crop.crop_name }/>
              </th>
            </Fragment>
          )) }
        </tr>
        </thead>
        <tbody>
        { rows?.map(({
                       label,
                       key,
                       valueFormat,
                       classNameRows = "",
                       classNameHeader = "",
                       showIndicator,
                     }) => (
          <tr key={ key } className={ classNameHeader }>
            <th className={ [
              !classNameHeader.includes("text-") && "text-gray-600",
              !classNameHeader.includes("font-") && "font-light",
              classNameHeader,
            ].filter(Boolean).join(" ") + " p-2 pl-3 text-left w-[280px] border-t border-t-gray-300" }>
              { label }
            </th>
            { data.crops.map((crop) => {
              const finalRowClasses = [
                !classNameRows.includes("text-") && "text-gray-600",
                !classNameRows.includes("font-") && "font-light",
                classNameRows,
              ].filter(Boolean).join(" ");

              const rowValue = getValue(key, crop.crop_id);

              return (
                <Fragment key={ `${key}-${crop.crop_id}` }>
                  <td className="w-3 bg-white"></td>
                  { showIndicator ? (
                    <td className={ `${ finalRowClasses } border-t border-t-gray-300 p-1` }>
                      <div className="flex items-center justify-center h-full w-full gap-2">
                        {isSingleColumn ? (
                          <div className="w-full pl-10">
                            <ValueCell value={ valueFormat.crop(rowValue) } />
                          </div>
                        ) : (
                          <ValueCell value={ valueFormat.crop(rowValue) } />
                        )}
                        <div className="relative h-5 w-5 ml-1">
                          <div
                            className={ `absolute inset-0 rounded-full opacity-30 ${ indicatorBackgroundColor(rowValue) }` }></div>
                          <div
                            className={ `absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${ indicatorBackgroundColor(rowValue) }` }>
                          </div>
                        </div>
                      </div>
                    </td>
                  ) : (
                    <td className={ `${ finalRowClasses } border-t border-t-gray-300 p-1` }>
                      <div className="flex items-center justify-center h-full w-full">
                        {isSingleColumn ? (
                          <div className="w-full pl-10">
                            <ValueCell value={ valueFormat.crop(rowValue) } />
                          </div>
                        ) : (
                          <ValueCell value={ valueFormat.crop(rowValue) } />
                        )}
                      </div>
                    </td>
                  ) }
                </Fragment>
              );
            }) }
          </tr>
        )) }
        </tbody>
      </table>
      <div className="flex gap-2">
        <table className=" text-base h-1 border border-gray-300 bg-white text-nowrap">
          <thead>
          <tr>
            <th className="h-16 p-3 text-sm text-[#6B7280] bg-white text-nowrap  border-b border-gray-300">GRAL CAMPOS</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td className="p-2 text-center h-1 ">
              { data.totals.total_surface_ha } Has
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center text-white font-bold h-1 bg-[#9CA3AF] border-t border-gray-300">
              u$ { formatNumberAr(data.totals.total_net_income_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-[#D1D5DB] border-t border-gray-300">
              u$ { formatNumberAr(data.totals.total_direct_costs_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-white border-t border-gray-300">
              u$ { formatNumberAr(data.totals.total_rent_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-[#D1D5DB] border-t border-gray-300">
              u$ { formatNumberAr(data.totals.total_structure_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-[#FBD5D5] border-t border-gray-300">
              u$ { formatNumberAr(data.totals.total_invested_project_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center h-1 bg-black text-white font-bold border-t border-gray-300">
              <div className="flex justify-center items-center gap-2">
                <ValueCell value={ `u$ ${ formatNumberAr(data.totals.total_operating_result_usd) }` } />
                <div className="relative h-5 w-5 ml-1">
                  <div
                    className={ `absolute inset-0 rounded-full opacity-30 ${ indicatorBackgroundColor(data.totals.total_operating_result_usd) }` }></div>
                  <div
                    className={ `absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${ indicatorBackgroundColor(data.totals.total_operating_result_usd) }` }>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-white border-t border-gray-300">
              <div className="flex justify-center items-center gap-2">
                <ValueCell value={ `${ parseFloat(data.totals.project_return_pct) }%` } />
                <div className="relative h-5 w-5 ml-1">
                  <div
                    className={ `absolute inset-0 rounded-full opacity-30 ${ indicatorBackgroundColor(data.totals.project_return_pct) }` }></div>
                  <div
                    className={ `absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${ indicatorBackgroundColor(data.totals.project_return_pct) }` }>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
        <table className=" text-base border border-gray-300 bg-white text-nowrap">
          <thead>
          <tr>
            <th className="h-16 text-sm text-[#6B7280] bg-white text-nowrap px-4 border-b border-gray-300">GRAL CULTIVOS</th>
          </tr>
          </thead>
          <tbody>
          <tr>
            <td className="p-2 text-center text-[#6B7280] font-bold h-1 bg-[#D1D5DB] border-t border-gray-300">
              { data.general_crops.total_surface_ha } Has
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center text-white font-bold h-1 bg-[#9CA3AF] border-t border-gray-300">
              u$ { formatNumberAr(data.general_crops.total_net_income_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-[#D1D5DB] border-t border-gray-300">
              u$ { formatNumberAr(data.general_crops.total_direct_costs_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-white border-t border-gray-300">
              u$ { formatNumberAr(data.general_crops.total_rent_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-[#D1D5DB] border-t border-gray-300">
              u$ { formatNumberAr(data.general_crops.total_structure_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-[#FBD5D5] border-t border-gray-300">
              u$ { formatNumberAr(data.general_crops.total_invested_project_usd) }
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center h-1 bg-black text-white font-bold border-t border-gray-300">
              <div className="flex justify-center items-center gap-2">
                <ValueCell value={ `u$ ${ formatNumberAr(data.general_crops.total_operating_result_usd) }` } />
                <div className="relative h-5 w-5 ml-1">
                  <div
                    className={ `absolute inset-0 rounded-full opacity-30 ${ indicatorBackgroundColor(data.general_crops.total_operating_result_usd) }` }></div>
                  <div
                    className={ `absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${ indicatorBackgroundColor(data.general_crops.total_operating_result_usd) }` }>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          <tr>
            <td className="p-2 text-center font-bold h-1 bg-white border-t border-gray-300">
              <div className="flex justify-center items-center gap-2">
                <ValueCell value={ `${ parseFloat(data.general_crops.project_return_pct) }%` } />
                <div className="relative h-5 w-5 ml-1">
                  <div
                    className={ `absolute inset-0 rounded-full opacity-30 ${ indicatorBackgroundColor(data.general_crops.project_return_pct) }` }></div>
                  <div
                    className={ `absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${ indicatorBackgroundColor(data.general_crops.project_return_pct) }` }>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          </tbody>
        </table>
      </div>
      </div>
    </div>
  );
};