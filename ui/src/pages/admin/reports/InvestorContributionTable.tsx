import { InvestorContributionReportData, RowToRender } from "../../../hooks/useReporting/types.ts";
import { formatNumberAr, normalizeNumber } from "../utils.ts";

const HeaderShareBadge = ({ value }: { value: number }) => (
  <span className="ml-2 rounded-md border border-[#9CA3AF] bg-[#D1D5DB] px-2 py-1 text-xs font-normal text-[#374151]">
    { value }%
  </span>
);

const TotalShareBadge = ({ value }: { value: number }) => (
  <span className="ml-2 rounded-md border border-[#9CA3AF] bg-[#D1D5DB] px-2 py-1 text-xs font-medium text-[#374151]">
    { value }%
  </span>
);

const MainValueCell = ({ value }: { value: string }) => {
  const match = value.match(/^([^ ]+)\s*(.*)$/);
  if (!match) return <span className="font-medium text-[#374151]">{ value }</span>;

  const [, amount, tail] = match;
  return (
    <span className="inline-flex items-baseline gap-1">
      <span className="font-medium text-[#374151]">{ amount }</span>
      { tail && <span className="text-[#6B7280]">{ tail }</span> }
    </span>
  );
};

const InvestorValueCell = ({ value, dark = false }: { value: string; dark?: boolean }) => {
  const [amount, share] = value.split(" - ");
  const amountClass = dark ? "text-white" : "text-[#374151]";
  const shareClass = dark ? "bg-[#374151] text-[#D1D5DB]" : "bg-[#EEF2F7] text-[#6B7280]";

  if (!share) return <span className={ `font-medium ${ amountClass }` }>{ value }</span>;

  return (
    <span className="inline-flex items-center gap-2">
      <span className={ `font-medium ${ amountClass }` }>{ amount }</span>
      <span className={ `rounded-md px-1.5 py-0.5 text-xs ${ shareClass }` }>{ share }</span>
    </span>
  );
};

