import { useCallback, useEffect } from "react";
import { SquareArrowOutUpRight } from "lucide-react";
import { InlineSpinner } from "../../../components/feedback/InlineSpinner";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { AppFilterBar as FilterBar } from "../../../components/filters/AppFilterBar";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import InputField from "../../../components/Input/InputField.tsx";
import useReporting from "../../../hooks/useReporting";
import { InvestorContributionTable } from "./InvestorContributionTable.tsx";
import { RowToRender } from "../../../hooks/useReporting/types.ts";
import { usePDF } from "react-to-pdf";
import { formatNumberAr } from "../utils.ts";

const contributionRowsToRender: RowToRender[] = [
  {
    label: "Agroquímicos",
    key: "agrochemicals",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Fertilizantes",
    key: "fertilizers",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Semilla",
    key: "seeds",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Total insumos",
    key: "total_inputs",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
    classNameRows: "text-[#111827] bg-[#D1D5DB] font-semibold",
    classNameHeader: "text-[#111827] bg-[#D1D5DB] font-semibold",
  },
  {
    label: "Labores grales",
    key: "general_labors",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Siembra",
    key: "sowing",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Riego",
    key: "irrigation",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Total labores",
    key: "total_labors",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
    classNameRows: "text-[#111827] bg-[#D1D5DB] font-semibold",
    classNameHeader: "text-[#111827] bg-[#D1D5DB] font-semibold",
  },
  {
    label: "Arriendo",
    key: "capitalizable_lease",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Administración y estructura",
    key: "administration_structure",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Costos indirectos",
    key: "indirect_costs",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
    classNameRows: "text-[#111827] bg-[#D1D5DB] font-semibold",
    classNameHeader: "text-[#111827] bg-[#D1D5DB] font-semibold",
  },
  {
    label: "Totales",
    key: "total",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value) => `u$${ formatNumberAr(value) }`,
    },
    classNameRows: "text-[#111827] bg-[#FBD5D5] font-bold",
    classNameHeader: "text-[#111827] bg-[#FBD5D5] font-bold",
  },
];

const harvestRowsToRender: RowToRender[] = [
  {
    label: "Cosecha",
    key: "harvest",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value, percentage) => `u$${ formatNumberAr(value) } - ${ percentage }%`,
    },
  },
  {
    label: "Totales",
    key: "totals",
    valueFormat: {
      totalInvested: (value) => `u$${ formatNumberAr(value) }`,
      totalPerHa: (value) => `${ formatNumberAr(value) } u$/Ha`,
      investor: (value) => `u$${ formatNumberAr(value) }`,
    },
    classNameRows: "text-[#111827] bg-[#FBD5D5] font-bold",
    classNameHeader: "text-[#111827] bg-[#FBD5D5] font-bold",
  },
];

export function InvestorContributionReport() {
  const {
    filters,
    projectId,
    selectedCustomer,
    selectedCampaignId,
    workspaceReady,
    loading,
  } = useWorkspaceFilters(["project", "campaign"]);

  const {
    investorContributionReportingData: reportingData,
    processing,
    error,
    getInvestorContributionReportingData,
  } = useReporting();

  const buildQueryParams = useCallback(() => {
    const params: Record<string, string> = {};

    if (selectedCustomer?.id) {
      params.customer_id = String(selectedCustomer.id);
    }
    if (projectId) {
      params.project_id = String(projectId);
    }
    if (selectedCampaignId) {
      params.campaign_id = String(selectedCampaignId);
    }

    return new URLSearchParams(params).toString();
  }, [projectId, selectedCustomer, selectedCampaignId]);

  useEffect(() => {
    if (!workspaceReady) {
      getInvestorContributionReportingData("");
      return;
    }
    getInvestorContributionReportingData(buildQueryParams());
  }, [buildQueryParams, getInvestorContributionReportingData, workspaceReady]);

  const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
  const { toPDF, targetRef } = usePDF({ filename: `informe-aporte-inversor-${ timestamp }.pdf` });

  return (
    <div className="relative">
      <LoadingOverlay show={loading.projects || loading.campaigns || processing} />

      <FilterBar
        filters={ filters }
        actions={ [
          {
            label: "Generar Informe",
            variant: "primary",
            disabled: processing || !workspaceReady,
            onClick: () => getInvestorContributionReportingData(buildQueryParams()),
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

      <ErrorBanner message={error} />

      { !error && (
        <>
          <div ref={ targetRef }>
            <div className="rounded-xl border py-6 px-2">
              <div className="border-b mb-5" style={ { borderColor: "#D1D5DB" } }/>
              <div className="flex justify-between items-center gap-8 mb-4">
                <h2 className="text-2xl font-semibold text-gray-900 w-4/12">
                  Aporte por Inversor
                </h2>
                <div className="flex gap-8">
                  <InputField
                    label="Superficie"
                    name="surface"
                    size="sm"
                    value=""
                    placeholder={ `${ reportingData?.general.surface_total_ha !== undefined ? formatNumberAr(reportingData.general.surface_total_ha) : "" } Has` }
                    className="flex items-center w-[175px] gap-2 text-nowrap"
                    inputClassName="h-12 -mt-2"
                    onChange={ () => {
                    } }
                    disabled
                  />
                  <InputField
                    label="Admin. proyecto / Ha"
                    name="admin-project-per-ha"
                    size="sm"
                    value=""
                    placeholder={ `u$ ${ reportingData?.general.admin_per_ha_usd !== undefined ? formatNumberAr(reportingData.general.admin_per_ha_usd) : "" }` }
                    className="flex items-center w-[250px] gap-2 text-nowrap"
                    inputClassName="h-12 -mt-2"
                    onChange={ () => {
                    } }
                    disabled
                  />
                </div>
              </div>
              <div
                className="border-b mt-2 mb-6"
                style={ { borderColor: "#D1D5DB" } }
              />
              <h2 className="font-semibold text-xl mb-4">Aportes Pre Cosecha</h2>
              { processing ? (
                <InlineSpinner
                  size="md"
                  spinnerClassName="text-blue-500"
                  containerClassName="flex items-center justify-center h-48"
                />
              ) : (
                <InvestorContributionTable
                  data={ reportingData }
                  rows={ contributionRowsToRender }
                  tableType="contributions"
                />
              ) }
            </div>

            <div className="rounded-xl border py-6 px-2 mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">
                Pagos de cosecha
              </h2>
              { processing ? (
                <InlineSpinner
                  size="md"
                  spinnerClassName="text-blue-500"
                  containerClassName="flex items-center justify-center h-48"
                />
              ) : (
                <InvestorContributionTable
                  data={ reportingData }
                  rows={ harvestRowsToRender }
                  tableType="harvest"
                />
              ) }
            </div>
          </div>
        </>
      ) }
    </div>
  );
}

export default InvestorContributionReport;
