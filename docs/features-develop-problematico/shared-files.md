# Shared files — descomposición de `develop-problematico`

> Documento GLOBAL. Lista **todos los archivos de este repo (FE monorepo: `ui/` React + `api/` BFF NodeJS, yarn) que son tocados por más de una feature** en el rango de extracción.
>
> - **SOURCE de extracción**: `develop-problematico~1` (SHA `3ffcf60`) — el **pico** de la rama, NUNCA el tip (`ac5dd2e`, que es un restore que la vacía).
> - **Destino**: `develop`.
> - **Rango fuente**: `fefbe695..3ffcf60`.
> - **Fecha del análisis**: 2026-05-30.
>
> Todos los comandos `git` de este doc son **sugerencias** (cero cambios a código). Para los archivos `partial`, el patrón recomendado es:
> ```
> git restore -p --source=develop-problematico~1 -- <path>
> ```
> que abre el selector hunk-por-hunk para traer SOLO los hunks de la feature que estás portando, dejando el resto del archivo intacto.

## Cómo leer este doc

- **Tipo de mezcla**: cómo conviven los cambios de distintas features en el mismo archivo (mismo hunk vs. hunks separados vs. archivo entero re-derivado).
- **Estrategia**: `whole` = traer el archivo entero con una sola feature; `partial` = `restore -p` por hunks; `regenerate` = NO se edita a mano (lockfiles).
- **Riesgo**: probabilidad/impacto de conflicto de merge o de romper compilación/runtime si se trae mal o fuera de orden.

---

## Resumen ejecutivo: los "hot files"

| Archivo | # features | Riesgo | Estrategia base |
| --- | --- | --- | --- |
| `ui/src/router.tsx` | 7 (006/007/008/010/014/015/016/017/018) | ALTO | partial por hunks, 006 es dueño base |
| `api/src/routes/index.ts` | 4+ (007/008/012/014) | ALTO | partial por hunks, 014 monta base |
| `ui/src/main.tsx` | 2 (006 grueso, 008 depende) | medio | whole con 006 |
| `ui/package.json` | 4 (006/016/017/021/024 + platform-migration) | ALTO | partial; deps platform = migración, NO feature |
| `ui/yarn.lock` | todas las FE | ALTO | **regenerate** (`yarn install`), nunca a mano |
| `ui/tailwind.config.js` | 2 (006 + 021/platform) | medio | partial |
| `ui/vite.config.ts` | 2-3 (021 + 006/platform + 026) | medio | partial |
| `ui/src/api/client.ts` | 2 (006 + 008) | ALTO | partial |
| `api/src/clients/ApiClient.ts` | 2 (008 + base) | medio | partial |
| `api/src/index.ts` | 2 (008 + 012 no-op) | bajo | partial (4 líneas de 008) |
| `ui/src/api/aiClient.ts` | 2 (006 + 012) | medio | partial |
| `ui/src/types/aiChat.ts` | 2 (012 dueño + 006/014 consumen) | medio | whole con 012 (BE-first) |
| `.gitignore` | 3 (021 + 026 + 006) | bajo | partial |
| `ui/eslint.config.js` | 2 (021 + 026) | bajo | partial |
| `ui/src/api/generated/{index,types}.ts` | 2+ (008 + 021/024) | medio | regenerate (`yarn codegen:openapi`) |
| `ui/src/lib/entityNameMatcher.ts` (+`.test`) | 3 (006 dueño, 007 + 010 consumen) | medio | whole con 006 |
| `ui/src/lib/properName.ts` (+`.test`) | 2-3 (006 dueño, 007 consume; 004 BE) | medio | whole con 006 |
| `ui/src/pages/admin/types.ts` | 2+ (014 + otras master-data) | bajo | partial |
| `api/src/routes/types.ts` | 1 (cache scoped, NO 008) | bajo | do-not-extract-yet, coord con `routes/index.ts` |

---

## Detalle por archivo

### 1. `ui/src/router.tsx` — el archivo más mezclado del FE

