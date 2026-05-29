import { Scale } from "lucide-react";
import type { DashboardData, BalanceItem } from "../../../../hooks/useDashboard/types";
import { formatNumberAr } from "../../utils";
import { ProgressBar } from "./ProgressBar";

const SORA = "Sora, ui-sans-serif, system-ui, sans-serif";
const DIRECT_CATEGORIES = ["SEED", "SUPPLIES", "FERTILIZERS", "LABORS"];
const OTHER_CATEGORIES = ["LEASE", "ADMIN"];

function n(v: string | number | undefined | null): number {
  return Number(v) || 0;
}

export function ManagementBalanceCardV2({ dashboard }: { dashboard: DashboardData | null }) {
  if (!dashboard?.management_balance) {
    return <EmptyCard />;
  }

  const { items } = dashboard.management_balance;
  const directCosts = items
    .filter((i) => DIRECT_CATEGORIES.includes(i.category))
    .sort((a, b) => a.order - b.order);
  const otherCosts = items
    .filter((i) => OTHER_CATEGORIES.includes(i.category))
    .sort((a, b) => a.order - b.order);

  const totals = directCosts.reduce(
    (acc, it) => ({
      executed: acc.executed + n(it.executed_usd),
      invested: acc.invested + n(it.invested_usd),
      stock: acc.stock + n(it.stock_usd),
    }),
    { executed: 0, invested: 0, stock: 0 },
  );

  return (
    <div
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-4 flex items-center gap-2">
        <Scale className="h-4 w-4 text-slate-500" />
        <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: SORA }}>
          Balance de Gestión
        </h3>
      </header>

      <div className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 pb-2 border-b border-slate-100 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        <div>Categoría</div>
        <div className="text-right">Ejecutado</div>
        <div className="text-right">Aportado</div>
        <div className="text-right">Diferencia</div>
      </div>

      <ul className="divide-y divide-slate-100">
        {directCosts.map((item) => (
          <BalanceRow key={item.category + item.label} item={item} />
        ))}
      </ul>

      <div className="mt-2 grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 items-center rounded-lg bg-slate-100 px-3 py-2.5">
        <span className="text-xs font-bold uppercase tracking-wide text-slate-700">
          Costos directos
        </span>
        <Money value={totals.executed} className="text-red-700" />
        <Money value={totals.invested} className="text-rose-800" />
        <Money value={totals.stock} className="text-slate-700" />
      </div>

      {otherCosts.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {otherCosts.map((item) => (
            <li
              key={item.category + item.label}
              className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 items-center rounded-lg bg-slate-50 px-3 py-2.5"
            >
              <span className="text-sm font-semibold text-slate-700">{item.label}</span>
              <Money value={n(item.executed_usd)} className="text-slate-700" />
              <Money value={n(item.invested_usd)} className="text-rose-800" />
              <Money value={n(item.stock_usd)} className="text-slate-700" />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function BalanceRow({ item }: { item: BalanceItem }) {
  const executed = n(item.executed_usd);
  const invested = n(item.invested_usd);
  const denom = Math.max(executed, invested);
  const execPct = denom > 0 ? (executed / denom) * 100 : 0;
  const invPct = denom > 0 ? (invested / denom) * 100 : 0;

  return (
    <li className="grid grid-cols-[1.3fr_1fr_1fr_1fr] gap-2 items-center py-2.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-slate-800 truncate">{item.label}</div>
        <div className="mt-1.5 flex items-center gap-2">
          <ProgressBar value={execPct} color="#EF4444" height="sm" />
          <ProgressBar value={invPct} color="#FCA5A5" height="sm" />
        </div>
      </div>
      <Money value={executed} className="text-slate-900" />
      <Money value={invested} className="text-rose-700" />
      <Money value={n(item.stock_usd)} className="text-slate-500" />
    </li>
  );
}

function Money({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span
      className={`text-right text-sm font-semibold tabular-nums ${className}`}
      style={{ fontFamily: SORA }}
    >
      u$s {formatNumberAr(value)}
    </span>
  );
}

function EmptyCard() {
  return (
    <div
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-3 flex items-center gap-2">
        <Scale className="h-4 w-4 text-slate-500" />
        <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: SORA }}>
          Balance de Gestión
        </h3>
      </header>
      <p className="text-sm text-slate-500">No hay datos disponibles</p>
    </div>
  );
}
