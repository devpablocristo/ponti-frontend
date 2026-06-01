# notes-for-future-agent.md — feature-008 · Identity & tenant context

## Resumen corto

FULL-STACK. Introduce **tenant activo** + **identidad verificada** en el monorepo web. BFF: `GET /me/context`, verifyToken contra Identity Platform (bypass local), propagación de `X-Tenant-Id`/userId por requestContext. FE: `TenantContext`/`useTenant`, `TenantSwitcher` en el Navbar, parser `meContextPayload`, reset de workspace al cambiar de tenant, y eliminación del viejo `WorkspaceSelector`/`FieldSearch`. Login ahora navega a `/admin/dashboard`.

El código en SOURCE (3ffcf60) está completo, pero **NO es self-contained**: depende de archivos que NO están en este flist y que NO existen en `develop`.

## Qué está en FE y en BE

- **FE (ui/)**: TenantContext + provider + hook, TenantSwitcher, meContextPayload(+test); integración (mezclada) en Navbar/Menu/Login/AuthProvider/SelectionContext.
- **BFF (api/)**: me.ts, authMiddleware (Identity Platform), requestContext, configService, index.ts (tenant header).
- **BE (otro repo, feature-008)**: endpoint `/me/context` + schemas `internal_admin.MeContext`/`MeTenant`. **Debe ir ANTES (BE-first).**

## Archivos ESENCIALES (núcleo, traer enteros)

- `api/src/routes/me.ts`, `api/src/requestContext.ts`, `api/src/configService.ts`, `api/src/routes/authMiddleware.ts`
- `ui/src/pages/login/context/{TenantContext.shared.ts,TenantContext.tsx,useTenant.ts,meContextPayload.ts,meContextPayload.test.ts}`
- `ui/src/layout/Navbar/TenantSwitcher.tsx`

## Archivos PELIGROSOS / MEZCLADOS (partial-hunks, no traer entero)

- `api/src/routes/index.ts` (NO en flist): mezcla 008 (me, cache scopeada, tenant guard) + 007 (actors) + investors/managers. **La cache scopeada por `tenant:user` es de seguridad — traerla completa o no traer `router.use("/me")` suelto.**
- `ui/src/layout/Navbar/Navbar.tsx`, `Menu.tsx`, `ui/src/pages/login/Login.tsx`, `authService.ts`: mezclan 006 (dark-mode/responsive) y 016 (Notification, `/admin/access`). Traer SÓLO el hunk de tenant/nav.
- `ui/src/pages/login/context/SelectionContext.tsx`/`.shared.ts`: reescritura grande (quita `@devpablocristo/core-browser`, agrega `allSelection` y listener `ponti:tenant-changed`). Sólo el listener+reset es de 008.

## Archivos REQUERIDOS que NO están en el flist (traer/portar aparte)

- `ui/src/lib/authStorage.ts` (ausente en develop — AuthProvider lo importa)
- `ui/src/api/client.ts` (interceptor `X-Tenant-Id` + `.raw()`; ausente en develop)
- `api/src/clients/ApiClient.ts` (forward `X-Tenant-Id` al BE; ausente en develop)
- `ui/src/layout/ProtectedLayout.tsx` (monta `<TenantProvider>`)
- `ui/src/api/generated/{index,types}.ts` (`MeTenant`/`MeContext`; regenerar con `yarn codegen`)
- `ui/src/components/feedback/Notification.tsx` (es de 016; sólo si traés ese hunk de Login — mejor NO)

## Decisiones ya tomadas

- Extracción recomendada: **arreglar antes** (completar deps + limpiar mezclas), no extraer tal cual.
- Orden: **BE-first**, luego `yarn codegen`, luego infra web, luego este PR.
- NO traer dark-mode/Notification/`/admin/access`/actors en este PR.

## Dudas abiertas (para humano)

- ¿`allSelection` (SelectionContext) es de 008 o de 014/015? `git grep allSelection ui/src`.
- ¿`api/src/routes/types.ts` (quitar `setImmediate`) va en este PR o en el de cache scopeada?
- ¿El BE garantiza `id`/`name` en `MeTenant`? (el FE los asume requeridos).

## Comandos para mirar primero

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-008.txt
git show 3ffcf60:api/src/routes/index.ts | sed -n '100,145p'   # tenant guard + use("/me")
git show 3ffcf60:ui/src/api/client.ts | sed -n '58,70p'        # interceptor X-Tenant-Id
git show 3ffcf60:api/src/clients/ApiClient.ts | sed -n '110,140p' # forward al BE
git show 3ffcf60:ui/src/layout/ProtectedLayout.tsx | sed -n '129,135p' # provider tree
git diff fefbe695..3ffcf60 -- ui/src/layout/Navbar/Navbar.tsx  # ver mezcla 006/008
git cat-file -e 8c25e88:ui/src/lib/authStorage.ts && echo present || echo absent  # ausente
```

## Errores a evitar

- Mergear FE antes que BE → TenantSwitcher vacío y 400 everywhere si `BFF_REQUIRE_TENANT=1`.
- Traer `router.use("/me")` sin la cache scopeada → fuga de cache entre tenants.
- Arrastrar `Notification`/`/admin/access`/dark-mode → rompe build (Notification no está en develop) y contamina el PR.
- Olvidar `yarn codegen` → no compila por `MeTenant` faltante.
- Olvidar montar `<TenantProvider>` en ProtectedLayout → `useTenant` lanza en runtime.

## Camino más seguro

1. Mergear BE-008. 2. `yarn codegen`. 3. Portar infra (authStorage, client.ts, ApiClient.ts, ProtectedLayout, hunks de routes/index.ts). 4. Enteros propios + partials limpios. 5. `yarn build && yarn test`. 6. Probar con `BFF_REQUIRE_TENANT=0` primero, luego activarlo.

## Qué PR del otro repo va antes/después

- **ANTES**: PR BE feature-008 (`/me/context` + OpenAPI schemas). Idealmente también 007-actor-system y tenancy 001/003.
- **DESPUÉS / coordinado**: activar `BFF_REQUIRE_TENANT` por ambiente (021). 006 y 016 pueden ir independientes (reaplicar sus hunks de Navbar/Login en sus propios PRs).
