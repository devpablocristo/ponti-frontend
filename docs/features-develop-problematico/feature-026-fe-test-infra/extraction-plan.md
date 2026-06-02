# extraction-plan.md — feature-026 · fe-test-infra

- **repo:** `ponti/web` (monorepo FE: `ui/` + `api/`)
- **rama base:** `develop` (tip `8c25e88`)
- **SOURCE:** `develop-problematico~1` (SHA **3ffcf60**). NUNCA usar `develop-problematico` (tip = restore/vacío).
- **merge:** FE independiente (no requiere PR BE; el BE figura como "sin cambios BE").

## Estrategia: 3 sub-PRs (no un solo PR)

Esta feature arrastra dependencias de 6+ features de producción. Partirla evita que la suite quede roja:

### Sub-PR 026a — cleanup `.vite-smoke` (SEGURO, ya, sin gate)
- **rama:** `pr/feature-026a-vite-smoke-cleanup-fe`
- **contenido:** borrado de los 44 `ui/.vite-smoke/deps/*` + (opcional) añadir `.vite-smoke` a `ui/.gitignore`.
- **depende de:** nada.

### Sub-PR 026b — unit tests BFF (tras 008 + 011 en develop)
- **rama:** `pr/feature-026b-api-tests-fe`
- **contenido:** `api/test/authMiddleware.test.js`, `api/test/configService.test.js` (whole-file); `api/test/lotsRoute.test.js`, `api/test/workOrdersRoute.test.js`, `api/src/mocks/handlers.ts` (partial-hunks).
- **gate:** `api/src/configService.ts`, `api/src/routes/authMiddleware.ts`, `api/src/utils/forwardQuery.ts` deben existir y compilar (`npm run build` en `api/`).

### Sub-PR 026c — e2e Playwright (tras 007/008/010/014/018 en develop)
- **rama:** `pr/feature-026c-e2e-fe`
- **contenido:** `ui/e2e/helpers/auth.ts` (partial-hunks, primero); luego los 7 specs nuevos (whole-file) + `lots.spec.ts` y `workorders-stock.spec.ts` (partial-hunks). Corregir whitespace.
- **gate:** UI de CustomerEditor/drawers/actores presente en `develop`.

> Si el orquestador exige UN solo PR: usar rama `pr/feature-026-fe-test-infra-fe` y mergear DESPUÉS de 006/007/008/010/011/014/018. Igual conviene separar 026a porque no necesita gate.

## PR title + description (PR combinado, si se hace uno solo)

**Title:** `test(fe): infra de tests e2e/BFF + limpieza de artefactos .vite-smoke (feature-026)`

**Description:**
```
Porta la infra de tests FE desde develop-problematico~1 (3ffcf60).

Incluye:
- e2e Playwright: helper auth multitenant (tenant_id + /me/context, workspace CAMPO COTY/29)
  y specs nuevos (customer-editor-*, actors-archive-crudar, drawer-audit,
  project-responsibles-admin-drawer); lots/workorders-stock pasan a asserts data-driven.
- unit BFF (node:test): authMiddleware, configService nuevos; lotsRoute/workOrdersRoute
  actualizados al contrato customer/campaign + buildForwardQuery.
- cleanup: borra 44 archivos versionados de ui/.vite-smoke/deps (cache de Vite).

Sin cambios BE. Depende de que el código de producción de las features 006/007/008/010/011/014/018
ya esté en develop. Whitespace de los specs e2e corregido (git diff --check limpio).
```

## Pasos ordenados (PR combinado)

1. `git -C <repo> checkout develop && git pull`
2. `git checkout -b pr/feature-026-fe-test-infra-fe`
3. **Cleanup** (whole-file delete): traer los borrados de `.vite-smoke`.
4. **api whole-file** (tests nuevos).
5. **api partial** (lotsRoute, workOrdersRoute, handlers.ts).
6. **e2e helper** primero (`auth.ts` partial), luego specs whole-file y partial.
7. Corregir whitespace, `git diff --check`.
8. `npm --prefix api run build && node --test api/test` ; `yarn --cwd ui test:e2e` (o al menos `playwright test --list`).

## Comandos git SUGERIDOS (NO ejecutar acá; son para un humano)

