# validation — feature-015 fe-dashboard-consolidation

## Checklist pre-PR (higiene de extracción)
```
cd /home/pablocristo/Proyectos/pablo/ponti/web

# 1) no quedan referencias a la V2 ni al reducer viejo
git grep -n "DashboardV2\|dashboard-v2\|dashboardV2/" -- ui/src      # => 0 resultados
git grep -n "useDashboardReducer" -- ui/src                          # => 0 resultados

# 2) el dashboard ya no usa el FilterBar externo
git grep -n "@devpablocristo/modules-ui-filters" -- ui/src/pages/admin/dashboard   # => 0 resultados

# 3) dependencias de 006 presentes
for f in components/feedback/InlineSpinner.tsx components/feedback/Notification.tsx \
  components/feedback/EmptyState.tsx components/filters/AppFilterBar.tsx \
  components/crud/ScrollableTable.tsx hooks/useBreakpoint.ts lib/notify.ts lib/format.ts; do
  test -f ui/src/$f && echo "OK $f" || echo "FALTA $f"; done
git grep -n "hasWorkspaceSelection" -- ui/src/hooks/useWorkspaceFilters.ts

# 4) router limpio (solo se quitó lo del dashboard)
git diff -- ui/src/router.tsx     # revisar: NO debe haber quitado rutas de reports V2

# 5) whitespace
git diff --check
```

## Tests sugeridos (FE)
- `yarn --cwd ui build` (o `yarn --cwd ui tsc --noEmit`) — debe pasar sin "Cannot find module".
- `yarn --cwd ui lint`.
- `yarn --cwd ui test` si hay suite; agregar (mejora futura) un render smoke de `Dashboard` y un test unit de
  `aggregateCrops` con dos ítems del mismo `crop_id` para verificar la suma de hectáreas y el costo ponderado.
- e2e (si aplica): navegar a `/admin/dashboard`, verificar EmptyState sin filtros, y que `/admin/dashboard-v2`
  ya no resuelve.

## Manual (UI)
- Entrar a `/admin/dashboard` sin seleccionar filtros → ver `EmptyState` "Seleccioná filtros para ver el dashboard"; NO debe haber spinner ni request al endpoint de dashboard.
- Seleccionar cliente/proyecto/campaña → ver spinner (`InlineSpinner`) y luego datos.
- Forzar error de red → ver `Notification` con botón "Reintentar"; el click reintenta.
- KPIs: en viewport angosto, las 5 cards se acomodan en grid (no overflow horizontal).
- Tablas (`CostByCropTable`, `ManagementBalanceTable`): en mobile aparece scroll horizontal, no se aplastan.
- Dark mode activado: fondos `slate`, textos legibles en cards/tablas/empty.
- Export PDF: deshabilitado sin filtros; en mobile muestra toast informativo en vez de generar PDF.

## Casos borde
- `metrics.investor_contributions.items` vacío → "0%" / "Sin aportes cargados" (antes "N/A").
- `crop_incidence.items` con múltiples filas del mismo `crop_id` → deben agregarse en una sola fila.
- `crop_incidence.total.hectares` = 0 → no debe dividir por cero (la tabla usa `totalHectares || 1`).

## Qué revisar en API / DB / env
- **API**: ninguna ruta nueva; el dashboard sigue consumiendo el mismo endpoint con querystring de filtros.
- **DB**: nada.
- **env**: nada nuevo.

## Qué validar en el otro repo
- Nada. Solo-FE; el BE no cambia para esta feature.

## Señales de incompletitud / incompatibilidad
- Build falla por módulos de 006 no encontrados → 006 no está en `develop` (frenar).
- Build falla por `hasWorkspaceSelection` → falta migrar `useWorkspaceFilters`.
- Build falla por `DashboardV2` → no se aplicó el hunk de `router.tsx`.
- Números del dashboard distintos a los esperados → revisar `aggregateCrops` vs lo que ya agrega el backend.
