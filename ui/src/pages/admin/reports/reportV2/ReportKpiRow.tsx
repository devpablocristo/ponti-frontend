import { Layers, Tractor, Settings, Users } from "lucide-react";
import { ReportKpiCard } from "./ReportKpiCard";
import { formatNumberAr } from "../../utils";

interface Props {
  totalInvested: number;
  perHa: number;
  totalInputs: number;
  inputsPct: number;
  totalLabors: number;
  laborsPct: number;
  adminStructure: number;
  adminPct: number;
  investorsCount: number;
  agreedUsd: number;
}

export function ReportKpiRow(p: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      <ReportKpiCard
        variant="hero"
        label="Total invertido"
        value={`u$s ${formatNumberAr(p.totalInvested)}`}
        meta={`${formatNumberAr(p.perHa)} u$s/ha`}
      />
      <ReportKpiCard
        variant="mint"
        label="Total insumos"
        value={`u$s ${formatNumberAr(p.totalInputs)}`}
        meta={`${p.inputsPct.toFixed(1)}% del total`}
        icon={<Layers className="h-5 w-5" />}
      />
      <ReportKpiCard
        variant="sky"
        label="Total labores"
        value={`u$s ${formatNumberAr(p.totalLabors)}`}
        meta={`${p.laborsPct.toFixed(1)}% del total`}
        icon={<Tractor className="h-5 w-5" />}
      />
      <ReportKpiCard
        variant="stone"
        label="Admin. y estructura"
        value={`u$s ${formatNumberAr(p.adminStructure)}`}
        meta={`${p.adminPct.toFixed(1)}% del total`}
        icon={<Settings className="h-5 w-5" />}
      />
      <ReportKpiCard
        variant="lavender"
        label="Inversores"
        value={String(p.investorsCount)}
        meta={`Aporte acordado: u$s ${formatNumberAr(p.agreedUsd)}`}
        icon={<Users className="h-5 w-5" />}
      />
    </div>
  );
}