```bash
REPO=/home/pablocristo/Proyectos/pablo/ponti/web
SRC=develop-problematico~1   # 3ffcf60

git -C "$REPO" checkout develop
git -C "$REPO" checkout -b pr/feature-026-fe-test-infra-fe

# 026a cleanup (borrados whole-file)
git -C "$REPO" rm -r ui/.vite-smoke/deps   # estos paths YA no existen en SRC; rm directo es lo correcto

# 026b api — whole-file (creados)
git -C "$REPO" checkout "$SRC" -- \
  api/test/authMiddleware.test.js \
  api/test/configService.test.js

# 026b api — partial (mezclados con otras features)
git -C "$REPO" restore -p --source="$SRC" -- \
  api/test/lotsRoute.test.js \
  api/test/workOrdersRoute.test.js \
  api/src/mocks/handlers.ts

# 026c e2e — helper partial primero
git -C "$REPO" restore -p --source="$SRC" -- ui/e2e/helpers/auth.ts

# 026c e2e — specs nuevos whole-file
git -C "$REPO" checkout "$SRC" -- \
  ui/e2e/actors-archive-crudar.spec.ts \
  ui/e2e/customer-editor-canonical.spec.ts \
  ui/e2e/customer-editor-identity.spec.ts \
  ui/e2e/customer-editor-responsive.spec.ts \
  ui/e2e/customer-editor-smart-entity.spec.ts \
  ui/e2e/drawer-audit.spec.ts \
  ui/e2e/project-responsibles-admin-drawer.spec.ts

# 026c e2e — specs modificados partial
git -C "$REPO" restore -p --source="$SRC" -- \
  ui/e2e/lots.spec.ts \
  ui/e2e/workorders-stock.spec.ts

# verificar whitespace (los specs e2e traen tabs mezclados)
git -C "$REPO" diff --check
```

> Para el borrado de `.vite-smoke` también sirve `git checkout "$SRC" -- ui/.vite-smoke` (como en SRC ya no existen, deja el árbol sin ellos) seguido de `git add -A ui/.vite-smoke`. Preferir `git rm -r` por claridad.

## Archivos enteros vs parciales

- **Enteros (creados):** 2 unit BFF + 7 specs e2e + (borrado) 44 `.vite-smoke`.
- **Parciales:** `auth.ts`, `handlers.ts`, `lotsRoute.test.js`, `workOrdersRoute.test.js`, `lots.spec.ts`, `workorders-stock.spec.ts`.

## Migraciones / tests a incluir

- Migraciones: **ninguna**.
- Tests: todo el flist ES tests/mocks/artefactos.

## Dependencias previas (deben estar en develop)

006, 007, 008, 010, 011, 014, 018. Lot-metrics (#117/#121/#124) y table-select-filters (#104), reports-dark-mode (#105) ya están DONE en develop (tip incluye #120).

## Coordinación con el otro repo

**FE-independiente.** No hay PR BE asociado. Confirmar solo que el BE desplegado expone los contratos que se mockean (`/me/context`, lots/work-orders con customer/campaign) — pero eso ya lo cubren las features BE 008/010/011, no este PR.

## Qué NO traer

- Código de producción (`ui/src/**`, `api/src/configService.ts`, `authMiddleware.ts`, `forwardQuery.ts`) → es de otras features.
- `ui/package.json`, `ui/vite.config.ts`, `api/package.json`, `ui/playwright.config.ts` → NO en este flist; pertenecen a tooling/otras features.
- json-tags cleanup → feature 027 (BE).

## Qué podría romperse

- `api/test` no compila si faltan `dist/configService`, `dist/routes/authMiddleware`, `dist/utils/forwardQuery`.
- e2e rojos si CustomerEditor/drawers/actores no están en `develop`, o si el seed no matchea workspace 29/CAMPO COTY.
- `git diff --check` con warnings de whitespace en los 3 specs e2e modificados.

## Cómo detectar extracción incompleta

- `node --test api/test` con error `Cannot find module '../dist/...'` → falta dependencia de 008/011.
- `playwright test --list` OK pero specs fallan con "selector not found" → falta UI de producción.
- `git grep -n "vite-smoke" ui/` debe quedar solo en `eslint.config.js`.

## Qué validar antes del PR

1. `npm --prefix api ci && npm --prefix api run build && node --test api/test` verde.
2. `yarn --cwd ui playwright test --list` enumera los 9 specs sin error de import.
3. `git diff --check` limpio.
4. `git ls-files ui/.vite-smoke` vacío.

## Qué hacer después de mergear

- Si quedó separado: mergear 026a → luego 026b (tras 008/011) → luego 026c (tras 007/010/014/018).
- Agregar `.vite-smoke` a `ui/.gitignore` si no se hizo en 026a.
- Correr la suite e2e completa una vez en CI para detectar flakiness del nuevo workspace.
