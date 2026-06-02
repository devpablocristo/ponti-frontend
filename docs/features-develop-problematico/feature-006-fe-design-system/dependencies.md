# dependencies.md — feature-006 fe-design-system

## Resumen direccional

- **Depende de**: ninguna feature FE (es la base). Dependencias externas: paquete `@devpablocristo/platform-authn` publicado.
- **Bloquea a**: 014 (fe-master-data-pages), 015 (fe-dashboard-consolidation), 016 (fe-access-notifications), 017 (fe-dollar-commerce-forms), 018 (data-integrity-admin, parte FE), 026 (fe-test-infra). Todas consumen primitivos/copy/notify/theme de 006.

## Depende-de

### Fuertes
- **`@devpablocristo/platform-authn`** (paquete npm, migración new-cns3 core→platform). `lib/authStorage.ts` importa `@devpablocristo/platform-authn/browser/storage`; `api/client.ts` importa `@devpablocristo/platform-authn/http/axios`. Sin el paquete publicado, no resuelven y el build falla.

### Débiles
- **feature-008 (identity-tenant-context, BEFE)**: `ProtectedLayout.tsx` importa `TenantProvider`/`TenantContext`; `client.ts` agrega interceptor `X-Tenant-Id`. Estos hunks viven en archivos compartidos con 006 pero son de 008. Débil porque 006 puede mergearse rechazando esos hunks (camino documentado en extraction-plan).
- **feature-014 (fe-master-data-pages)**: `router.tsx` (post-3ffcf60) referencia `pages/admin/master-data/*`. 006 puro no compila sin esas páginas → acoplamiento de compilación. Débil/condicional: se resuelve con router recortado o trayendo 014 junto.

### Inciertas
- **table-select-filters #104 (DONE en develop)**: `lib/tableFilters.ts`, `hooks/useWorkspaceFilters.ts`, `lib/workspaceQuery.ts` solapan conceptualmente con los filtros de tabla ya porteados. Incierto si 006 los redefine/duplica o los extiende. Revisar diff contra lo presente en `develop`.
- **feature-004 (shared-text-propername, BE)**: `lib/properName.ts`, `lib/entityNameMatcher.ts` comparten dominio de nombres propios. En FE son helpers de display; incierto si dependen de un contrato del BE.

## Bloquea-a (consumidores de 006)

| Feature | Qué consume de 006 |
|---|---|
| 014 fe-master-data-pages | `crud/*`, `EntityFormDrawer`, `ArchivedListPage`, `AppFilterBar`, `useEntityCrud`, `useBulkSelection`, `useArchiveActions`, copy/entities, notify, theme |
| 015 fe-dashboard-consolidation | `layout/*`, `IndicatorCard`, `Skeleton`, notify, theme |
| 016 fe-access-notifications | `Notification`, notify, copy/notifications, theme; rutas de notifications en router/sidebar |
| 017 fe-dollar-commerce-forms | `InputField`, `SelectField`, `formatError`, notify; `useDollar` ya usa formatError |
| 018 data-integrity-admin (FE) | `crud/*`, `ConfirmModal`, notify, copy |
| 026 fe-test-infra | runner/setup para los tests introducidos en 006 |

## Intra-repo (archivos compartidos)

Archivos que sirven a varias features (MEZCLADOS — partial-hunks):
- `ui/src/router.tsx` — 006 (lazy/Suspense) + 007 + 008 + 010 + 014 + 016 + 017.
- `ui/src/main.tsx` — 006 (ThemeProvider/AppToaster/ConfirmDialogProvider/ErrorBoundary). Mayoritariamente 006.
- `ui/src/layout/ProtectedLayout.tsx` — 006 (Suspense/useBreakpoint/sidebarTitle) + 008 (TenantProvider).
- `ui/src/layout/Sidebar/Sidebar.tsx` — 006 (theme toggle, useIsMobile) + 014/016 (ítems de menú).
- `ui/src/api/client.ts` — 006 (platform-authn, authStorage, httpErrorCopy, envelope) + 008 (X-Tenant-Id).
- `ui/src/index.css` — 006 (tokens dark) + posibles estilos de páginas (014/015).
- `ui/src/api/aiClient.ts`, `ui/src/api/insightsClient.ts` — 006 (fetchErrorAdapter) + 012/015 (lógica AI/insights).
- `ui/src/hooks/useDollar/index.ts` — 006 (formatError) + 017 (dollar).
- `ui/src/lib/importHelpers.ts` — 006 (normalizeHeader) + import flows (014).

## Cross-repo

- **BE**: sin cambios. feature-006 es Solo-FE. Registrar "sin cambios BE" en el cross-repo-map del BE.
- El interceptor `X-Tenant-Id` empareja con el hardening multitenant del BE (001/003/008) pero no es bloqueante para que el FE compile/mergee.

## Tipos / config / APIs compartidos

- `api/types.ts` (reducido) y eliminación de `api/schemas.ts`: base de tipos para todas las features FE.
- `copy/*`: contrato de textos consumido por todas las páginas. Cambiar claves rompe consumidores.
- `lib/notify`, `lib/format`, `lib/theme`: contratos de runtime de toda la app.

## Migraciones / APIs

- DB: ninguna.
- APIs: ninguna propia; el envelope `{success,data}` en `client.ts` define la shape que todos los hooks legacy esperan (`response.success`/`response.data`). Cambiarlo rompe hooks de 014/015/017.

## Recomendación de orden

1. Publicar/verificar `@devpablocristo/platform-authn`.
2. (Opcional pero recomendado) feature-008 lista para incluir hunks de tenant.
3. Mergear **006 + 014 juntas** (o 006 con router recortado seguido inmediatamente por 014).
4. Luego 015/016/017/018, en cualquier orden, todas sobre 006.
5. 026 (test-infra) cuando se quiera CI estable de los tests de 006.
