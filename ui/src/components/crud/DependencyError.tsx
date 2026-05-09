export type DependencyInfo = {
  /** Tipo de dependiente (ej: "proyectos", "campos", "lotes"). En plural y minúsculas. */
  type: string;
  count: number;
  status?: "active" | "archived";
};

type DependencyErrorProps = {
  entityLabel: string;
  itemLabel: string;
  dependents: DependencyInfo[];
  className?: string;
};

function formatDependents(deps: DependencyInfo[]): string {
  if (deps.length === 0) return "";
  const parts = deps.map((d) => {
    const statusLabel =
      d.status === "active"
        ? "activos"
        : d.status === "archived"
        ? "archivados"
        : "";
    return statusLabel
      ? `${d.count} ${d.type} ${statusLabel}`
      : `${d.count} ${d.type}`;
  });
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) return `${parts[0]} y ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")} y ${parts[parts.length - 1]}`;
}

/**
 * Mensaje contextual para errores 409 al hacer hard-delete: explica al usuario
 * qué dependientes bloquean la operación y qué tiene que hacer primero.
 *
 * Diseñado para ir adentro de `<ConfirmModal>` o como bloque inline.
 */
export function DependencyError({
  entityLabel,
  itemLabel,
  dependents,
  className = "",
}: DependencyErrorProps) {
  const summary = formatDependents(dependents);
  return (
    <div
      className={`p-4 text-sm text-amber-900 rounded-lg bg-amber-50 border border-amber-200 ${className}`}
      role="alert"
    >
      <p className="font-medium mb-1">
        No se puede eliminar {entityLabel}
        {itemLabel ? ` «${itemLabel}»` : ""}.
      </p>
      <p className="text-amber-800">
        {summary
          ? `Tiene ${summary}. Archivá o eliminá esos primero.`
          : "Tiene datos relacionados. Archivá o eliminá esos primero."}
      </p>
    </div>
  );
}

export default DependencyError;
