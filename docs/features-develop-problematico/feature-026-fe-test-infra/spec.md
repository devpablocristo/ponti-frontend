# spec.md — feature-026 · fe-test-infra

- **id:** feature-026
- **slug:** fe-test-infra
- **nombre:** FE test infra
- **tipo:** tests
- **repo:** Frontend monorepo `ponti/web` (`ui/` React + `api/` BFF NodeJS, yarn)
- **merge:** FE independiente (Solo-FE)
- **existe-en-FE:** Sí (es íntegramente FE: `ui/e2e`, `ui/.vite-smoke`, `api/test`, `api/src/mocks`).
- **existe-en-BE:** No. En el repo BE (`core`/`platform`) no hay carpeta para esta feature. En `cross-repo-map` del BE debe figurar como **"sin cambios BE"**.

## Resumen

Infraestructura de tests del monorepo FE. Agrupa tres cosas que cambian juntas en el rango:

1. **E2E Playwright (`ui/e2e`)**: nuevos specs y actualización del helper de sesión `helpers/auth.ts` para soportar contexto multitenant (`tenant_id` + `GET /api/v1/me/context`) y un workspace E2E nuevo (customer 14 "SOALEN SRL" / project 29 "CAMPO COTY", antes 17/30). Specs viejos (`lots`, `workorders-stock`) pasan de asserts hardcodeados (LOTE 54, "u$ 150", totales 21) a asserts data-driven (leen el payload real y validan estructura).
2. **Tests unitarios del BFF (`api/test`)**: dos suites nuevas (`authMiddleware.test.js`, `configService.test.js`) con `node:test`, y dos suites existentes (`lotsRoute`, `workOrdersRoute`) actualizadas al nuevo contrato de query/cache (customer_id + campaign_id, `buildForwardQuery`, orden de params, cache keys `lots:customer:…:campaign:…`).
3. **Limpieza de artefactos**: borrado de 44 archivos `ui/.vite-smoke/deps/*` (cache de optimize-deps de Vite) que estaban commiteados por error (ya ignorados por `eslint.config.js`).

## Objetivo

Dejar la suite de tests FE consistente con el dominio "new-cns3" (multitenancy, actores, projects unificados, lot-metrics) y eliminar basura de build versionada.

## Problema

- El helper `auth.ts` viejo no inyectaba `tenant_id` ni resolvía el tenant vía `/me/context`; los specs nuevos de actores/identity/projects no podían autenticarse contra el dominio multitenant.
- Specs `lots`/`workorders-stock` estaban acoplados a datos de seed concretos (LOTE 54, supply_id=549, totales fijos) y se rompían al cambiar el dataset.
- `api/test/lotsRoute` y `workOrdersRoute` validaban un contrato HTTP/cache antiguo (sin customer/campaign, sin `buildForwardQuery`).
- 44 archivos de `.vite-smoke/deps` se commitearon (cache de Vite); ensucian el repo y los diffs.

## Alcance en este repo (FE)

- `api/test/*` (unit del BFF), `api/src/mocks/handlers.ts` (mock MSW).
- `ui/e2e/*` (Playwright specs + helper auth).
- `ui/.vite-smoke/deps/*` (borrado de artefactos).

## Alcance en el otro repo (BE)

Ninguno. **Sin cambios BE.** Esta feature solo testea/mockea contratos que el BE expone; no toca código BE.

## Fuera de alcance

- El código de producción que estos tests ejercitan (componentes `CustomerEditor`, drawers, stores de actores/identity/projects, helpers BFF `forwardQuery`/`queryParams`/`configService`/`authMiddleware`). Eso pertenece a features **006/007/008/010/011/014/018** y NO se porta acá.
- Config de tooling de tests (`ui/playwright.config.ts`, `ui/package.json` scripts, `api/package.json`, `ui/vite.config.ts`). **No están en el flist** de esta feature (aunque `ui/package.json` y `ui/vite.config.ts` SÍ cambian en el rango → son de otras features; ver dependencies.md).
- json-tags cleanup del dominio BE → feature **027**.

## Comportamiento esperado

- `yarn --cwd api test` (= `npm run build && node --test test`) pasa: las 4 suites compilan contra `api/dist/**` y validan el contrato actual.
- `yarn --cwd ui test:e2e` (Playwright) levanta sesión multitenant válida vía `installAuthenticatedSession(page)` y corre los specs nuevos y los actualizados.
- El repo no versiona más `.vite-smoke/deps`.

## Estado en dp~1 (SHA 3ffcf60)

