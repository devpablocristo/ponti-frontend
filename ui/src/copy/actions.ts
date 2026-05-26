// Verbos canónicos de las acciones CRUDAR.
//
// Cada acción del usuario se nombra con UN solo verbo a lo largo de toda la
// app (botones, toasts, modales, logs). Los sinónimos prohibidos están
// listados en la guía de estilo del plan de auditoría UX.

export const ACTIONS = {
  // ─── CRUDAR ────────────────────────────────────────────────────────────────
  create: {
    infinitive: "crear",
    imperative: "Creá",
    gerund: "Creando",
    past3rd: "creó", // "Se creó el cliente."
  },
  update: {
    infinitive: "actualizar",
    imperative: "Actualizá",
    gerund: "Actualizando",
    past3rd: "actualizó",
  },
  save: {
    infinitive: "guardar",
    imperative: "Guardá",
    gerund: "Guardando",
    past3rd: "guardó",
  },
  archive: {
    infinitive: "archivar",
    imperative: "Archivá",
    gerund: "Archivando",
    past3rd: "archivó",
    past3rdPlural: "archivaron",
  },
  restore: {
    infinitive: "restaurar",
    imperative: "Restaurá",
    gerund: "Restaurando",
    past3rd: "restauró",
    past3rdPlural: "restauraron",
  },
  hardDelete: {
    infinitive: "eliminar permanentemente",
    imperative: "Eliminá permanentemente",
    gerund: "Eliminando permanentemente",
    past3rd: "eliminó permanentemente",
    past3rdPlural: "eliminaron permanentemente",
  },
  // ─── Import/Export/Publish ────────────────────────────────────────────────
  import: {
    infinitive: "importar",
    imperative: "Importá",
    gerund: "Importando",
    past3rd: "importó",
    past3rdPlural: "importaron",
  },
  export: {
    infinitive: "exportar",
    imperative: "Exportá",
    gerund: "Exportando",
    past3rd: "exportó",
  },
  publish: {
    infinitive: "publicar",
    imperative: "Publicá",
    gerund: "Publicando",
    past3rd: "publicó",
  },
  load: {
    infinitive: "cargar",
    imperative: "Cargá",
    gerund: "Cargando",
    past3rd: "cargó",
  },
  process: {
    infinitive: "procesar",
    imperative: "Procesá",
    gerund: "Procesando",
    past3rd: "procesó",
  },
} as const;

export type ActionKey = keyof typeof ACTIONS;
