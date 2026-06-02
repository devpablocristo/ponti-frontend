# spec — feature-015 fe-dashboard-consolidation

- **id**: feature-015
- **slug**: fe-dashboard-consolidation
- **nombre**: FE dashboard consolidation
- **tipo**: refactor
- **repo**: Frontend monorepo `ponti/web` (ui/ React + api/ BFF NodeJS, yarn)
- **existe-en-FE**: SÍ (todo el cambio vive en `ui/`)
- **existe-en-BE**: NO. Feature 100% FE. En el mapa cross-repo del BE figura como "sin cambios BE".
- **merge**: FE independiente.
- **SOURCE de extracción**: `develop-problematico~1` (SHA `3ffcf60`). NUNCA usar `develop-problematico` (su tip es un restore/vacío).
- **rama destino**: `develop` (tip `8c25e88`).
- **rango fuente-de-verdad**: `fefbe695..3ffcf60`.

## Resumen
Unifica el dashboard de admin en una única página canónica. Antes existían DOS dashboards: el clásico
`Dashboard.tsx` (ruta `/admin/dashboard`) y un prototipo paralelo `DashboardV2.tsx` (ruta
`/admin/dashboard-v2`) con su propio set de componentes en `dashboard/dashboardV2/*`. La feature **elimina
la V2** y **mejora la versión canónica** absorbiendo lo bueno del prototipo: dark mode, layout responsive
(grid de KPIs + scroll horizontal en tablas), agregación de cultivos por `crop_id`, manejo de error/empty/loading
con los componentes del design system (006), y delega el force-logout al interceptor global de `api/client.ts`.

## Objetivo
- Tener un solo dashboard mantenible (eliminar duplicación V1/V2).
- Hacerlo usable en mobile (responsive) y consistente con el design system (dark mode + feedback components).
- Quitar de `useDashboard` y `Dashboard.tsx` la heurística frágil de detección de "invalid token" por string,
  centralizándola en el interceptor de API.

## Problema que resuelve
1. **Duplicación**: dos dashboards divergentes que había que mantener en paralelo.
2. **Mobile roto**: el `flex gap-4` de KPIs hace overflow horizontal con 5 cards; las tablas de 4 columnas
   se aplastan a <580px.
3. **Auth heurístico disperso**: detección de token inválido por substring del mensaje, duplicada en
   `useDashboard/index.ts` y en un `useEffect` de `Dashboard.tsx`.
4. **Sin dark mode** en las tablas y cards del dashboard.

## Alcance EN ESTE repo (ui/)
- Hook `useDashboard`: rename del reducer (`useDashboardReducer.ts` → `dashboardReducer.ts`), simplificación
  de `getDashboardInfo` (usa `formatError` de `lib/format`, deja de hacer el force-logout heurístico),
  `types.ts` pasa interfaces internas de `export` a privadas (solo `DashboardData`, `CropItem`,
  `OperationalItem`, `OperationalIndicators` siguen exportadas/usadas).
- Página `Dashboard.tsx`: migra a `AppFilterBar`, `InlineSpinner`, `Notification`, `EmptyState`,
  `useIsMobile`, `notify`; grid responsive de KPIs; gating por `hasActiveFilters` (= `hasWorkspaceSelection`);
  bloqueo de export PDF en mobile; quita acción "Generar Informe"; ya no carga datos globales automáticos.
- Tablas: `CostByCropTable.tsx` (agregación por `crop_id` vía `aggregateCrops`, totales recomputados en cliente,
  `ScrollableTable`, dark mode), `ManagementBalanceTable.tsx` (`ScrollableTable` + dark mode),
  `OperationalIndicators.tsx` (dark mode + normalización de fin de línea CRLF→LF).
- **Borrado de la V2**: `DashboardV2.tsx` y `dashboard/dashboardV2/{CostByCropCardV2,DashboardKpiRow,ManagementBalanceCardV2,OperationalIndicatorsV2,ProgressBar}.tsx`.

## Alcance EN EL OTRO repo (BE / core)
Ninguno. El dashboard consume un endpoint ya existente vía `apiClient` (`/dashboard?...` query de
customer/project/campaign/field). No hay cambios de endpoint, DTO ni migración en BE.

## Fuera de alcance
- El componente `AppFilterBar`, `ScrollableTable`, `InlineSpinner`, `Notification`, `EmptyState`,
  `useBreakpoint/useIsMobile`, `lib/notify`, `lib/format` → pertenecen a **006-fe-design-system** (y el
  interceptor `auth:force-logout` a 008/016). NO se extraen acá; son **dependencia previa**.
