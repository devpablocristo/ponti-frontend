# extraction-plan — feature-015 fe-dashboard-consolidation

- **repo**: `ponti/web` (monorepo FE: `ui/` + `api/`)
- **rama base**: `develop` (tip `8c25e88`)
- **SOURCE**: `develop-problematico~1` (SHA `3ffcf60`). NUNCA `develop-problematico` (tip = restore/vacío).
- **rama sugerida**: `pr/feature-015-fe-dashboard-consolidation-fe`
- **merge**: FE independiente. Sin coordinación con BE.

## PR title
`refactor(fe): consolidar dashboard de admin (eliminar V2, responsive + dark mode)`

## PR description (sugerida)
> Unifica el dashboard de admin en una única página. Elimina el prototipo `DashboardV2` y su set de
> componentes `dashboard/dashboardV2/*` + la ruta `/admin/dashboard-v2`, y mejora la versión canónica:
> grid responsive de KPIs, scroll horizontal en tablas (mobile), dark mode, manejo de loading/empty/error
> con el design system (InlineSpinner / EmptyState / Notification), agregación de cultivos por `crop_id`,
> y delegación del force-logout al interceptor global de `api/client.ts`. El dashboard ya no carga datos
> globales sin filtros (muestra EmptyState).
>
> Depende de **006-fe-design-system** (AppFilterBar, ScrollableTable, feedback components, lib/format,
> lib/notify, useBreakpoint) y del campo `hasWorkspaceSelection` de `useWorkspaceFilters`. Sin cambios BE.

## DEPENDENCIA PREVIA (bloqueante)
Antes de abrir este PR, en `develop` deben existir (de 006 y afines):
`components/feedback/{InlineSpinner,Notification,EmptyState}.tsx`, `components/filters/AppFilterBar.tsx`,
`components/crud/ScrollableTable.tsx`, `hooks/useBreakpoint.ts`, `lib/notify.ts`, `lib/format.ts`
(con `formatError`), y `useWorkspaceFilters.hasWorkspaceSelection` + interceptor `auth:force-logout`.
Verificar con:
```
git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop
for f in components/feedback/InlineSpinner.tsx components/feedback/Notification.tsx \
  components/feedback/EmptyState.tsx components/filters/AppFilterBar.tsx \
  components/crud/ScrollableTable.tsx hooks/useBreakpoint.ts lib/notify.ts lib/format.ts; do
  test -f ui/src/$f && echo "OK  $f" || echo "FALTA $f"; done
git -C /home/pablocristo/Proyectos/pablo/ponti/web grep -n "hasWorkspaceSelection" -- ui/src/hooks/useWorkspaceFilters.ts || echo "FALTA hasWorkspaceSelection"
```
Si algo FALTA → no continuar hasta que 006 entre a `develop`.

## Pasos ordenados
1. Confirmar dependencias previas (bloque de arriba). Si faltan → STOP.
2. Crear rama desde `develop`.
3. Traer archivos ENTEROS propios (modificados + rename) desde SOURCE.
4. Traer las ELIMINACIONES (V2) desde SOURCE.
5. Aplicar el hunk PARCIAL de `router.tsx` (solo dashboard, no reports V2).
6. Limpiar artefactos: confirmar que no quedó `useDashboardReducer.ts` ni carpeta `dashboardV2/`.
7. `git diff --check`, build, tests, revisión manual.
8. PR contra `develop`.

## Archivos enteros vs parciales
- **Enteros** (modificados/rename): `useDashboard/index.ts`, `useDashboard/types.ts`,
  `useDashboard/dashboardReducer.ts`, `Dashboard.tsx`, `CostByCropTable.tsx`,
  `ManagementBalanceTable.tsx`, `OperationalIndicators.tsx`.
- **Enteros (delete)**: `DashboardV2.tsx`, `dashboardV2/{CostByCropCardV2,DashboardKpiRow,ManagementBalanceCardV2,OperationalIndicatorsV2,ProgressBar}.tsx`.
- **Parcial**: `router.tsx` (solo hunks de DashboardV2).