| Campo | Valor |
| --- | --- |
| **Features** | 006 (base shell), 007 (actors), 008 (tenant), 010 (projects), 014 (master-data), 015 (dashboard cleanup), 016 (notifications/access), 017 (dollar/commerce), 018 (data-integrity) |
| **Tipo de mezcla** | Hunks separados en un único archivo de tabla de rutas; imports al tope + entradas de `routes` abajo. Dueño base = **feature-006** (lazy/Suspense, shell). |
| **Estrategia** | `partial` — traer SOLO los hunks de la feature en curso. 006 va primero (define `lazy`, Suspense, shell); las demás suman sus rutas encima. |
| **Riesgo** | ALTO — conflicto de merge garantizado si dos features tocan imports adyacentes. |

**Qué hunk pertenece a cada feature** (verificado en `git diff fefbe695..3ffcf60 -- ui/src/router.tsx`):

- **006**: `import { lazy } from "react"`, conversión de páginas pesadas a `lazy(() => import(...))` (`CurrentWorkOrders`, `CurrentLots`, `LegacyLots`, `SummaryResultsReport`, `AIAssistant`, `CurrentLabors`, `LegacyTasks`, `LegacySupplyMovements`, `LegacyStock`), el comentario sobre Suspense en `ProtectedLayout`.
- **007**: `import ActorsList / ArchivedActors / DuplicateActors from "./pages/admin/master-data/actors/*"` + rutas `master-data/actors*` (imports l.81-83, rutas l.197-226 en SOURCE).
- **008**: wiring de `TenantProvider` / contexto de tenant en el árbol de rutas protegidas (parte FE de 008).
- **010**: ruta `/admin/projects/new` apuntando a `CustomersList projectsOnly` + `master-data/projects/ArchivedProjects`. (010 NO trae el archivo en su flist: llega por wiring de 014.)
- **014**: el grueso de los `import` `master-data/*` (customers, fields, investors, managers, campaigns, crops, supplies, labors, commerce, dollar, entities) y sus rutas. Renombres `Legacy*` / `Current*`.
- **015**: borra `import DashboardV2` y la ruta `dashboard-v2` (líneas ~14, 132-133). NO traer los hunks de `ByFieldOrCropReportV2` / `InvestorContributionReportV2` (esos son cleanup de reports, no de 015).
- **016**: `import Notifications` + `Access`, rutas `/admin/notifications` y `/admin/access`.
- **017**: rutas `dollar` / `commerce` (`DollarForm`, `CommerceForm` bajo master-data).
- **018**: `import DataIntegrity from "./pages/admin/master-data/data-integrity/Integrity"` + ruta data-integrity.

**Sugerencia**:
```
# por cada feature, abrir y seleccionar SOLO sus hunks:
git restore -p --source=develop-problematico~1 -- ui/src/router.tsx
```
Orden recomendado: 006 → (007/008) → 014 → 010/015/016/017/018.

---

### 2. `api/src/routes/index.ts` — router BFF compartido

| Campo | Valor |
| --- | --- |
| **Features** | 007 (`/actors`), 008 (`/me` + cache scopeada por tenant + guard `bffRequireTenant`), 012 (`/ai` — ya existe en base, NO cambia por 012), 014 (`/investors` `/managers`, monta base) |
| **Tipo de mezcla** | Imports de routers al tope + `router.use(...)` por ruta + bloque de `cache` (helpers scoped) + middleware `verifyToken`/guard de tenant. |
| **Estrategia** | `partial` — por hunks. **014 monta el esqueleto base**; 007/008 suman los suyos. |
| **Riesgo** | ALTO — orden de `router.use` importa; conflicto entre 007/008/014. |

**Atribución de hunks** (verificado en el diff):

