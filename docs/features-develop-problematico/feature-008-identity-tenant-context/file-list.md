# file-list.md — feature-008 · Identity & tenant context

Diff base: `fefbe695..3ffcf60`. SOURCE = `develop-problematico~1` (3ffcf60). Destino = `develop` (8c25e88).

Leyenda extracción: `whole-file` = traer el archivo entero · `partial-hunks` = sólo algunos hunks (archivo compartido) · `manual-port` = reescribir/adaptar a mano · `do-not-extract-yet` = no traer todavía.

## Propios de la feature (whole-file)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `api/src/routes/me.ts` | A | BFF route | `GET /context` → proxy a BE `/me/context` | whole-file | archivo nuevo 100% de 008 | bajo | alta |
| `api/src/requestContext.ts` | M | BFF infra | tenantId/userId en AsyncLocalStorage | whole-file | todos los hunks son de 008 | bajo | alta |
| `api/src/configService.ts` | M | BFF config | appEnv/bffRequireTenant/allowLocalDevAuth | whole-file | hunks son de 008 (env de tenant/identity) | bajo | alta |
| `ui/src/pages/login/context/TenantContext.shared.ts` | A | FE types/context | tipos Tenant + contexto | whole-file | nuevo, depende de MeTenant generado | medio (dep MeTenant) | alta |
| `ui/src/pages/login/context/TenantContext.tsx` | A | FE provider | TenantProvider, lee /me/context | whole-file | nuevo, núcleo de 008 | medio (dep client.ts/raw) | alta |
| `ui/src/pages/login/context/useTenant.ts` | A | FE hook | hook useTenant | whole-file | nuevo | bajo | alta |
| `ui/src/pages/login/context/meContextPayload.ts` | A | FE util | parser tolerante de respuesta | whole-file | nuevo | bajo | alta |
| `ui/src/pages/login/context/meContextPayload.test.ts` | A | FE test | vitest del parser | whole-file | test de 008 | bajo | alta |
| `ui/src/layout/Navbar/TenantSwitcher.tsx` | A | FE component | `<select>` de tenants | whole-file | nuevo, núcleo UI de 008 | bajo | alta |

## Compartidos / mezclados (partial-hunks o manual-port)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `api/src/index.ts` | M | BFF bootstrap | inyecta tenantId en requestContext.run | partial-hunks | 4 líneas de 008; archivo compartido (bootstrap) | bajo | alta |
| `api/src/routes/authMiddleware.ts` | M | BFF auth | verifyToken vs Identity Platform + setUserId | whole-file | el archivo entero se reescribió para 008 (identidad) | medio (Identity Platform en no-local) | alta |
| `ui/src/layout/Navbar/Navbar.tsx` | M | FE layout | monta TenantSwitcher | partial-hunks | MEZCLA: dark-mode/responsive (006) + TenantSwitcher (008) | alto (mezcla 006) | media |
| `ui/src/layout/Navbar/Menu.tsx` | M | FE layout | link Accesos + handleLogoutClick | partial-hunks | MEZCLA: z-token (006) + link `/admin/access` (016); 008 casi no toca acá | alto (no es de 008) | media |
| `ui/src/pages/login/Login.tsx` | M | FE page | navega a /admin/dashboard | partial-hunks | MEZCLA: nav (008) + dark-mode (006) + Notification (016) | alto | media |
| `ui/src/pages/login/authService.ts` | M | FE service | copy de errores de auth | manual-port | copy de errores; solapado con 016; el `\ No newline` reformatea todo | medio | media |
| `ui/src/pages/login/context/AuthProvider.tsx` | M | FE provider | importa @/lib/authStorage, clearWorkspaceSelectionStorage, nav /admin/dashboard | partial-hunks | depende de @/lib/authStorage (no en flist) | alto (dep externa) | media |
| `ui/src/pages/login/context/SelectionContext.tsx` | M | FE provider | reset workspace en `ponti:tenant-changed`; quita core-browser | manual-port | reescritura grande; mezcla allSelection + integración 008 | alto | media |
| `ui/src/pages/login/context/SelectionContext.shared.ts` | M | FE types | WorkspaceAllSelection | partial-hunks | tipo allSelection (no estrictamente 008) | medio | media |

## Requeridos por dependencia (NO están en este flist — traer/portar aparte)

