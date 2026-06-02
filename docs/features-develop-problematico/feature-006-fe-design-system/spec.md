# spec.md — feature-006 fe-design-system

## Identidad

- **id**: feature-006
- **slug**: fe-design-system
- **nombre**: FE design system / shared UI foundation
- **tipo**: refactor (fundación / plataforma de UI)
- **repo**: Frontend monorepo `web` (`ui/` React + `api/` BFF NodeJS, yarn)
- **existe-en-FE**: SÍ — es una feature exclusivamente FE.
- **existe-en-BE**: NO — Solo-FE. En `core` (BE) no hay carpeta para esta feature; debe mencionarse en el cross-repo-map del BE como "sin cambios BE".

## Resumen

Consolida la base compartida de UI del frontend: primitivos visuales (feedback, button/drawer, input, modal, card, filters, layout, ArchivedListPage), helpers de librería (`lib/format`, `lib/theme`, `lib/lifecycle`, `lib/notify`, copy/i18n centralizado), hooks transversales (`useConfirmDialog`, `useBreakpoint`, `useEntityCrud`, `useBulkSelection`, `useArchiveActions`, etc.) y el shell de aplicación (`router.tsx`, `main.tsx`, `ProtectedLayout`, `Sidebar`). Es la **base de todo el resto del FE**: features 014/015/016/017/018 (BEFE) consumen estos primitivos.

## Objetivo

- Establecer un sistema de notificaciones único (`@/lib/notify` → Sonner + `<Notification>`), prohibiendo banners improvisados.
- Centralizar el copy/UX-writing en `ui/src/copy/*` (entidades, acciones, feedback, validaciones, mapping HTTP).
- Unificar el manejo de errores HTTP (`lib/format/formatError` + `translateBackendError` + `api/fetchErrorAdapter`) tanto para axios como para fetch (SSE de `aiClient`/`insightsClient`).
- Introducir dark mode (`lib/theme/ThemeProvider`, tokens en `index.css`, toggle en Sidebar).
- Proveer primitivos CRUD reusables (`components/crud/*`, `ArchivedListPage`, `EntityFormDrawer`, `DrawerShell`, `AppFilterBar`) y hooks (`useEntityCrud`, `useBulkSelection`, `useBulkActions`, `useArchiveActions`).
- Migrar `core-authn` → `platform-authn` en el storage de tokens (`lib/authStorage.ts`, renombrado desde `pages/login/context/useLocalStorage.ts`).

## Problema

El FE previo tenía feedback disperso (`toast()` sueltos, `<p className="text-red-600">` inline, mensajes crudos del backend expuestos al usuario), sin dark mode, con duplicación de tablas/drawers por entidad y sin un copy centralizado. Esta feature crea la fundación para que las páginas de master-data (014) y demás se construyan encima sin reinventar.

## Alcance en este repo (FE)

