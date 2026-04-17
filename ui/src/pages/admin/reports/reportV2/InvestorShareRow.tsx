import { InvestorShareCard } from "./InvestorShareCard";

export interface InvestorShareItem {
  investor_id: number;
  name: string;
  color: string;
  contributed: number;
  sharePct: number;
  adjustment: number;
}

export function InvestorShareRow({ investors }: { investors: InvestorShareItem[] }) {
  return (
    <section>
      <header className="mb-3">
        <h2
          className="text-lg font-bold text-slate-900"
          style={{ fontFamily: "Sora, ui-sans-serif, system-ui, sans-serif" }}
        >
          Aporte por Inversor
        </h2>
        <p className="text-xs text-slate-500">Participación, aportes y ajustes</p>
      </header>
      <div className="flex flex-wrap gap-3">
        {investors.map((inv) => (
          <InvestorShareCard
            key={inv.investor_id}
            name={inv.name}
            color={inv.color}
            contributed={inv.contributed}
            sharePct={inv.sharePct}
            adjustment={inv.adjustment}
          />
        ))}
      </div>
    </section>
  );
}
