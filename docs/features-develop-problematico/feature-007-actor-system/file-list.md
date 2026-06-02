# file-list.md — feature-007 actor-system (FE)

Fuente: `/tmp/flists/fe-007.txt` (17 entradas). SOURCE = `develop-problematico~1` (`3ffcf60`). Todos los paths son **status A (creados)** y **ausentes en `develop` (`8c25e88`)**, por lo que se extraen como `whole-file`.

Leyenda extracción: `whole-file` (traer el archivo entero) / `partial-hunks` (solo algunos hunks de un archivo compartido) / `manual-port` / `do-not-extract-yet`.

## Propios (núcleo de la feature)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `api/src/routes/actors.ts` | A | BFF router (express) | Proxy REST a `/actors` del BE; normaliza lista, hidrata create/update, flushAll cache | whole-file | Archivo nuevo, exclusivo de fe-007 | Medio: requiere BE-007 vivo y montaje en `routes/index.ts` (feature-014) | alta |
| `ui/src/hooks/useActors/index.ts` | A | hook + tipos dominio | Tipos `Actor`/`ActorRole`/perfiles + servicio CRUD sobre `useEntityCrud`; merge, duplicate-candidates, roles, aliases | whole-file | Núcleo del dominio actor en FE | Alto: importa `useEntityCrud` y `canonicalizeName` (feature-006, ausentes en develop) | alta |
| `ui/src/components/SmartEntityInput/SmartEntityInput.tsx` | A | componente React | Input autocompletar fuzzy + dropdown en portal; usado por ActorFormDrawer | whole-file | **Exclusivo de fe-007** (NO en fe-006 ni fe-014) | Medio: importa `entityNameMatcher`, `fuzzySearch`, `properName` (feature-006) | alta |
| `ui/src/components/SmartEntityInput/SmartEntityInput.test.tsx` | A | test (vitest) | Cubre comportamiento del input | whole-file | Test del componente propio | Bajo | alta |
| `ui/src/pages/admin/master-data/actors/ActorsList.tsx` | A | página React (715 líneas) | Listado principal, filtros, bulk, integra ActorFormDrawer/ArchivedActors/DuplicateActors | whole-file | Pantalla principal de la feature | Alto: importa ~20 módulos de fe-006/fe-014 ausentes en develop | alta |
| `ui/src/pages/admin/master-data/actors/ActorFormDrawer.tsx` | A | página/drawer (520) | Editor de actor (crear/editar), reglas de display, perfil condicional, identifiers/aliases | whole-file | Editor central (SPEC.md) | Alto: `EntityFormDrawer`, `entityNameMatcher`, `properName`, `SmartEntityInput` | alta |
| `ui/src/pages/admin/master-data/actors/ActorFormDrawer.test.tsx` | A | test | Tests SDD del editor | whole-file | Regresiones del editor | Bajo | alta |
| `ui/src/pages/admin/master-data/actors/ArchivedActors.tsx` | A | página | Lista de actores archivados (restore/hard), exporta `ActorListFilters` | whole-file | Superficie de archivado | Medio: `ArchivedListPage`, `useArchiveActions`, `entities.ts` | alta |
| `ui/src/pages/admin/master-data/actors/ArchivedActorsByRole.tsx` | A | página | Variante de archivados filtrada por rol | whole-file | Reusa ArchivedActors con rol | Bajo | alta |
| `ui/src/pages/admin/master-data/actors/ArchivedActorsByRole.test.tsx` | A | test | Tests de la variante por rol | whole-file | Cobertura | Bajo | alta |
| `ui/src/pages/admin/master-data/actors/DuplicateActors.tsx` | A | página (375) | Lista duplicate-candidates y ejecuta merge | whole-file | Superficie de deduplicación | Medio: `useActors.mergeActors/getDuplicateCandidates` | alta |
| `ui/src/pages/admin/master-data/actors/actorContextFilters.ts` | A | helper TS | Filtra sugerencias de actor por contexto (customer/project/campaign/field) | whole-file | Lógica de filtros | Medio: importa `managers/managersListHelpers`, `investors/investorsListHelpers`, `projects/types` (feature-014) | alta |
| `ui/src/pages/admin/master-data/actors/actorContextFilters.test.ts` | A | test | Cubre filtros de contexto | whole-file | Cobertura | Bajo | alta |
| `ui/src/pages/admin/master-data/actors/actorCrudarRouting.ts` | A | helper TS | Mapea actor↔entidad legacy (customer/manager/investor) para archivado/bulk | whole-file | Puente CRUDAR (no sync de negocio) | Medio: tipos de `useCustomers/types`, `useInvestors`, `useManagers`, `Modal/copy`, `entities.ts` | alta |
| `ui/src/pages/admin/master-data/actors/actorCrudarRouting.test.ts` | A | test | Cubre el mapeo CRUDAR | whole-file | Cobertura | Bajo | alta |
| `ui/src/pages/admin/master-data/actors/constants.ts` | A | constantes | `ACTOR_KIND_OPTIONS`, `ACTOR_ROLE_OPTIONS` | whole-file | Etiquetas/opciones | Bajo | alta |
| `ui/src/pages/admin/master-data/actors/SPEC.md` | A | doc/SDD | Especificación del editor de actores + tests SDD | whole-file | Fuente de verdad funcional | Bajo (doc) | alta |

