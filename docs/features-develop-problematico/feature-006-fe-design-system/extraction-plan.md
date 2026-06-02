# extraction-plan.md — feature-006 fe-design-system

## Contexto

- **repo**: `web` (`/home/pablocristo/Proyectos/pablo/ponti/web`)
- **rama base**: `develop` (tip `8c25e88`)
- **SOURCE de extracción**: `develop-problematico~1` (SHA `3ffcf60`). NUNCA usar `develop-problematico` (su tip es un restore/vacío).
- **rango fuente-de-verdad (diff)**: `fefbe695..3ffcf60`
- **rama sugerida**: `pr/feature-006-fe-design-system-fe`
- **merge**: FE independiente (no requiere coordinar BE — Solo-FE).

## PR title

`feat(fe): design system / shared UI foundation (notify, theme, crud primitives, copy)`

## PR description (sugerida)

> Consolida la fundación de UI del frontend: sistema único de notificaciones (`@/lib/notify` sobre Sonner + `<Notification>`), copy/UX-writing centralizado (`ui/src/copy/*`), pipeline unificado de errores HTTP (`lib/format/formatError` + `translateBackendError` + `api/fetchErrorAdapter` para fetch/SSE), dark mode (`lib/theme/ThemeProvider`, tokens en `index.css`, toggle en Sidebar), primitivos CRUD reusables (`components/crud/*`, `ArchivedListPage`, `EntityFormDrawer`, `DrawerShell`, `AppFilterBar`, `layout/*`) y hooks transversales (`useConfirmDialog`, `useBreakpoint`, `useEntityCrud`, `useBulkSelection`, `useArchiveActions`). Migra el storage de tokens a `@devpablocristo/platform-authn`.
>
> Solo-FE: sin cambios en BE.
>
> NOTA: `router.tsx`/`main.tsx`/`ProtectedLayout.tsx`/`Sidebar.tsx`/`client.ts` son archivos compartidos; este PR trae solo los hunks de la fundación. Las páginas de master-data referenciadas por el router llegan en feature-014.

## Decisión de acoplamiento (LEER ANTES)

`router.tsx` (post-3ffcf60) referencia páginas `pages/admin/master-data/*` (feature-014), `actors/*` (007), `projects` (010), `notifications` (016), dollar/commerce (017). Por lo tanto **feature-006 sola NO compila**. Dos caminos:

- **A (recomendado)**: portar 006 + 014 en el mismo tren (PR de fundación FE), con 008 (TenantProvider) entrando antes o junto. Más simple y deja `develop` siempre verde.
- **B**: portar 006 con un `router.tsx` recortado (solo rutas que existían pre-014) y agregar las rutas master-data en el PR de 014. Requiere edición manual del router → más trabajo, mayor riesgo de divergencia.

Este plan asume **A**: traer el núcleo whole-file, y el shell por hunks, coordinando con 014/008 en el mismo merge train.

## Pasos ordenados

1. **Preparar rama** (SUGERIDO, lo ejecuta un humano):
   ```bash
   git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop
   git -C /home/pablocristo/Proyectos/pablo/ponti/web pull
   git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout -b pr/feature-006-fe-design-system-fe
   ```