- El campo `hasWorkspaceSelection` de `useWorkspaceFilters.ts` (archivo NO está en este flist) →
  es API nueva consumida por esta feature pero owned por otra feature (workspace filters / 014/006).
- La eliminación de los reports V2 (`ByFieldOrCropReportV2`, `InvestorContributionReportV2`) que aparece en
  el mismo diff de `router.tsx` → NO es parte de esta feature (probablemente 014 master-data o reports).

## Comportamiento esperado (post-extracción)
- Existe solo `/admin/dashboard`. `/admin/dashboard-v2` deja de existir (404/redirect; no había link en sidebar).
- Sin filtros seleccionados → `EmptyState` "Seleccioná filtros para ver el dashboard"; NO se hace fetch global.
- Con filtros → fetch; loading = `InlineSpinner`; error = `Notification` inline con botón "Reintentar".
- KPIs en grid responsive (1/2/3/5 cols). Tablas con scroll horizontal en mobile.
- Export PDF deshabilitado sin filtros; en mobile muestra toast informativo en vez de generar PDF cortado.
- Sesión inválida → la maneja el interceptor global (no este código).

## Estado en dp~1 (`3ffcf60`)
Completo y coherente a nivel FE. El diff compila conceptualmente **siempre que** las dependencias del design
system (006) y el campo `hasWorkspaceSelection` ya estén presentes en la rama destino.

## Criterios de aceptación
- [ ] `DashboardV2.tsx` y `dashboardV2/*` no existen en el árbol.
- [ ] `router.tsx` no importa ni rutea `DashboardV2`; no hay path `dashboard-v2`.
- [ ] `ui/` compila (`yarn build` / `tsc`) sin referencias colgadas a `useDashboardReducer`, `FilterBar`
      (`@devpablocristo/modules-ui-filters`) en el dashboard, ni a las interfaces que dejaron de exportarse.
- [ ] Dashboard responsive + dark mode visibles.
- [ ] EmptyState al entrar sin filtros; sin fetch global.

## Endpoints / modelos / UI / DB / tests afectados
- **Endpoints**: ninguno nuevo. Consumo de dashboard vía `apiClient.get` con querystring de filtros (sin cambios).
- **Modelos/tipos**: `ui/src/hooks/useDashboard/types.ts` — interfaces pasan a privadas; superficie pública
  reducida a `DashboardData` + tipos usados por las tablas (`CropItem`, `OperationalItem`, `OperationalIndicators`).
- **UI/componentes**: `Dashboard`, `CostByCropTable`, `ManagementBalanceTable`, `OperationalIndicators`
  (modificados); `DashboardV2` + 5 componentes V2 (eliminados); hook `useDashboard` (refactor).
- **DB/migraciones**: ninguna.
- **Tests**: ninguno en el flist. No se detectaron tests unit/e2e específicos del dashboard en el rango.

## Dependencias
- **Intra-repo (FE)**: 006-fe-design-system (FUERTE). Componentes/utilidades nuevos consumidos:
  `components/feedback/{InlineSpinner,Notification,EmptyState}.tsx`, `components/filters/AppFilterBar.tsx`,
  `components/crud/ScrollableTable.tsx`, `hooks/useBreakpoint.ts` (`useIsMobile`), `lib/notify.ts`, `lib/format.ts`
  (`formatError`). Todos AUSENTES en base `fefbe695`. Además `useWorkspaceFilters.hasWorkspaceSelection`
  (campo nuevo) y el interceptor `auth:force-logout` (008/016).
- **Cross-repo**: NINGUNA. Es Solo-FE.

## Riesgos
- **Funcional**: cambio de comportamiento deliberado — el dashboard ya NO carga datos sin filtros (antes
  llamaba `getDashboardInfo("")`). Validar con producto que el EmptyState es el comportamiento deseado.
- **Técnico**: si 006 no está mergeado primero, el build rompe por imports inexistentes. `router.tsx` es
  archivo COMPARTIDO (partial-hunks): traer solo los hunks de dashboard, no los de reports V2.

## DECISIÓN recomendada
**Extraer tal cual, pero DESPUÉS de 006** (dependencia fuerte) y aplicando `router.tsx` por hunks parciales.
Si 006 aún no está en `develop`, **postergar** hasta que entre, o partir en sub-PR que primero traiga las
piezas de 006 que el dashboard necesita. No requiere coordinación con BE.
