# validation.md — feature-014 FE master-data pages

## Checklist pre-PR (por cada PR de entidad)
- [ ] Deps en develop: `git grep -l "useWorkspaceFilters" ui/src/hooks` (008), `git grep -l "ArchivedDrawer" ui/src/components/crud` (009), `git grep -l "ActorFormDrawer" ui/src/pages/admin/master-data/actors` (007), `git grep -l "ENTITIES_BY_KEY" ui/src/copy` (007).
- [ ] `cd ui && yarn tsc --noEmit` sin errores.
- [ ] `cd ui && yarn test <ruta de la entidad>` verde (incluye el `*.test.*` del PR).
- [ ] `cd api && yarn build` (tsc del BFF) y `yarn test` si aplica.
- [ ] `git diff --check` sin marcadores de conflicto/whitespace.
- [ ] Confirmar que NO entraron hunks de: `EditableTonsCell.tsx`, total_tons, tentative-prices, table-select-filters.
- [ ] `git grep "useXReducer"` (X = la entidad renombrada) devuelve 0.
- [ ] `routes/index.ts`: solo se agregaron los `import`/`router.use` de la entidad; NO el bloque de cache scoped/`/me`/`/actors`.
- [ ] Renames: origen borrado (no coexiste con destino).

## Tests sugeridos
- **FE unit:** `cd ui && yarn test`
  - hooks: `useLabors/index.test.ts`, `useWorkOrders/index.test.ts`, `useSupplyMovements/index.test.ts`, `useCrops/index.test.ts`.
  - drawers/listas: `CampaignFormDrawer.test.tsx`, `FieldFormDrawer.test.tsx`, `LegacyLotDrawer.test.tsx`, `CropsList.test.tsx`, `ArchivedCrops.test.tsx`, `ProjectBasicDrawer.test.tsx`, `LotEditDrawer.test.tsx`, `GeneralEntities.test.tsx`.
  - helpers: `customerEditorValidation.test.ts`, `customersListHelpers.test.ts`, `helpers.test.ts`, `generalEntityRows.test.ts`, `importUtils.test.ts` (crops/labors/supply-movements), `fileTransfer.test.ts`, `integrityUtils.test.ts`, `lotTableUtils.test.ts`, `importWorkOrders.test.ts`, `utils.test.ts`.
- **FE build/e2e:** `cd ui && yarn build`; si hay e2e, smoke de `/admin/master-data/<entidad>`.
- **BE:** N/A (sin cambios BE). No correr `go test` para esta feature.

## Manual / UI (por SPEC.md)
### entities (`/admin/master-data/entities`)
- [ ] Filtros en orden Cliente→Proyecto→Inversor→Campania→Proveedor→Responsable→Arrendatario→Campo→Lote→Cultivo.
- [ ] Seleccionar un filtro NO abre editor.
- [ ] Filtro cerrado muestra display-name (`Agro Lajitas`, no `agro lajitas`); siglas en mayúscula (`SRL`,`SA`,`SAS`); `2025-2026` sin formato de nombre.
- [ ] `Nuevo` crea la primera entidad en `Buscar`; clientes crean actor+customer vinculado.
- [ ] Módulo vivo = drawer congelado (no tabla/tarjetas); NO muestra costos/%/ha/arriendo/periodo.
- [ ] Editar Proyecto abre `ProjectBasicDrawer` (no `CustomerEditor`); guarda `PUT /projects/:id` solo `name`.
- [ ] Archivar entidad seleccionada la quita de filtros sin refresh manual.

### campaigns
- [ ] Label del input dice "Periodo" (no "Nombre"); validación "El periodo es obligatorio."; payload `{ name: periodo }`.

### fields
- [ ] `FieldFormDrawer` no muestra cliente/proyecto/campania/costos/campos hermanos; botones de una palabra; guarda `PUT /projects/:id` preservando el resto.

### lots
- [ ] Crear: título "Nuevo Lote" sin contexto. Cultivos por buscador fuzzy (guarda `id`). Cambiar Periodo con Cultivo Actual pide confirmación; "Deshacer" restaura.

## Casos borde
- Lista vacía (BE devuelve `data: []`) → la página no cachea y muestra estado vacío.
- BE 502 / respuesta no-array → BFF responde 502 controlado; la UI muestra error, no crash.
- Sin tenant → 400 "Tenant obligatorio" (dep 008); el FE debe enviar `X-Tenant-Id`.
- Customer sin `actor_id` al editar → debe crear/vincular actor antes de update.
- Paginación: `per_page` clamp a [1,1000] en customers.
- Matching numérico: `Lote 1` ≠ `Lote 15`.

## Qué revisar en UI/API/DB/env
- **UI:** rutas `/admin/master-data/*` montadas en `router.tsx`; sidebar apunta a las nuevas; Legacy* siguen accesibles.
- **API (BFF):** `GET /investors`,`/managers`,`/customers?status=...` responden; `forwardQuery` reenvía page/per_page/filtros; cache scoped por tenant (no fuga entre tenants).
- **DB:** nada (sin migraciones).
- **env:** `configService.bffRequireTenant` y `baseManagerApi`/`apiKey` configurados (vienen de 008/config existente).

## Qué validar en el otro repo (BE)
- Solo runtime: que el BE expone `/investors`,`/managers`,`customers?status`,`campaign_id`,`customer_id`,`project_id`,`field_id` y acepta `X-Tenant-Id`/`X-User-Id`. No hay código BE que portar/validar para esta feature.

## Señales de incompletitud / incompatibilidad
- `tsc` falla por import faltante → dep no mergeada.
- Ruta master-data en blanco → falta hunk en `router.tsx`.
- 404 en `/investors`|`/managers` desde el FE → falta registro en `routes/index.ts`.
- Tests de hooks fallan → falta un archivo del split (queries/mutations/metrics/helpers).
- Doble archivo `useXReducer.ts`+`xReducer.ts` → rename incompleto.
- Indicadores de tons/precios duplicados o conflicto → se coló un hunk DONE.