2. **Traer núcleo whole-file** (archivos creados / propios). Estos no tienen mezcla:
   ```bash
   git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop-problematico~1 -- \
     ui/src/components/feedback \
     ui/src/components/Button/AppButton.tsx ui/src/components/Button/DrawerButton.tsx \
     ui/src/components/Button/IconActionButton.tsx ui/src/components/Button/ToolbarActionButton.tsx \
     ui/src/components/Button/Button.tsx \
     ui/src/components/Drawer/DrawerShell.tsx ui/src/components/Drawer/DrawerFormActions.tsx \
     ui/src/components/Drawer/Drawer.tsx ui/src/components/Drawer/SPEC.md ui/src/components/Drawer/DrawerShell.test.tsx \
     ui/src/components/Input/Checkbox.tsx ui/src/components/Input/InputField.tsx \
     ui/src/components/Input/Search.tsx ui/src/components/Input/SelectField.tsx \
     ui/src/components/Modal/BaseModal.tsx ui/src/components/Modal/copy.ts \
     ui/src/components/Card/IndicatorCard.tsx \
     ui/src/components/filters \
     ui/src/components/layout \
     ui/src/components/crud \
     ui/src/components/AppToaster.tsx \
     ui/src/components/ArchivedListPage \
     ui/src/copy \
     ui/src/lib/notify.ts ui/src/lib/notify.md ui/src/lib/notify.test.ts \
     ui/src/lib/translateBackendError.ts \
     ui/src/lib/format \
     ui/src/lib/theme \
     ui/src/lib/lifecycle \
     ui/src/lib/categoryTypes.ts ui/src/lib/leaseTypes.ts ui/src/lib/fuzzySearch.ts \
     ui/src/lib/dataDisplay.ts ui/src/lib/dataDisplay.test.tsx \
     ui/src/lib/properName.ts ui/src/lib/properName.test.ts \
     ui/src/lib/entityNameMatcher.ts ui/src/lib/entityNameMatcher.test.ts \
     ui/src/lib/workspaceQuery.ts ui/src/lib/workspaceQuery.test.ts \
     ui/src/lib/workspaceActionGuards.ts ui/src/lib/workspaceActionGuards.test.ts \
     ui/src/hooks/useConfirmDialog ui/src/hooks/useBreakpoint.ts \
     ui/src/hooks/useEntityCrud ui/src/hooks/useEntityFormDrawer \
     ui/src/hooks/useBulkActions ui/src/hooks/useBulkSelection ui/src/hooks/useArchiveActions \
     ui/src/api/fetchErrorAdapter.ts ui/src/api/fetchErrorAdapter.test.ts \
     ui/src/api/types.ts ui/src/api/hooks/useApiCall.ts
   ```

3. **Rename de authStorage** (R en flist): el SOURCE ya tiene el archivo en la ruta nueva. Traer el destino y borrar el origen:
   ```bash
   git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop-problematico~1 -- ui/src/lib/authStorage.ts
   git -C /home/pablocristo/Proyectos/pablo/ponti/web rm ui/src/pages/login/context/useLocalStorage.ts   # SUGERIDO
   ```
   (Verificar que ningún consumidor siga importando `pages/login/context/useLocalStorage`.)

4. **Eliminaciones**: aplicar los D del flist (todos reemplazados por nuevos primitivos):
   ```bash
   git -C /home/pablocristo/Proyectos/pablo/ponti/web rm \
     ui/src/lib/toast.ts ui/src/components/Form/FormButtons.tsx \
     ui/src/components/Card/Card.tsx ui/src/components/Input/TextAreaField.tsx \
     ui/src/api/schemas.ts ui/src/hooks/useSupplyMovement/index.ts \
     ui/src/layout/Footer/Footer.tsx   # SUGERIDO — revisar 0 referencias antes
   ```

5. **Archivos COMPARTIDOS → partial-hunks** (revisar hunk por hunk, quedarse SOLO con lo de 006):
   ```bash
   git -C /home/pablocristo/Proyectos/pablo/ponti/web restore -p --source=develop-problematico~1 -- \
     ui/src/main.tsx ui/src/router.tsx ui/src/layout/ProtectedLayout.tsx \
     ui/src/layout/Sidebar/Sidebar.tsx ui/src/api/client.ts \
     ui/src/index.css ui/src/api/aiClient.ts ui/src/api/insightsClient.ts \
     ui/src/hooks/useDollar/index.ts ui/src/lib/importHelpers.ts
   ```
   - `main.tsx`: aceptar TODO (ThemeProvider, AppToaster, ConfirmDialogProvider, ErrorBoundary) — es 100% de 006.
   - `client.ts`: aceptar platform-authn + authStorage + httpErrorCopy + envelope `{success,data}`; **rechazar** el hunk del interceptor `X-Tenant-Id` (es feature-008) salvo que 008 entre junto.
   - `ProtectedLayout.tsx`: aceptar InlineSpinner/Suspense + useBreakpoint + sidebarTitle; **rechazar** `TenantProvider` salvo que 008 entre junto.
   - `Sidebar.tsx`: aceptar toggle de tema (useTheme, Sun/Moon/Monitor) + useIsMobile; los nuevos ítems de menú master-data deben coordinarse con 014.
   - `router.tsx`: aceptar `lazy`/Suspense de pantallas pesadas; las rutas master-data van con 014 (ver decisión A/B).
   - `index.css`: aceptar el bloque `.dark { ... }` y los tokens `--color-*`; revisar que no arrastre estilos de páginas de 014/015.

6. **sidebarTitle.ts**: traer whole-file pero revisar que las claves de título no asuman rutas que aún no existen (si va sin 014, recortar).

7. **Tests / config a NO traer en este PR**: `ui/src/config/dockerComposeGuard.test.ts` (es feature-021).

