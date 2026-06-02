# implementation-status.md — feature-008 · Identity & tenant context

## Estado general

- **Estado**: PARCIAL para extracción autónoma (el código en 3ffcf60 está COMPLETO y funcional, pero depende de archivos fuera del flist que NO existen en `develop`).
- **% completitud (código en SOURCE)**: ~95%.
- **% completitud (autonomía para mergear sólo este flist en develop)**: ~60% (faltan los REQUERIDOS).

## Estado en este repo (web)

### BFF (api/) — COMPLETO en SOURCE
- `me.ts`: `GET /context` → BE `/me/context`. OK.
- `authMiddleware.ts`: verifyToken con Identity Platform (`accounts:lookup`), cache de verificación, `setUserId`. OK. **Atención**: lanza si `identityApiKey`/`identityProjectId` no configurados y no es local.
- `requestContext.ts`, `configService.ts`, `index.ts`: OK.
- **Dependencia oculta**: `api/src/routes/index.ts` (registro `/me`, cache scopeada, guard) y `api/src/clients/ApiClient.ts` (forward `X-Tenant-Id`) — NO en flist. Sin ellos el endpoint no se monta y el tenant no llega al BE.

### FE (ui/) — COMPLETO en SOURCE
- `TenantContext.*`, `useTenant`, `meContextPayload(.test)`, `TenantSwitcher`: OK.
- Integración Navbar/SelectionContext/AuthProvider/Login: presente pero MEZCLADA con 006/016.
- **Dependencia oculta**: `@/lib/authStorage`, interceptor en `ui/src/api/client.ts`, `ProtectedLayout` con TenantProvider, tipos `MeTenant` en `ui/src/api/generated`. Verificado ausentes en develop.

## Estado en el otro repo (BE)

- DESCONOCIDO desde este paquete. Se asume que el paquete BE feature-008 cubre `GET /me/context` + schemas `internal_admin.MeContext`/`MeTenant` + resolución de tenant por `X-Tenant-Id`. **Coordinar.** Debe mergear ANTES (BE-first).

## Tests

- `meContextPayload.test.ts` (vitest): cubre respuesta cruda y envuelta `{success,data}`. PRESENTE.
- NO hay test del TenantProvider ni del middleware `bffRequireTenant` ni de `verifyToken`. (mejora-futura)

## Pendientes / bugs

### BLOQUEANTE para mergear (este repo)
1. Traer `ui/src/lib/authStorage.ts` (sino AuthProvider no compila).
2. Traer hunks de `X-Tenant-Id` en `ui/src/api/client.ts` y `api/src/clients/ApiClient.ts`.
3. Montar `<TenantProvider>` en `ui/src/layout/ProtectedLayout.tsx`.
4. Traer hunks de 008 en `api/src/routes/index.ts` (`router.use("/me", me)`, cache scopeada, guard).
5. Regenerar tipos `MeTenant`/`MeContext` (`yarn codegen`) — requiere BE mergeado.
6. Limpiar de los partials los hunks de 006/016 (dark-mode, Notification, `/admin/access`).

### BLOQUEANTE cross-repo
7. BE feature-008 (`/me/context`) mergeado y desplegado.

### Mejora futura
- Tests de TenantProvider y de `verifyToken`/guard.
- `verifiedTokenCache` (Map en memoria) sin TTL eviction más allá de `exp` → crece sin límite; considerar LRU.

### Deuda aceptable
- `localDevUserId`/`localDevPassword` con defaults; OK para local.
- Doble persistencia de claves legacy (`tenant_id` y `ponti:tenant_id`) por compat.

### Duda humana
- ¿`allSelection` en `SelectionContext` pertenece a 008 o a otra feature? (ver dependencies.md, inciertas).
- ¿`api/src/routes/types.ts` (quitar `setImmediate`) va en este PR o en el de cache scopeada?
