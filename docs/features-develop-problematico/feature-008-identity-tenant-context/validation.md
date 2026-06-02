# validation.md — feature-008 · Identity & tenant context

## Checklist pre-PR

- [ ] BE feature-008 mergeado y `/me/context` disponible en el ambiente de prueba.
- [ ] `yarn codegen` corrido; `grep -rn "internal_admin.MeContext\|internal_admin.MeTenant" ui/src/api/generated/types.ts` devuelve >0.
- [ ] `ui/src/lib/authStorage.ts` presente y exporta `clearWorkspaceSelectionStorage`, `getAccessToken`, `getRefreshToken`, `setLocalStorage`, `clearLocalStorage`.
- [ ] `grep -n "X-Tenant-Id" ui/src/api/client.ts api/src/clients/ApiClient.ts` presente en ambos.
- [ ] `grep -n "TenantProvider" ui/src/layout/ProtectedLayout.tsx` presente, envolviendo `SelectionProvider`.
- [ ] `grep -n 'router.use("/me"' api/src/routes/index.ts` presente; cache scopeada (`scopedCacheKey`) y guard `bffRequireTenant`/`isTenantOptionalPath` presentes.
- [ ] `grep -rn "core-browser" ui/src/pages/login/context/SelectionContext.tsx` NO encuentra nada.
- [ ] `grep -rn "WorkspaceSelector\|FieldSearch\|useClickOutside" ui/src` no devuelve imports vivos (archivos borrados).
- [ ] Partials limpios: NO se colaron hunks de dark-mode (006), `Notification`/`/admin/access` (016), `actors`/`investors`/`managers` (007/otras).
- [ ] `yarn build` y `tsc` sin errores.
- [ ] `yarn test` verde (incluye `meContextPayload.test.ts`).
- [ ] `git diff --check` sin whitespace errors (varios archivos venían con `\ No newline at end of file` reformateados a CRLF/LF; revisar).

## Tests sugeridos

- **FE (vitest)**: `yarn test ui/src/pages/login/context/meContextPayload.test.ts`.
- **FE nuevo (sugerido)**: test de `TenantProvider` — mock de `apiClient.raw().get("/me/context")`, verificar selección de tenant (stored válido > current_tenant_id > tenants[0]) y dispatch de `ponti:tenant-changed`.
- **BFF (sugerido)**: test de `verifyToken` con `allowLocalDevAuth()` true/false; test del middleware `bffRequireTenant` (400 cuando falta tenant y path no es opcional).
- **Build**: `yarn build` (ui + api).

## Pruebas manuales

1. Login en local con `LOCAL_DEV_AUTH=1` + `APP_ENV=local` → entra sin Identity Platform, navega a `/admin/dashboard`.
2. Login en ambiente no-local con `IDENTITY_PLATFORM_*` seteados → token verificado; con token manipulado → 401.
3. Usuario con 2+ tenants → `TenantSwitcher` visible; cambiar tenant → workspace se limpia y las listas recargan con nuevo `X-Tenant-Id` (verlo en Network).
4. Usuario con 1 tenant y sin `tenantId` previo → `TenantSwitcher` oculto (`tenants.length <= 1 && !tenantId`).
5. Con `BFF_REQUIRE_TENANT=1` y sin tenant → request a `/customers` devuelve 400 "Tenant obligatorio"; `/me/context` sigue 200.
6. Logout desde el `Menu` → cierra dropdown y abre modal (`handleLogoutClick`).

## Casos borde

- `/me/context` responde envuelto `{success:true,data:{...}}` vs crudo `{...}` → `resolveMeContextPayload` cubre ambos.
- `current_tenant_id` no está entre `tenants` → cae a `tenants[0]`.
- `localStorage` con `tenant_id` (legacy) y sin `ponti:tenant_id` → `readStoredTenantId` lo toma.
- Tenant con `id` o `name` faltante (BE marca opcionales) → posible `key` undefined en `<option>` (ver risks.md).
- Request con `X-Skip-Tenant: 1` (la del propio `/me/context`) → NO debe llevar `X-Tenant-Id`.

## Qué revisar en UI / API / DB / env

- **UI**: Navbar muestra `TenantSwitcher` a la izquierda del `Menu`; Login navega a `/admin/dashboard`.
- **API/BFF**: `routes/index.ts` registra `/me`; `requestContext` propaga tenantId/userId; `ApiClient` reenvía `X-Tenant-Id`.
- **DB**: n/a en este repo.
- **Env**: `APP_ENV`, `BFF_REQUIRE_TENANT`, `IDENTITY_PLATFORM_API_KEY`, `IDENTITY_PLATFORM_PROJECT_ID`, `LOCAL_DEV_AUTH`, `LOCAL_DEV_USER_ID`, `BASE_MANAGER_API`, `X_API_KEY`.

## Qué validar en el OTRO repo (BE)

- `GET /me/context` devuelve `{ current_tenant_id, tenants: [{id,name,role,permissions,is_current}] }`.
- El BE resuelve el tenant activo desde `X-Tenant-Id` y aísla datos por tenant.
- OpenAPI publica `internal_admin.MeContext` / `internal_admin.MeTenant` (para codegen).

## Señales de incompletitud / incompatibilidad

- Build falla por `@/lib/authStorage` o `MeTenant` → falta infra/codegen.
- `useTenant debe usarse dentro de TenantProvider` en runtime → falta provider en ProtectedLayout.
- Listas vacías + 400 en Network → falta forward de tenant o BE no responde.
- Datos de otro tenant cacheados → cache no scopeada (`routes/index.ts` incompleto).