## Migraciones / tests a incluir
- Migraciones: NINGUNA (feature FE).
- Tests: NINGUNO en el flist; no hay specs de dashboard en el rango. Sugerencia de smoke test en validation.md.

## Comandos git SUGERIDOS (para un humano — NO ejecutar desde el agente)
```
# rama
git checkout develop
git checkout -b pr/feature-015-fe-dashboard-consolidation-fe

# 1) rename del reducer (traer el nuevo, borrar el viejo)
git checkout develop-problematico~1 -- ui/src/hooks/useDashboard/dashboardReducer.ts
git rm ui/src/hooks/useDashboard/useDashboardReducer.ts

# 2) archivos propios enteros (modificados)
git checkout develop-problematico~1 -- \
  ui/src/hooks/useDashboard/index.ts \
  ui/src/hooks/useDashboard/types.ts \
  ui/src/pages/admin/dashboard/Dashboard.tsx \
  ui/src/pages/admin/dashboard/CostByCropTable.tsx \
  ui/src/pages/admin/dashboard/ManagementBalanceTable.tsx \
  ui/src/pages/admin/dashboard/OperationalIndicators.tsx

# 3) eliminaciones de la V2
git rm ui/src/pages/admin/dashboard/DashboardV2.tsx \
  ui/src/pages/admin/dashboard/dashboardV2/CostByCropCardV2.tsx \
  ui/src/pages/admin/dashboard/dashboardV2/DashboardKpiRow.tsx \
  ui/src/pages/admin/dashboard/dashboardV2/ManagementBalanceCardV2.tsx \
  ui/src/pages/admin/dashboard/dashboardV2/OperationalIndicatorsV2.tsx \
  ui/src/pages/admin/dashboard/dashboardV2/ProgressBar.tsx

# 4) router.tsx por HUNKS (aceptar SOLO los que tocan DashboardV2 / dashboard-v2;
#    RECHAZAR los hunks de ByFieldOrCropReportV2 / InvestorContributionReportV2)
git restore -p --source=develop-problematico~1 -- ui/src/router.tsx

# 5) verificación de higiene
git diff --check
git grep -n "useDashboardReducer" -- ui/src        # debe dar 0 resultados
git grep -n "DashboardV2\|dashboard-v2\|dashboardV2/" -- ui/src   # debe dar 0 resultados
```

## Qué NO traer
- Hunks de `router.tsx` de reports V2 (`ByFieldOrCropReportV2`, `InvestorContributionReportV2`).
- Componentes de 006 (feedback/filters/crud), `lib/*`, `useBreakpoint`, `useWorkspaceFilters` (dependencias previas).

## Qué podría romperse
- **Build TS** si falta 006 (imports de AppFilterBar, ScrollableTable, feedback, lib/format, lib/notify, useIsMobile).
- **Build TS** si falta `hasWorkspaceSelection` en `useWorkspaceFilters`.
- **router.tsx** si se aplican de más los hunks de reports → borra rutas que otra feature aún no migró.
- Referencias colgadas a `useDashboardReducer` (si no se borró el archivo viejo) o a interfaces despublicadas en `types.ts`.

## Cómo detectar extracción incompleta
- `git grep "useDashboardReducer"` / `"DashboardV2"` / `"dashboard-v2"` → 0 resultados.
- `git grep "@devpablocristo/modules-ui-filters"` en el dashboard → 0 (debe usar `AppFilterBar`).
- `yarn build` (o `tsc --noEmit`) en `ui/` sin errores de módulo no encontrado.

## Qué validar antes del PR
- Build + lint + (si existen) tests. EmptyState al entrar sin filtros. Dark mode y responsive a ojo.

## Qué hacer después de mergear
- Confirmar que el deploy no rompió por la ruta `dashboard-v2` eliminada (no había link en sidebar; bajo riesgo).
- Avisar a QA del cambio de comportamiento: el dashboard ya no carga datos sin filtros.
