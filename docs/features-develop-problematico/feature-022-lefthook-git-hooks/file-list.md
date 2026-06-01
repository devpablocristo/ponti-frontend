# file-list — feature-022 · lefthook-git-hooks (FE)

Fuente del listado: `/tmp/flists/fe-022.txt`. Rango de diff: `fefbe695..3ffcf60`. SOURCE = `develop-problematico~1` (SHA 3ffcf60).

El flist completo de esta feature en este repo contiene **un único path**.

## Propios (whole-file)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|------|--------|------|-------------------|------------|--------|--------|-----------|
| `lefthook.yml` | A | config YAML (raíz del repo) | Config de hooks git: `pre-commit` (eslint + typecheck) y `pre-push` (vitest) scopeados a `ui/` | **whole-file** | Archivo nuevo, completo, 27 líneas, idéntico entre diff del rango y `3ffcf60:lefthook.yml`; no existe en develop (add limpio) | bajo | alta |

## Compartidos (partial-hunks)
_(ninguno)_ — `lefthook.yml` es un archivo nuevo y autónomo. No hay hunks mezclados con otras features. Ninguno de los archivos compartidos típicos del repo (`ui/src/router.tsx`, `ui/src/main.tsx`, `api/src/routes/index.ts`, `api/src/index.ts`, `package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`) forma parte de esta feature.

## Requeridos por dependencia
_(ninguno)_ — la feature no agrega `lefthook` a ningún `package.json`; depende solo de tooling instalado a nivel sistema y de binarios (`eslint`/`tsc`/`vitest`) ya presentes en `ui/`.

## Dudosos
_(ninguno)_

## NO traer todavía
_(ninguno)_

## Notas
- El `lefthook.yml` del repo `core` (BE) tiene el mismo feature-022 pero es un archivo distinto en otro repo: NO se incluye acá.
- No hay `.husky/`, `package.json#scripts.prepare`, ni dependencia `lefthook` que portar (verificado: `git grep lefthook 3ffcf60 -- package.json ui/package.json api/package.json` no devuelve nada).
