# spec.md — feature-021 Build & deploy config (FE)

## Identidad
- **id:** feature-021
- **slug:** build-and-deploy-config
- **nombre:** Build & deploy config
- **tipo:** config
- **repo:** Frontend monorepo (`ui/` React + `api/` BFF NodeJS, yarn) — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE:** SÍ (este paquete)
- **existe-en-BE:** SÍ — FULL-STACK con el mismo feature-021. El BE aporta Dockerfile/compose, `go.mod`/`go.sum`. **OJO:** los dependency bumps `go-jose/v4` y `x/net` YA están porteados (#124) y se EXCLUYEN de 021.
- **merge:** por repo (cada repo abre su PR de 021).

## Resumen
Agrupa los cambios de **configuración de build, tooling de lint y orquestación local** del FE monorepo: `.gitignore`, `docker-compose.yml`, configs de ESLint (`ui/` y `api/`), `knip.json`, scripts de lint custom (`lint-notify-leaks.sh`, `lint-responsive-antipatterns.sh`), `ui/vite.config.ts`, `ui/tailwind.config.js`, `ui/package.json` y lockfiles (`ui/yarn.lock`, borrado de `package-lock.json` raíz y `api/package-lock.json`), más el cliente OpenAPI generado (`ui/src/api/generated/`).

## Objetivo
Dejar el repo con: (1) un único package manager declarado (yarn) y `package-lock.json` espurios bloqueados/borrados; (2) ESLint v9 flat-config homogéneo en ui y api; (3) guardrails de CI mediante scripts de lint custom; (4) chunking de Vite y plugins de Tailwind alineados al stack post-migración platform (sin `@material-tailwind`); (5) tipos TypeScript generados desde la spec OpenAPI del BE.

## Problema
- Coexistían `package-lock.json` (npm) y `yarn.lock` (yarn) → instalaciones no determinísticas. yarn es el manager oficial.
- El `command` de docker-compose para `ponti-ui` chequeaba a mano la presencia de cada paquete `@devpablocristo/*`; frágil tras la migración platform. Vite saturaba `fs.inotify.max_user_watches` (ENOSPC) en Linux.
- ESLint del BFF usaba `.eslintignore` (deprecado en flat-config) y no había `eslint.config.js` en `api/`.
- Reglas de ESLint del `ui/` estaban en `warn` (no bloqueaban).
- No había tipado generado desde el contrato del BE.

## Alcance en este repo (FE)
- `.gitignore`: bloquear `**/package-lock.json`; ignorar artefactos efímeros de Playwright (`ui/playwright-report/`, `ui/test-results/`, `docs/audit/drawers/after/*.failed.png|*.failure.txt`).
- `docker-compose.yml`: simplificar `command` de `ponti-ui` a `yarn install --frozen-lockfile --check-files ...`; agregar `CHOKIDAR_USEPOLLING=true` + `CHOKIDAR_INTERVAL=1000`; **cambiar puerto publicado del BFF de `3000:3000` a `3001:3000`**.
- ESLint: crear `api/eslint.config.js` (flat), borrar `api/.eslintignore`; subir reglas de `ui/eslint.config.js` de `warn` a `error` y añadir `playwright-report`/`test-results` a ignores.
- `ui/knip.json` nuevo (detección de dead code).
- Scripts custom `ui/scripts/lint-notify-leaks.sh` y `ui/scripts/lint-responsive-antipatterns.sh`; cablear en `ui/package.json` (`lint`, `lint:notify-leaks`, `lint:responsive`, `codegen:openapi`).
- `ui/vite.config.ts`: ajustar `manualChunks` (vendor-ui solo `lucide-react`; vendor-export `read-excel-file` en vez de `xlsx`).
- `ui/tailwind.config.js`: quitar `mtConfig()`; agregar `darkMode: "class"`, `screens` (xs/3xl), escala `zIndex`.
- `ui/package.json` + `ui/yarn.lock`: swap de deps core→platform, quitar material-tailwind/heroicons/flowbite/xlsx, agregar exceljs/react-window/openapi-typescript/swagger2openapi, `resolutions`.
- `ui/src/api/generated/index.ts` + `types.ts`: cliente OpenAPI generado.
- Borrar `package-lock.json` (raíz) y `api/package-lock.json`.

## Alcance en el otro repo (BE)
Dockerfile/compose del BE y `go.mod`/`go.sum`. **Excluir** los bumps de seguridad `go-jose/v4` y `x/net` (ya en #124). Coordinar el puerto: si compose del BE expone el backend Go, debe seguir alineado con `BASE_MANAGER_API=http://host.docker.internal:8080/api/v1`.

## Fuera de alcance (NO extraer en 021)
- **`api/src/clients/ApiClient.ts`**: el hunk agrega header `X-Tenant-Id` → es **feature-008 (identity-tenant-context)**, no config. NO traer en 021.
- Lógica de dark mode/responsive en sí (componentes, hooks `useBreakpoint`/`useIsMobile`, `lib/theme`, `lib/notify`) → **feature-006 (fe-design-system)**. 021 solo trae la config y los scripts guardrail.
- El swap de dependencias core→platform como decisión de producto pertenece a la **migración platform (new-cns3)**; en 021 viaja únicamente porque vive en `package.json`/`yarn.lock` y bloquea el build.
- Bumps de seguridad BE (#124).

## Comportamiento esperado en `dp~1` (SHA 3ffcf60)
- `yarn install` determinístico; `yarn dev` levanta Vite con polling.
- `yarn lint` = `eslint . && lint:notify-leaks && lint:responsive`; falla CI ante leaks de notificación o `z-[N]`/`window.innerWidth` crudos.
- `yarn build` chunkea con los vendors nuevos.
- `yarn codegen:openapi` regenera `src/api/generated/types.ts` desde `../../core/docs/openapi/swagger.yaml`.

## Estado en dp~1
Completo a nivel archivo, pero **fuertemente acoplado** a otras features (platform migration, 006, 008, 024). Ver implementation-status.md.

## Criterios de aceptación
1. No existe `package-lock.json` en el repo; `.gitignore` lo bloquea.
2. `yarn install --frozen-lockfile` pasa con el `ui/yarn.lock` extraído.
3. `yarn lint` (ui) corre las 3 etapas sin error en el árbol extraído.
4. `eslint .` en `api/` usa el flat-config y no `.eslintignore`.
5. `docker-compose up` levanta ui (5173) y bff (3001→3000) sin ENOSPC.
6. `yarn build` (ui) genera chunks sin referencias a `xlsx`/material-tailwind.
7. ApiClient.ts NO debe aparecer en este PR.

## Endpoints / modelos / UI / DB / tests afectados
- **Endpoints:** ninguno propio. El cliente generado tipa `/data-integrity/costs-check` (018), `/me/context` (008) — solo tipos, sin runtime.
- **Modelos/tipos:** `MeContext`, `MeUser`, `MeTenant` (008), `IntegrityCheck`, `IntegrityReport` (018) en `generated/index.ts`.
- **UI:** ninguna; solo config de build.
- **DB/migraciones:** ninguna.
- **Tests:** ninguno nuevo. Sí afecta gates (knip, lint scripts, playwright ignores).

## Dependencias
- **Intra-repo:** feature-006 (design-system: tailwind darkMode/screens/zIndex y scripts responsive/notify hacen referencia a hooks y módulos que viven en 006), platform-migration (deps en package.json), feature-024 (openapi/docs: el cliente generado sale del swagger del BE), feature-026 (test-infra: ignores de playwright).
- **Cross-repo:** feature-021 BE (compose/Dockerfile/go.mod), feature-024 BE (swagger.yaml fuente del codegen), feature-008 BE (X-Tenant-Id end-to-end, pero ese hunk se mueve a 008).

## Riesgos
- **Funcional:** cambiar el puerto BFF a `3001:3000` puede romper integraciones/docs/`.env` que asumen 3000.
- **Técnico:** borrar `package-lock.json` está OK; pero `ui/yarn.lock` cambió 980/+334 líneas y refleja el swap platform — si se trae sin el resto de la migración platform, `yarn install` fallará por paquetes `@devpablocristo/platform-*` ausentes.
- **Acoplamiento:** tailwind.config y vite.config mezclan config pura con design-system y dep-swap (partial-hunks).

## DECISIÓN recomendada
**Partir en subfeatures + arreglar antes de extraer.** Extraer tal cual SOLO la config genuina y autocontenida: `.gitignore`, `api/eslint.config.js`+borrado `.eslintignore`, `ui/knip.json`, los dos scripts de lint, borrado de `package-lock.json`. El resto (`package.json`/`yarn.lock`, `tailwind.config.js`, `vite.config.ts`, generated client, docker-compose dep-check) **depende de la migración platform / 006 / 024** y debe ir DESPUÉS o coordinado con esas features. `ApiClient.ts` → mover a 008.