export const InvestorContributionTable = ({
                                            data,
                                            rows,
                                            tableType = "contributions",
                                          }: {
  data: InvestorContributionReportData | null;
  rows: RowToRender[];
  tableType?: "contributions" | "harvest";
}) => {
  if (!data) {
    return (
      <div className="p-4 text-sm text-gray-600 rounded-lg bg-gray-50">
        No hay datos disponibles
      </div>
    );
  }

  const investors = data.investor_headers;
  const investorColumnWidth = investors.length > 0 ? `${ 50 / investors.length }%` : "0%";
  const totalOnlyKeys = new Set(["total_inputs", "total_labors", "indirect_costs"]);

  const toAmountNumber = (value: unknown) => {
    const n = normalizeNumber(value);
    return Number.isFinite(n) ? n : 0;
  };

  const getAggregatedContributionRow = (keys: string[]) => {
    const selectedRows = data.contributions.filter((row) => keys.includes(row.key));

    if (selectedRows.length === 0) {
      return null;
    }

    const total_usd = selectedRows.reduce((sum, row) => sum + toAmountNumber(row.total_usd), 0);

    return {
      total_usd,
      total_usd_ha: 0,
      investors: [],
    };
  };

  const getRowData = (key: string) => {
    if (key === "total" && tableType === "contributions") {
      return {
        total_usd: data.pre_harvest.total_usd,
        total_usd_ha: data.pre_harvest.total_us_ha,
        investors: data.pre_harvest.investors,
      };
    }

    if (tableType === "contributions" && key === "total_inputs") {
      return getAggregatedContributionRow(["agrochemicals", "fertilizers", "seeds"]);
    }

    if (tableType === "contributions" && key === "total_labors") {
      return getAggregatedContributionRow(["general_labors", "sowing", "irrigation"]);
    }

    if (tableType === "contributions" && key === "indirect_costs") {
      return getAggregatedContributionRow(["capitalizable_lease", "administration_structure"]);
    }

    if (tableType === "harvest") {
      const harvestRow = data.harvest.rows.find(row => row.key === key);
      return harvestRow ? {
        total_usd: harvestRow.total_usd,
        total_usd_ha: harvestRow.total_us_ha,
        investors: harvestRow.investors,
      } : null;
    }

    const contribution = data.contributions.find(c => c.key === key);
    return contribution ? {
      total_usd: contribution.total_usd,
      total_usd_ha: contribution.total_usd_ha,
      investors: contribution.investors,
    } : null;
  };

  const getInvestorValue = (rowKey: string, investorId: number) => {
    const rowData = getRowData(rowKey);
    if (!rowData) return 0;

    const investorData = rowData.investors.find(inv => inv.investor_id === investorId);
    return investorData?.amount_usd || 0;
  };

  const getInvestorSharePct = (rowKey: string, investorId: number) => {
    const rowData = getRowData(rowKey);
    if (!rowData) return 0;

    const investorData = rowData.investors.find(inv => inv.investor_id === investorId);
    return investorData?.share_pct || 0;
  };

  return (
    <div className="overflow-x-auto flex justify-between">
      <table className="w-full table-fixed border border-gray-300 bg-white text-sm">
        <colgroup>
          <col style={ { width: "22%" } }/>
          <col style={ { width: "14%" } }/>
          <col style={ { width: "14%" } }/>
          { investors.map((investor) => (
            <col key={ investor.investor_id } style={ { width: investorColumnWidth } }/>
          )) }
        </colgroup>
        <thead>
        <tr className="h-12">
          <th className="h-12 border-b border-gray-300 bg-[#F8FAFC] p-3 text-left text-sm font-semibold text-[#4B5563] text-nowrap">
            { tableType === "contributions" ? "TIPO/CLASE" : "RUBRO" }
          </th>
          <th className="h-12 border-b border-gray-300 bg-[#F8FAFC] p-3 text-center text-sm font-semibold text-[#4B5563] text-nowrap">
            TOTAL INVERTIDO
          </th>
          <th className="h-12 border-b border-gray-300 bg-[#F8FAFC] p-3 text-center text-sm font-semibold text-[#4B5563] text-nowrap">
            TOTAL U$ / HA
          </th>
          { investors.map((investor, index) => {
            return (
              <th
                key={ investor.investor_id }
                className={ `h-12 bg-[#F8FAFC] p-3 text-center text-sm font-semibold uppercase text-[#4B5563] text-nowrap ${ index === 0 ? "border-l border-l-gray-300" : "" }` }
              >
                { investor.investor_name }
                <HeaderShareBadge value={ investor.share_pct }/>
              </th>
            );
          }) }
        </tr>
        </thead>
        <tbody>
        { rows.map(({
                      label,
                      key,
                      valueFormat,
                      classNameRows = "",
                      classNameHeader = "",
                    }) => {
          const rowData = getRowData(key);

          if (!rowData) {
            return null;
          }

          let baseBg = "bg-white";
          if (key === "total" || key === "totals") {
            baseBg = "bg-[#FBD5D5]";
          }

          const finalHeaderClasses = [
            !classNameHeader.includes("text-") && "text-[#111827]",
            !classNameHeader.includes("font-") && "font-bold",
            !classNameHeader.includes("bg-") && baseBg,
            classNameHeader,
          ].filter(Boolean).join(" ") + " h-11 border-t border-t-gray-300 pl-3 text-left";

          const finalRowClasses = [
            !classNameRows.includes("text-") && "text-[#6B7280]",
            !classNameRows.includes("bg-") && baseBg,
            !classNameRows.includes("font-") && "font-normal",
            classNameRows,
          ].filter(Boolean).join(" ");

          return (
            <tr key={ key } className={ baseBg }>
              <th className={ finalHeaderClasses }>
                { label }
              </th>
              <td className={ `${ finalRowClasses } h-11 border-t border-t-gray-300 px-2 py-1.5 text-center` }>
                <MainValueCell value={ valueFormat.totalInvested(rowData.total_usd) }/>
              </td>
              <td className={ `${ finalRowClasses } h-11 border-t border-t-gray-300 px-2 py-1.5 text-center` }>
                { totalOnlyKeys.has(key) ? "—" : <MainValueCell value={ valueFormat.totalPerHa(rowData.total_usd_ha) }/> }
              </td>
              { investors.map((investor, index) => {
                const investorValue = getInvestorValue(key, investor.investor_id);
                const investorSharePct = getInvestorSharePct(key, investor.investor_id);

                let cellBg = baseBg;
                let cellTextColor = "text-[#6B7280]";

                return (
                  <td
                    key={ investor.investor_id }
                    className={ `${ cellBg } ${ cellTextColor } ${ (key === "total" || key === "totals") ? "font-bold" : "font-normal" } h-11 border-t border-t-gray-300 px-2 py-1.5 text-center ${ index === 0 ? "border-l border-l-gray-300" : "" }` }
                  >
                    { totalOnlyKeys.has(key) ? "—" : <InvestorValueCell value={ valueFormat.investor(investorValue, investorSharePct) }/> }
                    {
                      (key === "total" || key === "totals") && (
                        <TotalShareBadge value={ investorSharePct }/>
                      )
                    }
                  </td>
                );
              }) }
            </tr>
          );
        }) }

        { tableType === "contributions" && data.comparison && (
          <>
            <tr className="h-11 bg-[#F3F4F6]">
              <td></td>
              <td></td>
              <td className="p-1.5 text-right font-bold text-[#111827]">
                Aporte acordado
              </td>
              { data.comparison.map((investor, index) => (
                <td key={ investor.investor_id } className={ `p-1.5 text-center font-medium text-[#374151] ${ index === 0 ? "border-l border-l-gray-300" : "" }` }>
                  u${ formatNumberAr(investor.agreed_usd) } - { investor.agreed_share_pct }%
                </td>
              )) }
            </tr>
            <tr className="h-11 bg-black">
              <td></td>
              <td></td>
              <td className="border-t border-t-[#111827] p-1.5 text-right font-bold text-white">
                Ajuste de aporte
              </td>
              { data.comparison.map((investor, index) => (
                <td key={ investor.investor_id } className={ `border-t border-t-[#111827] p-1.5 text-center font-semibold text-white ${ index === 0 ? "border-l border-l-gray-300" : "" }` }>
                  u${ formatNumberAr(investor.adjustment_usd) }
                </td>
              )) }
            </tr>
          </>
        ) }

        { tableType === "harvest" && data.harvest && (
          <>
            <tr className="h-11 bg-[#F3F4F6]">
              <td></td>
              <td></td>
              <td className="p-1.5 text-right font-bold text-[#111827]">
                Pago acordado
              </td>
              { data.harvest.footer_payment_agreed.map((investor, index) => (
                <td key={ investor.investor_id } className={ `p-1.5 text-center font-medium text-[#374151] ${ index === 0 ? "border-l border-l-gray-300" : "" }` }>
                  u${ formatNumberAr(investor.amount_usd) } - { investor.share_pct }%
                </td>
              )) }
            </tr>
            <tr className="h-11 bg-black">
              <td></td>
              <td></td>
              <td className="border-t border-t-[#111827] p-1.5 text-right font-bold text-white">
                Ajuste de pago
              </td>
              { data.harvest.footer_payment_adjustment.map((investor, index) => (
                <td key={ investor.investor_id } className={ `border-t border-t-[#111827] p-1.5 text-center font-semibold text-white ${ index === 0 ? "border-l border-l-gray-300" : "" }` }>
                  u${ formatNumberAr(investor.amount_usd) }
                </td>
              )) }
            </tr>
          </>
        ) }
        </tbody>
      </table>
    </div>
  );
};
