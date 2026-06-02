# implementation-status — feature-015 fe-dashboard-consolidation

- **estado**: COMPLETA a nivel FE en SOURCE (`3ffcf60`), condicionada a que existan las dependencias de 006.
- **% completitud**: ~95% (lo que falta no es código de esta feature, sino dependencias previas y el hunk de router).
- **estado en este repo (FE)**: implementado. Página única, V2 eliminada, tablas/hook refactorizados.
- **estado en el otro repo (BE)**: N/A — sin cambios BE.

## Detalle por área
- **useDashboard**: rename del reducer (1:1), `getDashboardInfo` simplificado, error vía `formatError`,
  force-logout heurístico removido. Coherente.
- **types.ts**: superficie pública reducida. Riesgo bajo si nadie externo importaba las interfaces internas.
- **Dashboard.tsx**: migración completa a design system + gating por `hasWorkspaceSelection`. Cambio de
  comportamiento intencional (sin fetch global).
- **CostByCropTable.tsx**: `aggregateCrops` (agrupa por `crop_id`, recomputa hectáreas/incidencia/costo en
  cliente) + totales recomputados + `ScrollableTable` + dark. Lógica nueva — el mayor candidato a bug funcional.
- **ManagementBalanceTable.tsx / OperationalIndicators.tsx**: dark mode + scroll; OperationalIndicators trae
  ruido de fin de línea (CRLF→LF) que infla el diff sin cambio real de lógica.
- **Eliminación V2**: 6 archivos borrados; ningún consumidor salvo `router.tsx`.

## Tests
- No hay tests unit ni e2e específicos del dashboard en el flist ni en el rango.
- Recomendado agregar al menos un render smoke (ver validation.md). No bloqueante para extraer.

## Pendientes

### BLOQUEANTE para mergear
- Dependencias de 006 presentes en `develop` (AppFilterBar, ScrollableTable, feedback/*, lib/format, lib/notify, useBreakpoint).
- `useWorkspaceFilters.hasWorkspaceSelection` presente en `develop`.
- Aplicar `router.tsx` por hunks (solo dashboard) — sin esto el build falla por import de `DashboardV2` borrado, o se aplican rutas de más.
- Borrar `useDashboardReducer.ts` viejo y carpeta `dashboardV2/` (que `git grep` quede limpio).

### Mejora futura
- Tests del dashboard (smoke + caso de `aggregateCrops`).
- Revisar si `crop_incidence.total` del backend sigue usándose en algún lado (la tabla ahora recomputa totales en cliente).

### Deuda aceptable
- Ruido de EOL en `OperationalIndicators.tsx` (no afecta runtime).

### Duda humana
- Confirmar con producto que el dashboard NO debe cargar datos sin filtros (EmptyState es el comportamiento querido).
- Confirmar que ninguna otra parte del código importa las interfaces despublicadas de `types.ts`.

## Bugs / observaciones
- Sin bugs evidentes. El cambio de mayor superficie funcional es `aggregateCrops`: si el backend ya devolvía
  cultivos agregados, la doble agregación podría alterar números — validar con un dataset real.
