# notes-for-future-agent.md — feature-026 · fe-test-infra

## Resumen corto

Infra de tests del monorepo FE (`ponti/web`). 59 paths en el flist = 5 `api/` + 44 `ui/.vite-smoke/deps` + 10 `ui/e2e`. Es **Solo-FE** (sin cambios BE). Tres cosas independientes empaquetadas juntas: cleanup de artefactos Vite, unit tests del BFF, y e2e Playwright multitenant.

## Qué está en FE y qué en BE

- **FE:** todo. e2e Playwright, unit `node:test` del BFF, mock MSW, borrado de cache Vite.
- **BE:** nada. En el cross-repo-map del BE poné **"sin cambios BE"**.

## Archivos esenciales

- `ui/e2e/helpers/auth.ts` — **el más importante**. Base de toda la suite e2e. Cambia a multitenant (`tenant_id` + `GET /api/v1/me/context`), exporta `e2eWorkspace` (antes privado `workspace`) y cambia el workspace a customer 14 / project 29 ("SOALEN SRL" / "CAMPO COTY"). Si esto no entra primero, ningún spec corre.
- `api/test/configService.test.js`, `api/test/authMiddleware.test.js` — unit nuevos; `require("../dist/...")` → necesitan build con código de 008.

## Archivos peligrosos / mezclados (partial-hunks)

- `ui/e2e/helpers/auth.ts`, `ui/e2e/lots.spec.ts`, `ui/e2e/workorders-stock.spec.ts` → **traen daño de whitespace** (tabs mezclados con espacios en líneas re-indentadas). `git diff --check` lo marca. Corregir SIEMPRE.
- `api/src/mocks/handlers.ts` → reindent masivo que tapa el cambio real (elimina login/JWT: `jsonwebtoken`, `generateToken`, `MOCK_USER` → auth movido a middleware en 008). Aplicar por hunks.
- `api/test/lotsRoute.test.js`, `workOrdersRoute.test.js` → contrato customer/campaign + `buildForwardQuery` (011) + reorden de params (lot-metrics, ya DONE).

## Decisiones ya tomadas

- **Partir en 3 sub-PRs:** 026a (cleanup `.vite-smoke`, sin gate, ya), 026b (api unit, tras 008+011), 026c (e2e, tras 007/008/010/014/018).
- `.vite-smoke/deps` se BORRA (era cache de Vite versionado por error; `vite.config.ts` usa `.vite`, no `.vite-smoke`; ya está en `eslint.config.js` ignores). Es lo único 100% seguro de portar ya.
- No traer código de producción ni runners (`ui/package.json`, `playwright.config.ts`, `api/package.json` NO están en el flist).

## Dudas abiertas

- ¿Están los runners en develop? `ui/package.json` cambia en el rango (otra feature). Verificar antes de 026b/026c.
- ¿El seed/entorno E2E tiene customer 14 / project 29? Si no, e2e rojos.
- Orden 007 vs 010 para `customer-editor-smart-entity.spec.ts`.

## Comandos para mirar primero

```bash
REPO=/home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-026.txt
git -C "$REPO" diff fefbe695..3ffcf60 -- ui/e2e/helpers/auth.ts
git -C "$REPO" diff fefbe695..3ffcf60 -- api/test/lotsRoute.test.js
git -C "$REPO" show 3ffcf60:api/test/configService.test.js
git -C "$REPO" show 3ffcf60:ui/eslint.config.js | grep smoke   # confirma que .vite-smoke está ignorado
git -C "$REPO" ls-tree -r --name-only 8c25e88 -- ui/.vite-smoke | head  # confirma que está trackeado en develop
```

## Errores a evitar

- NO usar `develop-problematico` (tip = restore vacío). SOURCE = `develop-problematico~1` = `3ffcf60`.
- NO mergear 026b/026c antes de sus dependencias → CI roja. Solo 026a es libre.
- NO commitear specs con `.skip` para "arreglar" tests rojos por dependencias faltantes.
- NO traer `ui/src/**` ni `api/src/configService.ts`/`authMiddleware.ts`/`forwardQuery.ts` (son de otras features).
- NO olvidar `git diff --check` (whitespace).

## Camino más seguro

1. PR aislado 026a: `git rm -r ui/.vite-smoke/deps` + `.gitignore`. Mergeable hoy.
2. Cuando 008+011 estén en develop: 026b (api unit) — build + `node --test`.
3. Cuando 007/008/010 (+014/018) estén: 026c (e2e) — auth.ts primero, corregir whitespace, `playwright test --list`.

## Qué PR del otro repo va antes/después

Ninguno. Sin cambios BE. La feature es FE-independiente; coordinar solo dentro del repo FE con las features de producción listadas.
