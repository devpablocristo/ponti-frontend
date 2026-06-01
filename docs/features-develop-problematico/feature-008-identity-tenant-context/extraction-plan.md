# extraction-plan.md — feature-008 · Identity & tenant context

- **repo**: `web` (ui/ + api/ BFF) — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **rama base**: `develop` (tip `8c25e88`)
- **SOURCE**: `develop-problematico~1` (SHA `3ffcf60`). NUNCA `develop-problematico` (tip restore/vacío).
- **rama sugerida**: `pr/feature-008-identity-tenant-context-fe`
- **orden cross-repo**: **BE-first**. El PR del BE feature-008 (`/me/context` + schemas `internal_admin.MeContext`/`MeTenant`) DEBE mergear antes; luego regenerar `ui/src/api/generated` con `yarn codegen` apuntando al OpenAPI nuevo.

## PR title

`feat(fe+bff): identity & tenant context (/me/context, TenantSwitcher)`

## PR description (sugerida)

> Agrega contexto de tenant al FE y BFF. BFF: endpoint `GET /me/context`, verificación de token contra Identity Platform (bypass local), propagación de `X-Tenant-Id`/userId por requestContext. FE: `TenantContext`/`useTenant`, `TenantSwitcher` en el Navbar, parser `meContextPayload`, reset de workspace al cambiar de tenant; se elimina el viejo `WorkspaceSelector`/`FieldSearch`. Login redirige a `/admin/dashboard`.
>
> Depende del PR BE feature-008 (mergeado antes) y de `yarn codegen` para los tipos `MeTenant`/`MeContext`. Trae también los archivos de infra requeridos (authStorage, interceptor de client.ts, ProtectedLayout, ApiClient BFF) que no estaban aislados.

## Pasos ordenados

0. **(otro repo) Mergear BE feature-008** y desplegar/publicar el OpenAPI con `/me/context`.
1. `git checkout develop && git pull` → `git checkout -b pr/feature-008-identity-tenant-context-fe`.
2. **Traer infra REQUERIDA primero** (sino no compila):
   - `ui/src/lib/authStorage.ts` (whole-file).
   - `ui/src/api/generated/index.ts` + `types.ts` con `MeTenant`/`MeContext`: preferible regenerar (`yarn codegen`); si no, traer del SOURCE.
   - hunks de `X-Tenant-Id`/`.raw()`/`X-Skip-Tenant` de `ui/src/api/client.ts` (partial).
   - hunk de forward `X-Tenant-Id` de `api/src/clients/ApiClient.ts` (partial).
3. **BFF propios** (whole-file): `api/src/requestContext.ts`, `api/src/configService.ts`, `api/src/routes/me.ts`, `api/src/routes/authMiddleware.ts`.
4. **BFF bootstrap** (partial): hunk `tenantId` en `api/src/index.ts`.
5. **BFF router** (partial): en `api/src/routes/index.ts` traer SÓLO los hunks de 008: `import me`, `import { requestContext }`, cache scopeada (`scopedCachePrefix`/`scopedCacheKey`/objeto `cache`), `isTenantOptionalPath`, middleware `bffRequireTenant`, `router.use("/me", me)`. NO traer `actors`/`investors`/`managers`.
6. **FE propios** (whole-file): `TenantContext.shared.ts`, `TenantContext.tsx`, `useTenant.ts`, `meContextPayload.ts`, `meContextPayload.test.ts`, `layout/Navbar/TenantSwitcher.tsx`.
7. **FE provider tree** (partial): en `ui/src/layout/ProtectedLayout.tsx` agregar `<TenantProvider>` envolviendo `<SelectionProvider>`.
8. **FE mezclados** (manual-port / partial):
   - `AuthProvider.tsx`: cambiar import a `@/lib/authStorage`, agregar `clearWorkspaceSelectionStorage()` y nav `/admin/dashboard`.
   - `SelectionContext.tsx` + `.shared.ts`: agregar listener `ponti:tenant-changed`/`ponti:workspace-selection-reset` y reset; quitar `@devpablocristo/core-browser/storage`. (Si `allSelection` no es necesario para 008, evaluar dejarlo para su feature.)
   - `Navbar.tsx`: traer SÓLO el montaje de `<TenantSwitcher />` (NO dark-mode/responsive de 006).
   - `Menu.tsx`: 008 casi no toca; NO traer `/admin/access` (016) ni z-token (006).
   - `Login.tsx`: traer SÓLO nav `/admin/dashboard` (NO dark-mode 006 ni `Notification` 016).
9. **Borrados**: `git rm ui/src/pages/login/{FieldSearch.tsx,WorkspaceSelector.tsx,useClickOutside.ts}` (verificar que nadie los siga importando).
10. `yarn install` (si cambió lockfile por quitar core-browser), `yarn build`, `yarn test`.

## Comandos git SUGERIDOS (para un humano; este agente NO los ejecuta)