- **014**: `import investors from "./investors"`, `import managers from "./managers"`, `router.use("/investors", investors)`, `router.use("/managers", managers)`. También `import { CACHE_TTL_DEFAULT } from "../configService"` y `import insights from "./insights"`, `router.use("/insights", insights)`, `router.use("/form-options", options)`, `/projects`.
- **007**: `import actors from "./actors"` + `router.use("/actors", actors)`.
- **008**: `import me from "./me"` + `router.use("/me", me)`; bloque completo de cache scopeada por tenant (`scopedCachePrefix`, `scopedCacheKey`, `unscopedCacheKey`, `export const cache = {...}`); `import { requestContext } from "../requestContext"`; middleware `function isTenantOptionalPath(path)`, `router.use(verifyToken)` y el guard `configService.bffRequireTenant && !isTenantOptionalPath(...)`.
- **012**: `import ai`/`router.use("/ai", ai)` ya existe en `develop` base, NO se introduce en este rango → **no extraer desde 012**.

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- api/src/routes/index.ts
```

---

### 3. `ui/src/main.tsx` — bootstrap React

| Campo | Valor |
| --- | --- |
| **Features** | 006 (grueso: `ThemeProvider`, `AppToaster`, `ConfirmDialogProvider`, `ErrorBoundary`, `RouterProvider`), 008 (depende del árbol de providers) |
| **Tipo de mezcla** | El árbol JSX de providers es casi 100% de 006. 008 solo necesita que exista para colgar `TenantProvider` (que en SOURCE vive dentro de `ProtectedLayout`, no de `main.tsx`). |
| **Estrategia** | `whole` con **feature-006**. 008 no necesita tocar este archivo si su provider va en `ProtectedLayout.tsx`. |
| **Riesgo** | medio — depende de que existan `AppToaster`, `ConfirmDialogProvider`, `ErrorBoundary`, `lib/theme` (todos de 006). |

**Contenido** (verificado): `ErrorBoundary > ThemeProvider > ConfirmDialogProvider > RouterProvider + AppToaster`. Todo de 006.

**Sugerencia**: traer entero con 006:
```
git restore --source=develop-problematico~1 -- ui/src/main.tsx
```

---

### 4. `ui/package.json` — manifest FE

| Campo | Valor |
| --- | --- |
| **Features** | 021 (scripts lint/codegen), 024 (devDeps openapi), 006 (deps de design-system), 016/017 (deps de UI), **platform-migration** (swap `core-*` → `platform-*`, parte de new-cns3, NO es una feature de este paquete) |
| **Tipo de mezcla** | Bloques distintos del mismo manifest: `scripts` (021/024) vs `dependencies`/`resolutions` (platform-migration + 006/017) vs `devDependencies` (021/024/026). |
| **Estrategia** | `partial` por bloque. |
| **Riesgo** | ALTO — un mal split deja el lock incoherente o rompe build. |

**Atribución de bloques** (verificado en el diff):

- **021**: `scripts.lint` → `"eslint . && yarn lint:notify-leaks && yarn lint:responsive"`, `lint:notify-leaks`, `lint:responsive`.
- **024 (+021)**: `codegen:openapi` (script), devDeps `openapi-typescript ^7.13.0`, `swagger2openapi ^7.0.8`.
- **platform-migration (NO feature)**: swap `@devpablocristo/core-authn|core-browser|core-http|modules-*` → `@devpablocristo/platform-authn|platform-browser|platform-http|platform-ui-data-display`; bloque `resolutions` (axios/follow-redirects/form-data); bumps `axios ^1.16.0`, `react-router-dom ^7.12.0`, `react-to-pdf ^3.2.2`; quita `@heroicons/react`, `@material-tailwind/react`, `flowbite`, `xlsx`, `use-debounce`, `zod`.
- **006**: relacionado al design-system (drop material-tailwind/flowbite va de la mano del DS; `sonner` ya está en develop).
- **017**: `exceljs ^4.4.0` (reemplazo de xlsx para forms dollar/commerce), `react-window ^2.2.7` + `@types/react-window`.
- **026**: devDeps de testing (`@testing-library/react ^16.3.2`).

**Sugerencia**: separar **explícitamente** los deps platform (migración) del resto.
```
git restore -p --source=develop-problematico~1 -- ui/package.json
```
Importante: **NO** traer los hunks de `dependencies`/`resolutions` como parte de una feature; pertenecen a la migración core→platform.

---

### 5. `ui/yarn.lock` — lockfile FE

| Campo | Valor |
| --- | --- |
| **Features** | todas las FE que tocan deps (006/016/017/021 + platform-migration) |
| **Tipo de mezcla** | Generado. +1314 líneas netas, atado al swap platform. |
| **Estrategia** | **`regenerate`** — NO se edita a mano. |
| **Riesgo** | ALTO — traerlo aislado deja el lock incoherente con `package.json`. |

**Sugerencia**: tras fijar `ui/package.json`, regenerar:
```
cd ui && yarn install
```
NO usar `git restore` sobre `yarn.lock`.

---

### 6. `ui/tailwind.config.js`

| Campo | Valor |
| --- | --- |
| **Features** | 021/platform-migration (quitar `mtConfig()` de material-tailwind), 006 (`darkMode`, `screens`, `zIndex` tokens) |
| **Tipo de mezcla** | Hunks separados en el mismo objeto config. |
| **Estrategia** | `partial`. |
| **Riesgo** | medio. |

**Atribución**: quitar el plugin `mtConfig` = 021/platform (necesario para compilar sin material-tailwind); `darkMode`/`screens`/`zIndex` = 006 (design-system).

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- ui/tailwind.config.js
```

