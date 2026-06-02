# risks.md — feature-014 FE master-data pages

## Funcionales
| riesgo | impacto | mitigación |
|---|---|---|
| `Administrar Entidades` expone valores operativos (costos/ha/arriendo) por error | rompe la regla central del entities/SPEC.md | usar `EntityCatalogProjectModule` (capa que oculta valores) sobre el reference congelado; correr tests SDD de entities |
| `CampaignFormDrawer` envía `{ periodo }` en vez de `{ name: periodo }` | rompe contrato BE | test SDD campaigns "Submit: envia `{ name: periodo }`"; NO renombrar `name` |
| `FieldFormDrawer`/`LotBasicDrawer` muestran secciones de proyecto | viola fields/lots SPEC | tests "no muestra secciones generales"; revisar render |
| Filtros de la cadena no aplican "solo hacia adelante" o matchean `Lote 1` con `Lote 15` | navegación incorrecta | tests `generalEntityRows.test.ts`; match exacto por número |
| Sync actor↔customer falla al editar/crear cliente | fila de cliente desincronizada | test "editar cliente sincroniza actor y customer"; crear actor si falta `actor_id` |
| Tras archivar, filtro sigue mostrando valor archivado | dato fantasma | refrescar activos+archivados y resetear filtros posteriores (SPEC entities) |

## Técnicos
| riesgo | impacto | mitigación |
|---|---|---|
| Imports a `@/copy`, `useActors`, `useWorkspaceFilters`, `lib/workspaceQuery` no resueltos | no compila | gate de deps 006/007/008 antes de extraer |
| Hooks divididos (queries/mutations/metrics) con API pública cambiada | rompe consumidores | verificar que `index.ts` reexporta la misma superficie; `yarn tsc` |
| Renames a medias (origen + destino coexisten) | dobles exports / imports rotos | borrar orígenes; `git grep useXReducer` debe dar 0 |
| Borrados `D` con consumidores externos | imports rotos | `git grep` de `useFields/actions`, `LotDrawer`, `database/tasks/List` antes de `git rm` |

## Integración / cross-repo
| riesgo | impacto | mitigación |
|---|---|---|
| BE no expone `/investors`,`/managers`,`status`,`campaign_id` | pantallas cargan vacías o 404/502 | desplegar BE 007/008/010 primero; el BFF ya devuelve 502 controlado si la respuesta no es array |
| Header `X-Tenant-Id` requerido por `bffRequireTenant` (008) | todas las rutas 400 sin tenant | asegurar que 008 (contexto tenant en FE) esté mergeado y el FE manda el header |
| Mergear solo FE sin BE listo | features visibles pero rotas en runtime | feature-flag/menu oculto hasta que BE esté; smoke test de endpoints |

## Datos / migración
- **Sin migraciones, sin DB.** Riesgo de datos nulo en el repo FE. El único "dato" es de runtime (lo que devuelve el BE).

## Archivos compartidos (alto riesgo de extracción)
| archivo | dueños mezclados | riesgo | mitigación |
|---|---|---|---|
| `api/src/routes/index.ts` | 014 + 007 (`/actors`) + 008 (cache scoped, `/me`, `bffRequireTenant`) | traer entero contamina; partir mal rompe tenancy | `git restore -p`: tomar SOLO `import investors/managers` + `router.use("/investors"|"/managers")` |
| `ui/src/router.tsx` (NO en flist 014) | 006/007/009/010 + 014 | sin él no se montan páginas; con él routing ajeno | hunk dirigido por entidad; coordinar con dueño de router |
| `ui/src/main.tsx` (NO en flist 014) | 007/008 (providers) | providers de tenant/actor | dejar que 007/008 lo aporten; 014 no lo toca |
| `pages/admin/{types,utils,colors}.ts` | transversal | hunks de varias features | `restore -p` selectivo |

## Extracción parcial (DONE solapado)
| archivo | DONE | riesgo | mitigación |
|---|---|---|---|
| `lots/components/EditableTonsCell.tsx` | #117 lot-metrics | doble-porteo / conflicto | do-not-extract-yet |
| `useLots/queries.ts`, `LotsIndicators.tsx`, `useLots/types.ts` | #117/#121 total_tons/tentative | mezcla métrica + dominio | partial-hunks, excluir métricas |
| `lotTableUtils.ts`, `useLotColumns.tsx` | #104 table-select-filters | doble-porteo | partial-hunks, excluir filtros |
| `useWorkOrders/metrics.ts` | #117 | archivo nuevo pero contenido métrica | revisar antes de traer; probablemente do-not-extract-yet |

## Riesgo de mergear solo un repo
- **Solo FE (este repo):** ALTO en runtime si el BE no tiene los endpoints/headers. Compila y testea (mocks) pero las pantallas reales fallan. Mitigar con BE-first deploy + ocultar menú hasta verificar.
- **Solo BE:** N/A — no hay cambios BE en esta feature.

## Señal temprana de problemas
- `yarn tsc --noEmit` con errores de import → falta una dep (006/007/008).
- 400 "Tenant obligatorio" en todas las rutas → falta header tenant / 008 incompleto.
- 502 "Respuesta inválida del backend (/investors)" → BE no expone el endpoint.
- Tests SDD de entities en rojo → módulo vivo o cadena de filtros mal portados.
