# file-list.md — feature-014 (212 archivos, agrupado por entidad)

Fuente: `cat /tmp/flists/fe-014.txt` (STATUS<TAB>path). Diff de verdad: `fefbe695..3ffcf60`.
Leyenda extracción: **whole-file** = traer el archivo entero (`git checkout 3ffcf60 -- <path>`); **partial-hunks** = `git restore -p`; **manual-port** = re-aplicar a mano; **do-not-extract-yet** = esperar dep / es de otra feature / ya DONE.

> Convención: archivos `A` (nuevos) propios de 014 → whole-file. Archivos `M` que son hooks/rutas compartidas o que ya recibieron hunks de DONE (#104/#117/#121) → partial-hunks. `R`/`C` (renames/copias) → whole-file del destino + recordar borrar/dejar origen.

---

## BFF (`api/`) — transversal a todas las entidades

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/index.ts | M | router/registry | registra `/investors` `/managers` | **partial-hunks** | COMPARTIDO: trae también cache scoped + `/me` `/actors` `bffRequireTenant` (007/008) | alto | alta |
| api/src/utils/forwardQuery.ts | A | util | reenvío de query params (page/per_page/filtros) | whole-file | nuevo, usado por casi todas las rutas | bajo | alta |
| api/src/utils/queryParams.ts | M | util | añade `customer_id`/`campaign_id` a parse | whole-file | cambio aditivo, sin DONE conocido | bajo | alta |
| api/src/utils/lotsRoute.ts | M | util | helpers ruta lots | partial-hunks | puede solapar #117 (lots) | medio | media |
| api/src/utils/workOrdersRoute.ts | M | util | helpers ruta workorders | partial-hunks | puede solapar #117 | medio | media |
| api/src/routes/options.ts | M | route | form-options ampliadas | whole-file | aditivo | bajo | media |
| api/src/routes/categories.ts | M | route | forwardQuery | whole-file | aditivo | bajo | media |

---

## customers (+ sociedad/cliente)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/customers.ts | M | route BFF | paginación+status+archived forwardQuery | whole-file | cambio propio de 014 | medio | alta |
| ui/src/hooks/useCustomers/index.ts | M | hook | consumo customers | partial-hunks | hook compartido | medio | media |
| ui/src/hooks/useCustomers/types.ts | M | tipos | DTO customer | whole-file | aditivo | bajo | media |
| ui/src/hooks/useCustomers/customersReducer.ts | R (de useCustomersReducer.ts) | reducer | rename | whole-file | rename: traer destino, borrar origen | bajo | alta |
| ui/src/pages/admin/customers/Customers.tsx | M | page legacy | ajustes | partial-hunks | legacy, posible solape | medio | media |
| ui/src/pages/admin/customers/ExpandedRow.tsx | M | page legacy | fila expandida | partial-hunks | legacy | bajo | media |
| ui/src/pages/admin/customers/FieldDetails.tsx | M | page legacy | detalle campo | partial-hunks | legacy | bajo | media |
| ui/src/pages/admin/database/customers/ArchivedCustomers.tsx | M | page legacy | archived viejo | partial-hunks | reubicado a master-data | medio | media |
| ui/src/pages/admin/master-data/customers/CustomersList.tsx | A | page | List nueva | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/customers/CustomerEditor.tsx | A | page/drawer | editor | whole-file | propio (dep 007 ActorForm) | medio | alta |
| ui/src/pages/admin/master-data/customers/CustomerEditor.project-drawer.reference.tsx | A | referencia congelada | base visual de EntityCatalogProjectModule | whole-file | NO modificar; referencia | bajo | alta |
| ui/src/pages/admin/master-data/customers/ArchivedCustomers.tsx | A | page | archived nuevo | whole-file | propio (dep 009) | bajo | alta |
| ui/src/pages/admin/master-data/customers/_components/EditableList.tsx | A | componente | lista editable | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/customers/customerEditorValidation.ts | A | helper | validación | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/customers/customerEditorValidation.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/customers/customersListHelpers.ts | A | helper | helpers list | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/customers/customersListHelpers.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/customers/helpers.ts | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/customers/helpers.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/customers/types.ts | A | tipos | tipos page | whole-file | propio | bajo | alta |

---

## fields (campos)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/fields.ts | M | route BFF | forwardQuery/filtros | whole-file | propio | bajo | alta |
| ui/src/hooks/useFields/index.ts | M | hook | consumo fields | partial-hunks | hook compartido | medio | media |
| ui/src/hooks/useFields/types.ts | M | tipos | DTO field | whole-file | aditivo | bajo | media |
| ui/src/hooks/useFields/actions.ts | D | reducer-actions | eliminado (refactor) | whole-file | borrar: confirmar no usado por otra feature | medio | media |
| ui/src/hooks/useFields/useFieldsReducer.ts | D | reducer | eliminado (refactor) | whole-file | borrar archivo | medio | media |
| ui/src/pages/admin/master-data/fields/FieldsList.tsx | A | page | List | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/fields/FieldFormDrawer.tsx | A | drawer | crear/editar | whole-file | propio (fields/SPEC) | bajo | alta |
| ui/src/pages/admin/master-data/fields/FieldFormDrawer.test.tsx | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/fields/ArchivedFields.tsx | A | page | archived | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/fields/SPEC.md | A | spec SDD | reglas | whole-file | cosechado en spec.md | bajo | alta |

---

## lots (lotes) — PARCIALMENTE DONE (#104/#117)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/lots.ts | M | route BFF | filtros/forwardQuery | partial-hunks | solapa #117 lots | alto | media |
| ui/src/hooks/useLots/index.ts | M | hook | orquestación | partial-hunks | dividido; solapa DONE | alto | media |
| ui/src/hooks/useLots/actions.ts | M | reducer-actions | acciones | partial-hunks | solape | medio | media |
| ui/src/hooks/useLots/lotsReducer.ts | R (de useLotsReducer.ts) | reducer | rename | whole-file | rename | bajo | alta |
| ui/src/hooks/useLots/queries.ts | A | hook-queries | split queries | partial-hunks | **contiene métricas/total_tons DONE #117** — excluir esos hunks | alto | media |
| ui/src/hooks/useLots/mutations.ts | A | hook-mutations | split mutations | whole-file | propio | medio | media |
| ui/src/hooks/useLots/types.ts | M | tipos | DTO lot | partial-hunks | total_tons puede ser DONE | medio | media |
| ui/src/pages/admin/lots/Lots.tsx | M | page | reroute a Legacy/new | partial-hunks | solapa DONE | alto | media |
| ui/src/pages/admin/lots/LegacyLots.tsx | C (de Lots.tsx) | page legacy | copia congelada | whole-file | propio | bajo | alta |
| ui/src/pages/admin/lots/EmbeddedLotsList.tsx | A | componente | lista embebida | whole-file | propio | bajo | alta |
| ui/src/pages/admin/lots/ImportLotsPreview.tsx | A | componente | preview import | whole-file | propio | bajo | alta |
| ui/src/pages/admin/lots/importLots.ts | A | helper | parser import | whole-file | propio | bajo | alta |
| ui/src/pages/admin/lots/SPEC.md | A | spec SDD | reglas drawer | whole-file | cosechado | bajo | alta |
| ui/src/pages/admin/lots/components/EditableTonsCell.tsx | M | componente | celda tons | **do-not-extract-yet** | **lot-metrics DONE #117** | alto | alta |
| ui/src/pages/admin/lots/components/LotsIndicators.tsx | M | componente | indicadores | partial-hunks | parte total_tons DONE; solo hunks no-métrica | alto | media |
| ui/src/pages/admin/lots/components/LotsHeader.tsx | M | componente | header | partial-hunks | solape | medio | media |
| ui/src/pages/admin/lots/components/LegacyLotDrawer.tsx | A | drawer | drawer compartido | whole-file | propio (lots/SPEC) | bajo | alta |
| ui/src/pages/admin/lots/components/LegacyLotDrawer.test.tsx | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/lots/components/LegacyLotsHeader.tsx | C (de LotsHeader.tsx) | componente | copia | whole-file | propio | bajo | alta |
| ui/src/pages/admin/lots/components/LegacyLotsIndicators.tsx | C (de LotsIndicators.tsx) | componente | copia | whole-file | propio | bajo | alta |
| ui/src/pages/admin/lots/components/LotDrawer.tsx | D | drawer viejo | eliminado | whole-file | borrar; reemplazado por LegacyLotDrawer | medio | media |
| ui/src/pages/admin/lots/lotTableUtils.ts | M | util | tabla | partial-hunks | solape #104/#117 | medio | media |
| ui/src/pages/admin/lots/lotTableUtils.test.ts | M | test | unit | partial-hunks | idem | medio | media |
| ui/src/pages/admin/lots/useLotColumns.tsx | M | hook-cols | columnas | partial-hunks | solape | medio | media |
| ui/src/pages/admin/lots/useLegacyLotColumns.tsx | C (de useLotColumns.tsx) | hook-cols | copia | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/lots/ArchivedLots.tsx | A | page | archived | whole-file | propio | bajo | alta |

---

## workorders (órdenes de trabajo) — PARCIALMENTE DONE (#117)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/workorders.ts | M | route BFF | filtros | partial-hunks | solape #117 | alto | media |
| ui/src/hooks/useWorkOrders/index.ts | M | hook | orquestación | partial-hunks | dividido; solape | alto | media |
| ui/src/hooks/useWorkOrders/ordersReducer.ts | M | reducer | acciones | partial-hunks | solape | medio | media |
| ui/src/hooks/useWorkOrders/queries.ts | A | hook-queries | split | partial-hunks | revisar métricas DONE | medio | media |
| ui/src/hooks/useWorkOrders/mutations.ts | A | hook-mutations | split | whole-file | propio | medio | media |
| ui/src/hooks/useWorkOrders/metrics.ts | A | hook-metrics | split | **do-not-extract-yet** | **lot-metrics DONE #117** | alto | media |
| ui/src/hooks/useWorkOrders/types.ts | M | tipos | DTO | partial-hunks | solape | medio | media |
| ui/src/hooks/useWorkOrders/index.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/workorders/WorkOrders.tsx | M | page | reroute | partial-hunks | solape | alto | media |
| ui/src/pages/admin/workorders/LegacyWorkOrders.tsx | C (de WorkOrders.tsx) | page legacy | copia | whole-file | propio | bajo | alta |
| ui/src/pages/admin/workorders/CreateOrder.tsx | M | page | crear | partial-hunks | solape | medio | media |
| ui/src/pages/admin/workorders/UpdateOrder.tsx | M | page | editar | partial-hunks | solape | medio | media |
| ui/src/pages/admin/workorders/ImportWorkOrdersPreview.tsx | A | componente | preview import | whole-file | propio | bajo | alta |
| ui/src/pages/admin/workorders/importWorkOrders.ts | A | helper | parser | whole-file | propio | bajo | alta |
| ui/src/pages/admin/workorders/importWorkOrders.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/workorders/helpers.ts | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/workorders/orderTypes.ts | A | tipos | tipos page | whole-file | propio | bajo | alta |
| ui/src/pages/admin/workorders/_components/OrdersHeader.tsx | A | componente | header | whole-file | propio | bajo | alta |
| ui/src/pages/admin/workorders/_components/OrdersIndicators.tsx | A | componente | indicadores | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/work-orders/ArchivedWorkOrders.tsx | A | page | archived | whole-file | propio | bajo | alta |

---

## crops (cultivos)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/crops.ts | M | route BFF | forwardQuery | whole-file | propio | bajo | alta |
| ui/src/hooks/useCrops/index.ts | A | hook | nuevo hook | whole-file | propio | bajo | alta |
| ui/src/hooks/useCrops/types.ts | A | tipos | DTO crop | whole-file | propio | bajo | alta |
| ui/src/hooks/useCrops/index.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/crops/CropsList.tsx | A | page | List | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/crops/CropsList.test.tsx | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/crops/CropFormDrawer.tsx | A | drawer | crear/editar | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/crops/ArchivedCrops.tsx | A | page | archived | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/crops/ArchivedCrops.test.tsx | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/crops/importUtils.ts | A | helper | import | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/crops/importUtils.test.ts | A | test | unit | whole-file | propio | bajo | alta |

---

## investors (inversores)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/investors.ts | A | route BFF | nueva ruta | whole-file | propio (consume `/investors` BE) | medio | alta |
| ui/src/pages/admin/master-data/investors/InvestorsList.tsx | A | page | List | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/investors/InvestorFormDrawer.tsx | A | drawer | crear/editar | whole-file | propio (dep 007 actor) | medio | alta |
| ui/src/pages/admin/master-data/investors/ArchivedInvestors.tsx | A | page | archived | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/investors/investorsListHelpers.ts | A | helper | helpers | whole-file | propio | bajo | alta |

> Nota: el hook `useInvestors` NO está en la flist → lo provee 007.

---

## managers (responsables)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/managers.ts | A | route BFF | nueva ruta | whole-file | propio (consume `/managers` BE) | medio | alta |
| ui/src/pages/admin/master-data/managers/ManagersList.tsx | A | page | List | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/managers/ManagerFormDrawer.tsx | A | drawer | crear/editar | whole-file | propio (dep 007 actor) | medio | alta |
| ui/src/pages/admin/master-data/managers/ArchivedManagers.tsx | A | page | archived | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/managers/managersListHelpers.ts | A | helper | helpers | whole-file | propio | bajo | alta |

> Nota: el hook `useManagers` NO está en la flist → lo provee 007.

---

## labors (labores / tasks)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/labors.ts | M | route BFF | filtros | whole-file | propio | bajo | media |
| ui/src/hooks/useLabors/index.ts | M | hook | orquestación (412→98) | partial-hunks | refactor grande; revisar consumidores | medio | alta |
| ui/src/hooks/useLabors/laborsReducer.ts | M | reducer | acciones | partial-hunks | refactor | medio | media |
| ui/src/hooks/useLabors/queries.ts | A | hook-queries | split | whole-file | propio | bajo | alta |
| ui/src/hooks/useLabors/mutations.ts | A | hook-mutations | split | whole-file | propio | bajo | alta |
| ui/src/hooks/useLabors/metrics.ts | A | hook-metrics | split | whole-file | propio | bajo | alta |
| ui/src/hooks/useLabors/invoices.ts | A | servicio | facturas | whole-file | propio | bajo | alta |
| ui/src/hooks/useLabors/helpers.ts | A | helper | extractLaborsArray | whole-file | propio | bajo | alta |
| ui/src/hooks/useLabors/types.ts | M | tipos | DTO | whole-file | aditivo | bajo | media |
| ui/src/hooks/useLabors/index.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/labors/LaborsCatalog.tsx | A | page | catálogo | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/labors/List.tsx | A | page | List | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/labors/ArchivedLabors.tsx | A | page | archived | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/labors/laborsCatalogHelpers.ts | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/labors/listHelpers.tsx | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/labors/importUtils.ts | R (de database/tasks/importUtils.ts) | helper | reubicado | whole-file | rename | bajo | alta |
| ui/src/pages/admin/master-data/labors/importUtils.test.ts | R (de database/tasks/importUtils.test.ts) | test | reubicado | whole-file | rename | bajo | alta |
| ui/src/pages/admin/database/tasks/List.tsx | D | page legacy | eliminado | whole-file | borrar | medio | media |
| ui/src/pages/admin/database/tasks/TasksForm.tsx | M | page legacy | ajuste | partial-hunks | legacy | bajo | media |
| ui/src/pages/admin/tasks/Labors.tsx | A | page | tasks→labors | whole-file | propio | bajo | alta |
| ui/src/pages/admin/tasks/LegacyTasks.tsx | R (de tasks/Tasks.tsx) | page legacy | copia | whole-file | rename | bajo | alta |
| ui/src/pages/admin/tasks/helpers.tsx | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/tasks/_components/LaborsHeader.tsx | A | componente | header | whole-file | propio | bajo | alta |
| ui/src/pages/admin/tasks/_components/TasksIndicators.tsx | A | componente | indicadores | whole-file | propio | bajo | alta |

---

## supplies (insumos)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/supplies.ts | M | route BFF | filtros | whole-file | propio | bajo | media |
| ui/src/hooks/useSupplies/index.ts | M | hook | consumo | partial-hunks | hook compartido | medio | media |
| ui/src/hooks/useSupplies/types.ts | M | tipos | DTO | whole-file | aditivo | bajo | media |
| ui/src/pages/admin/master-data/supplies/SuppliesCatalog.tsx | C (de database/products/Items.tsx) | page | catálogo | whole-file | copia | bajo | alta |
| ui/src/pages/admin/master-data/supplies/List.tsx | R (de database/products/List.tsx) | page | List | whole-file | rename | bajo | alta |
| ui/src/pages/admin/master-data/supplies/ArchivedSupplies.tsx | A | page | archived | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/supplies/catalogHelpers.ts | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/supplies/listHelpers.tsx | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/database/products/Items.tsx | M | page legacy | ajuste/origen copia | partial-hunks | legacy | bajo | media |
| ui/src/pages/admin/products/CreateItem.tsx | D | page legacy | eliminado | whole-file | borrar | medio | media |

---

## supply-movements (movimientos de insumos)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/movements.ts | M | route BFF | filtros | whole-file | propio | bajo | media |
| ui/src/hooks/useSupplyMovements/index.ts | A | hook | nuevo (de useSupplyMovement) | whole-file | propio | bajo | alta |
| ui/src/hooks/useSupplyMovements/queries.ts | A | hook-queries | split | whole-file | propio | bajo | alta |
| ui/src/hooks/useSupplyMovements/mutations.ts | A | hook-mutations | split | whole-file | propio | bajo | alta |
| ui/src/hooks/useSupplyMovements/batchErrors.ts | A | helper | errores batch | whole-file | propio | bajo | alta |
| ui/src/hooks/useSupplyMovements/index.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/hooks/useSupplyMovements/actions.ts | R (de useSupplyMovement/actions.ts) | reducer-actions | reubicado | whole-file | rename | bajo | alta |
| ui/src/hooks/useSupplyMovements/supplyMovementsReducer.ts | R (de useSupplyMovement/ordersReducer.ts) | reducer | reubicado | whole-file | rename | bajo | alta |
| ui/src/hooks/useSupplyMovements/types.ts | R (de useSupplyMovement/types.ts) | tipos | reubicado | whole-file | rename | bajo | alta |
| ui/src/pages/admin/supply-movements/SupplyMovements.tsx | A | page | nueva pantalla | whole-file | propio (dep 008 useWorkspaceFilters) | medio | alta |
| ui/src/pages/admin/supply-movements/CreateSupplyMovement.tsx | A | page | crear | whole-file | propio | bajo | alta |
| ui/src/pages/admin/supply-movements/createSupplyMovementHelpers.ts | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/supply-movements/ArchivedSupplyMovements.tsx | A | page | archived | whole-file | propio | bajo | alta |
| ui/src/pages/admin/supply-movements/ImportSupplyMovements.tsx | R (de products/ImportSupplyMovements.tsx) | page | reubicado | whole-file | rename | bajo | alta |
| ui/src/pages/admin/supply-movements/LegacySupplyMovements.tsx | R (de products/Products.tsx) | page legacy | copia | whole-file | rename | bajo | alta |
| ui/src/pages/admin/supply-movements/importPreviewTypes.ts | A | tipos | preview | whole-file | propio | bajo | alta |
| ui/src/pages/admin/supply-movements/importUtils.ts | R (de products/importUtils.ts) | helper | reubicado | whole-file | rename | bajo | alta |
| ui/src/pages/admin/supply-movements/importUtils.test.ts | R (de products/importUtils.test.ts) | test | reubicado | whole-file | rename | bajo | alta |
| ui/src/pages/admin/supply-movements/_components/FilterChip.tsx | A | componente | chip filtro | whole-file | propio | bajo | alta |
| ui/src/pages/admin/supply-movements/_components/StatusBadge.tsx | A | componente | badge | whole-file | propio | bajo | alta |
| ui/src/pages/admin/supply-movements/_components/SupplyMovementsIndicators.tsx | A | componente | indicadores | whole-file | propio | bajo | alta |
| ui/src/pages/admin/products/ImportSupplyMovements.tsx | (origen R) | — | — | do-not-extract-yet | origen del rename, se elimina con el rename | bajo | media |

---

## stock

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/stock.ts | M | route BFF | filtros | whole-file | propio | bajo | media |
| api/src/routes/stock_movements.ts | M | route BFF | filtros | whole-file | propio | bajo | media |
| ui/src/hooks/useStock/index.ts | M | hook | consumo | partial-hunks | hook compartido | medio | media |
| ui/src/hooks/useStock/types.ts | M | tipos | DTO | whole-file | aditivo | bajo | media |
| ui/src/hooks/useStock/stockReducer.ts | R (de useStockReducer.ts) | reducer | rename | whole-file | rename | bajo | alta |
| ui/src/hooks/useStockMovement/index.ts | M | hook | consumo | partial-hunks | hook compartido | medio | media |
| ui/src/hooks/useStockMovement/types.ts | M | tipos | DTO | whole-file | aditivo | bajo | media |
| ui/src/pages/admin/stock/Stock.tsx | M | page | reroute | partial-hunks | legacy/new | medio | media |
| ui/src/pages/admin/stock/LegacyStock.tsx | C (de stock/Stock.tsx) | page legacy | copia | whole-file | copia | bajo | alta |
| ui/src/pages/admin/stock/CreateStockItem.tsx | M | page | crear | partial-hunks | legacy | bajo | media |
| ui/src/pages/admin/stock/stockHelpers.ts | A | helper | helpers | whole-file | propio | bajo | alta |
| ui/src/pages/admin/stock/_components/CloseStockDate.tsx | A | componente | cierre fecha | whole-file | propio | bajo | alta |
| ui/src/pages/admin/stock/_components/EditableCell.tsx | A | componente | celda editable | whole-file | propio | bajo | alta |
| ui/src/pages/admin/stock/_components/StockIndicators.tsx | A | componente | indicadores | whole-file | propio | bajo | alta |

---

## campaigns (campañas)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/pages/admin/master-data/campaigns/CampaignsList.tsx | A | page | List | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/campaigns/CampaignFormDrawer.tsx | A | drawer | crear/editar (label "Periodo") | whole-file | propio (campaigns/SPEC) | bajo | alta |
| ui/src/pages/admin/master-data/campaigns/CampaignFormDrawer.test.tsx | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/campaigns/ArchivedCampaigns.tsx | A | page | archived | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/campaigns/SPEC.md | A | spec SDD | reglas | whole-file | cosechado | bajo | alta |

> Nota: el hook `useCampaigns` NO está en la flist → lo provee 007.

---

## projects (proyectos) — reubicación

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/pages/admin/master-data/projects/ArchivedProjects.tsx | A | page | archived nuevo | whole-file | propio | bajo | alta |
| ui/src/pages/admin/database/projects/ArchivedProjects.tsx | M | page legacy | ajuste | partial-hunks | reubicado | medio | media |

---

## entities (Administrar Entidades) — pantalla transversal, EXTRAER ÚLTIMO

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/pages/admin/entities.ts | A | shim/constantes | compat `@/copy` | whole-file | propio (dep 007 @/copy) | medio | alta |
| ui/src/pages/admin/master-data/entities/GeneralEntities.tsx | A | page | pantalla principal | whole-file | propio (dep 006/007/008/009) | alto | alta |
| ui/src/pages/admin/master-data/entities/GeneralEntities.test.tsx | A | test | unit | whole-file | propio | medio | alta |
| ui/src/pages/admin/master-data/entities/EntityCatalogProjectModule.tsx | A | componente | módulo vivo drawer | whole-file | propio (base reference) | alto | alta |
| ui/src/pages/admin/master-data/entities/ProjectEditorDrawer.reference.tsx | A | referencia | wrapper congelado | whole-file | NO modificar | bajo | alta |
| ui/src/pages/admin/master-data/entities/ProjectBasicDrawer.tsx | A | drawer | editor básico proyecto | whole-file | propio (entities/SPEC) | medio | alta |
| ui/src/pages/admin/master-data/entities/ProjectBasicDrawer.test.tsx | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/entities/FieldBasicDrawer.tsx | A | drawer | editor básico campo | whole-file | propio | medio | alta |
| ui/src/pages/admin/master-data/entities/LotBasicDrawer.tsx | A | drawer | editor básico lote | whole-file | propio | medio | alta |
| ui/src/pages/admin/master-data/entities/LotEditDrawer.tsx | A | drawer | editar lote | whole-file | propio | medio | alta |
| ui/src/pages/admin/master-data/entities/LotEditDrawer.test.tsx | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/entities/generalEntityRows.ts | A | helper | builder filas cadena | whole-file | propio | medio | alta |
| ui/src/pages/admin/master-data/entities/generalEntityRows.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/master-data/entities/SPEC.md | A | spec SDD | reglas | whole-file | cosechado (clave) | bajo | alta |

---

## data-integrity / dollar / commerce (reubicación master-data)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| ui/src/pages/admin/master-data/data-integrity/Integrity.tsx | R (de database/data-integrity/Integrity.tsx) | page | reubicado | whole-file | rename; lógica → 018 | medio | media |
| ui/src/pages/admin/master-data/data-integrity/integrityUtils.ts | R | util | reubicado | whole-file | rename | bajo | media |
| ui/src/pages/admin/master-data/data-integrity/integrityUtils.test.ts | R | test | reubicado | whole-file | rename | bajo | media |
| ui/src/pages/admin/master-data/dollar/DollarForm.tsx | R (de database/dollar/DollarForm.tsx) | page | reubicado | whole-file | rename; forms → 017 | medio | media |
| ui/src/pages/admin/master-data/commerce/CommerceForm.tsx | R (de database/commerce/CommerceForm.tsx) | page | reubicado | whole-file | rename; forms → 017 | medio | media |

---

## categories / providers / utils admin / varios (transversal)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| api/src/routes/categories.ts | M | route BFF | forwardQuery | whole-file | aditivo | bajo | media |
| ui/src/hooks/useCategories/index.ts | M | hook | consumo | partial-hunks | hook compartido | medio | media |
| ui/src/hooks/useCategories/types.ts | M | tipos | DTO | whole-file | aditivo | bajo | media |
| ui/src/hooks/useCategories/categoriesReducer.ts | R (de useCategoriesReducer.ts) | reducer | rename | whole-file | rename | bajo | alta |
| ui/src/hooks/useProviders/index.ts | M | hook | consumo | partial-hunks | hook compartido | medio | media |
| ui/src/hooks/useProviders/providersReducer.ts | R (de useProvidersReducer.ts) | reducer | rename | whole-file | rename | bajo | alta |
| ui/src/pages/admin/colors.ts | M | util | paleta | partial-hunks | transversal | bajo | media |
| ui/src/pages/admin/types.ts | M | tipos | tipos admin | partial-hunks | transversal | medio | media |
| ui/src/pages/admin/utils.ts | M | util | utils admin | partial-hunks | transversal | medio | media |
| ui/src/pages/admin/utils.test.ts | M | test | unit | partial-hunks | transversal | bajo | media |
| ui/src/pages/admin/entities.ts | A | (ver entities) | — | — | duplicado en sección entities | — | — |
| ui/src/pages/admin/fileTransfer.ts | A | util | import/export CSV | whole-file | propio | bajo | alta |
| ui/src/pages/admin/fileTransfer.test.ts | A | test | unit | whole-file | propio | bajo | alta |
| ui/src/pages/admin/ai-assistant/AIAssistant.tsx | M | page | ajuste menor | partial-hunks | transversal (012) | bajo | media |
| ui/src/pages/admin/profile/Profile.tsx | M | page | ajuste menor | partial-hunks | transversal | bajo | media |
| ui/src/pages/admin/database/products/Items.tsx | M | page legacy | origen copia supplies | partial-hunks | legacy | bajo | media |
| ui/src/pages/admin/database/tasks/TasksForm.tsx | M | page legacy | ajuste | partial-hunks | legacy | bajo | media |

---

## Compartidos (partial-hunks) — coordinación obligatoria

| path | status | dueños del hunk | extracción | motivo |
|---|---|---|---|---|
| api/src/routes/index.ts | M | 014 (`/investors` `/managers`) + 007 (`/actors`) + 008 (cache scoped, `/me`, `bffRequireTenant`) | **partial-hunks** | solo extraer los 4 hunks de `import investors/managers` y `router.use(...)` |
| ui/src/router.tsx | M (NO en flist 014) | 014 monta páginas master-data + 006/007/009/010 | **partial-hunks/coord** | sin él las páginas no se montan; con él se arrastra routing ajeno |
| ui/src/main.tsx | M (NO en flist 014) | bootstrap providers (007/008) | **partial-hunks/coord** | providers de tenant/actor |

> No hay `package.json`/`yarn.lock` en la flist de 014 → no toca dependencias.

---

## NO traer todavía (do-not-extract-yet)
- `ui/src/pages/admin/lots/components/EditableTonsCell.tsx` — lot-metrics DONE #117.
- `ui/src/hooks/useWorkOrders/metrics.ts` — lot-metrics DONE #117 (verificar; el archivo es nuevo pero su contenido es métrica ya porteada).
- Hunks de total_tons/tentative-prices dentro de `useLots/queries.ts`, `LotsIndicators.tsx`, `useLots/types.ts` — DONE #117/#121/#124.
- Hunks de table-select-filters dentro de `lotTableUtils.ts`/`useLotColumns.tsx` — DONE #104.
- `router.tsx`/`main.tsx` enteros — coordinar por hunks con 007/008/010.

## Dudosos (revisar a mano)
- `useFields/actions.ts` (D) y `useFields/useFieldsReducer.ts` (D): confirmar que ningún consumidor fuera de 014 los importa antes de borrar.
- `database/tasks/List.tsx` (D), `products/CreateItem.tsx` (D), `lots/components/LotDrawer.tsx` (D): borrados; verificar referencias en router/otros.
- `AIAssistant.tsx`, `Profile.tsx`: cambios menores que podrían pertenecer a 012/transversal; revisar el hunk.
