# implementation-status.md — feature-014 FE master-data pages

## Estado global
- **Estado:** PARCIAL-COMPLETA a nivel código en `3ffcf60`, pero **NO extraíble tal cual** (deps no resueltas + shared files contaminados + solapamiento con DONE).
- **% completitud (código presente en source):** ~90%. Existen List/Form/Archived por entidad, hooks divididos, rutas BFF nuevas, 24 tests y 4 SPEC.md SDD.
- **% extraíble limpio hoy a develop:** ~60–70% (lo que es `A`/`R`/`C` propio). El resto necesita coordinación por-hunk (compartidos) o exclusión (DONE).

## Estado en este repo (FE)
| Entidad | List | Form | Archived | Tests | Notas |
|---|---|---|---|---|---|
| customers | ✓ | CustomerEditor (+reference) | ✓ | validation/listHelpers/helpers | sync actor↔customer (dep 007) |
| fields | ✓ | FieldFormDrawer | ✓ | FieldFormDrawer.test | SPEC.md presente |
| lots | ✓ (Embedded) | LegacyLotDrawer | ✓ | LegacyLotDrawer.test | **parcial DONE #104/#117** |
| workorders | ✓ | (CreateOrder/UpdateOrder + drawers básicos) | ✓ | index.test, importWorkOrders.test | **parcial DONE #117** |
| crops | ✓ | CropFormDrawer | ✓ | CropsList/ArchivedCrops/importUtils/index.test | nuevo hook useCrops |
| investors | ✓ | InvestorFormDrawer | ✓ | — (sin test propio) | ruta BFF nueva |
| managers | ✓ | ManagerFormDrawer | ✓ | — (sin test propio) | ruta BFF nueva |
| labors | ✓ | (List/LaborsCatalog) | ✓ | useLabors/index.test, importUtils.test | hook 412→98 |
| supplies | ✓ | (List/SuppliesCatalog) | ✓ | — | reubicado de products |
| supply-movements | ✓ | CreateSupplyMovement | ✓ | index.test, importUtils.test | reubicado de products |
| stock | ✓ | CreateStockItem | (LegacyStock) | — | _components nuevos |
| campaigns | ✓ | CampaignFormDrawer | ✓ | CampaignFormDrawer.test | SPEC.md presente |
| projects | (master-data) | ProjectBasicDrawer (en entities) | ✓ | ProjectBasicDrawer.test | |
| entities | GeneralEntities | Basic drawers (Field/Lot/Project) | (reusa) | GeneralEntities/LotEdit/ProjectBasic/generalEntityRows tests | SPEC.md clave; depende de TODO |
| data-integrity/dollar/commerce | reubicados | — | — | integrityUtils.test | lógica → 017/018 |

## Estado en el otro repo (BE)
- **N/A — sin cambios BE.** El código BE consumido (endpoints) pertenece a features BE (007/008/010). Esta feature no agrega ni modifica BE.

## Tests
- **24 archivos `*.test.*`** en la flist (hooks `index.test.ts`, helpers, drawers, importUtils, fileTransfer, generalEntityRows, integrityUtils, customerEditorValidation, customersListHelpers, helpers).
- **Gaps de test:** investors, managers y supplies/stock **no tienen test propio** en la flist (solo helpers genéricos). Riesgo medio para esas entidades.
- **SDD specs** (lots/campaigns/fields/entities SPEC.md) enumeran tests esperados; usar como checklist.

## Pendientes / Bugs

### BLOQUEANTE para mergear
1. **Deps 006/007/008/009 deben estar en develop** antes de extraer cualquier entidad (compilación).
2. **`api/src/routes/index.ts`:** extraer SOLO hunks de `/investors`,`/managers`; NO el cache scoped ni `/me`/`/actors` (007/008).
3. **`router.tsx`/`main.tsx`:** montar las rutas de la entidad por hunk; no traer el archivo entero.
4. **Excluir DONE:** `EditableTonsCell.tsx`, hunks total_tons/tentative-prices (#117/#121), table-select-filters (#104).
5. **Renames completos:** borrar orígenes (`useXReducer.ts`, `database/tasks/*`, `products/*`) al traer destinos, o quedan dobles.

### Mejora futura
- Añadir tests para investors/managers/supplies/stock.
- Borrar shim `pages/admin/entities.ts` cuando las pantallas migren a `ENTITIES_BY_KEY` directo.
- Eliminar carpetas legacy (`database/`, `products/`, `tasks/Tasks`) tras migración total.

### Deuda aceptable
- Variantes `Legacy*` duplican código del flujo viejo a propósito (congeladas como referencia). Se eliminan más adelante.
- `*.reference.tsx` (ProjectEditorDrawer/ CustomerEditor.project-drawer.reference) son copias congeladas intencionales (NO refactorizar).

### Duda humana (verificar)
- ¿El BE desplegado ya expone `/investors`,`/managers`,`customers?status`,`campaign_id`? Si no, las pantallas compilan pero fallan en runtime.
- Alcance exacto de hunks DONE en `useLots/queries.ts`, `LotsIndicators.tsx`, `lotTableUtils.ts` — comparar contra develop.
- ¿`useFields/actions.ts` y `useFieldsReducer.ts` (borrados) tienen consumidores fuera de 014?