## Compartidos (partial-hunks) — NO en este flist, pero REQUERIDOS para que la feature funcione

Estos archivos no aparecen en `fe-007.txt`. En `3ffcf60` contienen el wiring de actors. Pertenecen a otros features; tratarlos como partial-hunks coordinados.

| path | status (vs develop) | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/router.tsx` | ausente/distinto en develop | router compartido | Registra rutas `master-data/actors*` (líneas 81-83 imports, 197-226 rutas en 3ffcf60) | partial-hunks | Sin esto las páginas no son alcanzables; lo posee **feature-006** | Alto: conflicto de merge si 006 y 007 tocan el mismo archivo | alta |
| `api/src/routes/index.ts` | ausente/distinto en develop | router BFF compartido | `import actors` (l.32) + `router.use("/actors", actors)` (l.155) | partial-hunks | Sin esto el BFF no expone `/actors`; lo posee **feature-014** | Alto: conflicto/orden con 014 | alta |

## Requeridos por dependencia (deben existir ANTES; NO se traen en este PR)

Ausentes en `develop`. Pertenecen a feature-006 / feature-014. Importados directamente por los archivos propios.

| path / módulo | owner | usado por |
|---|---|---|
| `ui/src/lib/properName.ts` (`canonicalizeName`, `formatProperName`) | fe-006 | useActors, ActorFormDrawer, ActorsList, SmartEntityInput |
| `ui/src/lib/fuzzySearch.ts` (`fuzzySearchOptions`) | fe-006 | SmartEntityInput |
| `ui/src/lib/entityNameMatcher.ts` (`EntityNameOption`, `findEntityMatches`) | fe-006 | SmartEntityInput, ActorFormDrawer |
| `ui/src/hooks/useEntityCrud/index.ts` (`CrudService`, `useEntityCrud`) | fe-006 | useActors |
| `ui/src/components/crud/{EntityFormDrawer,ArchivedDrawer,BulkSelectionPanel,ResponsiveTable,makeSelectColumn}.tsx` | fe-006 | ActorsList, ActorFormDrawer |
| `ui/src/components/feedback/{EmptyState,LoadingOverlay,Skeleton}` | fe-006 | ActorsList |
| `ui/src/components/filters/AppFilterBar.tsx` | fe-006 | ActorsList |
| `ui/src/components/ArchivedListPage/ArchivedListPage.tsx` | fe-006 | ArchivedActors |
| `ui/src/components/Modal/copy.ts` (`EntityCopy`) | fe-006 | actorCrudarRouting |
| `ui/src/pages/admin/entities.ts` (`ACTOR_ENTITY`, `CUSTOMER_ENTITY`, ...) | fe-014 | ArchivedActors, actorCrudarRouting |
| `ui/src/pages/admin/fileTransfer.ts` | fe-014 | ActorsList (import/export) |
| `ui/src/hooks/useInvestors/index.ts`, `useManagers/index.ts` | fe-014 | ActorsList, actorCrudarRouting, actorContextFilters |
| `ui/src/pages/admin/master-data/{managers/managersListHelpers,investors/investorsListHelpers}.ts` | fe-014 | actorContextFilters |
| `ui/src/pages/admin/database|master-data/{customers,investors,managers}/Archived*.tsx` | fe-014 | ActorsList |
| `ui/src/hooks/useDatabase/projects[/types]` | fe-014 (probable) | ActorsList, actorContextFilters |
| `ui/src/pages/admin/types.ts` (`Column`) | fe-006/014 | ActorsList, ArchivedActors |

> Nota: `@/api/client`, `@/api/types`, `@/lib/notify`, `@/lib/dataDisplay`, `Button`, `Input/*` — confirmar en develop; algunos preexisten, otros llegan con fe-006. Validar con `git cat-file -e 8c25e88:<path>` antes del PR.

## Dudosos
- `actorCrudarRouting.ts` mezcla "puente a entidades legacy" (CRUDAR) con el dominio actor. No es sync de negocio (eso está fuera), pero acopla a tipos de customer/manager/investor. Confianza alta de que es propio, media sobre si debería vivir aquí o en feature-014; **dejarlo en fe-007** (lo importa ActorsList de fe-007).
- `useDatabase/projects` — no quedó claro qué feature lo posee (posible preexistente o fe-010 projects). Verificar antes del PR.

## NO traer todavía
- `ui/src/router.tsx` y `api/src/routes/index.ts` enteros: solo los hunks de actors, y coordinados con 006/014 (ver extraction-plan.md).
- Cualquier archivo de fe-006/fe-014 listado arriba: NO incluirlos en el PR de fe-007; deben venir en sus propios PRs primero.