Todo el flist (133 paths, todos `ui/src/...`). Bloques:
- **feedback/**: `Notification`, `EmptyState`, `FieldError`, `InlineSpinner`, `LoadingOverlay`, `Skeleton/*`.
- **Button/**: `AppButton`, `DrawerButton`, `IconActionButton`, `ToolbarActionButton` (+ `Button.tsx` modificado).
- **Drawer/**: `DrawerShell`, `DrawerFormActions`, `SPEC.md`, tests.
- **Input/**: `Checkbox`, `InputField`, `Search`, `SelectField` (+ eliminación de `TextAreaField`).
- **Modal/**: `BaseModal` modificado, `copy.ts`.
- **Card/**: eliminación de `Card.tsx`, `IndicatorCard` modificado.
- **filters/**: `AppFilterBar` + `SPEC.md` + test.
- **layout/**: `Cluster`, `Container`, `FormSection`, `Grid`, `PageShell`, `Stack`, `index.ts`.
- **crud/**: `ArchivedDrawer`, `BulkActionBar`, `BulkSelectionPanel`, `ColumnConfigHeader`, `ConfirmModal`, `CreateSupplyInline`, `EntityFormDrawer`, `MobileDataCards`, `ResponsiveTable`, `ScrollableTable`, `SupplyItemsTable`, `makeSelectColumn`.
- **copy/**: `actions`, `entities`, `feedback`, `http`, `index`, `notifications`, `validation`, `README.md` + tests.
- **hooks/**: `useArchiveActions`, `useBreakpoint`, `useBulkActions`, `useBulkSelection`, `useConfirmDialog/*`, `useEntityCrud`, `useEntityFormDrawer`, `useInvestors`, `useManagers`, `useWorkspaceFilters` + test.
- **lib/**: `authStorage` (rename), `categoryTypes`, `dataDisplay`, `entityNameMatcher`, `format/*`, `fuzzySearch`, `importHelpers`, `leaseTypes`, `lifecycle/*`, `notify`, `properName`, `tableFilters`, `theme/*`, `translateBackendError`, `workspaceActionGuards`, `workspaceQuery` + tests.
- **api/**: `client.ts`, `types.ts`, `schemas.ts` (eliminado), `useApiCall.ts`, `aiClient`, `insightsClient`, `fetchErrorAdapter` + test.
- **shell MEZCLADO**: `router.tsx`, `main.tsx`, `ProtectedLayout.tsx`, `Sidebar/*`, `index.css`.

## Alcance en el otro repo (BE)

**Ninguno.** Solo-FE. En el cross-repo-map del BE: "feature-006: sin cambios BE".

## Fuera de alcance

- `api/src/index.ts`, `api/src/routes/index.ts`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`: **tienen cambios en el rango del diff pero NO están en el flist de esta feature** → pertenecen a features de build/deploy (021) y BFF. NO traer dentro de feature-006.
- Páginas de entidades concretas (master-data customers/fields/lots/etc.) → feature-014.
- `TenantProvider` / `TenantContext` (importado por `ProtectedLayout`) → feature-008.
- Interceptor `X-Tenant-Id` en `client.ts` → lógica de feature-008 (ver riesgos).
- Páginas de access/notifications → feature-016.
- Formularios dollar/commerce → feature-017.
- Limpieza de json-tags del dominio BE de reports → feature-027 (NO acá).

## Comportamiento esperado

- Todas las notificaciones pasan por `notify.*` (top-right, duración por severidad). Banners inline solo en excepciones documentadas (`ErrorBoundary`, `LoadingOverlay`, `CreateSupplyInline`, etc.).
- Errores HTTP nunca exponen `.message` crudo: `formatError` resuelve copy en español.
- Dark mode persistente en `localStorage["ponti:theme"]`, toggle en footer del Sidebar (Sun→Moon→Monitor).
- Drawers por encima de filtros/dropdowns (`z-tooltip`), según `Drawer/SPEC.md` y `filters/SPEC.md`.

## Estado en dp~1 (SHA 3ffcf60)

Completa y funcional como base. El `router.tsx` ya enruta a páginas Legacy y Current de master-data (014) → **la feature-006 sola no compila sin esas páginas presentes**. Ver implementation-status.md.

## Criterios de aceptación

1. `yarn build` (ui) compila sin errores de tipos.
2. `yarn test` pasa los tests del flist (notify, formatError, AppFilterBar, DrawerShell, ArchivedListPage, copy/*, lifecycle, properName, etc.).
3. `notify.*` renderiza toast top-right con la paleta correcta y dark mode.
4. Toggle de tema en Sidebar persiste y togglea `.dark` en `<html>`.
5. No quedan imports a `ui/src/lib/toast.ts`, `Form/FormButtons.tsx`, `Card/Card.tsx`, `Input/TextAreaField.tsx`, `hooks/useSupplyMovement` (todos eliminados).
6. `client.ts` importa `@devpablocristo/platform-authn/...` y `@/lib/authStorage`.

## Endpoints / modelos / UI / DB / tests afectados

- **Endpoints**: ninguno propio. `client.ts` agrega interceptor de envelope `{success,data}` y header `X-Tenant-Id` (este último es de 008).
- **Modelos/tipos**: `api/types.ts` (reducido), `schemas.ts` eliminado; tipos en `lib/categoryTypes`, `lib/leaseTypes`.
- **UI/componentes/hooks/stores**: ver alcance en este repo.
- **DB / migraciones**: ninguna (FE puro).
- **Tests**: 16 tests nuevos + `dockerComposeGuard.test.ts` modificado (este último relacionado a config 021, ver dudosos).

## Dependencias

- **Intra-repo**: ninguna feature FE la precede. Es la base.
- **Cross-repo**: ninguna estricta. `platform-authn` debe existir como paquete publicado (migración `core/*`→`platform/*` de new-cns3). El interceptor `X-Tenant-Id` empareja con BE multitenant (001/003/008) pero es no-bloqueante para que el FE compile.

## Riesgos

- **Funcional**: si se extrae sola sin feature-014, `router.tsx` referencia páginas inexistentes → no compila.
- **Técnico**: `router.tsx`/`main.tsx`/`ProtectedLayout` son MEZCLADOS (007/008/010/014/016/017). Extracción por hunks parciales obligatoria.
- **Datos**: ninguno (sin DB).

## DECISIÓN recomendada

**Partir en subfeatures de extracción y coordinar con 014/008.** El núcleo (feedback/button/drawer/input/modal/card/filters/layout/lib/copy/hooks genéricos) se extrae *whole-file* sin problema. Los archivos shell (`router.tsx`, `main.tsx`, `ProtectedLayout.tsx`, `Sidebar.tsx`, `client.ts`) van **partial-hunks** y deben mergearse coordinados con 008 (tenant) y 014 (páginas). Recomendación práctica: portar feature-006 **junto con 014** en un mismo PR de fundación FE, o garantizar que 014 entre en el mismo tren, porque `router.tsx` los acopla. No postergar; no extraer el shell tal cual sin las páginas.
