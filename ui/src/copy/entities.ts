// Catálogo único de entidades de Ponti.
//
// Fuente de verdad para la copy léxica de cada CRUDAR. Se importa desde:
//   - `src/components/Modal/copy.ts` (helpers de confirmación bulk).
//   - `src/pages/admin/entities.ts` (constantes legacy: CUSTOMER_ENTITY, ...).
//   - `src/lib/translateBackendError.ts` (traducción de errores BE).
//   - `src/lib/format/*` (helpers de UX writing).
//
// REGLA: si una entidad CRUDAR aparece en la UI, su léxico vive acá y solo acá.
// Si necesitás otra, agregala a ENTITIES_BY_KEY (TS te va a validar usos en el resto del catálogo).

export type Article = "el" | "la" | "los" | "las";

/**
 * Léxico mínimo de una entidad. Se eligió `article + singular + plural`
 * (no género) porque el artículo ya determina el género gramatical y deja
 * margen para casos como "los datos" (plural-only) sin agregar más props.
 *
 * `article` es `string` y no `Article` para no romper a los callers que
 * construyen entidades ad-hoc en otros sitios (`entity: { article: "el", ... }`
 * sin `as const`). El catálogo `ENTITIES_BY_KEY` mantiene la integridad de los
 * valores vía `as const`; los helpers de género tratan cualquier valor distinto
 * de "la"/"las" como masculino, así un artículo no estándar nunca rompe la UI.
 */
export type Entity = {
  article: string;
  singular: string;
  plural: string;
};

/** "la" / "las" → true. Útil para concordar adjetivos: "archivado" vs "archivada". */
export function isFeminine(e: Entity): boolean {
  return e.article === "la" || e.article === "las";
}

/** Devuelve el sufijo de género: por defecto "o" / "a". */
export function genderSuffix(e: Entity, masc = "o", fem = "a"): string {
  return isFeminine(e) ? fem : masc;
}

/** Pronombre OD enclítico: "Restauralo" (m) / "Restaurala" (f). */
export function objectPronoun(e: Entity): string {
  return isFeminine(e) ? "la" : "lo";
}

/** Artículo indefinido: "uno" (m) / "una" (f). */
export function indefiniteArticle(e: Entity): string {
  return isFeminine(e) ? "una" : "uno";
}

/** "el cliente" / "la labor". */
export function withArticle(e: Entity): string {
  return `${e.article} ${e.singular}`;
}

/** "El cliente" / "La labor" — para empezar oración. */
export function withArticleCap(e: Entity): string {
  const a = e.article;
  return `${a.charAt(0).toUpperCase() + a.slice(1)} ${e.singular}`;
}

// ─── Diccionario canónico ─────────────────────────────────────────────────────

export const ENTITIES_BY_KEY = {
  customer: { article: "el", singular: "cliente", plural: "clientes" },
  actor: { article: "el", singular: "actor", plural: "actores" },
  project: { article: "el", singular: "proyecto", plural: "proyectos" },
  investor: { article: "el", singular: "inversor", plural: "inversores" },
  manager: { article: "el", singular: "responsable", plural: "responsables" },
  campaign: { article: "la", singular: "campaña", plural: "campañas" },
  field: { article: "el", singular: "campo", plural: "campos" },
  lot: { article: "el", singular: "lote", plural: "lotes" },
  supply: { article: "el", singular: "insumo", plural: "insumos" },
  labor: { article: "la", singular: "labor", plural: "labores" },
  workOrder: { article: "la", singular: "orden de trabajo", plural: "órdenes de trabajo" },
  // Catálogos sin CRUDAR completo pero referenciados en errores BE:
  crop: { article: "el", singular: "cultivo", plural: "cultivos" },
  leaseType: { article: "el", singular: "tipo de arrendamiento", plural: "tipos de arrendamiento" },
  businessParameter: { article: "el", singular: "parámetro", plural: "parámetros" },
  // Genérico para fallbacks:
  record: { article: "el", singular: "registro", plural: "registros" },
} as const satisfies Record<string, Entity>;

export type EntityKey = keyof typeof ENTITIES_BY_KEY;

/**
 * Mapping de los nombres en inglés que el BE usa en sus mensajes de error
 * (ej: "lot is archived", "work order already exists for number ...") al
 * EntityKey correspondiente. Centralizado acá para no duplicar en
 * `translateBackendError.ts`.
 */
export const BACKEND_ENTITY_ALIAS: Record<string, EntityKey> = {
  customer: "customer",
  actor: "actor",
  project: "project",
  investor: "investor",
  manager: "manager",
  campaign: "campaign",
  field: "field",
  lot: "lot",
  supply: "supply",
  labor: "labor",
  "work order": "workOrder",
  crop: "crop",
  "lease type": "leaseType",
  "business parameter": "businessParameter",
};

/** Lookup case-insensitive por nombre del BE. */
export function lookupBackendEntity(raw: string): Entity | undefined {
  const key = BACKEND_ENTITY_ALIAS[raw.trim().toLowerCase()];
  return key ? ENTITIES_BY_KEY[key] : undefined;
}