---

### 7. `ui/vite.config.ts`

| Campo | Valor |
| --- | --- |
| **Features** | 021/platform (manualChunks: `vendor-ui` solo lucide; `vendor-export` con `read-excel-file` en vez de xlsx), 006 (atado al swap de deps DS), 026 (referencia indirecta de test infra) |
| **Tipo de mezcla** | Hunks de `manualChunks` / build. |
| **Estrategia** | `partial`. |
| **Riesgo** | medio — el chunking sigue al swap de deps; sin xlsx/material-tailwind debe cambiar. |

**Nota**: `vite.config.ts` usa `cacheDir: ".vite"` (NO `.vite-smoke`), así que los artefactos `.vite-smoke` que borra 026 no se referencian acá.

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- ui/vite.config.ts
```

---

### 8. `ui/src/api/client.ts` — cliente axios FE

| Campo | Valor |
| --- | --- |
| **Features** | 006 (platform-authn, authStorage, httpErrorCopy, envelope `{success,data}`), 008 (interceptor `X-Tenant-Id` + `X-Skip-Tenant` + `.raw()`) |
| **Tipo de mezcla** | Hunks separados: imports/envelope (006) vs interceptor de tenant (008). |
| **Estrategia** | `partial`. |
| **Riesgo** | ALTO — sin el interceptor el FE no manda tenant; sin el envelope los hooks legacy rompen. |

**Atribución** (verificado):
- **006**: `import { createAuthenticatedAxiosClient } from "@devpablocristo/platform-authn/http/axios"`, `import { authTokenStorage } from "@/lib/authStorage"`, `import { httpErrorCopy } from "@/copy"`, el interceptor de **response** que envuelve 2xx en `{success:true,data:...}`.
- **008**: el interceptor de **request** que inyecta `X-Tenant-Id` (lee `ponti:tenant_id`/`tenant_id` de localStorage) y respeta/borra `X-Skip-Tenant`; exposición de `.raw()`.

**Sugerencia** (este archivo NO está en el flist de 008, traer por hunks):
```
git restore -p --source=develop-problematico~1 -- ui/src/api/client.ts
```

---

### 9. `api/src/clients/ApiClient.ts` — cliente BFF→BE

| Campo | Valor |
| --- | --- |
| **Features** | 008 (reenvía `X-Tenant-Id` al BE desde `requestContext`), base |
| **Tipo de mezcla** | Hunk único que agrega el header de tenant; el resto del archivo es base. |
| **Estrategia** | `partial` / manual-port. |
| **Riesgo** | medio — sin esto el tenant nunca llega al BE. NO está en el flist de 008. |

**Atribución** (verificado): el hunk agrega `const tenantId = requestContext.getTenantId()` y `"X-Tenant-Id": ... || tenantId` en los headers de salida. Todo 008.

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- api/src/clients/ApiClient.ts
```

---

### 10. `api/src/index.ts` — bootstrap BFF

