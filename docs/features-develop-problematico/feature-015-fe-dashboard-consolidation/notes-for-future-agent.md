# notes-for-future-agent — feature-015 fe-dashboard-consolidation

## Resumen corto
Refactor Solo-FE. Unifica el dashboard de admin: elimina el prototipo `DashboardV2` + sus componentes
`dashboard/dashboardV2/*` + la ruta `/admin/dashboard-v2`, y mejora la página canónica `Dashboard.tsx`
con dark mode, responsive, manejo de loading/empty/error del design system, agregación de cultivos por
`crop_id`, y delega el force-logout al interceptor global. SOURCE = `develop-problematico~1` (`3ffcf60`).

## Qué está en FE y qué en BE
- **FE**: todo. 7 archivos propios modificados/renombrados + 6 eliminados + 1 hunk parcial en `router.tsx`.
- **BE**: NADA. En el cross-repo del BE va como "sin cambios BE". No hay endpoint/DTO/migración nuevos.

## Archivos esenciales
- `ui/src/pages/admin/dashboard/Dashboard.tsx` — página consolidada (corazón).
- `ui/src/pages/admin/dashboard/CostByCropTable.tsx` — trae `aggregateCrops` (lógica nueva real).
- `ui/src/hooks/useDashboard/index.ts` + `types.ts` + `dashboardReducer.ts` (renombrado).

## Archivos peligrosos / mezclados
- `ui/src/router.tsx` — COMPARTIDO. No está en el flist pero hay que tocarlo. Su diff borra el route
  `dashboard-v2` (de ESTA feature) Y rutas de reports V2 (`ByFieldOrCropReportV2`,
  `InvestorContributionReportV2`, de OTRA feature). Aplicar SOLO los hunks del dashboard con `git restore -p`.
- `OperationalIndicators.tsx` — el diff parece enorme pero es casi todo CRLF→LF; el cambio real es dark mode.

## Decisiones ya tomadas (visibles en los comentarios del código)
- Force-logout por sesión inválida centralizado en `api/client.ts` (interceptor) + listener `auth:force-logout`
  en AuthProvider. Se ELIMINÓ la heurística por string de `useDashboard` y de `Dashboard.tsx`.
- El dashboard NO carga datos globales sin filtros → `EmptyState`.
- Export PDF bloqueado en mobile (layout fijo 1280px) con toast informativo.
- Agregación de cultivos por `crop_id` y totales recomputados en cliente.

## Dudas abiertas
- ¿Producto quiere el comportamiento "sin filtros = sin datos"? (antes cargaba global vacío).
- ¿El backend ya agrega cultivos? Si sí, `aggregateCrops` podría doble-contar — validar con payload real.
- ¿Alguien importa las interfaces de `types.ts` que dejaron de exportarse? (no detectado en el rango; verificar en `develop`).

## Qué comandos mirar primero
```
cd /home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-015.txt
git diff fefbe695..3ffcf60 -- ui/src/pages/admin/dashboard/Dashboard.tsx
git diff fefbe695..3ffcf60 -- ui/src/router.tsx | grep -nE "DashboardV2|dashboard-v2"
git grep -n "hasWorkspaceSelection" develop -- ui/src/hooks/useWorkspaceFilters.ts
```

## Errores a evitar
- Abrir el PR antes de que 006-fe-design-system esté en `develop` → build roto.
- Aplicar de más en `router.tsx` (borrar rutas de reports V2 que aún no migraron).
- Olvidar borrar `useDashboardReducer.ts` o la carpeta `dashboardV2/` → dead code / refs colgadas.
- Usar `develop-problematico` como SOURCE (su tip está vacío). Usar SIEMPRE `develop-problematico~1` / `3ffcf60`.

## Camino más seguro
1. Confirmar deps de 006 + `hasWorkspaceSelection` en `develop`.
2. Rama desde `develop`; traer enteros + borrar V2; `git restore -p` en `router.tsx` (solo dashboard).
3. `git grep` de limpieza + `yarn build` + revisión manual (EmptyState, responsive, dark).
4. PR contra `develop`. Sin coordinación con BE.

## PR del otro repo que debe ir antes/después
- Ninguno. Feature Solo-FE. La única dependencia es intra-repo (006, y deseable 008/016 para el force-logout).
