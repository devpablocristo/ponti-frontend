# dependencies — feature-015 fe-dashboard-consolidation

## Depende de (intra-repo, FE)

### FUERTE — 006-fe-design-system (BLOQUEANTE)
El dashboard consolidado importa piezas creadas en 006. Todas AUSENTES en base `fefbe695`,
presentes en SOURCE `3ffcf60`. Si 006 no está en `develop`, este PR no compila.

| dependencia | path | usado en |
|---|---|---|
| `AppFilterBar` | `ui/src/components/filters/AppFilterBar.tsx` | `Dashboard.tsx` (reemplaza `FilterBar` de `@devpablocristo/modules-ui-filters`) |
| `InlineSpinner` | `ui/src/components/feedback/InlineSpinner.tsx` | `Dashboard.tsx` (loading) |
| `Notification` | `ui/src/components/feedback/Notification.tsx` | `Dashboard.tsx` (banner error + Reintentar) |
| `EmptyState` | `ui/src/components/feedback/EmptyState.tsx` | `Dashboard.tsx` (sin filtros) |
| `ScrollableTable` | `ui/src/components/crud/ScrollableTable.tsx` | `CostByCropTable.tsx`, `ManagementBalanceTable.tsx` |
| `useIsMobile` | `ui/src/hooks/useBreakpoint.ts` | `Dashboard.tsx` (bloqueo PDF en mobile) |
| `notify` | `ui/src/lib/notify.ts` | `Dashboard.tsx` (toast PDF) |
| `formatError` | `ui/src/lib/format.ts` | `useDashboard/index.ts` (mensaje de error) |

### FUERTE — `useWorkspaceFilters.hasWorkspaceSelection` (campo nuevo)
`ui/src/hooks/useWorkspaceFilters.ts` NO está en este flist (lo migra otra feature: workspace/master-data/006).
`Dashboard.tsx` usa `hasWorkspaceSelection` para gatear el fetch y reemplaza el viejo `workspaceReady` en esa
lógica. Confirmar que el campo existe en `develop` antes de extraer: `git grep hasWorkspaceSelection -- ui/src/hooks/useWorkspaceFilters.ts`.

### DÉBIL — interceptor global `auth:force-logout`
`useDashboard/index.ts` y `Dashboard.tsx` BORRAN su detección heurística de token inválido y la delegan al
interceptor de `api/client.ts` + listener en AuthProvider (008-identity-tenant-context / 016-fe-access-notifications).
Si el interceptor NO está, la sesión inválida deja de auto-desloguear (degradación funcional, no rompe build).

### Estable (ya en base, sin riesgo)
- `formatNumberAr` → `ui/src/pages/admin/utils.ts` (existe en `fefbe695`).
- `cropColors` → `ui/src/pages/admin/colors.ts` (existe en `fefbe695`).
- `IndicatorCard`, `Button` → existen en base.
- `apiClient` → `ui/src/api/client.ts` (existe).

## Bloquea a
- Ninguna feature listada bloquea hacia abajo de forma estricta. La eliminación del route `dashboard-v2`
  podría afectar a quien tenga ese path hardcodeado (no se detectó link en sidebar; bajo impacto).

## Compartidos (archivos que sirven a varias intenciones)
- `ui/src/router.tsx` — COMPARTIDO. Esta feature quita `DashboardV2` + route `dashboard-v2`; el MISMO diff
  también elimina rutas de reports V2 (otra feature). Extraer por **partial-hunks** (`git restore -p`).

## Cross-repo
- NINGUNA. Feature Solo-FE. En BE figura como "sin cambios BE". No hay endpoints/DTO/migraciones nuevos.

## Recomendación de orden
1. **006-fe-design-system** (FE) — DEBE estar en `develop` primero (dependencia fuerte de build).
2. (Recomendado) **008/016** para que el force-logout centralizado funcione antes de quitar el heurístico local.
3. La feature que migra `useWorkspaceFilters` (`hasWorkspaceSelection`) — antes o junto.
4. **015** (esta) — después de lo anterior. Independiente de BE; puede mergearse sin tocar el otro repo.