| Campo | Valor |
| --- | --- |
| **Features** | 008 (inyecta `tenantId` en `requestContext.run`), 012 (NO modifica — solo lee `x-tenant-id`, ya cubierto por 008) |
| **Tipo de mezcla** | 4 líneas de 008. |
| **Estrategia** | `partial` (4 líneas). |
| **Riesgo** | bajo. |

**Atribución** (verificado): el único hunk lee `req.headers["x-tenant-id"]` y lo mete en `requestContext.run({ tenantId, ... })`. 100% 008. (En el doc de 012 figura como "NO extraer acá; feature-008".)

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- api/src/index.ts
```

---

### 11. `ui/src/api/aiClient.ts`

| Campo | Valor |
| --- | --- |
| **Features** | 006 (cambio para `fetchErrorAdapter`), 012 (lógica AI / consumo de `aiChat.ts`) |
| **Tipo de mezcla** | El rediseño/+90 líneas es de **006** (fe-design-system); la lógica AI subyacente es 012. |
| **Estrategia** | `partial`. |
| **Riesgo** | medio — consume tipos de `aiChat.ts`; si se trae 006/014 sin 012, referenciaría tipos viejos. |

**Atribución**: el cambio para `fetchErrorAdapter`/envelope = 006; el cliente AI en sí = 012. Coordinar: portar 012 (BE-first) ANTES de 006/014 para que el shape de `aiChat.ts` ya esté nuevo.

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- ui/src/api/aiClient.ts
```

---

### 12. `ui/src/types/aiChat.ts`

| Campo | Valor |
| --- | --- |
| **Features** | 012 (dueño del shape nuevo), consumido por 006 (`aiClient.ts`) y 014 (`AIAssistant.tsx`) |
| **Tipo de mezcla** | Archivo de tipos; el cambio de shape es de 012. |
| **Estrategia** | `whole` con **012** (BE-first). |
| **Riesgo** | medio — si 006/014 se portan sin 012, referencian tipos viejos. |

**Sugerencia**:
```
git restore --source=develop-problematico~1 -- ui/src/types/aiChat.ts
```
(Portar como parte de 012, antes que 006/014.)

---

### 13. `.gitignore`

| Campo | Valor |
| --- | --- |
| **Features** | 021 (bloquear `package-lock.json`), 026 (artefactos playwright: `ui/playwright-report/`, `ui/test-results/`), 006/024 (`docs/audit/drawers/...`) |
| **Tipo de mezcla** | Hunks distintos. |
| **Estrategia** | `partial`. |
| **Riesgo** | bajo. |

