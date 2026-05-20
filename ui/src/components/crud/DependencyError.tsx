import { AlertTriangle } from "lucide-react";

export type DependencyStatus = "active" | "archived";

export type Dependency = {
  type: string;
  count: number;
  status: DependencyStatus;
};

export type DependencyErrorProps = {
  entityLabel: string;
  itemLabel?: string;
  dependents: Dependency[];
  className?: string;
};

const STATUS_LABEL: Record<DependencyStatus, { singular: string; plural: string }> = {
  active: { singular: "activo", plural: "activos" },
  archived: { singular: "archivado", plural: "archivados" },
};

function pluralize(count: number, singular: string, plural: string) {
  return count === 1 ? singular : plural;
}

function formatDependency(dep: Dependency): string {
  const { singular, plural } = STATUS_LABEL[dep.status];
  const statusWord = pluralize(dep.count, singular, plural);
  return `${dep.count} ${dep.type} ${statusWord}`;
}

function joinWithAnd(items: string[]): string {
  if (items.length === 0) return "";
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} y ${items[1]}`;
  return `${items.slice(0, -1).join(", ")} y ${items[items.length - 1]}`;
}

export function DependencyError({
  entityLabel,
  itemLabel,
  dependents,
  className = "",
}: DependencyErrorProps) {
  if (dependents.length === 0) return null;

  const target = itemLabel ? `${entityLabel} «${itemLabel}»` : entityLabel;
  const list = joinWithAnd(dependents.map(formatDependency));

  return (
    <div
      className={`flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 ${className}`}
      role="alert"
    >
      <AlertTriangle className="h-5 w-5 flex-shrink-0 text-amber-600" aria-hidden="true" />
      <div className="flex-1 space-y-1">
        <p>
          No se puede eliminar {target} porque tiene {list}.
        </p>
        <p className="text-amber-800">
          Archivá o eliminá esos elementos primero.
        </p>
      </div>
    </div>
  );
}
