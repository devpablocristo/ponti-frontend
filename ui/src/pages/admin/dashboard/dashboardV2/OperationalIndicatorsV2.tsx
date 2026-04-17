import {
  Activity,
  ClipboardList,
  Newspaper,
  Calendar,
  ChartNoAxesCombined,
  FileText,
} from "lucide-react";
import type {
  DashboardData,
  OperationalItem,
} from "../../../../hooks/useDashboard/types";

const SORA = "Sora, ui-sans-serif, system-ui, sans-serif";

interface Visual {
  icon: React.ReactNode;
  bg: string;
  fg: string;
  accent?: boolean;
}

function visualFor(type: string): Visual {
  switch (type) {
    case "first_workorder":
    case "last_workorder":
      return {
        icon: <Newspaper className="h-5 w-5" />,
        bg: "bg-sky-100",
        fg: "text-sky-700",
      };
    case "last_stock_count":
      return {
        icon: <ChartNoAxesCombined className="h-5 w-5" />,
        bg: "bg-emerald-100",
        fg: "text-emerald-700",
      };
    case "campaign_closing":
      return {
        icon: <ClipboardList className="h-5 w-5" />,
        bg: "bg-rose-100",
        fg: "text-rose-700",
        accent: true,
      };
    default:
      return {
        icon: <FileText className="h-5 w-5" />,
        bg: "bg-slate-100",
        fg: "text-slate-600",
      };
  }
}

function formatDate(date: string | null | undefined): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("es-AR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return date;
  }
}

export function OperationalIndicatorsV2({ dashboard }: { dashboard: DashboardData | null }) {
  const items = dashboard?.operational_indicators?.items ?? [];

  return (
    <section
      className="rounded-2xl bg-white border border-slate-200/80 p-5"
      style={{ boxShadow: "var(--shadow-sm)" }}
    >
      <header className="mb-4 flex items-center gap-2">
        <Activity className="h-4 w-4 text-slate-500" />
        <h3 className="text-base font-bold text-slate-900" style={{ fontFamily: SORA }}>
          Indicadores operativos
        </h3>
      </header>

      {items.length === 0 ? (
        <p className="text-sm text-slate-500">No hay datos operativos disponibles</p>
      ) : (
        <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => (
            <OperationalCard key={i} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}

function OperationalCard({ item }: { item: OperationalItem }) {
  const v = visualFor(item.type);
  const code = item.workorder_id ? `N°${item.workorder_id}` : null;

  return (
    <article
      className={`rounded-xl p-4 transition-all duration-200 hover:shadow-md ${
        v.accent
          ? "bg-rose-50/50 border border-rose-200"
          : "bg-slate-50/60 border border-slate-200/60"
      }`}
    >
      <div className="flex items-start gap-3 mb-3">
        <span
          className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${v.bg} ${v.fg}`}
        >
          {v.icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            {item.type === "campaign_closing" ? "Cierre" : "Hito"}
          </p>
          <p className="text-sm font-bold text-slate-900 leading-snug line-clamp-2">
            {item.title}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-600">
        <Calendar className="h-3.5 w-3.5 shrink-0" />
        <span className="tabular-nums">{formatDate(item.date)}</span>
        {code && (
          <>
            <span className="text-slate-300">•</span>
            <span className="font-semibold tabular-nums">{code}</span>
          </>
        )}
      </div>
    </article>
  );
}
