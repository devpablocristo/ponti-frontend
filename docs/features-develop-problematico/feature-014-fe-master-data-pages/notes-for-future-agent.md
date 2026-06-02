# notes-for-future-agent.md — feature-014 FE master-data pages

## Resumen corto
Familia de 212 archivos FE-only que reorganiza la administración bajo `/admin/master-data/*` con List/Form/Archived por entidad (customers, fields, lots, workorders, crops, investors, managers, labors, supplies, supply-movements, stock, campaigns, projects) + la pantalla transversal `Administrar Entidades` (`GeneralEntities.tsx`). Además parte hooks monolíticos en `queries/mutations/metrics/helpers` y añade rutas BFF `investors`/`managers` + util `forwardQuery`. **NO es un PR único: 1 PR por entidad, entities al final.**

## Qué está en FE y qué en BE
- **FE:** TODO (ui/ + api/ BFF). 24 tests, 4 SPEC.md (lots, campaigns, fields, entities).
- **BE:** NADA. Solo-FE. En el cross-repo-map del BE: "feature-014: sin cambios BE". El BFF consume endpoints BE preexistentes/de otras features.

## Archivos esenciales (leer primero)
- `ui/src/pages/admin/master-data/entities/SPEC.md` — reglas de la pantalla clave (cadena, módulo vivo, no-valores-operativos, sync actor↔customer).
- `ui/src/pages/admin/master-data/entities/GeneralEntities.tsx` — depende de casi todo; extraer al final.
- `ui/src/pages/admin/master-data/{lots,campaigns,fields}/SPEC.md` — contratos finos por entidad.
- `api/src/routes/index.ts` — shared (014+007+008).
- `api/src/utils/forwardQuery.ts` — base de todas las listas; traer en el primer PR.

## Archivos peligrosos / mezclados (NO traer entero)
- `api/src/routes/index.ts`: trae cache scoped por tenant+user, `/me`, `/actors`, `bffRequireTenant` (todo de 007/008). Tomar SOLO `import investors/managers` + `router.use("/investors"|"/managers")`.
- `ui/src/router.tsx` y `ui/src/main.tsx`: **NO están en la flist de 014** pero montan las páginas/providers. Hunks dirigidos, coordinar con 006/007/009/010.
- `ui/src/pages/admin/lots/components/EditableTonsCell.tsx`, `useWorkOrders/metrics.ts`, hunks de total_tons/tentative/table-filters en `useLots/queries.ts`/`LotsIndicators.tsx`/`lotTableUtils.ts`/`useLotColumns.tsx`: **DONE (#104/#117/#121/#124)** — excluir.
- `*.reference.tsx` (CustomerEditor.project-drawer.reference, ProjectEditorDrawer.reference): copias congeladas, NO refactorizar.

## Decisiones ya tomadas
- Solo-FE confirmado (deps cross-repo son de runtime, no de código).
- 1 PR por entidad; entities último.
- Excluir DONE explícitamente.
- `routes/index.ts`, `router.tsx`, `main.tsx` por hunks.
- Renames (`useXReducer.ts`→`xReducer.ts`, `products/*`→`supply-movements/*`, `tasks/*`→`labors/*`, `database/*`→`master-data/*`): traer destino + borrar origen.

## Dudas abiertas (verificar antes de extraer)
1. ¿El BE desplegado expone `/investors`,`/managers`,`customers?status`,`campaign_id`? (runtime — confianza media).
2. Alcance exacto de hunks DONE en lots/workorders vs lo nuevo (comparar con develop).
3. ¿`useFields/actions.ts`/`useFieldsReducer.ts` (borrados) tienen consumidores externos?
4. ¿investors/managers/supplies/stock necesitan tests propios antes de mergear? (no hay en la flist).

## Comandos para mirar primero
```bash
R=/home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-014.txt                                   # lista autoritativa (212)
git -C $R show 3ffcf60:ui/src/pages/admin/master-data/entities/SPEC.md
git -C $R diff fefbe695..3ffcf60 -- api/src/routes/index.ts  # ver hunks mezclados
git -C $R diff --stat fefbe695..3ffcf60 -- ui/src/router.tsx ui/src/main.tsx
git -C $R diff --stat fefbe695..3ffcf60 -- ui/src/hooks/useLots ui/src/hooks/useWorkOrders  # solape DONE
git -C $R grep -l "useWorkspaceFilters" -- ui/src/hooks       # confirmar dep 008 en source
```

## Errores a evitar
- Hacer un PR único de 212 archivos.
- Traer `routes/index.ts`/`router.tsx`/`main.tsx` enteros (contamina con 007/008).
- Re-portar lot-metrics/total_tons/tentative-prices/table-filters (ya en develop).
- Extraer entities antes que sus deps (006/007/008/009) y antes que las otras entidades.
- Dejar renames a medias (origen + destino).
- Asumir que hay trabajo BE: no lo hay (solo runtime).

## Camino más seguro
1. Confirmar deps 006/007/008/009 (+004/010 FE) en develop.
2. Confirmar (o desplegar) endpoints BE de runtime.
3. PR-1: `forwardQuery.ts` + `queryParams.ts` + una entidad hoja (crops o campaigns) con sus tests.
4. Iterar entidad por entidad (hojas → actor-linked → lots/workorders excluyendo DONE).
5. entities al final.
6. Cada PR: `yarn tsc --noEmit` + `yarn test` + checklist de validation.md + `git diff --check`.

## Qué PR del otro repo va antes/después
- **Antes (runtime):** BE con `/investors`,`/managers`,`customers?status`,`campaign_id` y tenancy (features BE 007/008/010 desplegadas).
- **Después:** features FE 015/016/017/018 que dependen de la zona master-data ya migrada.
- **No hay PR BE específico de 014** (sin cambios BE).
