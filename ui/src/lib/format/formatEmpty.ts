// Helper para empty states consistentes.
//
// `formatEmpty(entity, opts)` devuelve `{title, description}` listo para
// `<EmptyState>`. Encapsula la decisión "lista vacía total" vs "lista
// vacía por filtros" vs "lista requiere selección de workspace".

import {
  type Entity,
  emptyByFilters,
  emptyList,
  emptyRequiresWorkspace,
  type EmptyCopy,
} from "@/copy";

export type FormatEmptyKind = "list" | "filtered" | "requiresWorkspace";

export type FormatEmptyOptions = {
  /** Por qué la lista está vacía. Default: "list". */
  kind?: FormatEmptyKind;
  /** Para `kind=list`: texto adicional ("en este proyecto"). */
  context?: string;
};

export function formatEmpty(
  entity: Entity,
  opts: FormatEmptyOptions = {},
): EmptyCopy {
  const kind = opts.kind ?? "list";

  if (kind === "filtered") return emptyByFilters(entity);
  if (kind === "requiresWorkspace") return emptyRequiresWorkspace(entity);
  return emptyList(entity, opts.context);
}
