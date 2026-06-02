# dependencies.md — feature-007 actor-system (FE)

## Resumen de grafo
feature-007 FE es una **hoja consumidora**: depende fuertemente de fe-006 y fe-014 (intra-repo) y de fe-007 BE (cross-repo). Casi nada depende de fe-007 FE salvo features consumidores del editor (Administrar Entidades = fe-014, y eventuales flujos de fe-010/011/017 que abran el `ActorFormDrawer` con `defaultRoles`).

## Depende de (intra-repo, FE)

### feature-006 (FE design system) — FUERTE / BLOQUEANTE
Módulos importados directamente por archivos propios de fe-007, todos **ausentes en develop**:
- `lib/properName.ts` → `canonicalizeName`, `formatProperName` (useActors, ActorFormDrawer, ActorsList, SmartEntityInput).
- `lib/fuzzySearch.ts` → `fuzzySearchOptions` (SmartEntityInput).
- `lib/entityNameMatcher.ts` → `EntityNameOption`, `findEntityMatches` (SmartEntityInput, ActorFormDrawer).
- `hooks/useEntityCrud/index.ts` → `CrudService`, `useEntityCrud` (useActors).
- `components/crud/{EntityFormDrawer,ArchivedDrawer,BulkSelectionPanel,ResponsiveTable,makeSelectColumn}.tsx`.
- `components/feedback/{EmptyState,LoadingOverlay,Skeleton}`.
- `components/filters/AppFilterBar.tsx`.
- `components/ArchivedListPage/ArchivedListPage.tsx`.
- `components/Modal/copy.ts` → `EntityCopy` (actorCrudarRouting).
- **Wiring compartido**: `ui/src/router.tsx` (owner fe-006) registra las rutas `master-data/actors*`.

### feature-014 (FE master-data) — FUERTE / BLOQUEANTE
- `pages/admin/entities.ts` → `ACTOR_ENTITY`, `CUSTOMER_ENTITY`, `INVESTOR_ENTITY`, `MANAGER_ENTITY` (ArchivedActors, actorCrudarRouting). **Ausente en develop.**
- `pages/admin/fileTransfer.ts` → import/export (ActorsList).
- `hooks/useInvestors`, `hooks/useManagers`, `hooks/useCustomers` (tipos) — ActorsList, actorCrudarRouting, actorContextFilters.
- `pages/admin/master-data/{managers/managersListHelpers,investors/investorsListHelpers}.ts` → `buildManagerRows`, `normalizeName`, `buildInvestorRows` (actorContextFilters).
- `pages/admin/.../Archived{Customers,Investors,Managers}.tsx` (ActorsList).
- **Wiring compartido**: `api/src/routes/index.ts` (owner fe-014) monta `router.use("/actors", actors)`.

### Otras intra-repo (DÉBIL / INCIERTA)
- `hooks/useDatabase/projects[/types]` (ActorsList, actorContextFilters) — owner incierto (posible preexistente o fe-010 projects). **Verificar `git cat-file -e develop:ui/src/hooks/useDatabase/projects/types.ts`.**
- `@/api/client`, `@/api/types`, `@/lib/notify`, `@/lib/dataDisplay`, `components/Button/*`, `components/Input/*`, `pages/admin/types.ts` — probablemente preexistentes o de fe-006; validar uno por uno.

## Depende de (cross-repo, BE) — FUERTE / BLOQUEANTE
- **feature-007 BE**: endpoints `GET/POST/PUT/DELETE /api/v1/actors*` (list, archived, duplicate-candidates, :id, archive, restore, hard, roles, aliases, merge) + migraciones **223 / 226 / 231 / 234**. El BFF de fe-007 FE es un proxy puro a estos; sin ellos no hay datos.
- **feature-004 (shared-text-propername, BE)**: contraparte de `lib/properName` del FE; la canonicalización/normalización de nombre que el FE envía debe coincidir con la que el BE usa para el índice único. INCIERTA pero relevante para la unicidad global.
- **feature-001/002/003 (BE)** (tenancy refactor / CRUDAR lifecycle / multitenant hardening): listadas como dependencias de la feature; el archivado/restore/hard-delete y el índice único parcial por tenant se apoyan en ese framework. DÉBIL-MEDIA desde la óptica del FE (el FE solo consume endpoints), pero el BE-007 las necesita.

## Bloquea a
- **feature-014** (Administrar Entidades / GeneralEntities) consume el `ActorFormDrawer` con `defaultRoles` y reutiliza `useActors`. Aunque 014 debe mergear ANTES (aporta deps), funcionalmente el flujo "editar Cliente sincronizando actor+customer legacy" requiere fe-007. Acoplamiento bidireccional débil; resolver con orden 006→014→007 y los hunks de wiring acordados.
- Cualquier flujo futuro (fe-010 projects, fe-011 campaign-dto, fe-017 dollar-commerce-forms) que abra el editor de actor para seleccionar/crear contrapartes.

## Archivos / tipos / config / APIs COMPARTIDOS
| recurso | tipo | owner | naturaleza |
|---|---|---|---|
| `ui/src/router.tsx` | router FE | fe-006 | partial-hunks (rutas actors) |
| `api/src/routes/index.ts` | router BFF | fe-014 | partial-hunks (montaje `/actors`) |
| shape `Actor`/payloads/`page_info` | contrato API | fe-007 BE | cross-repo, debe coincidir |
| `lib/properName` (FE) ↔ propername (BE) | normalización de nombre | fe-006 / fe-004 | semántica compartida para unicidad |
| `pages/admin/entities.ts` | catálogo de copys/entidades | fe-014 | importado por fe-007 |

## Recomendación de orden (definitiva)
1. **feature-007 BE** (BE-first; endpoints + migr 223/226/231/234).
2. **feature-006 FE** (design system + wiring de `router.tsx`).
3. **feature-014 FE** (master-data + montaje de `/actors` en `routes/index.ts`).
4. **feature-007 FE** (este paquete).

> Si se mergea fe-007 FE antes de 006/014: build rojo (imports faltantes) y rutas inalcanzables. Si se mergea antes de BE-007: UI presente pero sin datos (errores de red).
