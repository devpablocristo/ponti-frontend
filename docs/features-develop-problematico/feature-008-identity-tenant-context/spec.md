# spec.md — feature-008 · Identity & tenant context (/me)

- **id**: feature-008
- **slug**: identity-tenant-context
- **nombre**: Identity & tenant context (/me)
- **tipo**: feature
- **repo (este paquete)**: Frontend monorepo `web` (ui/ React + api/ BFF NodeJS, yarn) — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE**: SÍ (ui/ + api/ BFF)
- **existe-en-BE**: SÍ (repo `core`/`platform`, mismo feature-008) — FULL-STACK
- **fuente-de-verdad (diff)**: `fefbe695..3ffcf60`
- **SOURCE REF de extracción**: `develop-problematico~1` (SHA `3ffcf60`). NUNCA usar `develop-problematico` (su tip es un restore/vacío).
- **rama destino**: `develop` (tip `8c25e88`)
- **orden de merge**: **BE-first**, luego FE.

## Resumen

Introduce el concepto de **tenant activo** y de **identidad verificada** en todo el stack web:

- **BFF (api/)**: nuevo endpoint `GET /me/context` que proxea a `GET /me/context` del BE; verificación de token contra Identity Platform de Google (Firebase `accounts:lookup`) con bypass para desarrollo local; propagación del `tenantId` (header `X-Tenant-Id`) y del `userId` por `AsyncLocalStorage` (requestContext).
- **FE (ui/)**: nuevo `TenantContext`/`TenantProvider` + hook `useTenant`, componente `TenantSwitcher` en el Navbar, parser tolerante `meContextPayload`, e integración con `SelectionContext` para resetear el workspace (customer/project/campaign/field) cuando cambia el tenant. Se elimina el viejo flujo de selección de workspace en el login (`WorkspaceSelector`, `FieldSearch`, `useClickOutside`) y el login pasa a redirigir a `/admin/dashboard` en vez de `/workspace`.

## Objetivo

Que cada request del FE viaje con el tenant activo del usuario y que el BFF/BE puedan resolver permisos y datos por tenant. El usuario con acceso a varios tenants los ve en un `<select>` (TenantSwitcher) y al cambiar de tenant se limpia la selección de workspace y se recargan los datos scoping por tenant.

## Problema que resuelve

- Antes no había noción de tenant en el FE/BFF: la selección de "workspace" se hacía manualmente al loguear (`WorkspaceSelector` + `FieldSearch`).
- El token sólo se decodificaba localmente (sin verificación real contra Identity Platform).
- La cache del BFF (`NodeCache`) era global, no scopeada por tenant/usuario → fuga de datos entre tenants.

## Alcance EN ESTE REPO (web)

### BFF (api/)
- `api/src/routes/me.ts` (A): router `GET /context` → `apiClient.get("/me/context")` con `X-API-KEY`.
- `api/src/routes/authMiddleware.ts` (M): `verifyToken` ahora verifica contra Identity Platform (`identitytoolkit.googleapis.com/v1/accounts:lookup`) salvo `configService.allowLocalDevAuth()`; cachea verificaciones; `decodeTokenPayload` ahora exportada; llama `requestContext.setUserId(...)`.
- `api/src/requestContext.ts` (M): agrega `tenantId`, `userId`, `getTenantId()`, `setUserId()`, `getUserId()`.
- `api/src/index.ts` (M): inyecta `tenantId` al `requestContext.run(...)` desde el header `x-tenant-id`.
- `api/src/configService.ts` (M): `appEnv`, `bffRequireTenant`, `isLocalLikeEnv()`, `allowLocalDevAuth()`.

### FE (ui/)
- `ui/src/pages/login/context/TenantContext.shared.ts` (A): tipos `Tenant`, `TenantContextValue`, `TenantContext`.
- `ui/src/pages/login/context/TenantContext.tsx` (A): `TenantProvider` (lee `/me/context`, persiste `ponti:tenant_id`, dispara `ponti:tenant-changed`).
- `ui/src/pages/login/context/useTenant.ts` (A): hook.
- `ui/src/pages/login/context/meContextPayload.ts` (A) + `.test.ts` (A): parser tolerante de la respuesta cruda/envuelta.
- `ui/src/layout/Navbar/TenantSwitcher.tsx` (A): `<select>` de tenants.
- `ui/src/layout/Navbar/Navbar.tsx`, `Menu.tsx` (M): montan `TenantSwitcher` (MEZCLADO con dark-mode/responsive de 006 y link `/admin/access` de 016).
- `ui/src/pages/login/context/SelectionContext.tsx` + `.shared.ts` (M): reset de workspace al evento `ponti:tenant-changed`; nuevo `allSelection`; se quita dependencia `@devpablocristo/core-browser/storage`.
- `ui/src/pages/login/context/AuthProvider.tsx` (M): importa de `@/lib/authStorage`, `clearWorkspaceSelectionStorage()` en login, navega a `/admin/dashboard`.
- `ui/src/pages/login/Login.tsx` (M): navega a `/admin/dashboard` (MEZCLADO con dark-mode 006 y `Notification` 016).
- `ui/src/pages/login/authService.ts` (M): copy de errores (parcialmente 016).
- Borrados: `FieldSearch.tsx`, `WorkspaceSelector.tsx`, `useClickOutside.ts` (D).

## Alcance EN EL OTRO REPO (BE — core/platform)

- Endpoint admin `GET /me/context` que devuelve `{ current_tenant_id, tenants: MeTenant[] }` (schemas `internal_admin.MeContext` / `internal_admin.MeTenant`).
- Resolución del tenant activo desde el header `X-Tenant-Id` y de los tenants accesibles por el usuario.
- Publicación de los tipos vía OpenAPI (consumidos por `yarn codegen` → `ui/src/api/generated`). Ver feature-024 (openapi-and-docs).
- Depende de 007-actor-system y de la tenancy de plataforma (001/003).

