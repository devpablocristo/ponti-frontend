// filterActive — helper transversal para excluir entidades archivadas de
// listas que vienen embebidas en respuestas del BFF (p.ej. `project.fields`,
// `field.lots`, `selectedProject.investors`).
//
// El BFF debería devolver solo entidades activas en los endpoints de
// selectores/dropdowns. Este helper es la red de seguridad: hace explícito
// el invariante "archived = no se muestra" en el callsite y protege contra
// regresiones del BE (preload que se olvide del scope, FE que consuma un
// payload nested sin garantía).
//
// Soporta ambas convenciones que aparecen en payloads:
//   - `archived_at: string | null` (la mayoría de entidades en Ponti)
//   - `deleted_at: string | null` (campos GORM si se exponen)
//
// Si el item NO tiene esos campos, se considera activo (no filtra de más).

type WithLifecycle = {
  archived_at?: string | null;
  deleted_at?: string | null;
};

export function filterActive<T>(items: T[] | null | undefined): T[] {
  if (!items) return [];
  return items.filter((i) => {
    const lc = i as Partial<WithLifecycle>;
    return !lc.archived_at && !lc.deleted_at;
  });
}
