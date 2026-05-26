// Plantillas de feedback para el usuario: empty states, loading, success.
//
// Reciben una `Entity` (del catálogo) y devuelven copy lista para usar
// — toast string para success, `{title, description}` para empty/loading.

import {
  type Entity,
  genderSuffix,
  withArticle,
  withArticleCap,
} from "./entities";

// ─── Success ──────────────────────────────────────────────────────────────────

export function successCreate(e: Entity): string {
  return `Se creó ${withArticle(e)}.`;
}

export function successUpdate(e: Entity): string {
  return `Se actualizó ${withArticle(e)}.`;
}

export function successArchive(e: Entity, count = 1): string {
  if (count === 1) return `Se archivó ${withArticle(e)}.`;
  return `Se archivaron ${count} ${e.plural}.`;
}

export function successRestore(e: Entity, count = 1): string {
  if (count === 1) {
    const suffix = genderSuffix(e);
    return `Se restauró ${withArticle(e)} correctament${suffix === "a" ? "e" : "e"}.`;
  }
  return `Se restauraron ${count} ${e.plural}.`;
}

export function successHardDelete(e: Entity, count = 1): string {
  if (count === 1) {
    return `Se eliminó ${withArticle(e)} permanentemente.`;
  }
  return `Se eliminaron ${count} ${e.plural} permanentemente.`;
}

export function successImport(e: Entity, imported: number, skipped = 0): string {
  if (skipped > 0) {
    return `Se importaron ${imported} ${e.plural}. Se omitieron ${skipped} fila${skipped === 1 ? "" : "s"}.`;
  }
  return `Se importaron ${imported} ${e.plural} correctamente.`;
}

// ─── Partial failure (bulk) ───────────────────────────────────────────────────

export function partialBulkFailure(
  okCount: number,
  failedCount: number,
  total: number,
  reason?: string,
): string {
  const base = `${okCount} de ${total} OK. ${failedCount} no se completaron.`;
  return reason ? `${base} ${reason}` : base;
}

// ─── Empty states ─────────────────────────────────────────────────────────────

export type EmptyCopy = {
  title: string;
  description?: string;
};

/**
 * Empty state estándar para una lista. `contextHint` es opcional y debería
 * agregar valor real ("en este proyecto", "en la campaña actual"), no relleno.
 */
export function emptyList(e: Entity, contextHint?: string): EmptyCopy {
  const hint = contextHint ? ` ${contextHint}` : "";
  return {
    title: `Todavía no hay ${e.plural}${hint}.`,
    description: `Creá ${e.article === "el" ? "uno" : "una"} desde el botón "Nuevo" o importá un archivo.`,
  };
}

/** Empty state cuando los filtros actuales no devuelven resultados. */
export function emptyByFilters(e: Entity): EmptyCopy {
  return {
    title: `No se encontraron ${e.plural} con los filtros actuales.`,
    description: "Probá ajustar los filtros o limpiar la búsqueda.",
  };
}

/** Empty state para selección de workspace requerida. */
export function emptyRequiresWorkspace(e: Entity): EmptyCopy {
  return {
    title: `Seleccioná filtros para ver ${e.plural}.`,
    description: "El listado no carga datos sin un workspace seleccionado.",
  };
}

// ─── Loading states ───────────────────────────────────────────────────────────

/** "Cargando lotes…" */
export function loadingList(e: Entity): string {
  return `Cargando ${e.plural}…`;
}

/** "Cargando el insumo…" */
export function loadingDetail(e: Entity): string {
  return `Cargando ${withArticle(e)}…`;
}

/** "Guardando el cliente…" */
export function savingDetail(e: Entity): string {
  return `Guardando ${withArticle(e)}…`;
}

/** "Procesando archivo…" / "Procesando…" */
export function processing(what?: string): string {
  return what ? `Procesando ${what}…` : "Procesando…";
}

// ─── Confirm copy (modal title + body) ────────────────────────────────────────

export type ConfirmCopy = {
  title: string;
  message: string;
  primaryButtonText: string;
  secondaryButtonText: string;
};

export function confirmBulkArchive(e: Entity, count: number): ConfirmCopy {
  return {
    title: `¿Archivar ${count} ${count === 1 ? e.singular : e.plural}?`,
    message:
      "Podrás restaurarlos más tarde desde la vista de archivados. Esta acción es reversible.",
    primaryButtonText: "Archivar",
    secondaryButtonText: "Cancelar",
  };
}

export function confirmBulkRestore(e: Entity, count: number): ConfirmCopy {
  return {
    title: `¿Restaurar ${count} ${count === 1 ? e.singular : e.plural}?`,
    message: `${count === 1 ? withArticleCap(e) : e.plural[0].toUpperCase() + e.plural.slice(1)} volver${
      count === 1 ? "á" : "án"
    } a aparecer en los listados activos.`,
    primaryButtonText: "Restaurar",
    secondaryButtonText: "Cancelar",
  };
}

export function confirmBulkHardDelete(e: Entity, count: number): ConfirmCopy {
  return {
    title: `¿Eliminar permanentemente ${count} ${count === 1 ? e.singular : e.plural}?`,
    message:
      "Esta acción no se puede deshacer. Los registros que tengan datos relacionados no podrán eliminarse.",
    primaryButtonText: "Eliminar permanentemente",
    secondaryButtonText: "Cancelar",
  };
}