**Atribución** (del doc de 021): el bloqueo de `package-lock.json` es 100% 021; el hunk playwright (`ui/playwright-report/`, `ui/test-results/`, `docs/audit/drawers/...`) toca 026/006/024.

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- .gitignore
```

---

### 14. `ui/eslint.config.js`

| Campo | Valor |
| --- | --- |
| **Features** | 021 (config build/lint), 026 (ignores de `.vite-smoke` / artefactos test) |
| **Tipo de mezcla** | Hunks de `ignores` y reglas. |
| **Estrategia** | `partial`. |
| **Riesgo** | bajo. |

**Atribución**: las reglas/lint de build = 021; los `ignores` de `.vite-smoke/*` (artefactos que 026 borra) = 026.

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- ui/eslint.config.js
```

---

### 15. `ui/src/api/generated/index.ts` + `ui/src/api/generated/types.ts`

| Campo | Valor |
| --- | --- |
| **Features** | 008 (tipos `MeTenant`/`MeContext`, `internal_admin.*`), 021/024 (cliente generado / openapi pipeline) |
| **Tipo de mezcla** | **Generado** desde OpenAPI (cross-repo, BE docs/openapi = 024). |
| **Estrategia** | `regenerate` vía `yarn codegen:openapi` (NO a mano). |
| **Riesgo** | medio — `TenantContext.shared.ts` (008) importa `MeTenant` de acá; sin regenerar, 008 no compila. |

**Sugerencia**: tras portar el OpenAPI del BE (024) y tener el script (021):
```
cd ui && yarn codegen:openapi
```

---

### 16. `ui/src/lib/entityNameMatcher.ts` (+ `entityNameMatcher.test.ts`)

| Campo | Valor |
| --- | --- |
| **Features** | 006 (dueño — helper de display), 007 (`SmartEntityInput`, `ActorFormDrawer`, `useActors` lo consumen), 010 (`projectEditorScope.ts` usa `normalizeEntityName`) |
| **Tipo de mezcla** | Archivo nuevo, exclusivo de 006; el resto solo lo importa. |
| **Estrategia** | `whole` con **006**. 007/010 lo marcan `do-not-extract-yet` (lo trae 006). |
| **Riesgo** | medio — 007/010 no compilan sin él. |

**Sugerencia**:
```
git restore --source=develop-problematico~1 -- ui/src/lib/entityNameMatcher.ts ui/src/lib/entityNameMatcher.test.ts
```
(Portar con 006, antes de 007/010.)

---

### 17. `ui/src/lib/properName.ts` (+ `properName.test.ts`)

| Campo | Valor |
| --- | --- |
| **Features** | 006 (dueño FE — helper de display), 007 (`useActors`, `ActorFormDrawer`, `ActorsList`, `SmartEntityInput` usan `canonicalizeName`/`formatProperName`); relacionado a feature-004 (BE shared-text-propername) |
| **Tipo de mezcla** | Archivo nuevo, dueño 006; consumido por 007. |
| **Estrategia** | `whole` con **006**. |
| **Riesgo** | medio — revisar coherencia con la lógica BE de 004. |

**Sugerencia**:
```
git restore --source=develop-problematico~1 -- ui/src/lib/properName.ts ui/src/lib/properName.test.ts
```

---

### 18. `ui/src/pages/admin/types.ts`

| Campo | Valor |
| --- | --- |
| **Features** | 014 (master-data: tipos compartidos de páginas admin) + otras páginas admin del rango (010/015/016/017) |
| **Tipo de mezcla** | +3 líneas (tipos compartidos); cambio chico. |
| **Estrategia** | `partial`. |
| **Riesgo** | bajo. |

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- ui/src/pages/admin/types.ts
```

---

### 19. `api/src/routes/types.ts`

| Campo | Valor |
| --- | --- |
| **Features** | NINGUNA de identidad/tenant — el único hunk quita un `setImmediate(...)` alrededor de `cache.set` (pertenece al cambio de **cache scopeada**, ligado a `routes/index.ts`) |
| **Tipo de mezcla** | Hunk único de cache. |
| **Estrategia** | `do-not-extract-yet` — coordinar junto a `api/src/routes/index.ts` (cache scoped de 008), NO como cambio de identidad. |
| **Riesgo** | bajo. |

**Nota**: figura en el flist de 008 como dudoso; en realidad acompaña al bloque de cache scopeada de `routes/index.ts`.

---

### 20. `ui/src/pages/login/context/SelectionContext.tsx` + `SelectionContext.shared.ts`

| Campo | Valor |
| --- | --- |
| **Features** | 008 (listeners `ponti:tenant-changed`/`ponti:workspace-selection-reset` + reset; quita `@devpablocristo/core-browser/storage`), platform-migration (swap del import storage) |
| **Tipo de mezcla** | Hunks de listener/reset (008) + cambio de import storage (migración). El tipo `WorkspaceAllSelection` (`allSelection`) es dudoso si es estrictamente de 008. |
| **Estrategia** | `partial` / manual-port (no está limpio en el flist). |
| **Riesgo** | medio. |

**Atribución**: listeners de tenant-changed/reset = 008; swap `core-browser/storage` → `@/lib/...` = migración. Evaluar si `allSelection` se deja para su propia feature.

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- ui/src/pages/login/context/SelectionContext.tsx ui/src/pages/login/context/SelectionContext.shared.ts
```

---

### 21. `ui/src/layout/ProtectedLayout.tsx`

| Campo | Valor |
| --- | --- |
| **Features** | 008 (envolver `<TenantProvider>` alrededor de `<SelectionProvider>`), 006 (fallback Suspense para el `<Outlet />` lazy) |
| **Tipo de mezcla** | Provider tree (008) + Suspense wrapper (006). |
| **Estrategia** | `partial`. |
| **Riesgo** | medio — el Suspense de 006 es lo que evita el flicker de las páginas `lazy` del router. |

**Atribución**: `<TenantProvider>` = 008; `<Suspense fallback={...}>` envolviendo `<Outlet />` = 006 (atado al `lazy()` del `router.tsx`).

**Sugerencia**:
```
git restore -p --source=develop-problematico~1 -- ui/src/layout/ProtectedLayout.tsx
```

---

### 22. Archivos de `ui/src/pages/login/` con mezcla 006/008/016

Varios archivos de login mezclan el provider/nav de 008 con dark-mode/responsive de 006 y `Notification` de 016. No todos están en el flist de 008; se portan por hunks.

| Archivo | Features | Atribución | Estrategia |
| --- | --- | --- | --- |
| `ui/src/pages/login/Login.tsx` | 008, 006, 016 | 008 = nav a `/admin/dashboard`; 006 = dark-mode; 016 = `Notification` | `partial` (SOLO nav de 008 al portar 008) |
| `ui/src/layout/Navbar/Navbar.tsx` | 008, 006 | 008 = montaje de `<TenantSwitcher />`; 006 = dark-mode/responsive | `partial` (SOLO TenantSwitcher con 008) |
| `ui/src/layout/Menu.tsx` | 006, 008, 016 | 008 casi no toca; NO traer `/admin/access` (016) ni z-token (006) | `partial` |
| `ui/src/pages/login/context/AuthProvider.tsx` | 008, migración | 008 = `clearWorkspaceSelectionStorage()` + nav `/admin/dashboard`; migración = import `@/lib/authStorage` | `partial`/manual-port |
| `ui/src/pages/login/authService.ts` | 008, migración | ajustes de auth ligados a tenant + swap platform | `partial` |

**Sugerencia** (ejemplo Navbar):
```
git restore -p --source=develop-problematico~1 -- ui/src/layout/Navbar/Navbar.tsx
```

---

## Anexo: archivos que PARECEN compartidos pero NO lo son (un solo dueño)

Para evitar falsos positivos al portar:

- `api/src/routes/me.ts` — **whole, 100% feature-008** (archivo nuevo).
- `api/src/routes/actors.ts` — **whole, 100% feature-007** (archivo nuevo; requiere montaje en `routes/index.ts`).
- `ui/src/pages/login/context/TenantContext*.ts(x)`, `useTenant.ts`, `meContextPayload.ts(.test)` — **whole, 008** (nuevos).
- `ui/src/components/SmartEntityInput/SmartEntityInput.tsx`, `ActorFormDrawer.tsx`, `ActorsList.tsx`, `useActors` — **007** (consumen helpers de 006, pero son exclusivos de 007).
- `ui/src/pages/admin/projects/projectEditorScope.ts` — **010** (importa `entityNameMatcher` de 006 y campos de 007/009).
- `package-lock.json` (raíz) y `api/package-lock.json` — **whole (delete), 021** (locks npm espurios; yarn es el manager oficial).
- `lefthook.yml` — **whole, 022** (nuevo, autónomo; NO toca ningún `package.json`).
- Artefactos `ui/.vite-smoke/deps/*` (43 archivos + `_metadata.json` + `package.json`) — **whole (delete), 026** (subfeature 026a, sin gate; basura versionada, no referenciada por `vite.config.ts`).

> Estos NO van en este doc como "shared"; se listan acá solo para que nadie los confunda con archivos partial.

---

## DONE (ya en `develop`) — excluir de la extracción

Para que ningún hunk de estos se vuelva a portar:

- `table-select-filters`: FE #104.
- `reports-dark-mode`: FE #105 (la limpieza de json-tags del dominio BE NO está porteada → va en feature-027).
- `lot-metrics` / `total_tons`: FE+BE #117/#121/#124.
- `tentative-prices`: FE+BE #121/#124 → **excluir de feature-018**.
- `dependency-bumps` (go-jose, x/net): BE #124 → **excluir de feature-021** (BE, otro repo).
- `lots`/`workorders` (master-data) parcialmente DONE: #104/#117 → revisar al portar feature-014.
