# file-list — feature-015 fe-dashboard-consolidation

Rango: `fefbe695..3ffcf60`. SOURCE = `develop-problematico~1` (`3ffcf60`). Todos los paths bajo `ui/`.
Status: A=created, M=modified, D=deleted, R=renamed.

## Propios (núcleo de la feature)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/hooks/useDashboard/dashboardReducer.ts` (from `useDashboardReducer.ts`) | R | hook/reducer | rename del reducer (sin cambio de contenido, similarity 100%) | whole-file (con rename) | `git mv` 1:1; el import en `index.ts` ya apunta al nuevo nombre | bajo | alta |
| `ui/src/hooks/useDashboard/index.ts` | M | hook | simplifica `getDashboardInfo`; usa `formatError`; quita force-logout heurístico | whole-file | dueño de la lógica del hook; depende de `lib/format` y del interceptor | medio | alta |
| `ui/src/hooks/useDashboard/types.ts` | M | tipos | reduce superficie pública (interfaces internas pasan a privadas) | whole-file | cambio acotado; verificar que nadie externo importe las interfaces despublicadas | medio | media |
| `ui/src/pages/admin/dashboard/Dashboard.tsx` | M | page/component | página canónica consolidada (responsive, dark, empty/error/loading, gating por filtros) | whole-file | corazón de la feature | medio | alta |
| `ui/src/pages/admin/dashboard/CostByCropTable.tsx` | M | component | agregación por `crop_id` (`aggregateCrops`), totales en cliente, `ScrollableTable`, dark | whole-file | lógica nueva relevante; depende de `ScrollableTable` (006) | medio | alta |
| `ui/src/pages/admin/dashboard/ManagementBalanceTable.tsx` | M | component | `ScrollableTable` + dark mode | whole-file | depende de `ScrollableTable` (006) | bajo | alta |
| `ui/src/pages/admin/dashboard/OperationalIndicators.tsx` | M | component | dark mode + normalización CRLF→LF (ruido de fin de línea) | whole-file | cambio menor; gran parte del diff es EOL | bajo | alta |

## Eliminaciones (parte de la consolidación — borrar la V2)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/pages/admin/dashboard/DashboardV2.tsx` | D | page | dashboard prototipo eliminado | whole-file (delete) | reemplazado por `Dashboard.tsx`; solo lo referenciaba `router.tsx` | bajo | alta |
| `ui/src/pages/admin/dashboard/dashboardV2/CostByCropCardV2.tsx` | D | component | card V2 eliminada | whole-file (delete) | solo usado por `DashboardV2.tsx` | bajo | alta |
| `ui/src/pages/admin/dashboard/dashboardV2/DashboardKpiRow.tsx` | D | component | fila de KPIs V2 eliminada | whole-file (delete) | idem | bajo | alta |
| `ui/src/pages/admin/dashboard/dashboardV2/ManagementBalanceCardV2.tsx` | D | component | card balance V2 eliminada | whole-file (delete) | idem | bajo | alta |
| `ui/src/pages/admin/dashboard/dashboardV2/OperationalIndicatorsV2.tsx` | D | component | indicadores V2 eliminados | whole-file (delete) | idem | bajo | alta |
| `ui/src/pages/admin/dashboard/dashboardV2/ProgressBar.tsx` | D | component | progress bar V2 eliminada | whole-file (delete) | idem | bajo | alta |

## Compartidos (partial-hunks) — NO están en este flist, pero hay que tocarlos para cerrar la feature

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/router.tsx` | M (en el repo) | router | quitar `import DashboardV2` y el route `dashboard-v2` | partial-hunks | archivo COMPARTIDO: el mismo diff también borra rutas de reports V2 (NO de esta feature). Traer SOLO los hunks de dashboard | alto | alta |

> Detección: `git diff fefbe695..3ffcf60 -- ui/src/router.tsx` muestra hunks de `DashboardV2` (líneas ~14, 132-133)
> mezclados con `ByFieldOrCropReportV2`/`InvestorContributionV2` (otras features). Aplicar con `git restore -p`.

## Requeridos por dependencia (006-fe-design-system / otros — NO extraer aquí, deben existir antes)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/components/feedback/InlineSpinner.tsx` | (A en 006) | component | loading | do-not-extract-yet | owned por 006; ausente en base | alto si falta | alta |
| `ui/src/components/feedback/Notification.tsx` | (A en 006/016) | component | banner de error | do-not-extract-yet | idem | alto si falta | alta |
| `ui/src/components/feedback/EmptyState.tsx` | (A en 006) | component | estado vacío | do-not-extract-yet | idem | alto si falta | alta |
| `ui/src/components/filters/AppFilterBar.tsx` | (A en 006) | component | reemplaza `FilterBar` externo | do-not-extract-yet | idem | alto si falta | alta |
| `ui/src/components/crud/ScrollableTable.tsx` | (A en 006) | component | scroll horizontal mobile | do-not-extract-yet | idem | alto si falta | alta |
| `ui/src/hooks/useBreakpoint.ts` (`useIsMobile`) | (A en 006) | hook | detección mobile | do-not-extract-yet | idem | alto si falta | alta |
| `ui/src/lib/notify.ts` | (A en 006/016) | util | toasts | do-not-extract-yet | idem | alto si falta | alta |
| `ui/src/lib/format.ts` (`formatError`) | (A en 006) | util | mensaje de error | do-not-extract-yet | idem | alto si falta | alta |
| `ui/src/hooks/useWorkspaceFilters.ts` (`hasWorkspaceSelection`) | M (otra feature) | hook | gating de fetch | do-not-extract-yet | API nueva consumida; archivo NO en este flist | alto si falta | media |

## Dudosos

| path | status | nota |
|---|---|---|
| `ui/src/hooks/useDashboard/types.ts` | M | confianza media en despublicar interfaces: confirmar con `git grep` que ningún archivo fuera del módulo importa `Metrics`, `SowingMetric`, etc. (en el rango no se detectó consumo externo, pero validar en `develop`). |

## NO traer todavía

- Hunks de `router.tsx` que eliminan `ByFieldOrCropReportV2` / `InvestorContributionReportV2` (otras features).
- Cualquier componente de `components/feedback`, `components/filters`, `components/crud`, `lib/`, `hooks/useBreakpoint` → son de 006.
