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
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {dot && (
          <span
            className="h-2 w-2 rounded-full"
            style={{ background: dot }}
          />
        )}
        <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
      </div>
      <div
        className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums"
        style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
      >
        {value}
      </div>
    </div>
  );
}

export function HarvestPaymentStrip({ total, perHa, investors, adjustment }: Props) {
  return (
    <section
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-3 flex items-baseline gap-3">
        <h3
          className="text-base font-bold text-slate-900"
          style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
        >
          Pagos de cosecha
        </h3>
        <span className="text-xs text-slate-500">Liquidación y ajustes</span>
      </header>

      <div className="flex items-center gap-6 flex-wrap">
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
          className="ml-auto inline-flex items-center gap-2.5 rounded-full bg-slate-900 px-4 py-2.5 text-white transition-all duration-200 hover:bg-slate-800 hover:shadow-lg"
        >
          <Wallet className="h-4 w-4" />
          <span className="text-left">
            <span className="block text-[10px] font-medium text-white/60 uppercase tracking-wider">
              Ajuste de pago
            </span>
            <span
              className="block text-sm font-bold tabular-nums"
              style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
            >
              u$s {formatNumberAr(adjustment)}
            </span>
          </span>
        </button>
      </div>
    </section>
  );
}