- Specs nuevos creados y completos (147–308 líneas c/u). Helper `auth.ts` reescrito. Tests BFF nuevos creados. Borrados de `.vite-smoke` aplicados.
- **Riesgo de incompletitud**: los diffs e2e (`auth.ts`, `lots`, `workorders-stock`) traen **daño de whitespace** (líneas re-indentadas con tabs mezclados con espacios). `git diff --check` lo va a marcar.
- Tests dependen de código de producción de otras features: si esas features NO están en `develop`, los specs e2e fallarán (selectores/rutas inexistentes) y los unit del BFF no compilarán (faltarán `dist/utils/forwardQuery`, `dist/configService`, `dist/routes/authMiddleware`).

## Criterios de aceptación

1. `api/test` compila y pasa con `node --test` (requiere helpers BFF de 008/011 presentes).
2. `ui/e2e` specs corren contra el workspace 29/CAMPO COTY y resuelven tenant.
3. `git ls-files ui/.vite-smoke/` devuelve vacío.
4. `git diff --check` limpio (corregir whitespace antes del PR).

## Endpoints / contratos tocados (solo referenciados por tests/mocks)

- `GET /api/v1/me/context` → `{ current_tenant_id, tenants[] }` (consumido por `auth.ts`).
- `GET /api/v1/lots?` (customer_id/project_id/campaign_id/field_id, page/per_page).
- `GET /api/v1/stock?project_id=…` (antes `/api/v1/stock/:id`).
- `GET /api/v1/work-orders?` y `/work-orders/filter-rows?`.
- BFF helpers: `parseFieldProjectQueryParams`, `buildLotsQueryParams`, `buildForwardQuery`, `buildWorkOrderScopeParams`, cache keys `lots:customer:*:campaign:*`, `kpis:lots:*`.

## Modelos / tipos

No define tipos propios; consume DTOs de lots/work-orders/actors/projects de otras features.

## UI afectada (solo via e2e)

`CustomerEditor` (editor unificado de project/customer/lot), drawers de proyecto/responsables/inversores, panel de actores con archive (crudar), stock, lotes, work-orders.

## DB

Ninguna. (Sin migraciones.)

## Tests afectados

- Nuevos: `api/test/authMiddleware.test.js`, `api/test/configService.test.js`, `ui/e2e/actors-archive-crudar.spec.ts`, `ui/e2e/customer-editor-canonical.spec.ts`, `customer-editor-identity.spec.ts`, `customer-editor-responsive.spec.ts`, `customer-editor-smart-entity.spec.ts`, `drawer-audit.spec.ts`, `project-responsibles-admin-drawer.spec.ts`.
- Modificados: `api/test/lotsRoute.test.js`, `api/test/workOrdersRoute.test.js`, `ui/e2e/lots.spec.ts`, `ui/e2e/workorders-stock.spec.ts`, `ui/e2e/helpers/auth.ts`.
- Mock: `api/src/mocks/handlers.ts`.

## Dependencias

- **Intra-repo (FE):** 006 (design-system, base), 007 (actor-system UI), 008 (identity-tenant-context: `/me/context`, `tenant_id`, helper `configService`/`authMiddleware`), 010 (projects / CustomerEditor unificado), 011 (campaign-dto-projectid: customer_id/campaign_id en queries), 014 (master-data pages), 018 (data-integrity-admin: drawers/archive). Lot-metrics ya DONE (#117/#121/#124) → ya en `develop`.
- **Cross-repo (BE):** ninguna dura. Los contratos que se mockean los provee el BE de 008/010/011, pero acá no se mergea BE.

## Riesgos

- **Funcional:** specs e2e flaky o falsos-rojos si el dataset/seed difiere del workspace 29/CAMPO COTY.
- **Técnico:** daño de whitespace en 3 archivos e2e; tests BFF no compilan si faltan los helpers `dist/` de otras features.
- **Extracción parcial:** traer los specs sin su código de producción → suite roja permanente.

## DECISIÓN recomendada

**Partir en subfeatures + arreglar antes.**

- **026a (seguro, ahora):** borrar `ui/.vite-smoke/deps/*` + (opcional) agregar `.vite-smoke` a `ui/.gitignore`. No depende de nada.
- **026b (tras 008/011):** `api/test` nuevos+modificados + `handlers.ts` (partial). Validar que `api/dist` tenga `forwardQuery`/`configService`/`authMiddleware`.
- **026c (tras 007/008/010/014/018):** `ui/e2e` (auth.ts primero, luego specs). Corregir whitespace con `git diff --check`.

No extraer "tal cual" en un solo PR: arrastra dependencias de 6+ features de producción.
