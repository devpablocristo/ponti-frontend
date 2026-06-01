# dependencies.md — feature-008 · Identity & tenant context

## Depende de

### Cross-repo (FUERTES)
- **BE feature-008 (core/platform)** — endpoint `GET /me/context` y schemas OpenAPI `internal_admin.MeContext` / `internal_admin.MeTenant`. Sin esto el FE no tiene tenants ni tipos. **BE-first.**
- **feature-024 (openapi-and-docs)** — `yarn codegen` genera `ui/src/api/generated/{index,types}.ts` con `MeTenant`/`MeContext`. Verificado: existe en 3ffcf60, **NO existe en develop 8c25e88**.
- **feature-007 (actor-system)** — el feature declara `DEPENDE DE: 007`. El BE resuelve roles/permisos por actor; el `MeTenant` trae `role`/`permissions`. Débil a nivel de compilación FE, fuerte a nivel funcional.
- **feature-001 / 003 (be-platform-tenancy / multitenant-db-hardening)** — el tenant del header se resuelve y aísla datos en el BE. Fuerte funcional.

### Intra-repo web (FUERTES — NO están en este flist)
- **`ui/src/lib/authStorage.ts`** — `AuthProvider` importa `clearWorkspaceSelectionStorage`, `getAccessToken`, etc. Verificado: presente en 3ffcf60, **ausente en develop**. Bloqueante de compilación.
- **`ui/src/api/client.ts`** — interceptor request que inyecta `X-Tenant-Id` (y respeta `X-Skip-Tenant`) + método `.raw()` que usa `TenantProvider`. Verificado: develop NO tiene `X-Tenant-Id`. Bloqueante funcional.
- **`api/src/clients/ApiClient.ts`** — reenvía `X-Tenant-Id` al BE desde `requestContext.getTenantId()`. Verificado: develop NO lo tiene. Bloqueante funcional (BFF→BE).
- **`ui/src/layout/ProtectedLayout.tsx`** — monta `<TenantProvider>` (envuelve `<SelectionProvider>`). Verificado: develop NO tiene `TenantProvider`. Bloqueante (si no, `useTenant` rompe).
- **`api/src/routes/index.ts`** — registra `router.use("/me", me)`, cache scopeada por `tenant:user`, guard `bffRequireTenant`, `isTenantOptionalPath`. COMPARTIDO. Bloqueante (sin el `use("/me")` el endpoint no existe).

### Intra-repo (DÉBILES / mezcladas)
- **feature-006 (fe-design-system)** — dark-mode/responsive en `Navbar.tsx`, `Login.tsx`, `Menu.tsx` (z-tokens). Mezclado en los mismos archivos pero independiente.
- **feature-016 (fe-access-notifications)** — `components/feedback/Notification` (usado por Login), link `/admin/access` (Menu). Mezclado.

### Inciertas
- **`ui/src/pages/login/context/SelectionContext.shared.ts` `allSelection`** — ¿pertenece a 008 o a 014/015 (master-data/dashboard)? El reset por `ponti:tenant-changed` SÍ es de 008; `allSelection` parece de otra feature. Revisar quién consume `allSelection` (`git grep allSelection`).
- **`api/src/routes/types.ts`** — el hunk (quitar `setImmediate`) está ligado al cambio de cache scopeada, no a identidad. Incierto si va en este PR o en el de cache.

## Bloquea a

- **feature-010/011 (projects / campaign-dto-projectid)**, **014 (master-data-pages)**, **015 (dashboard)**, **018 (data-integrity-admin)** — todo lo que el BE scopa por tenant necesita que el FE mande `X-Tenant-Id` y que `/me/context` exista. Si 008 no está, esas pantallas operan sin tenant.
- **feature-016 (access-notifications)** — el link `/admin/access` y los permisos por tenant dependen del contexto de 008.

## Archivos / tipos / config / APIs compartidos

| recurso | compartido con | nota |
|---|---|---|
| `api/src/routes/index.ts` | 007 (actors), investors/managers | traer sólo hunks de 008 (me, cache, tenant guard) |
| `ui/src/layout/Navbar/Navbar.tsx`,`Menu.tsx` | 006, 016 | partial-hunks |
| `ui/src/pages/login/Login.tsx`,`authService.ts` | 006, 016 | partial-hunks/manual-port |
| `ui/src/pages/login/context/SelectionContext*.ts(x)` | 014/015 (allSelection) | manual-port |
| tipos `MeTenant`/`MeContext` (`ui/src/api/generated`) | 024 + BE-008 | regenerar con codegen |
| envs: `APP_ENV`, `BFF_REQUIRE_TENANT`, `IDENTITY_PLATFORM_API_KEY`, `IDENTITY_PLATFORM_PROJECT_ID`, `LOCAL_DEV_AUTH` | 021 (build-and-deploy-config) | documentar en cada ambiente |
| API `GET /me/context` | BE-008 | contrato cross-repo |
| header `X-Tenant-Id` / `X-Skip-Tenant` | FE client.ts ↔ BFF index.ts ↔ ApiClient.ts ↔ BE | contrato de transporte |

## Recomendación de orden

1. **BE feature-008** (`/me/context` + OpenAPI) — merge primero.
2. `yarn codegen` en web (tipos `MeTenant`/`MeContext`).
3. Infra web requerida: `authStorage`, interceptor `client.ts`, `ApiClient.ts`, `ProtectedLayout`, hunks de `routes/index.ts`.
4. Este PR FE+BFF de 008 (con partials de Navbar/Login limpios de 006/016).
5. 006/016 pueden ir antes o después; si van después, los hunks de dark-mode/Notification se reaplican en sus PRs.
