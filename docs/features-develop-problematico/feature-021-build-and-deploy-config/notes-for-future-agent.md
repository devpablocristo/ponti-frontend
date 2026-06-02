# notes-for-future-agent.md — feature-021 Build & deploy config (FE)

## Resumen corto
feature-021 = **config de build/tooling** del FE monorepo (ui React + api BFF). En `develop-problematico~1` (`3ffcf60`) está completa pero **mezclada con la migración platform y con 006/008/024**. Lo único limpiamente extraíble solo es la "Ola A": bloqueo de `package-lock.json`, borrado de locks npm, `api/eslint.config.js` (flat) + borrado de `.eslintignore`, `ui/knip.json`, y los 2 scripts de lint. El resto viaja con otras features.

## Qué está en FE y qué en BE
- **FE (este repo):** lockfiles, eslint configs, knip, scripts de lint, docker-compose, vite/tailwind config, package.json, cliente OpenAPI generado.
- **BE (mismo feature-021):** Dockerfile/compose, `go.mod`/`go.sum`. **Bumps go-jose/x/net YA porteados (#124) → EXCLUIR.**

## Archivos esenciales (Ola A — traer)
- `api/eslint.config.js` (A), `api/.eslintignore` (D)
- `ui/knip.json` (A)
- `ui/scripts/lint-notify-leaks.sh` (A), `ui/scripts/lint-responsive-antipatterns.sh` (A)
- `package-lock.json` (D, raíz), `api/package-lock.json` (D)
- `.gitignore` (hunk de bloqueo lock), `docker-compose.yml` (hunk CHOKIDAR)

## Archivos peligrosos / mezclados (partial-hunks o regenerar)
- `ui/package.json` — deps core→platform = platform-migration; scripts lint/codegen = 021; partir por hunks.
- `ui/yarn.lock` — REGENERAR con `yarn install`, NO copiar (+980/-334, atado al swap).
- `ui/tailwind.config.js` — quitar `mtConfig` (021/platform) vs darkMode/screens/zIndex (006).
- `ui/vite.config.ts` — manualChunks atado al swap.
- `ui/src/api/generated/{index,types}.ts` — REGENERAR con `yarn codegen:openapi` tras 024 BE.
- `docker-compose.yml` — el cambio de **puerto BFF 3000→3001** es dudoso, confirmar.
- `api/src/clients/ApiClient.ts` — **NO es 021**, agrega `X-Tenant-Id` → feature-008.

## Decisiones ya tomadas (en este análisis)
- ApiClient.ts movido a 008.
- yarn.lock y generated/* se regeneran, no se copian.
- Ola A es mergeable sola sobre develop sin riesgo de runtime.
- Excluir deps platform y darkMode/screens/zIndex de la PR de config pura.

## Dudas abiertas (para humano)
1. ¿Puerto BFF `3001:3000` intencional?
2. ¿Cablear `lint:notify-leaks`/`lint:responsive` en el target `lint` antes de que 006 exista? (los scripts no rompen si faltan módulos, pero el guardrail queda vacío).
3. ¿`api/package.json` ya tiene `@typescript-eslint/parser` + plugin para que `api/eslint.config.js` cargue? (no aparece en el flist como modificado — verificar).

## Comandos a mirar primero
```bash
cat /tmp/flists/fe-021.txt
git -C /home/pablocristo/Proyectos/pablo/ponti/web diff fefbe695..3ffcf60 -- ui/package.json docker-compose.yml ui/tailwind.config.js
git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:ui/scripts/lint-responsive-antipatterns.sh
git -C /home/pablocristo/Proyectos/pablo/ponti/web show 3ffcf60:ui/src/api/generated/index.ts
```

## Errores a evitar
- NO usar `develop-problematico` (tip vacío/restore). SOURCE = `develop-problematico~1` (`3ffcf60`).
- NO copiar `ui/yarn.lock` ni `generated/*` literal.
- NO traer `ApiClient.ts` en 021.
- NO mergear Ola B (deps platform) sin la migración platform → `yarn install` roto.
- NO re-introducir bumps go-jose/x/net en BE 021 (#124).
- Cuidado con el ruido CRLF↔LF en los diffs de config: usar `git restore -p` y `git diff --check`.
- En este entorno, `docker logs` (no `docker exec`/`run` stdout) para inspeccionar contenedores.

## Camino más seguro
1. Abrir `pr/feature-021-build-and-deploy-config-fe` desde `develop` con SOLO la Ola A.
2. Correr `yarn lint`/`eslint .`/`docker compose config` (validation.md).
3. Diferir Ola B (deps/tailwind/vite/codegen/cableo de scripts) hasta que platform-migration, 006 y 024 estén mergeadas.

## PRs del otro repo: antes / después
- **Antes (para codegen):** feature-024 BE (swagger.yaml).
- **En paralelo / independiente:** feature-021 BE (compose/Dockerfile, excluyendo #124).
- **Relacionado:** feature-008 BE (contraparte de X-Tenant-Id que aquí se desvía a 008).
