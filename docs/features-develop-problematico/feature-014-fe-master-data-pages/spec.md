# spec.md — feature-014 FE master-data pages (familia por entidad)

## Identidad
- **id:** feature-014
- **slug:** fe-master-data-pages
- **nombre:** FE master-data pages (familia por entidad)
- **tipo:** feature (familia de features por entidad)
- **repo:** Frontend monorepo `ui/` (React) + `api/` (BFF NodeJS, yarn) — path `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE:** SÍ (212 archivos: páginas `ui/src/pages/admin/master-data/*`, hooks `ui/src/hooks/*`, rutas BFF `api/src/routes/*` y utils `api/src/utils/*`)
- **existe-en-BE:** NO como feature nueva, pero SI tiene dependencias runtime sobre contratos Core existentes. En particular, las pantallas de labores consumen `GET /api/v1/projects/:project_id/labors`, que requiere la migracion Core `000232_labor_pending_changes` aplicada.

## Resumen
Reorganización integral de la zona de administración del FE: se crea la sección **`/admin/master-data`** que reemplaza progresivamente las antiguas pantallas bajo `/admin/database/*` y `/admin/products/*`. Cada entidad de dato maestro (customers, fields, lots, workorders, crops, investors, managers, labors, supplies, supply-movements, stock, campaigns, projects, data-integrity) gana su propia familia de pantallas con tres superficies estándar por entidad: **List**, **FormDrawer** (crear/editar) y **Archived** (archivados/restaurar). Se añade la pantalla transversal **`Administrar Entidades`** (`/admin/master-data/entities`, `GeneralEntities.tsx`) que navega la cadena Cliente→Proyecto→Inversor→Campania→Proveedor→Responsable→Arrendatario→Campo→Lote→Cultivo y monta el "drawer congelado" de proyecto como módulo vivo de catálogo. En paralelo se **refactorizan los hooks** monolíticos (`useLabors`, `useLots`, `useWorkOrders`, `useSupplyMovements`) partiéndolos en `queries.ts` / `mutations.ts` / `metrics.ts` / `helpers.ts` / `*Reducer.ts`, y se renombran reducers (`useXReducer.ts` → `xReducer.ts`). El BFF gana rutas nuevas (`investors`, `managers`), un helper compartido `forwardQuery.ts` y parámetros de query ampliados.

## Objetivo
- Migrar las pantallas de administración legacy a una arquitectura por entidad bajo `master-data`, consistente con el design-system (006) y el sistema de actores (007).
- Estandarizar List/Form/Archived por entidad reutilizando `components/crud/*` y `components/filters/AppFilterBar` (provistos por 006).
- Centralizar la edición de catálogo de entidades estructurales en `Administrar Entidades` sin exponer valores operativos (que viven en `/admin/projects/new`).
- Modularizar hooks grandes para reducir su tamaño y facilitar testing (aparecen `index.test.ts` por hook).

## Problema
Las pantallas legacy (`/admin/database/*`, `/admin/products/*`, `/admin/tasks`) mezclaban dato maestro y valores operativos, no tenían superficie de archivado coherente, y los hooks de dominio eran monolitos de cientos de líneas (p.ej. `useLabors/index.ts` pasa de ~412 a ~98 líneas). Faltaban rutas BFF para `investors`/`managers` (que ya existen como entidades actor en BE) y faltaba un helper único para reenviar query params (paginación/filtros) al backend.

## Alcance en este repo (FE)
- **Páginas nuevas por entidad** bajo `ui/src/pages/admin/master-data/{customers,fields,lots,investors,managers,labors,supplies,crops,campaigns,projects,work-orders,entities,data-integrity,dollar,commerce}`.
- **Páginas reubicadas/renombradas:** `supply-movements/*` (desde `products/*`), `tasks → labors`, `database/* → master-data/*` (commerce, dollar, data-integrity).
- **Variantes Legacy** preservadas como copia para no romper el flujo viejo: `LegacyLots.tsx`, `LegacyWorkOrders.tsx`, `LegacyStock.tsx`, `LegacySupplyMovements.tsx`, `LegacyTasks.tsx`, `LegacyLotDrawer.tsx`, `LegacyLotsHeader/Indicators`, `useLegacyLotColumns.tsx`.
- **Hooks refactorizados/divididos:** `useLabors`, `useLots`, `useWorkOrders`, `useSupplyMovements` (+ rename de reducers en `useCategories/useCustomers/useProviders/useStock`), nuevo `useCrops`.
- **BFF (`api/`):** rutas nuevas `investors.ts`, `managers.ts`; util nueva `forwardQuery.ts`; cambios en `customers/fields/lots/crops/labors/movements/options/stock/stock_movements/supplies/workorders/categories` y en `utils/{queryParams,lotsRoute,workOrdersRoute}`; registro en `routes/index.ts` (COMPARTIDO — ver más abajo).
- **SPECs SDD** dentro de los módulos (lots, campaigns, fields, entities) que documentan reglas de negocio.

## Alcance en el otro repo (BE)
No hay carpeta ni feature BE nueva para feature-014. El BFF consume endpoints BE existentes (`/customers`, `/investors`, `/managers`, `/projects`, `/fields`, `/lots`, `/crops`, `/labors`, `/supplies`, `/stock`, ...). Para labores, `GET /projects/:project_id/labors` debe responder el catalogo editable con IDs reales y depende de la migracion Core `000232_labor_pending_changes`; si esa migracion no esta aplicada, las pantallas legacy `/admin/database/tasks` y los selectores de OTs pueden fallar con `failed to list labor`.

## Fuera de alcance
- **lot-metrics / total_tons** (FE+BE #117/#121/#124) — DONE. NO re-extraer hunks de `EditableTonsCell.tsx`, `LotsIndicators.tsx`, `useLots/queries.ts` y `useWorkOrders/metrics.ts` que correspondan a métricas/total_tons.
- **tentative-prices** (#121/#124) — DONE; excluir.
- **table-select-filters** (#104) — DONE.
- Componentes base del design-system (`components/crud/*`, `components/filters/AppFilterBar`, `components/Modal/copy`) → feature-006.
- `useActors`, `ActorFormDrawer`, `actorCrudarRouting`, `ArchivedActorsByRole` → feature-007.
- `useWorkspaceFilters`, `lib/workspaceQuery`, contexto de tenant en BFF (`requestContext`, `bffRequireTenant`, scoped cache, `/me`, `/actors`) → features 007/008.
- `lib/properName` (`formatProperName`/`formatEntityDisplayName`) → feature-004 (shared-text-propername) en su contraparte FE.
- `data-integrity` operativo de admin → feature-018.

## Comportamiento esperado
- `/admin/master-data/<entidad>` muestra una **List** con filtros (AppFilterBar), tabla responsive, selección masiva y botón "Nuevo".
- Crear/editar abre un **FormDrawer** específico de la entidad (`CampaignFormDrawer`, `CropFormDrawer`, `FieldFormDrawer`, `InvestorFormDrawer`, `ManagerFormDrawer`, `ProjectBasicDrawer`, `FieldBasicDrawer`, `LotBasicDrawer`, `LegacyLotDrawer`).
- Archivados (`Archived*.tsx`) listan inactivos y permiten restaurar/eliminar; tras la acción se refresca activos+archivados.
- `Administrar Entidades` aplica filtros hacia adelante en la cadena, muestra display-names formateados, y monta `EntityCatalogProjectModule` (basado en `CustomerEditor.project-drawer.reference`) ocultando valores operativos.
- BFF: las listas reenvían `page/per_page/status/customer_id/project_id/campaign_id/field_id` vía `buildForwardQuery`/`parseFieldProjectQueryParams`; el cache de NodeCache queda **scoped por tenant+user** (hunk que en realidad es de 008, ver Compartidos).

## Estado en dp~1 (SHA 3ffcf60)
- Funcionalmente **completa a nivel código** para la mayoría de entidades: existen List/Form/Archived y tests por entidad (24 archivos `*.test.*` en la flist).
- **lots/workorders parcialmente DONE** vía #104/#117: parte de sus hunks ya está en `develop`. Hay que extraer SOLO lo no portado (Legacy*, drawers nuevos, import previews, columnas).
- Hay 4 `SPEC.md` (lots, campaigns, fields, entities) que documentan reglas vigentes.
- Confianza alta en la existencia del código (visto en `git show 3ffcf60:...`). Confianza media en runtime (depende de endpoints BE).

## Criterios de aceptación
1. Cada entidad migrada renderiza su List/Form/Archived sin errores y respeta los SPEC.md correspondientes.
2. `Administrar Entidades` cumple los "Tests SDD" del `entities/SPEC.md` (orden de filtros, no abrir editor al filtrar, display-names, módulo vivo sin valores operativos, sincronización actor↔customer).
3. `CampaignFormDrawer` muestra label "Periodo" y envía `{ name: periodo }` (campaigns/SPEC.md).
4. `FieldFormDrawer` no muestra secciones de proyecto; guarda vía `PUT /projects/:id` preservando el resto (fields/SPEC.md).
5. `LegacyLotDrawer` crea con título "Nuevo Lote" sin contexto; cultivos por fuzzy; confirmación al rotar periodo (lots/SPEC.md).
6. Hooks divididos exponen la misma API pública que antes (los consumidores no deben cambiar).
7. BFF: `/investors`, `/managers` responden y las listas reenvían query params; tests de hooks (`yarn test`) verdes.
8. NO se incluyen hunks de lot-metrics/tentative-prices ya porteados.

## Endpoints / modelos / UI / DB / tests afectados
- **Endpoints BFF (rutas Express):**
  - `GET /investors`, `GET /investors/archived`, (+ create/update/archive/restore) — `api/src/routes/investors.ts` (nuevo).
  - `GET /managers`, `GET /managers/archived`, (+ CRUD) — `api/src/routes/managers.ts` (nuevo).
  - `GET /customers?page&per_page&status`, `GET /customers/archived?<forwardQuery>` — `customers.ts`.
  - `fields`, `lots`, `crops`, `labors`, `supplies`, `stock`, `stock_movements`, `movements`, `workorders`, `categories`, `options` — todas reenvían query params ampliados.
  - Registro de todas en `api/src/routes/index.ts` (COMPARTIDO con 007/008).
- **Modelos/DTOs/tipos (FE):** `ui/src/pages/admin/types.ts`, `useCrops/types.ts`, `useLabors/types.ts`, `useLots/types.ts`, `useWorkOrders/types.ts`, `useSupplyMovements/types.ts`, `orderTypes.ts`, `importPreviewTypes.ts`, `pages/admin/master-data/customers/types.ts`.
- **Componentes/hooks/stores:** ver file-list.md (agrupado por entidad).
- **DB / migraciones:** ninguna en Web. Runtime depende de Core `migrations_v4/000232_labor_pending_changes.up.sql` para el catalogo de labores.
- **Tests:** 24 `*.test.ts(x)` (hooks `index.test.ts`, helpers, drawers, listHelpers, importUtils, fileTransfer, generalEntityRows, integrityUtils, customerEditorValidation, etc.).

## Dependencias
- **Intra-repo (FE) fuertes:** 006-fe-design-system (`components/crud/*`, `AppFilterBar`, `Modal/copy`), 007-actor-system (`useActors`, `ActorFormDrawer`, `actorCrudarRouting`, `@/copy/entities`, hooks `useInvestors`/`useManagers`/`useCampaigns`), 008-identity-tenant-context (`useWorkspaceFilters`, `lib/workspaceQuery`, `requestContext`/scoped-cache en BFF), 009-crudar-archive-surface (`ArchivedDrawer`, patrón crudar de archivado/restore).
- **Intra-repo débiles:** 004 contraparte FE de `lib/properName`; 010-projects (`useDatabase/projects`); 018-data-integrity (Integrity.tsx solo se reubica).
- **Cross-repo:** NINGUNA dependencia de extracción BE (Solo-FE). Dependencia de **runtime**: el BE debe exponer `/investors`, `/managers`, `customers?status`, `campaign_id`/`customer_id` y `GET /projects/:project_id/labors` con migracion `000232_labor_pending_changes` aplicada para que las pantallas funcionen end-to-end (ver risks.md).
- **Archivos compartidos (partial-hunks):** `api/src/routes/index.ts` (mezcla 007/008/014), `ui/src/router.tsx` y `ui/src/main.tsx` (NO están en la flist de 014 pero importan casi todos sus archivos — coordinación obligatoria).

## Riesgos
- **Funcional:** `Administrar Entidades` tiene reglas finas (cadena de filtros, sync actor↔customer, ocultar valores operativos). Extraer sin sus deps 007/008 deja la pantalla rota.
- **Técnico:** los hooks divididos referencian `lib/workspaceQuery` (008). Sin él no compila.
- **Shared-file:** `routes/index.ts` trae cache scoped (008) y registro de `/actors`,`/me` (007/008). Extraer entero contamina 014 con código ajeno; hay que partir por hunks (solo `import investors/managers` y `router.use("/investors"|"/managers")`).
- **router.tsx/main.tsx fuera de flist:** sin ellos las páginas no se montan; con ellos se arrastra routing de otras features.
- **Doble-porteo:** lots/workorders ya parcialmente en `develop` (#104/#117). Riesgo de conflicto/duplicado.

## DECISIÓN recomendada
**Partir en subfeatures (1 PR por entidad) y extraer tras 006/007/008/009.** No extraer "tal cual" en un solo PR (212 archivos, deps no resueltas, shared files contaminados). Orden sugerido de PRs por entidad: primero los "hojas" sin sync actor (crops, campaigns, supplies, stock, labors, supply-movements), luego customers/fields/lots/workorders, y **al final** `entities/GeneralEntities` (depende de todas). Los hunks de `routes/index.ts` y de `router.tsx/main.tsx` se aplican con `git restore -p` por-hunk, coordinando con 007/008. Excluir explícitamente lot-metrics/tentative-prices (DONE).
