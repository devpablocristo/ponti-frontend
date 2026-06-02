# validation.md — feature-006 fe-design-system

## Checklist pre-PR

- [ ] Rama creada desde `develop`: `pr/feature-006-fe-design-system-fe`.
- [ ] Núcleo whole-file traído desde `develop-problematico~1` (feedback/Button/Drawer/Input/Modal/Card/filters/layout/crud/copy/lib/hooks/api-error).
- [ ] Eliminaciones aplicadas: `lib/toast.ts`, `Form/FormButtons.tsx`, `Card/Card.tsx`, `Input/TextAreaField.tsx`, `api/schemas.ts`, `hooks/useSupplyMovement/index.ts`, `layout/Footer/Footer.tsx`.
- [ ] Rename: `pages/login/context/useLocalStorage.ts` → `lib/authStorage.ts` (origen borrado).
- [ ] Hunks parciales revisados en `router.tsx`, `main.tsx`, `ProtectedLayout.tsx`, `Sidebar.tsx`, `client.ts`, `index.css`, `aiClient.ts`, `insightsClient.ts`, `useDollar/index.ts`, `importHelpers.ts`.
- [ ] NO traído: `api/src/*`, `ui/package.json`, lockfiles, `config/dockerComposeGuard.test.ts`.
- [ ] `git diff --check` sin errores de whitespace.

## Comandos de validación

```bash
# Build TS (ui)
yarn --cwd /home/pablocristo/Proyectos/pablo/ponti/web/ui build

# Tests del flist
yarn --cwd /home/pablocristo/Proyectos/pablo/ponti/web/ui test

# Lint (si existe lint-notify-leaks)
yarn --cwd /home/pablocristo/Proyectos/pablo/ponti/web/ui lint
```

### Tests sugeridos (FE) — los del flist
- `ui/src/lib/notify.test.ts`
- `ui/src/lib/format/formatError.test.ts`
- `ui/src/api/fetchErrorAdapter.test.ts`
- `ui/src/components/filters/AppFilterBar.test.tsx` (SDD: usa `z-dropdown` por defecto; respeta clase de capa; `actionsPlacement="below"`)
- `ui/src/components/Drawer/DrawerShell.test.tsx` (SDD: renderiza `drawer-root` con `z-tooltip`; sin `z-[N]` local)
- `ui/src/components/ArchivedListPage/ArchivedListPage.test.tsx`
- `ui/src/copy/entities.test.ts`, `ui/src/copy/http.test.ts`
- `ui/src/lib/lifecycle/filterActive.test.ts`, `ui/src/lib/properName.test.ts`, `ui/src/lib/entityNameMatcher.test.ts`
- `ui/src/lib/tableFilters.test.ts`, `ui/src/lib/workspaceActionGuards.test.ts`, `ui/src/lib/workspaceQuery.test.ts`, `ui/src/lib/dataDisplay.test.tsx`, `ui/src/hooks/useWorkspaceFilters.test.ts`

### Tests sugeridos (BE)
- **Ninguno** — Solo-FE.

## Checklist manual (QA en navegador)

- [ ] Notificaciones: disparar success/error/warning/info → toast top-right, paleta correcta, X de cierre, duración por severidad (success 3.5s, info 4s, warning 6s, error 8s).
- [ ] Banner inline (`<Notification>`) con CTA (ej. "Reintentar") se ve correcto en dark y light.
- [ ] Tema: toggle en footer del Sidebar (Sun→Moon→Monitor), persiste tras reload (`localStorage["ponti:theme"]`), respeta `system`.
- [ ] Drawer abierto queda por encima de filtros/dropdowns (z-index del SPEC).
- [ ] `AppFilterBar` con dos filas: fila superior por encima de inferior; acciones below cuando corresponde.
- [ ] Error HTTP del BE no muestra JSON crudo, sino copy en español.
- [ ] Export binario (CSV/PDF si existe) sigue funcionando (el interceptor de envelope NO debe envolver blobs).
- [ ] Login/logout funciona con `lib/authStorage` (platform-authn) y respeta `legacyKeys`.

## Casos borde

- Response 204 No Content → `client.ts` setea `{success:true}` (no rompe flujos de mutación).
- Response binaria (`responseType: blob/arraybuffer`) → NO se envuelve.
- Error de red (status 0) en `aiClient`/`insightsClient` (fetch/SSE) → `FetchApiError` con `userMessage` en español vía `HTTP_COPY`.
- `notify` con `duration: Infinity` (sticky) y con `prefix`.
- Tema `system` con cambio de `prefers-color-scheme` en vivo (listener de matchMedia).

## Qué revisar en UI / API / DB / env

- **UI**: dark mode, z-index, toasts, skeletons, layout primitivos.
- **API (cliente, no BFF)**: envelope `{success,data}`, header `X-Tenant-Id` (solo si 008 entró), `VITE_API_BASE_URL`.
- **DB**: nada.
- **env**: `VITE_API_BASE_URL` (default `/api/v1`); paquete `@devpablocristo/platform-authn` resoluble.

## Qué validar en el otro repo

- **Nada en BE** (sin cambios). Solo confirmar que el cross-repo-map del BE registre "feature-006 sin cambios BE".

## Señales de incompletitud / incompatibilidad

- `yarn build` falla con "Cannot find module './pages/admin/master-data/..."` → falta feature-014.
- `yarn build` falla con "TenantProvider/TenantContext not found" → falta feature-008 (o hunk no rechazado).
- `Cannot find module '@devpablocristo/platform-authn/...'` → paquete no publicado/instalado.
- grep encuentra imports a `lib/toast`, `FormButtons`, `Card/Card`, `TextAreaField`, `api/schemas`, `useSupplyMovement`, `pages/login/context/useLocalStorage`, `core-authn` → extracción incompleta.
- Tests de `tableFilters`/`useWorkspaceFilters` rojos o conflicto con #104 → revisar solape.
