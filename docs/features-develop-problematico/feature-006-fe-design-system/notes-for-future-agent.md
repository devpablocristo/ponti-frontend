# notes-for-future-agent.md — feature-006 fe-design-system

## Resumen corto

feature-006 es la **fundación de UI del frontend** (`web/ui`). Trae: sistema único de notificaciones (`@/lib/notify`), copy centralizado (`ui/src/copy/*`), pipeline de errores (`lib/format/formatError` + `translateBackendError` + `api/fetchErrorAdapter`), dark mode (`lib/theme`), primitivos CRUD (`components/crud/*`, `ArchivedListPage`, `EntityFormDrawer`, `DrawerShell`, `AppFilterBar`, `layout/*`) y hooks transversales. Migra auth a `@devpablocristo/platform-authn`. Es la base que consumen 014/015/016/017/018/026.

## Qué está en FE y en BE

- **FE**: TODO. 133 paths, todos `ui/src/...`.
- **BE**: NADA. Solo-FE. En el cross-repo-map del BE poner "feature-006 sin cambios BE".

## Archivos esenciales (el corazón de la feature)

- `ui/src/lib/notify.ts` + `ui/src/components/feedback/Notification.tsx` + `ui/src/copy/notifications.ts` — sistema de notificaciones.
- `ui/src/lib/format/formatError.ts` + `ui/src/lib/translateBackendError.ts` + `ui/src/api/fetchErrorAdapter.ts` — errores.
- `ui/src/lib/theme/ThemeProvider.tsx` (+ `ThemeContext.ts`, `useTheme.ts`, `index.ts`) — dark mode.
- `ui/src/copy/*` — UX-writing (contrato de textos).
- `ui/src/components/crud/*` + `ui/src/components/ArchivedListPage/ArchivedListPage.tsx` — primitivos CRUD.
- Docs vivientes: `ui/src/copy/README.md`, `ui/src/lib/notify.md`, `ui/src/components/Drawer/SPEC.md`, `ui/src/components/filters/SPEC.md` (leelos, son la fuente de las reglas).

## Archivos PELIGROSOS / MEZCLADOS (partial-hunks obligatorio)

- `ui/src/router.tsx` — el más mezclado: 006 (code-split `lazy()`, `Navigate workspace→dashboard`) + 007 actors + 008 tenant + 010 projects + 014 master-data + 016 notifications + 017 dollar/commerce. **006 sola no compila sin las páginas de 014.**
- `ui/src/api/client.ts` — 006 (platform-authn + authStorage + httpErrorCopy + envelope `{success,data}`) MEZCLADO con 008 (interceptor `X-Tenant-Id`). Separá los hunks.
- `ui/src/layout/ProtectedLayout.tsx` — 006 (Suspense/InlineSpinner/useBreakpoint/sidebarTitle) + 008 (`TenantProvider`).
- `ui/src/layout/Sidebar/Sidebar.tsx` — 006 (theme toggle, useIsMobile) + 014/016 (ítems de menú).
- `ui/src/index.css` — 699+/308- líneas; dark-tokens (006) posiblemente mezclados con estilos de páginas.
- `ui/src/main.tsx` — casi 100% de 006 (ThemeProvider, AppToaster, ConfirmDialogProvider, ErrorBoundary); aceptalo entero.

## Decisiones ya tomadas

- **Solo-FE**: confirmado, no hay carpeta BE.
- **DONE — NO extraer**: table-select-filters (#104), reports-dark-mode (#105), lot-metrics/total_tons (#117/#121/#124), tentative-prices (#121/#124), dependency-bumps (#124). Si tu archivo solapa con #104 (tableFilters/useWorkspaceFilters/workspaceQuery), no dupliques.
- **NO traer**: `api/src/*` (BFF), `ui/package.json`, `ui/yarn.lock`, `package-lock.json` (build/deps → 021), `config/dockerComposeGuard.test.ts` (021). Tienen cambios en el rango del diff pero NO están en el flist de 006.
- Rama destino = `develop` (8c25e88). SOURCE = `develop-problematico~1` (3ffcf60). **NUNCA** `develop-problematico` (tip vacío/restore).

## Dudas abiertas (necesitan ojo humano)

1. `lib/tableFilters.ts` / `hooks/useWorkspaceFilters.ts` / `lib/workspaceQuery.ts` vs lo ya porteado por #104 — ¿duplica o extiende? Hacé `git diff develop -- <path>`.
2. `lib/properName.ts` / `lib/entityNameMatcher.ts` — ¿dependen del contrato BE de feature-004? En FE parecen autocontenidos.
3. `crud/CreateSupplyInline.tsx`, `crud/SupplyItemsTable.tsx`, `hooks/useInvestors`, `hooks/useManagers` — ¿son base 006 o pertenecen a 014? Quedaron en componentes "genéricos" pero acoplados a entidades.
4. `index.css`: ¿todo el bloque es dark-tokens o arrastra estilos de páginas 014/015?

## Comandos para mirar primero

```bash
cat /tmp/flists/fe-006.txt
git -C /home/pablocristo/Proyectos/pablo/ponti/web diff fefbe695..3ffcf60 -- ui/src/router.tsx
git -C /home/pablocristo/Proyectos/pablo/ponti/web diff fefbe695..3ffcf60 -- ui/src/api/client.ts
git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:ui/src/lib/notify.md
git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:ui/src/copy/README.md
git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:ui/src/components/Drawer/SPEC.md
```

## Errores a evitar

- Traer `router.tsx` entero → arrastra rutas de 007/010/014/016/017 y no compila.
- Traer el hunk `X-Tenant-Id` de `client.ts` sin feature-008.
- Olvidar borrar `pages/login/context/useLocalStorage.ts` tras traer `lib/authStorage.ts` (quedan dos copias).
- Dejar imports a archivos eliminados (`toast.ts`, `FormButtons`, `Card.tsx`, `TextAreaField`, `schemas.ts`, `useSupplyMovement`).
- Sobrescribir `tableFilters`/`useWorkspaceFilters` pisando lo de #104 sin verificar.
- Usar `develop-problematico` (tip vacío). Siempre `develop-problematico~1` (3ffcf60).

## Camino más seguro

1. Verificar `@devpablocristo/platform-authn` publicado.
2. Traer núcleo whole-file (todo menos los 10 archivos shell).
3. Aplicar eliminaciones + rename.
4. `restore -p` los 10 shell, quedándose solo con hunks de 006.
5. Mergear **006 + 014 juntas** (y 008 si se quiere tenant) para que `router.tsx` compile.
6. `yarn build` + `yarn test` + QA de notify/theme/drawer.

## Qué PR del otro repo va antes/después

- **Ninguno en BE** (Solo-FE). El único orden relevante es intra-FE: 006 (con 014, y ojalá 008) primero; luego 015/016/017/018/026 encima.
