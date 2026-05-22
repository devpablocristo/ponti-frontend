// Helper para loading states consistentes.
//
// "Cargando lotes…" / "Guardando el cliente…" / "Importando órdenes…".
// El kind determina el verbo; la entidad determina el sujeto.

import {
  type Entity,
  loadingDetail,
  loadingList,
  processing,
  savingDetail,
  withArticle,
} from "@/copy";

export type FormatLoadingKind =
  | "list" // Cargando {plural}…
  | "detail" // Cargando {el|la} {singular}…
  | "saving" // Guardando {el|la} {singular}…
  | "creating" // Creando {el|la} {singular}…
  | "archiving" // Archivando {el|la} {singular}…
  | "restoring" // Restaurando {el|la} {singular}…
  | "importing" // Importando {plural}…
  | "exporting" // Exportando {plural}…
  | "processing"; // Procesando…

export function formatLoading(entity: Entity, kind: FormatLoadingKind = "list"): string {
  switch (kind) {
    case "list":
      return loadingList(entity);
    case "detail":
      return loadingDetail(entity);
    case "saving":
      return savingDetail(entity);
    case "creating":
      return `Creando ${withArticle(entity)}…`;
    case "archiving":
      return `Archivando ${withArticle(entity)}…`;
    case "restoring":
      return `Restaurando ${withArticle(entity)}…`;
    case "importing":
      return `Importando ${entity.plural}…`;
    case "exporting":
      return `Exportando ${entity.plural}…`;
    case "processing":
      return processing();
  }
}
