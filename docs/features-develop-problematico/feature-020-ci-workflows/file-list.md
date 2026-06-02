# feature-020 (FE) — file-list

Fuente: `/tmp/flists/fe-020.txt`. Todos `M` (modified). Diff `fefbe695..3ffcf60`.
Cada archivo cambia **exactamente 2 líneas** (1 `-` / 1 `+`): solo la línea 1 `name:`.

## Propios

(No hay archivos "propios exclusivos" de esta feature: los 4 YAML son compartidos con feature-021. Pero el **hunk** de la línea 1 `name:` es propio y exclusivo de 020.)

## Compartidos (partial-hunks)

> Estos 4 archivos también reciben hunks de **feature-021 (build-and-deploy-config)** en líneas distintas. Extraer SOLO la línea 1 (`name:`). Usar `git restore -p`.

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `.github/workflows/ci-pr.yml` | M | GH Actions YAML | rename `name: CI PR Frontend` → `CI PR` | partial-hunks (solo línea 1) | el resto del archivo pertenece a 021; concurrency.group `ponti-frontend-ci-pr-…` NO cambia | bajo | alta |
| `.github/workflows/deploy-dev.yml` | M | GH Actions YAML | rename `name:` → `Deploy DEV (Cloud Run + Hosting)` | partial-hunks (solo línea 1) | deploy a Cloud Run + Firebase; resto pertenece a 021 | bajo | alta |
| `.github/workflows/deploy-prod.yml` | M | GH Actions YAML | rename `name:` → `Deploy PROD (promote STAGING artifact)` | partial-hunks (solo línea 1) | promote de artefacto staging; `concurrency.group: deploy-frontend-prod` NO cambia | bajo | alta |
| `.github/workflows/deploy-staging.yml` | M | GH Actions YAML | rename `name:` → `Deploy STAGING (Cloud Run + Hosting)` | partial-hunks (solo línea 1) | deploy staging; resto pertenece a 021 | bajo | alta |

## Requeridos por dependencia

Ninguno. No hay dependencia dura intra-repo. (feature-021 es co-tenant físico de estos archivos pero NO es prerequisito del rename.)

## Dudosos

Ninguno. Los 4 diffs son inequívocos: cambio de 1 línea cada uno, verificado con `git diff fefbe695..3ffcf60` y conteo `wc -l` = 2 líneas por archivo.

## NO traer todavía

- **Cualquier otro hunk de estos 4 YAML que no sea la línea 1** → pertenece a feature-021. NO extraer en este PR.
- No existen otros archivos `.github/workflows/*` en el flist de 020.

## Notas de verificación

- `develop` (8c25e88) confirma nombres viejos (`CI PR Frontend`, `Deploy Frontend DEV/STAGING/PROD …`).
- SOURCE (3ffcf60) confirma nombres nuevos (sin "Frontend").
- Las `concurrency.group` mantienen el slug `frontend` en TODOS (incluido `deploy-frontend-prod`); ESO no se toca: confirma que el cambio es solo del título humano.