```bash
git checkout develop
git checkout -b pr/feature-008-identity-tenant-context-fe

# Archivos enteros propios
git checkout develop-problematico~1 -- \
  api/src/routes/me.ts \
  api/src/requestContext.ts \
  api/src/configService.ts \
  api/src/routes/authMiddleware.ts \
  ui/src/pages/login/context/TenantContext.shared.ts \
  ui/src/pages/login/context/TenantContext.tsx \
  ui/src/pages/login/context/useTenant.ts \
  ui/src/pages/login/context/meContextPayload.ts \
  ui/src/pages/login/context/meContextPayload.test.ts \
  ui/src/layout/Navbar/TenantSwitcher.tsx \
  ui/src/lib/authStorage.ts

# Archivos mezclados: SOLO algunos hunks (modo interactivo)
git restore -p --source=develop-problematico~1 -- \
  api/src/index.ts \
  api/src/routes/index.ts \
  api/src/clients/ApiClient.ts \
  ui/src/api/client.ts \
  ui/src/layout/ProtectedLayout.tsx \
  ui/src/layout/Navbar/Navbar.tsx \
  ui/src/layout/Navbar/Menu.tsx \
  ui/src/pages/login/Login.tsx \
  ui/src/pages/login/authService.ts \
  ui/src/pages/login/context/AuthProvider.tsx \
  ui/src/pages/login/context/SelectionContext.tsx \
  ui/src/pages/login/context/SelectionContext.shared.ts

# Borrados
git rm ui/src/pages/login/FieldSearch.tsx \
       ui/src/pages/login/WorkspaceSelector.tsx \
       ui/src/pages/login/useClickOutside.ts

# Tipos generados: PREFERIR regenerar contra el BE ya mergeado
yarn codegen   # (o el script de codegen del repo)
# fallback si no se puede regenerar:
# git checkout develop-problematico~1 -- ui/src/api/generated/index.ts ui/src/api/generated/types.ts

git diff --check
```

> `git restore -p` (o `git checkout -p`) abre selección de hunks. **Importante**: en `routes/index.ts`, `Navbar.tsx`, `Menu.tsx`, `Login.tsx` hay hunks de 006/007/016 que NO van — rechazarlos.

## Archivos enteros vs parciales

- **Enteros**: me.ts, requestContext.ts, configService.ts, authMiddleware.ts, TenantContext*, useTenant.ts, meContextPayload(.test).ts, TenantSwitcher.tsx, authStorage.ts.
- **Parciales**: index.ts (BFF), routes/index.ts, ApiClient.ts, client.ts, ProtectedLayout.tsx, Navbar.tsx, Menu.tsx, Login.tsx, authService.ts, AuthProvider.tsx, SelectionContext(.shared).ts.

## Migraciones / tests a incluir

- Migraciones: ninguna en este repo.
- Tests: `ui/src/pages/login/context/meContextPayload.test.ts` (vitest). Sugerido agregar test del TenantProvider (selección de tenant) — ver validation.md.

## Dependencias previas (deben estar antes del PR)

1. BE feature-008 mergeado (cross-repo).
2. OpenAPI con `internal_admin.MeContext`/`MeTenant` → `yarn codegen`.
3. `@/lib/authStorage`, interceptor de `client.ts`, `ProtectedLayout` con TenantProvider, `ApiClient.ts` forward → si alguna pertenece a otra feature ya porteada, verificar que esté en develop.

## Qué NO traer

- Hunks de dark-mode/responsive (006), `Notification` y `/admin/access` (016), `actors`/`investors`/`managers` (007/otras), `setImmediate` de `types.ts`.

## Qué podría romperse

- Compilación FE: import de `@/lib/authStorage` o `MeTenant` faltante.
- `ProtectedLayout` sin TenantProvider → `useTenant` lanza "useTenant debe usarse dentro de TenantProvider".
- Requests del FE sin `X-Tenant-Id` + `BFF_REQUIRE_TENANT=1` → 400 en todo.
- BFF sin forward de tenant en `ApiClient.ts` → BE no scopa por tenant.

## Cómo detectar extracción incompleta

- `grep -r "@/lib/authStorage" ui/src` debe resolver a un archivo presente.
- `grep -r "MeTenant\|MeContext" ui/src/api/generated` debe encontrar los schemas.
- `grep -rn "TenantProvider" ui/src/layout/ProtectedLayout.tsx` presente.
- `grep -n "X-Tenant-Id" ui/src/api/client.ts api/src/clients/ApiClient.ts` presente en ambos.
- `grep -n 'router.use("/me"' api/src/routes/index.ts` presente.
- `grep -rn "core-browser" ui/src/pages/login/context/SelectionContext.tsx` debe NO encontrar nada.

## Qué validar antes del PR

- `yarn build` y `yarn test` verdes; `tsc` sin errores de tipos.
- Login local (LOCAL_DEV_AUTH) y no-local (Identity Platform) ambos OK.
- TenantSwitcher visible con >1 tenant; cambio limpia workspace.

## Qué hacer después de mergear

- Setear `APP_ENV`, `BFF_REQUIRE_TENANT`, `IDENTITY_PLATFORM_API_KEY`, `IDENTITY_PLATFORM_PROJECT_ID` en cada ambiente (ver feature-021 build-and-deploy-config).
- Verificar en staging que el BE responde `/me/context` y que el header llega.