8. **Validar compilación**:
   ```bash
   git -C /home/pablocristo/Proyectos/pablo/ponti/web diff --check
   yarn --cwd /home/pablocristo/Proyectos/pablo/ponti/web/ui build
   yarn --cwd /home/pablocristo/Proyectos/pablo/ponti/web/ui test
   ```

## Archivos enteros vs parciales

- **Enteros**: todo el bloque feedback/Button/Drawer(salvo nada)/Input/Modal/Card(Indicator)/filters/layout/crud/copy/lib(format,theme,lifecycle,notify,translateBackendError, helpers)/hooks(genéricos)/api(fetchErrorAdapter,types,useApiCall) + eliminaciones + rename.
- **Parciales (restore -p)**: `router.tsx`, `main.tsx`, `ProtectedLayout.tsx`, `Sidebar.tsx`, `client.ts`, `index.css`, `aiClient.ts`, `insightsClient.ts`, `useDollar/index.ts`, `importHelpers.ts`.

## Migraciones / tests a incluir

- Migraciones DB: **ninguna** (FE puro).
- Tests: los 16 nuevos del flist (notify, formatError, AppFilterBar, DrawerShell, ArchivedListPage, copy/entities, copy/http, lifecycle/filterActive, properName, entityNameMatcher, tableFilters, workspaceActionGuards, workspaceQuery, dataDisplay, useWorkspaceFilters, fetchErrorAdapter). NO incluir `dockerComposeGuard.test.ts`.

## Dependencias previas

- Paquete npm `@devpablocristo/platform-authn` publicado (migración new-cns3 core→platform). Sin él, `authStorage.ts` y `client.ts` no resuelven imports.
- feature-008 (identity-tenant-context) si se quiere mergear `client.ts`/`ProtectedLayout.tsx` con tenant. Si 008 no está, rechazar esos hunks.
- feature-014 (master-data pages) si se sigue el camino A para que `router.tsx` compile.

## Coordinación con el otro repo

**Ninguna.** Solo-FE. No hay orden BE-first/FE-first. En el cross-repo-map del BE registrar "feature-006: sin cambios BE".

## Qué NO traer

- `api/src/index.ts`, `api/src/routes/index.ts` (BFF — no están en flist, son de otra feature).
- `ui/package.json`, `ui/yarn.lock`, `package-lock.json` (deps/build — feature-021).
- `ui/src/config/dockerComposeGuard.test.ts` (config — feature-021).
- Páginas `pages/admin/master-data/*` (feature-014).
- Hunks de `X-Tenant-Id` / `TenantProvider` (feature-008) si 008 no entra junto.

## Qué podría romperse

- `router.tsx` no compila por imports a páginas master-data inexistentes (si no entra 014).
- `client.ts`/`ProtectedLayout.tsx` no compilan por `TenantProvider`/`TenantContext` inexistente (si no entra 008).
- `tableFilters.ts`/`useWorkspaceFilters.ts` pueden chocar/duplicar lo de #104 (table-select-filters, DONE en develop).
- Imports residuales a archivos eliminados (`toast.ts`, `FormButtons`, `Card`, `TextAreaField`, `schemas`, `useSupplyMovement`).

## Cómo detectar extracción incompleta

- `grep -rn 'from "@/lib/toast"' ui/src` → debe dar 0.
- `grep -rn 'useSupplyMovement\|FormButtons\|api/schemas\|Card/Card' ui/src` → 0.
- `grep -rn 'core-authn' ui/src` → 0 (debe ser todo `platform-authn`).
- `grep -rn 'pages/login/context/useLocalStorage' ui/src` → 0 (movido a `lib/authStorage`).
- `yarn --cwd ui build` sin errores TS.

## Qué validar antes del PR

- `yarn build` y `yarn test` verdes.
- Toggle de tema funciona y persiste (`localStorage["ponti:theme"]`).
- `notify.success/error/...` muestra toast top-right con dark-mode.
- Drawer por encima de filtros (z-index).
- `git diff --check` sin whitespace errors.

## Qué hacer después de mergear

- Mergear feature-014 (master-data) inmediatamente si se siguió camino A o B con router recortado.
- Comunicar a los demás FE-devs: prohibido `toast()` suelto, usar `notify.*`; copy nuevo en `ui/src/copy`.
- Si `scripts/lint-notify-leaks.sh` existe (mencionado en notify.md), cablearlo a `yarn lint` (puede venir en feature-021/026).
