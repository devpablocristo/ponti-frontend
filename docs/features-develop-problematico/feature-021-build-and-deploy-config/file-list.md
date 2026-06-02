# file-list.md — feature-021 Build & deploy config (FE)

Fuente: `cat /tmp/flists/fe-021.txt`. SOURCE = `develop-problematico~1` (SHA `3ffcf60`). Diff base `fefbe695..3ffcf60`.

Leyenda extracción: `whole-file` = traer archivo completo desde SOURCE · `partial-hunks` = solo algunos hunks (`git restore -p`) · `manual-port` = re-aplicar a mano · `do-not-extract-yet` = bloqueado por otra feature.

## Propios (config genuina, autocontenida)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|------|--------|------|-------------------|-----------|--------|--------|-----------|
| `.gitignore` | M | config | bloquear `package-lock.json`, ignorar artefactos playwright | partial-hunks | el hunk de playwright (`ui/playwright-report/`, `ui/test-results/`, `docs/audit/drawers/...`) toca también 026/006; el bloqueo de `package-lock.json` es 100% 021 | bajo | alta |
| `api/eslint.config.js` | A | config | flat-config ESLint v9 para BFF | whole-file | nuevo, autocontenido | bajo | alta |
| `api/.eslintignore` | D | config | eliminar ignore deprecado (reemplazado por `ignores` en flat-config) | whole-file (delete) | par natural del create de arriba | bajo | alta |
| `ui/knip.json` | A | config | detección de dead-code (knip) | whole-file | nuevo, autocontenido; ignora `e2e/helpers/auth.ts`, `scripts/generate-ai-types.mjs`, `src/test/setup.ts` | bajo | alta |
| `ui/scripts/lint-notify-leaks.sh` | A | script CI | guardrail: prohíbe JSON crudo/alert/import directo de sonner | whole-file | nuevo; **referencia** `lib/notify.ts` y `components/AppToaster.tsx` que viven en otra feature, pero el script no rompe si no existen (solo grep) | medio | alta |
| `ui/scripts/lint-responsive-antipatterns.sh` | A | script CI | guardrail: prohíbe `z-[N]`/`window.innerWidth` crudos | whole-file | nuevo; referencia escala z de tailwind (006) y `hooks/useBreakpoint.ts` | medio | alta |
| `package-lock.json` | D | lockfile | borrar lock de npm en raíz (13 líneas, espurio) | whole-file (delete) | yarn es el manager oficial | bajo | alta |
| `api/package-lock.json` | D | lockfile | borrar lock de npm en api (3664 líneas) | whole-file (delete) | api usa yarn | bajo | alta |

## Compartidos (partial-hunks — sirven a varias intenciones)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|------|--------|------|-------------------|-----------|--------|--------|-----------|
| `ui/package.json` | M | manifest | scripts lint/codegen (021) + swap deps core→platform (platform-migration) + exceljs/react-window (006/017) | partial-hunks | el bloque `scripts` (lint:notify-leaks, lint:responsive, codegen:openapi) es 021; los bloques `dependencies`/`resolutions` son platform-migration; openapi-typescript/swagger2openapi devDeps son 021+024 | **alto** | media |
| `ui/yarn.lock` | M | lockfile | lock regenerado tras el swap platform (+980/-334) | do-not-extract-yet | NO se edita a mano; se regenera con `yarn install` DESPUÉS de fijar `package.json`. Traerlo aislado deja el lock incoherente | **alto** | alta |
| `ui/tailwind.config.js` | M | config | quitar `mtConfig()` (021/platform) + darkMode/screens/zIndex (006) | partial-hunks | quitar el plugin `mtConfig` es necesario para que compile sin material-tailwind (021); darkMode/screens/zIndex son design-system (006) | medio | media |
| `ui/vite.config.ts` | M | config | manualChunks: vendor-ui solo lucide; vendor-export read-excel-file en vez de xlsx | partial-hunks | sigue al swap de deps (sin xlsx/material-tailwind el chunking debe cambiar) — atado a platform-migration/006 | medio | media |
| `docker-compose.yml` | M | infra | simplificar command ui, CHOKIDAR polling, puerto BFF 3001 | partial-hunks | CHOKIDAR + simplificación de command son 021 puros; el `command` viejo enumeraba paquetes `@devpablocristo/core-*` (platform); **el cambio de puerto `3000→3001` es decisión que hay que confirmar** | medio | media |

## Requeridos por dependencia (de otras features, llegan por acople)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|------|--------|------|-----|-----------|--------|--------|-----------|
| `ui/src/api/generated/index.ts` | A | codegen barrel | aliases de tipos OpenAPI | do-not-extract-yet | producto del codegen; depende del swagger del BE (feature-024). Si se trae, los tipos referencian DTOs de 018 (`IntegrityReport`) y 008 (`MeContext`) | medio | media |
| `ui/src/api/generated/types.ts` | A | codegen output | tipos auto-generados (201 líneas) | do-not-extract-yet | auto-generado; regenerar con `yarn codegen:openapi` una vez que exista `core/docs/openapi/swagger.yaml` (024 BE). NO editar a mano | medio | media |

## Dudosos / a confirmar con humano

| path | status | tipo | duda | acción |
|------|--------|------|------|--------|
| `docker-compose.yml` (hunk puerto) | M | infra | ¿`3001:3000` es intencional o resto de pruebas locales? | confirmar antes de extraer; si dudoso, dejar `3000:3000` |
| `ui/scripts/lint-*.sh` | A | script CI | referencian módulos de 006 (notify/useBreakpoint/escala z). En un PR de 021 solo, ¿se cablean en `lint` aunque esos módulos no existan? | Cablear `lint:notify-leaks`/`lint:responsive` SOLO si 006 ya está mergeado; si no, dejar scripts pero NO en el target `lint` |

## NO traer todavía en 021

| path | motivo | feature destino |
|------|--------|-----------------|
| `api/src/clients/ApiClient.ts` | hunk agrega header `X-Tenant-Id` (tenant context), no es config | feature-008 |
| hunks `dependencies`/`resolutions` de `ui/package.json` | swap core→platform | platform-migration (new-cns3) |
| `ui/yarn.lock` | regenerado, atado al swap | platform-migration |
| hunks darkMode/screens/zIndex de `ui/tailwind.config.js` | design-system | feature-006 |
| `ui/src/api/generated/*` | depende de swagger BE | feature-024 |
