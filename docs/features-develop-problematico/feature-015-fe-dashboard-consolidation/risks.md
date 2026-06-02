# risks — feature-015 fe-dashboard-consolidation

## Funcionales
- **Cambio de comportamiento: sin fetch global.** Antes, sin filtros, `Dashboard` llamaba `getDashboardInfo("")`.
  Ahora con `!hasActiveFilters` retorna sin fetch y muestra `EmptyState`. Si el negocio esperaba métricas
  globales por defecto, esto es una regresión percibida.
  - *Mitigación*: validar con producto/QA; el texto del EmptyState explica la decisión.
- **Agregación de cultivos en cliente (`aggregateCrops`).** Recomputa hectáreas, incidencia y costo/ha por
  `crop_id` y los totales de la tabla, en lugar de usar `crop_incidence.total` del backend.
  - *Mitigación*: comparar contra un payload real; si el BE ya agrega, evitar doble conteo.
- **Export PDF bloqueado en mobile** (toast en vez de exportar). Esperado; comunicar a usuarios.

## Técnicos
- **Build roto si falta 006.** Imports de `AppFilterBar`, `ScrollableTable`, `InlineSpinner`, `Notification`,
  `EmptyState`, `useIsMobile`, `notify`, `formatError` no existen en base.
  - *Mitigación*: gate de dependencias previas (ver extraction-plan.md) antes de abrir el PR.
- **`hasWorkspaceSelection` inexistente** → `Dashboard.tsx` no compila.
  - *Mitigación*: `git grep hasWorkspaceSelection -- ui/src/hooks/useWorkspaceFilters.ts` antes de extraer.
- **Referencias colgadas**: `useDashboardReducer` (si no se borra el viejo) o interfaces despublicadas de `types.ts`.
  - *Mitigación*: `git grep useDashboardReducer`, `tsc --noEmit`.

## Integración
- **Force-logout delegado al interceptor.** Si el interceptor `auth:force-logout` (008/016) no está en `develop`,
  una sesión inválida deja de desloguear automáticamente desde el dashboard (degradación silenciosa, no rompe build).
  - *Mitigación*: traer/confirmar el interceptor antes; o aceptar la degradación temporal documentada.

## Cross-repo
- Ninguno. Solo-FE; no hay PR de BE asociado. Mergear solo-FE es seguro respecto del BE.

## Datos / migración
- No aplica. Sin migraciones ni cambios de esquema.

## Archivos compartidos
- **`router.tsx`** (partial-hunks). Riesgo ALTO de sobre-extracción: el diff también elimina rutas de reports V2
  (`ByFieldOrCropReportV2`, `InvestorContributionReportV2`) que son de otra feature.
  - *Mitigación*: `git restore -p` aceptando SOLO los hunks de `DashboardV2`/`dashboard-v2`; revisar el resultado
    con `git diff -- ui/src/router.tsx` antes de commitear.

## Extracción parcial
- Si se traen los archivos del dashboard pero NO se ajusta `router.tsx`, el import de `DashboardV2` (ya borrado)
  rompe el build. Señal: `tsc`/`yarn build` falla con "Cannot find module './pages/admin/dashboard/DashboardV2'".
- Si queda la carpeta `dashboardV2/` o el reducer viejo, hay dead code que puede confundir.
  - *Mitigación*: checklist de `git grep` de validation.md.

## Riesgo de mergear solo este repo / solo el otro
- **Solo FE (este)**: seguro respecto del BE. El único requisito es que 006 (y deps) ya estén en `develop`.
- **Solo BE**: N/A — no hay cambios BE en esta feature.
