import { Wallet } from "lucide-react";
import { formatNumberAr } from "../../utils";

export interface HarvestInvestor {
  investor_id: number;
  name: string;
  color: string;
  sharePct: number;
  amount: number;
}

interface Props {
  total: number;
  perHa: number;
  investors: HarvestInvestor[];
  adjustment: number;
}

function Cell({
  dot,
  label,
  value,
}: {
  dot?: string;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0 px-4 py-2 border-r last:border-r-0">
      <div className="flex items-center gap-1.5">
        {dot && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: dot }}
          />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {label}
        </span>
      </div>
      <div className="mt-0.5 text-sm font-semibold text-slate-900 dark:text-slate-100 tabular-nums">
        {value}
      </div>
    </div>
  );
}

export function HarvestPaymentStrip({ total, perHa, investors, adjustment }: Props) {
  return (
    <section className="rounded-xl border bg-white dark:bg-slate-800 p-4">
      <header className="mb-3 flex items-baseline gap-3">
        <h3 className="text-xl font-medium text-[#020617]">Pagos de cosecha</h3>
        <span className="text-xs text-slate-500 dark:text-slate-400">Liquidación y ajustes</span>
      </header>

      <div className="flex items-stretch gap-0 flex-wrap rounded-lg border bg-white dark:bg-slate-800 overflow-hidden">
        <Cell label="Total cosecha" value={`u$s ${formatNumberAr(total)}`} />
        <Cell label="u$s / ha" value={formatNumberAr(perHa)} />
        {investors.map((inv) => (
          <Cell
            key={inv.investor_id}
            dot={inv.color}
            label={`${inv.name} (${inv.sharePct}%)`}
            value={`u$s ${formatNumberAr(inv.amount)}`}
          />
        ))}
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2.5 border-l bg-[#F3F4F6] px-5 py-3 text-[#111827]"
        >
          <Wallet className="h-4 w-4" />
          <span className="text-left">
            <span className="block text-[10px] font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Ajuste de pago
            </span>
            <span className="block text-sm font-semibold tabular-nums">
              u$s {formatNumberAr(adjustment)}
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
