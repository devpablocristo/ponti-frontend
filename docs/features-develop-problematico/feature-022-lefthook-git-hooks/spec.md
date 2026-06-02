# spec — feature-022 · lefthook-git-hooks (FE)

- **id**: feature-022
- **nombre**: Lefthook git hooks
- **tipo**: config (tooling local)
- **repo**: Frontend monorepo `ui/` (React) + `api/` (BFF NodeJS), yarn — path `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE**: sí (este paquete)
- **existe-en-BE**: sí — `lefthook.yml` también existe en el repo `core` con el MISMO feature-022 (FULL-STACK, ver cross-repo)
- **merge**: por repo (cada repo lleva su propio `lefthook.yml`, son archivos independientes)

## Resumen
Se agrega un único archivo de configuración en la raíz del monorepo FE: `lefthook.yml`. Configura hooks de git (vía [lefthook](https://github.com/evilmartians/lefthook)) que corren linters/typecheck/tests automáticamente antes de commit/push. Es tooling de desarrollo local, **opcional**, sin impacto en runtime de la app ni en CI.

## Objetivo
Estandarizar y automatizar las verificaciones rápidas locales antes de que el código llegue al remoto:
- `pre-commit`: `eslint` sobre TS/TSX staged + `typecheck` (`tsc -b`).
- `pre-push`: tests (`vitest run --passWithNoTests`).

## Problema que resuelve
Sin hooks, los devs olvidan correr lint/typecheck/tests antes de pushear, y los errores se descubren tarde (en CI o en review). Lefthook centraliza la config en un YAML versionado en vez de scripts ad-hoc en `.git/hooks`.

## Alcance en este repo (FE)
- Crear `lefthook.yml` en la raíz del repo (1 archivo, 27 líneas).
- Comandos referenciados (todos con `cd ui &&`, es decir scopeados al sub-proyecto `ui/`):
  - `pre-commit > eslint`: `cd ui && yarn eslint {staged_files}` con `glob: "ui/src/**/*.{ts,tsx}"`.
  - `pre-commit > typecheck`: `cd ui && yarn tsc -b --noEmit 2>/dev/null || yarn tsc -b` con `glob: "ui/src/**/*.{ts,tsx}"`, `parallel: true`.
  - `pre-push > tests`: `cd ui && yarn vitest run --passWithNoTests`.

## Alcance en el OTRO repo (BE / core)
- También un `lefthook.yml` propio en la raíz del repo `core`, con comandos del stack Go (típicamente `gofmt`/`go vet`/`golangci-lint`/`go test`). Es un archivo separado, NO comparte contenido con el FE.
- Coordinación: ver `dependencies.md`. No hay dependencia de orden real; cada repo se puede mergear por separado.

## Fuera de alcance
- No instala lefthook como dependencia del proyecto: NO aparece en `package.json` / `ui/package.json` / `api/package.json` (verificado en 3ffcf60). El header del YAML asume instalación a nivel sistema (`brew install lefthook` / `sudo apt install lefthook` + `lefthook install`).
- No toca CI (feature-020 `ci-workflows`) ni build/deploy (feature-021).
- No agrega scripts a `package.json` ni husky ni `.husky/`.
- No cubre el sub-proyecto `api/` (los hooks solo apuntan a `ui/`).

## Comportamiento esperado
- Tras `lefthook install`, al hacer `git commit` se ejecutan en paralelo eslint (solo archivos TS/TSX staged bajo `ui/src/`) y typecheck del proyecto `ui`. Si fallan, el commit se aborta.
- Al hacer `git push` corre `vitest run --passWithNoTests` en `ui/`.
- Bypass de emergencia: `git commit --no-verify` (documentado en el header como NO usar de rutina).

## Estado en dp~1 (SHA 3ffcf60)
- Archivo presente y completo. Status `A` (created) respecto del rango `fefbe695..3ffcf60`. Contenido idéntico entre el diff del rango y `git show 3ffcf60:lefthook.yml` (no hay hunks parciales mezclados con otra feature).
- NO existe en `develop` (8c25e88) → add limpio sin conflicto.

## Criterios de aceptación
- `lefthook.yml` existe en la raíz del repo en `develop` tras el port, byte-idéntico a `3ffcf60:lefthook.yml`.
- `git diff --check` limpio.
- Con lefthook instalado: `lefthook run pre-commit` y `lefthook run pre-push` ejecutan los comandos sin error de parseo del YAML.

## Endpoints / Modelos / UI / DB / Tests afectados
- **Endpoints/rutas**: ninguno.
- **Modelos/DTOs/tipos**: ninguno.
- **Componentes/hooks/stores**: ninguno.
- **DB/migraciones**: ninguna.
- **Tests**: no agrega tests; sí *invoca* `vitest` (script `test` = `vitest run` en `ui/package.json`) y `tsc -b` en el hook. No define suites nuevas.

## Dependencias
- **Intra-repo**: ninguna funcional. Dependencia *blanda* de tooling: requiere que `ui/` tenga resolubles los binarios `eslint`, `tsc` y `vitest` vía yarn (existen scripts `lint`/`typecheck`/`test` en `ui/package.json`).
- **Cross-repo**: ninguna de orden. Coordinación cosmética con feature-022 del repo `core` (mismo nombre de feature, archivo análogo).

## Riesgos
- **Funcional**: nulo en runtime (no afecta la app desplegada).
- **Técnico**: lefthook NO está declarado como dependencia → un dev sin lefthook instalado simplemente no ejecuta hooks (degradación silenciosa, no rompe nada). Los comandos `yarn eslint`/`yarn tsc`/`yarn vitest` dependen de que esos binarios sean invocables por yarn en `ui/`; si no, el hook falla y bloquea el commit localmente.

## DECISIÓN recomendada
**Extraer tal cual.** Add limpio de 1 archivo, sin conflicto con develop, sin impacto en runtime/CI. Opcional documentar en README/CONTRIBUTING que lefthook debe instalarse a nivel sistema (mejora futura, no bloqueante). Coordinar (sin bloquear) con el `lefthook.yml` del repo `core`.
