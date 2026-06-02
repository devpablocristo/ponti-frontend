# dependencies.md — feature-021 Build & deploy config (FE)

## Depende-de

### Fuertes (bloquean Ola B)
- **platform-migration (new-cns3)** — `ui/package.json` reemplaza `@devpablocristo/core-*` por `@devpablocristo/platform-*` y quita `@material-tailwind/react`, `@heroicons/react`, `flowbite`, `xlsx`. `ui/yarn.lock` (+980/-334) y `ui/vite.config.ts` (manualChunks sin xlsx/mt) son consecuencia directa. Sin la migración, `yarn install` falla.
- **feature-024 (openapi-and-docs, BE)** — `ui/src/api/generated/types.ts` se genera con `yarn codegen:openapi` desde `../../core/docs/openapi/swagger.yaml`. Sin ese swagger en el BE, no hay codegen.
- **feature-006 (fe-design-system)** — `ui/tailwind.config.js` agrega `darkMode:"class"`, `screens` (xs/3xl) y la escala `zIndex`. El script `lint-responsive-antipatterns.sh` exige esa escala y `hooks/useBreakpoint.ts`. `lint-notify-leaks.sh` exige `lib/notify.ts` + `components/AppToaster.tsx`.

### Débiles
- **feature-026 (fe-test-infra)** — el hunk de `.gitignore` que ignora `ui/playwright-report/` y `ui/test-results/`, y los `ignores: ["playwright-report","test-results"]` en `ui/eslint.config.js`. Funciona aunque 026 no esté (solo son patrones de ignore).
- **feature-017 (fe-dollar-commerce-forms) / 013 (csv-export)** — `exceljs` y `read-excel-file` (reemplazo de `xlsx`) los consumen features de import/export; aquí solo viajan en deps/chunking.

### Inciertas
- **feature-018 (data-integrity-admin)** y **feature-008 (identity-tenant-context)** — `generated/index.ts` exporta aliases `IntegrityReport`/`IntegrityCheck` (018) y `MeContext`/`MeUser`/`MeTenant` (008). Es solo tipado; no fuerza orden de merge, pero el swagger fuente debe contener esos handlers.

## Bloquea-a
- **Nada de forma dura.** La Ola A (config genuina) es hoja: no la requiere ninguna otra feature para compilar. Mejora CI/determinismo.
- La Ola B habilita el guardrail de los scripts de lint para 006, pero 006 puede mergear sin ellos.

## Cross-repo
- **feature-021 BE** (mismo slug): Dockerfile/compose + `go.mod`/`go.sum`. Excluir bumps go-jose/x/net (#124, ya done). Independiente de FE salvo el codegen.
- **feature-024 BE**: provee `core/docs/openapi/swagger.yaml` → fuente de `codegen:openapi`. **Debe ir antes** si se quiere regenerar el cliente.
- **feature-008 BE**: el header `X-Tenant-Id` (hunk de `ApiClient.ts` que aquí NO extraemos) debe tener su contraparte BE.

## Artefactos compartidos / load-bearing
| artefacto | features que lo tocan | nota |
|-----------|----------------------|------|
| `ui/package.json` | 021 (scripts), platform-migration (deps), 006/017 (exceljs), 024 (openapi devdeps) | partial-hunks obligatorio |
| `ui/yarn.lock` | platform-migration (principal), 021 | regenerar, no copiar |
| `ui/tailwind.config.js` | 021 (quitar mtConfig), 006 (darkMode/screens/zIndex) | partial-hunks |
| `ui/vite.config.ts` | platform-migration/006 (chunks) | partial-hunks |
| `docker-compose.yml` | 021 (chokidar/puerto), platform (command) | partial-hunks |
| `.gitignore` | 021 (lockblock), 026 (playwright) | partial-hunks |
| `ui/src/api/generated/*` | 024 (fuente), 008/018 (tipos referidos) | regenerar |

## Recomendación de orden
1. **platform-migration** (mergea deps + regenera `yarn.lock`).
2. **feature-006** (design-system: tailwind darkMode/screens/zIndex + módulos notify/theme/useBreakpoint).
3. **feature-024 BE** (swagger.yaml) → luego `yarn codegen:openapi` en FE.
4. **feature-021 FE Ola A** puede ir en **cualquier momento** (incluso primero), porque es config aislada.
5. **feature-021 FE Ola B** (cableo de scripts en `lint`, vite chunks finales) DESPUÉS de 1-3.
6. **feature-008** lleva el hunk de `ApiClient.ts`.