| path | rol | extracción | motivo |
|---|---|---|---|
| `api/src/routes/index.ts` | registra `/me`, cache scopeada por tenant:user, guard `bffRequireTenant`, `isTenantOptionalPath` | partial-hunks | COMPARTIDO: mezcla 008 (me, cache, tenant guard) con 007 (actors), investors/managers de otras features |
| `api/src/clients/ApiClient.ts` | reenvía `X-Tenant-Id` al BE desde requestContext | partial-hunks/manual-port | sin esto el tenant nunca llega al BE; no en flist |
| `ui/src/api/client.ts` | interceptor request: inyecta `X-Tenant-Id`, respeta `X-Skip-Tenant`; expone `.raw()` | partial-hunks | sin esto el FE no manda tenant; no en flist |
| `ui/src/lib/authStorage.ts` | `clearWorkspaceSelectionStorage`, get/set tokens | whole-file | AuthProvider lo importa; NO existe en develop |
| `ui/src/layout/ProtectedLayout.tsx` | monta `<TenantProvider>` envolviendo `<SelectionProvider>` | partial-hunks | sin esto TenantContext nunca se provee |
| `ui/src/api/generated/index.ts` + `types.ts` | tipos `MeTenant`/`MeContext` (`internal_admin.*`) | whole-file (vía `yarn codegen`) | TenantContext.shared importa MeTenant; cross-repo OpenAPI (024) |
| `ui/src/components/feedback/Notification.tsx` | usado por Login.tsx (016) | do-not-extract-yet | pertenece a 016; sólo si se trae el hunk de Notification de Login |

## Dudosos

| path | status | duda | recomendación |
|---|---|---|---|
| `api/src/routes/types.ts` | M | el único hunk quita un `setImmediate(...)` alrededor de `cache.set` — NO es de identidad/tenant | do-not-extract-yet en este PR; pertenece al cambio de cache scopeada (revisar junto a routes/index.ts) |
| `ui/src/layout/Navbar/Menu.tsx` | M | el grueso del diff es 006/016, casi nada de 008 | manual-port: traer sólo si querés el TenantSwitcher rodeado; ojo de no arrastrar `/admin/access` |

## NO traer todavía (do-not-extract-yet)

| path | motivo |
|---|---|
| hunks de dark-mode/responsive en `Navbar.tsx`/`Login.tsx`/`Menu.tsx` | pertenecen a feature-006 (fe-design-system) |
| link `/admin/access` en `Menu.tsx`, `Notification` en `Login.tsx` | pertenecen a feature-016 (fe-access-notifications) |
| hunks de `actors`/`investors`/`managers` en `routes/index.ts` | feature-007 y otras |
| `api/src/routes/types.ts` (setImmediate) | cambio de cache, no identidad — coordinar con routes/index.ts |

## Inventario adicional (completitud)

Archivos fuente reales que faltaban en las tablas de arriba. Son los 3 borrados (`D`) de la vieja página de selección de workspace, reemplazada en 008 por el flujo `TenantSwitcher` + evento `ponti:tenant-changed`.

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/pages/login/WorkspaceSelector.tsx` | D | FE page (487 líneas) | vieja página `/workspace` (selección de customer/campaign/project) que 008 jubila | manual-port | borrado total: en 008 el `/workspace` route sale de `router.tsx` y la selección pasa al `TenantSwitcher` + `ponti:tenant-changed` en `SelectionContext`. En extracción es un `git rm` coordinado con el hunk de `router.tsx` que quita `WorkspaceSelectorPage` y el route `workspace` | medio (arrastra la baja del route en `router.tsx`, fuera de este flist) | alta |
| `ui/src/pages/login/useClickOutside.ts` | D | FE hook (28 líneas) | hook click-outside/Escape usado sólo por `WorkspaceSelector.tsx` | manual-port | borrado total al irse `WorkspaceSelector`. NO confundir con `ui/src/pages/admin/database/customers/hooks/useClickOutside.ts`, que es otra copia y sigue viva: borrar sólo este path. `git rm` en extracción | bajo | alta |
| `ui/src/pages/login/FieldSearch.tsx` | D | FE component (134 líneas) | combobox de búsqueda de campos (`useFields`/`useDebounce`), residente bajo `login/` y sin consumidores vivos en SOURCE | manual-port | borrado total: no quedan refs a `FieldSearch` en 3ffcf60. Limpieza acompañando la baja de la vieja UI de workspace; `git rm` en extracción | bajo | alta |