## Fuera de alcance

- Diseño visual dark/responsive del Navbar/Login (feature-006).
- Componente `Notification` y link `/admin/access` (feature-016 / access-notifications).
- Módulo `@/lib/authStorage` y el interceptor de `ui/src/api/client.ts` con `X-Tenant-Id` (infra compartida — ver dependencies.md; no están en este flist pero son REQUERIDOS).
- `ApiClient.ts` del BFF que reenvía `X-Tenant-Id` al BE (no está en este flist; REQUERIDO).
- Registro de routers en `api/src/routes/index.ts` (compartido; sólo los hunks de 008).

## Comportamiento esperado

1. Login (email+password) → BFF `/auth/login` → token. Navega a `/admin/dashboard`.
2. `TenantProvider` (montado en `ProtectedLayout`) llama `GET /me/context` con header `X-Skip-Tenant: 1`, obtiene `tenants[]` y `current_tenant_id`.
3. Se elige tenant: el guardado en `localStorage("ponti:tenant_id")` si sigue siendo válido, si no `current_tenant_id`, si no `tenants[0]`.
4. Todas las requests del FE (interceptor de `client.ts`) agregan `X-Tenant-Id` salvo cuando llevan `X-Skip-Tenant`.
5. BFF lee `x-tenant-id`, lo mete en `requestContext` y `ApiClient` lo reenvía al BE.
6. Al cambiar de tenant en `TenantSwitcher` → `setTenantId` → persiste + dispara `ponti:tenant-changed` → `SelectionContext` limpia customer/project/campaign/field.
7. Con `BFF_REQUIRE_TENANT=1`, el BFF responde 400 "Tenant obligatorio" si falta el header (salvo paths `/me`, `/admin/tenants`, `/admin/invites`).

## Estado en dp~1 (3ffcf60)

Funcionalmente **completo** en este repo a nivel código, pero **NO autónomo**: depende de archivos fuera del flist que en `develop` (8c25e88) NO existen (ver implementation-status.md): `@/lib/authStorage`, `ui/src/api/client.ts` con interceptor de tenant, `ProtectedLayout` con `TenantProvider`, `api/src/clients/ApiClient.ts` con forward de tenant, `ui/src/api/generated` con `MeTenant`/`MeContext`, `Notification`, ruta `/admin/access` y `/admin/dashboard`.

## Criterios de aceptación

- `GET /me/context` (BFF) devuelve los tenants y se rendiza el `TenantSwitcher` cuando hay >1 tenant.
- Cambiar de tenant limpia el workspace y recarga listas con el nuevo `X-Tenant-Id`.
- En local con `LOCAL_DEV_AUTH=1` y `APP_ENV` local-like, el login funciona sin Identity Platform.
- En no-local, el token se verifica contra Identity Platform; token inválido → 401.
- La cache del BFF queda aislada por `tenant:<id>:user:<id>:`.
- `yarn test` pasa `meContextPayload.test.ts`.

## Endpoints / modelos / UI / DB / tests afectados

- **Endpoints BFF**: `GET /me/context` (nuevo). Middleware global de tenant en `routes/index.ts`.
- **Endpoints BE (otro repo)**: `GET /me/context`.
- **Modelos/Tipos**: FE `Tenant` (derivado de `MeTenant` generado), `MeContextPayload`, `TenantContextValue`, `WorkspaceAllSelection`; BFF `VerifiedIdentity`, `RequestContextData`.
- **UI**: `TenantSwitcher`, integración en `Navbar`/`Menu`, eliminación de `WorkspaceSelector`/`FieldSearch`.
- **DB**: ninguna migración en este repo (la tenancy vive en BE).
- **Tests**: `ui/src/pages/login/context/meContextPayload.test.ts` (vitest).

## Dependencias

- **Intra-repo (web)**: `@/lib/authStorage`, `ui/src/api/client.ts` (interceptor X-Tenant-Id), `ui/src/layout/ProtectedLayout.tsx`, `api/src/clients/ApiClient.ts`, `api/src/routes/index.ts` (hunks 008), `ui/src/api/generated/*`. 006 (dark-mode en Navbar/Login), 016 (Notification, /admin/access).
- **Cross-repo**: BE feature-008 (`/me/context` + schemas `internal_admin.MeContext`/`MeTenant`), 007-actor-system, tenancy plataforma (001/003), 024 (OpenAPI codegen).

## Riesgos

- **Funcional**: si BE no expone `/me/context`, el FE queda sin tenants (TenantSwitcher oculto, requests sin X-Tenant-Id → 400 si `BFF_REQUIRE_TENANT=1`).
- **Técnico**: import roto de `@/lib/authStorage` y `MeTenant` (no existen en develop) → no compila.
- **Datos**: cache scopeada por tenant vive en `routes/index.ts` (compartido); si se trae a medias, fuga de cache entre tenants.

## DECISIÓN recomendada

**Arreglar antes de extraer (partir-y-completar dependencias).** El feature es coherente pero NO es self-contained: requiere portar primero los archivos REQUERIDOS fuera del flist (`@/lib/authStorage`, interceptor de `client.ts`, `ProtectedLayout`, `ApiClient.ts` BFF, `api/src/routes/index.ts` hunks, `ui/src/api/generated` con MeTenant) y mergear el BE feature-008 ANTES (BE-first). Las partes mezcladas de 006/016 (dark-mode, Notification, /admin/access) deben quedar fuera de este PR (traer sólo los hunks de tenant en Navbar/Menu/Login). Ver extraction-plan.md.
