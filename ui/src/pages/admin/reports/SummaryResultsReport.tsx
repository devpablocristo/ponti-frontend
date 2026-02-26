import { useEffect, useState } from "react";
import { LoaderCircle, SquareArrowOutUpRight } from "lucide-react";
import FilterBar from "../../../layout/FilterBar/FilterBar";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import SelectField from "../../../components/Input/SelectField";
import useReporting from "../../../hooks/useReporting";
import { SummaryResultsTable } from "./SummaryResultsTable.tsx";
import { RowToRender } from "../../../hooks/useReporting/types.ts";
import { usePDF } from "react-to-pdf";
import { formatNumberAr } from "../utils";

const rowsToRender: RowToRender[] = [
  {
    label: "Superficie",
    key: "surface_ha",
    valueFormat: {
      crop: (value) => `${ formatNumberAr(value) } Has`,
    },
    classNameRows: "text-center",
    
  },
  {
    label: "Ingreso Neto",
    key: "net_income_usd",
    valueFormat: {
      crop: (value) => `u$ ${ formatNumberAr(value) }`,
    },
  },
  {
    label: "Costos Directos",
    key: "direct_costs_usd",
    valueFormat: {
      crop: (value) => `u$ ${ formatNumberAr(value) }`,
    },
 
  },
  {
    label: "Arriendo",
    key: "rent_usd",
    valueFormat: {
      crop: (value) => `u$ ${ formatNumberAr(value) }`,
    },

  },
  {
    label: "Estructura",
    key: "structure_usd",
    valueFormat: {
      crop: (value) => `u$ ${ formatNumberAr(value) }`,
    },
  },
  {
    label: "Total Activo",
    key: "total_invested_usd",
    valueFormat: {
      crop: (value) => `u$ ${ formatNumberAr(value) }`,
    },
      classNameRows: "text-black bg-[#FBD5D5] font-bold",
    classNameHeader: "text-black bg-[#FBD5D5] font-bold",
  },
  {
    label: "Resultado operativo",
    key: "operating_result_usd",
    valueFormat: {
      crop: (value) => `u$ ${ formatNumberAr(value) }`,
    },

    classNameRows: "text-white bg-black font-bold",
    classNameHeader: "text-white bg-black font-bold",
    showIndicator: true,
  },
  {
    label: "Renta del cultivo",
    key: "crop_return_pct",
    valueFormat: {
      crop: (value) => `${ value }%`,
    },
    classNameHeader: "text-center",
    showIndicator: true,
  },
];

export function SummaryResultsReport() {
  const [selectedCrop, setSelectedCrop] = useState<string>("0");

  const { filters, projectId, selectedCampaignId, loading } =
    useWorkspaceFilters(["project", "campaign"]);

  const {
    summaryResultsReportingData: reportingData,
    processing,
    error,
    getSummaryResultsReportingData,
  } = useReporting();

  const buildQueryParams = () => {
    const params: Record<string, string> = {};

    if (projectId) {
      params.project_id = String(projectId);
    }
    if (selectedCampaignId) {
      params.campaign_id = String(selectedCampaignId);
    }

    return new URLSearchParams(params).toString();
  };

  useEffect(() => {
    getSummaryResultsReportingData(buildQueryParams());
  }, []);

  const filteredData = selectedCrop === "0"
    ? reportingData
    : reportingData ? {
      ...reportingData,
      crops: reportingData.crops.filter((crop) => crop.crop_id.toString() === selectedCrop),
    } : null;

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const { toPDF, targetRef } = usePDF({ filename: `informe-resumen-resultados-${ timestamp }.pdf` });

  return (
    <div className="relative">
      { (loading.projects || loading.campaigns || processing) && (
        <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
          <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin"/>
        </div>
      ) }

      <FilterBar
        filters={ filters }
        actions={ [
          {
            label: "Generar Informe",
            variant: "primary",
            disabled: processing,
            onClick: () => getSummaryResultsReportingData(buildQueryParams()),
          },
          {
            label: "Exportar Informe",
            variant: "primary",
            icon: <SquareArrowOutUpRight className="h-3.5 w-3.5 stroke-[3px]"/>,
            disabled: processing,
            onClick: toPDF,
          },
        ] }
      />

      { error && (
        <div
          className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50"
          role="alert"
        >
          <span className="font-medium">{ error }</span>
        </div>
      ) }

      { !error && (
        <>
          <div className="rounded-xl border py-6 px-2" ref={ targetRef }>
            <div className="border-b mb-4" style={ { borderColor: "#D1D5DB" } }/>
            <div className="flex items-center gap-8 mb-4">
              <h2 className="text-xl font-semibold text-gray-900">
                Resumen de Resultados
              </h2>
              <div className="w-48">
                <SelectField
                  label="Cultivo"
                  name="summaryView"
                  value={ selectedCrop }
                  onChange={ (e) => setSelectedCrop(e.target.value) }
                  options={ reportingData ? [
                    { id: 0, name: "Todos" },
                    ...reportingData.crops.map((crop) => ({
                      id: crop.crop_id,
                      name: crop.crop_name,
                    })),
                  ] : [] }
                  size="sm"
                  fullWidth
                />
              </div>
            </div>
            <div className="border-b mt-2 mb-6" style={ { borderColor: "#D1D5DB" } }/>

            { processing ? (
              <div className="flex items-center justify-center h-48">
                <LoaderCircle className="w-8 h-8 text-blue-500 animate-spin"/>
              </div>
            ) : (
              <SummaryResultsTable
                data={ filteredData }
                rows={ rowsToRender }
              />
            ) }
          </div>
        </>
      ) }
    </div>
  );
}

export default SummaryResultsReport;