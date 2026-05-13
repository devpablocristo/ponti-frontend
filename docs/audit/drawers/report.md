# Drawer Audit Report

## Resultado

Se normalizaron los drawers laterales sobre un único contrato visual y estructural:

- `DrawerShell` es el entrypoint único para paneles laterales.
- `EntityFormDrawer` y `ArchivedDrawer` quedaron como wrappers finos sobre `DrawerShell`.
- No quedan imports ni renders directos del drawer legacy ni de `DrawerLayout` en `ui/src`.
- Los drawers usan el mismo ancho, overlay, header, close button, body scrolleable y footer.
- Los botones equivalentes pasan por `AppButton`, `ToolbarActionButton`, `DrawerButton` o `IconActionButton`.

## Componentes Creados / Consolidados

- `ui/src/components/Button/AppButton.tsx`
- `ui/src/components/Button/ToolbarActionButton.tsx`
- `ui/src/components/Button/DrawerButton.tsx`
- `ui/src/components/Button/IconActionButton.tsx`
- `ui/src/components/Drawer/DrawerShell.tsx`
- `ui/src/components/Drawer/DrawerFormActions.tsx`

Componentes consolidados:

- `ui/src/components/Button/Button.tsx`
- `ui/src/components/Drawer/Drawer.tsx`
- `ui/src/components/crud/EntityFormDrawer.tsx`
- `ui/src/components/crud/ArchivedDrawer.tsx`
- `ui/src/components/crud/BulkActionBar.tsx`
- `ui/src/components/filters/AppFilterBar.tsx`
- `ui/src/components/Modal/BaseModal.tsx`

## Drawers Migrados / Verificados

Playwright verificó apertura/cierre y screenshot final de estos 21 escenarios:

- `lots-edit`
- `lots-archived`
- `products-new`
- `products-archived`
- `tasks-new`
- `tasks-archived`
- `workorders-new`
- `workorders-archived`
- `stock-new`
- `customers-new`
- `customers-archived`
- `database-items-new`
- `database-tasks-new`
- `actors-new`
- `actors-archived`
- `investors-new`
- `investors-archived`
- `managers-new`
- `managers-archived`
- `campaigns-new`
- `campaigns-archived`

## Evidencia Visual

- Inventario: `docs/audit/drawers/inventory.md`
- Estándar: `docs/audit/drawers/drawer-standard.md`
- Before: `docs/audit/drawers/before/`
- After: `docs/audit/drawers/after/`

La corrida `before` dejó 28 archivos: screenshots exitosos y artefactos de fallas para escenarios que antes no abrían por filtros/selector.  
La corrida `after` dejó 21 screenshots finales y 0 artefactos de falla.

## Archivos Principales Tocados

- `ui/src/index.css`
- `ui/src/components/Button/*`
- `ui/src/components/Drawer/*`
- `ui/src/components/crud/*`
- `ui/src/components/filters/AppFilterBar.tsx`
- `ui/src/components/Modal/BaseModal.tsx`
- `ui/src/pages/admin/products/CreateItem.tsx`
- `ui/src/pages/admin/products/ImportSupplyMovements.tsx`
- `ui/src/pages/admin/stock/CreateStockItem.tsx`
- `ui/src/pages/admin/workorders/CreateOrder.tsx`
- `ui/src/pages/admin/workorders/UpdateOrder.tsx`
- `ui/src/pages/admin/database/customers/CustomerEditor.tsx`
- `ui/src/pages/admin/database/actors/ActorFormDrawer.tsx`
- `ui/e2e/drawer-audit.spec.ts`
- `ui/e2e/helpers/auth.ts`

## Verificaciones Ejecutadas

- `yarn typecheck`: OK
- `yarn lint`: OK
- `yarn test`: OK, 51 tests
- `yarn build`: OK
- `DRAWER_AUDIT_PHASE=after yarn test:e2e e2e/drawer-audit.spec.ts --project=chromium`: OK, 21/21
- `yarn test:e2e`: 24/26; fallan 2 tests existentes no vinculados a drawers:
  - `e2e/lots.spec.ts`: espera `u$ 433` en `LOTE 54`, valor no visible en los datos actuales.
  - `e2e/workorders-stock.spec.ts`: espera `Cantidad Total de Órdenes`, pero la vista con ese filtro no renderiza ese texto.

## Decisiones

- Los modales centrados se mantuvieron como modales, pero sus acciones pasan por `AppButton` / `IconActionButton`.
- Los filtros se mantienen fuera de drawers; el contexto llega desde la pantalla invocadora.
- El z-index del drawer queda por encima de filtros, dropdowns y contenido de página.
- Los drawers anidados usan el mismo `DrawerShell`, por orden de render quedan por encima del drawer padre.

## Riesgos Pendientes

- Los formularios complejos conservan grillas y layouts internos específicos del dominio; se normalizó el shell, header, footer, acciones y botones equivalentes sin reescribir lógica de negocio.
- El e2e completo depende de datos reales actuales; dos assertions de datos/label quedan para ajustar fuera de esta normalización visual.
