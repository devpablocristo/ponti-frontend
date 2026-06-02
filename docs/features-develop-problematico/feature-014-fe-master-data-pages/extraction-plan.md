# extraction-plan.md — feature-014 FE master-data pages

## Contexto
- **repo:** `/home/pablocristo/Proyectos/pablo/ponti/web` (monorepo `ui/` React + `api/` BFF NodeJS, yarn).
- **rama base:** `develop` (tip `8c25e88`).
- **SOURCE de extracción:** `develop-problematico~1` (SHA **3ffcf60**). NUNCA usar `develop-problematico` (su tip es un restore/vacío).
- **rango fuente-de-verdad (diff):** `fefbe695..3ffcf60`.
- **tipo:** Solo-FE. NO hay cambios BE que portar.

## Estrategia general
**1 PR por entidad** (la feature son 212 archivos = familia). No hacer un único PR gigante. Extraer después de mergear las dependencias 006/007/008/009. Excluir hunks ya DONE (#104/#117/#121/#124).

### Orden recomendado de PRs (por dependencia interna)
1. **Hojas sin sync-actor (bajo riesgo):** crops → campaigns → supplies → stock → labors → supply-movements.
2. **Con sync-actor / proyecto:** investors → managers → customers → fields.
3. **lots → workorders** (cuidado: parcialmente DONE; extraer solo Legacy*, drawers, import previews, columnas legacy).
4. **entities (`GeneralEntities`) AL FINAL** (depende de todas las anteriores + 006/007/008/009).
5. **BFF cleanup:** `forwardQuery.ts` + `queryParams.ts` deberían entrar en el PR-1 (las rutas las consumen). Las rutas `investors.ts`/`managers.ts` van con sus PRs de entidad.

## Nombre de rama (por entidad)
`pr/feature-014-fe-master-data-pages-fe` (rama paraguas) o, recomendado, una rama por PR:
- `pr/feature-014-md-crops-fe`, `pr/feature-014-md-campaigns-fe`, ..., `pr/feature-014-md-entities-fe`.

## PR title + description (plantilla por entidad)
**Title:** `feat(fe): master-data <entidad> (List/Form/Archived) [feature-014]`

**Description:**
```
Parte de feature-014 (FE master-data pages, familia por entidad). Solo-FE; sin cambios BE.
Source: develop-problematico~1 (3ffcf60). Base: develop.

Incluye para <entidad>:
- Pantallas master-data/<entidad>: List, FormDrawer, Archived (+ helpers/tests).
- Ruta BFF api/src/routes/<entidad>.ts (consume contrato BE existente).
- (si aplica) refactor del hook useX en queries/mutations/metrics/helpers.

Depende de: 006-fe-design-system, 007-actor-system, 008-identity-tenant-context, 009-crudar-archive-surface (mergeadas).
Excluye: lot-metrics/total_tons (#117), tentative-prices (#121), table-select-filters (#104).
SPEC SDD: ui/src/pages/admin/master-data/<entidad>/SPEC.md (si existe).
```

## Pasos ordenados (genéricos por PR de entidad)
1. Confirmar que 006/007/008/009 están en `develop` (buscar `components/crud/ArchivedDrawer`, `hooks/useActors`, `hooks/useWorkspaceFilters`, `lib/workspaceQuery`).
2. Crear rama desde `develop`.
3. Traer archivos **enteros** propios de la entidad (`A`/`R`/`C`) con `git checkout 3ffcf60 -- <paths>`.
4. Para rutas BFF compartidas, aplicar **hunks** con `git restore -p`.
5. Para hooks `M` (lots/workorders/labors/supplies/stock/categories/providers), aplicar `git restore -p` excluyendo hunks DONE.
6. Registrar la página en `router.tsx` (hunk dirigido) y el provider en `main.tsx` si hace falta.
7. Registrar la ruta BFF en `api/src/routes/index.ts` (solo los 2 hunks de la entidad).
8. `git diff --check` (whitespace/conflict markers).
9. `cd ui && yarn tsc --noEmit` y `yarn test`; `cd api && yarn build`/`yarn test`.
10. Validar visual (ver validation.md). Abrir PR.

## Archivos enteros vs parciales
- **Enteros (whole-file):** todo lo `A`/`R`/`C` listado por entidad (List/Form/Archived/helpers/tests, drawers, Legacy*, reducers renombrados, `forwardQuery.ts`, `investors.ts`, `managers.ts`, `entities.ts`, SPEC.md).
- **Parciales (partial-hunks):** `api/src/routes/index.ts`, hooks `M` (`useLots/index.ts`, `useWorkOrders/index.ts`, `useLabors/index.ts`, etc.), páginas legacy `M` (`Lots.tsx`, `WorkOrders.tsx`, `Stock.tsx`, `customers/*`), utils transversales (`pages/admin/{types,utils,colors}.ts`), `router.tsx`, `main.tsx`.
- **Borrados (D):** `useFields/{actions,useFieldsReducer}.ts`, `database/tasks/List.tsx`, `products/CreateItem.tsx`, `lots/components/LotDrawer.tsx` → aplicar `git rm` SOLO cuando el reemplazo ya esté en la rama y no haya consumidores.

## Migraciones / tests a incluir
- **Migraciones:** NINGUNA (Solo-FE, sin DB).
- **Tests:** incluir SIEMPRE el `*.test.*` de la entidad en el mismo PR (24 tests en total). No mergear código sin su test.

## Dependencias previas (gate)
- 006-fe-design-system (MERGEADA) → `components/crud/*`, `AppFilterBar`, `Modal/copy`.
- 007-actor-system (MERGEADA) → `useActors`, `ActorFormDrawer`, `@/copy/entities`, hooks `useInvestors`/`useManagers`/`useCampaigns`, ruta BFF `/actors`.
- 008-identity-tenant-context (MERGEADA) → `useWorkspaceFilters`, `lib/workspaceQuery`, `requestContext`/cache scoped + `bffRequireTenant` + `/me` en `routes/index.ts`.
- 009-crudar-archive-surface (MERGEADA) → patrón Archived/restore (`ArchivedDrawer`).
- 004 (FE) → `lib/properName` (`formatProperName`/`formatEntityDisplayName`), usado por entities.

## Coordinación con el otro repo (BE)
- **Solo-FE → no hay PR BE a portar.** En el cross-repo-map del BE: "feature-014: sin cambios BE".
- **Runtime:** el BE desplegado debe exponer `/investors`, `/managers`, `customers?status`, y aceptar `customer_id`/`campaign_id`/`project_id`/`field_id`. Estos contratos vienen del BE de 007/008/010. **Orden: BE-first a nivel runtime** (el BE con esos endpoints debe estar desplegado antes de mergear las pantallas que los consumen), aunque la extracción de código sea FE-only.

## Comandos git SUGERIDOS (para un humano; NO ejecutar aquí)
```bash
# 0) verificar deps en develop
git -C <repo> grep -l "useWorkspaceFilters" -- ui/src/hooks   # debe existir (008)
git -C <repo> grep -l "ArchivedDrawer"      -- ui/src/components/crud  # debe existir (009)

# 1) rama
git checkout develop
git checkout -b pr/feature-014-md-crops-fe

# 2) archivos enteros propios (ejemplo crops)
git checkout 3ffcf60 -- \
  api/src/routes/crops.ts \
  api/src/utils/forwardQuery.ts \
  ui/src/hooks/useCrops/index.ts ui/src/hooks/useCrops/types.ts ui/src/hooks/useCrops/index.test.ts \
  ui/src/pages/admin/master-data/crops/

# 3) hunks dirigidos en archivos compartidos
git restore -p --source=3ffcf60 -- api/src/routes/index.ts        # tomar SOLO investors/managers o crops segun PR
git restore -p --source=3ffcf60 -- ui/src/router.tsx              # tomar SOLO el import/route de la entidad
git restore -p --source=3ffcf60 -- api/src/utils/queryParams.ts

# 4) para lots/workorders EXCLUIR hunks de metricas/total_tons
git restore -p --source=3ffcf60 -- ui/src/hooks/useLots/queries.ts        # saltear hunks de total_tons
git restore -p --source=3ffcf60 -- ui/src/pages/admin/lots/components/LotsIndicators.tsx
# y NO traer:
# ui/src/pages/admin/lots/components/EditableTonsCell.tsx (DONE #117)

# 5) higiene
git diff --check
```

## Qué NO traer
- `EditableTonsCell.tsx`, hunks de total_tons/tentative-prices/table-select-filters (DONE #104/#117/#121/#124).
- `routes/index.ts` entero (trae cache scoped + `/me` + `/actors` de 007/008).
- `router.tsx`/`main.tsx` enteros (routing/providers de otras features).
- Componentes base de 006/007 (no están en la flist; ya deben estar en develop).

## Qué podría romperse
- Si 008 no está: no compila (`lib/workspaceQuery`, `useWorkspaceFilters` faltan).
- Si 007 no está: `ActorFormDrawer`, `useInvestors`/`useManagers`/`useCampaigns`, `@/copy` faltan → entities/investors/managers/customers no compilan.
- Si se trae `routes/index.ts` entero sin 008: cache scoped referencia `requestContext`/`configService.bffRequireTenant` inexistentes.
- Doble-porteo de lots/workorders → conflictos con #104/#117 ya en develop.
- Renames a medias: si traés el destino (`xReducer.ts`) sin borrar el origen (`useXReducer.ts`), quedan dos archivos y dobles exports.

## Cómo detectar extracción incompleta
- `yarn tsc --noEmit` falla por imports faltantes (`@/copy`, `useActors`, `useWorkspaceFilters`).
- Tests `index.test.ts` de hooks fallan si falta `queries.ts`/`mutations.ts` del split.
- Ruta 404 en runtime si `routes/index.ts` no registró `/investors`|`/managers`.
- Página en blanco si `router.tsx` no montó la ruta master-data.
- `git grep "useXReducer"` debe dar 0 tras el rename.

## Qué validar antes del PR
- `yarn tsc --noEmit` limpio en `ui/`; `yarn build` en `api/`.
- `yarn test` (al menos los `*.test.*` de la entidad) verde.
- `git diff --check` sin marcadores.
- La pantalla carga y los SPEC.md SDD se cumplen (ver validation.md).
- Confirmar que no entraron hunks de métricas/tentative-prices.

## Qué hacer después de mergear
- Verificar que las rutas legacy (`/admin/database/*`, `/admin/products/*`) siguen funcionando (Legacy* preservados) o redirigen.
- Reentrenar enlaces del menú/sidebar a `/admin/master-data/*`.
- Tras migrar todas las entidades, evaluar borrar shims (`pages/admin/entities.ts`) y carpetas `database/`/`products/` legacy.
- Avisar al equipo BE que las pantallas dependen de `/investors`,`/managers`,`status` en runtime.
