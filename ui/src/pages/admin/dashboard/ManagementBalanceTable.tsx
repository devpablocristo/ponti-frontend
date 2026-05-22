import { DashboardData } from "../../../hooks/useDashboard/types";
import { formatNumberAr } from "../utils";

interface ManagementBalanceTableProps {
  dashboard: DashboardData | null;
}

export default function ManagementBalanceTable({ dashboard }: ManagementBalanceTableProps) {
  if (!dashboard || !dashboard.management_balance) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 w-full">
        <h3 className="font-medium text-[#020617] font-sans mb-4 text-xl">
          Balance de Gestión
        </h3>
        <div className="p-4 text-sm text-gray-600 dark:text-gray-300 rounded-lg bg-gray-50 dark:bg-slate-900">
          No hay datos disponibles
        </div>
      </div>
    );
  }

  const { management_balance } = dashboard;
  const { items } = management_balance;

  // Filter items by category - direct costs first
  const directCostItems = items.filter(item =>
    ['SEED', 'SUPPLIES', 'FERTILIZERS', 'LABORS'].includes(item.category)
  );

  const otherItems = items.filter(item =>
    ['LEASE', 'ADMIN'].includes(item.category)
  );

  const formatCurrency = (value: string | undefined) => {
    if (!value) return "---";
    return `u$ ${formatNumberAr(value)}`;
  };

  const tableGridColumns = "minmax(140px,1.15fr) repeat(3,minmax(110px,1fr))";
  const headerChipClassName =
    "h-[43px] w-full rounded px-2 text-center text-sm flex items-center justify-center";
  const valueCellClassName =
    "h-[45px] w-full text-center flex items-center justify-center";

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border p-4 w-full">
      <h3 className="font-medium text-[#020617] font-sans mb-4 text-xl">
        Balance de Gestión
      </h3>

      <div
        className="grid gap-x-3 text-sm font-semibold mb-1 items-center"
        style={{ gridTemplateColumns: tableGridColumns }}
      >
        <div></div>
        <div className="flex items-center justify-center">
          <span className={`${headerChipClassName} bg-[#F98080] text-gray-900`}>
            Ejecutados
          </span>
        </div>
        <div className="flex items-center justify-center">
          <span className={`${headerChipClassName} bg-[#FBD5D5] text-gray-900`}>
            Aportado
          </span>
        </div>
        <div className="flex items-center justify-center">
          <span className={`${headerChipClassName} bg-[#E5E7EB] text-gray-900`}>
            Diferencias
          </span>
        </div>
      </div>

      {directCostItems
        .sort((a, b) => a.order - b.order)
        .map((item, idx) => (
          <div
            key={idx}
            className="grid gap-x-3 text-sm text-gray-800 dark:text-gray-200 min-h-[45px] border-b border-[#F3F4F6] items-center"
            style={{ gridTemplateColumns: tableGridColumns }}
          >
            <div className="flex items-center min-w-0 pr-2">{item.label}</div>
            <div className={`${valueCellClassName} text-black`}>
              {formatCurrency(item.executed_usd)}
            </div>
            <div className={`${valueCellClassName} text-black bg-[#FDF2F2]`}>
              {formatCurrency(item.invested_usd)}
            </div>
            <div className={`${valueCellClassName} bg-[#F9FAFB]`}>
              {formatCurrency(item.stock_usd)}
            </div>
          </div>
        ))}

      <div
        className="grid gap-x-3 text-sm bg-gray-100 dark:bg-slate-800 font-semibold text-gray-900 dark:text-gray-100 min-h-[45px] rounded-lg mb-0.5 mt-2 items-center"
        style={{ gridTemplateColumns: tableGridColumns }}
      >
        <div className="flex items-center min-w-0 px-2">Costos directos</div>
        <div className={`${valueCellClassName} text-black bg-[#F98080] rounded`}>
          {formatCurrency(
            directCostItems.reduce((sum, item) => sum + parseFloat(item.executed_usd || "0"), 0).toString()
          )}
        </div>
        <div className={`${valueCellClassName} text-[#F05252] bg-[#FBD5D5] rounded`}>
          {formatCurrency(
            directCostItems.reduce((sum, item) => sum + parseFloat(item.invested_usd || "0"), 0).toString()
          )}
        </div>
        <div className={`${valueCellClassName} bg-[#E5E7EB] rounded`}>
          {formatCurrency(
            directCostItems.reduce((sum, item) => sum + parseFloat(item.stock_usd || "0"), 0).toString()
          )}
        </div>
      </div>

      {otherItems
        .sort((a, b) => a.order - b.order)
        .map((item, idx) => (
          <div
            key={idx}
            className="grid gap-x-3 text-sm bg-gray-100 dark:bg-slate-800 font-semibold text-gray-900 dark:text-gray-100 min-h-[45px] rounded-lg mb-0.5 items-center"
            style={{ gridTemplateColumns: tableGridColumns }}
          >
            <div className="flex items-center min-w-0 px-2">{item.label}</div>
            <div className={`${valueCellClassName} text-black`}>
              {formatCurrency(item.executed_usd)}
            </div>
            <div className={`${valueCellClassName} text-[#F05252]`}>
              {formatCurrency(item.invested_usd)}
            </div>
            <div className={valueCellClassName}>
              {formatCurrency(item.stock_usd)}
            </div>
          </div>
        ))}

      {/* Totals Row */}
      {/*<div className="grid grid-cols-4 text-sm py-2 px-2 bg-gray-200 font-bold text-gray-900 dark:text-gray-100 border-t-2 border-gray-300 dark:border-gray-600 h-[45px]">*/}
      {/*  <div>Total</div>*/}
      {/*  <div className="text-red-500 text-center">*/}
      {/*    {formatCurrency(totals.executed_usd)}*/}
      {/*  </div>*/}
      {/*  <div className="text-blue-600 text-center">*/}
      {/*    {formatCurrency(totals.invested_usd)}*/}
      {/*  </div>*/}
      {/*  <div className="text-center">*/}
      {/*    {formatCurrency(totals.stock_usd)}*/}
      {/*  </div>*/}
      {/*</div>*/}
    </div>
  );
}
