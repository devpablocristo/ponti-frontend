# feature-020 — CI / GitHub workflows (FE)

- **id:** feature-020
- **nombre:** CI / GitHub workflows
- **tipo:** infra
- **repo (este paquete):** Frontend monorepo `ponti/web` (`ui/` React + `api/` BFF NodeJS, yarn)
- **existe-en-FE:** sí (este paquete)
- **existe-en-BE:** sí (FULL-STACK — mismo `feature-020` en el repo `core`/platform). Ver sección cross-repo.
- **SOURCE REF de extracción:** `develop-problematico~1` = SHA `3ffcf60` (NUNCA `develop-problematico`, cuyo tip es un restore/vacío).
- **Rango fuente-de-verdad (diff):** `fefbe695..3ffcf60`.
- **Rama destino:** `develop` (tip `8c25e88`).

## Resumen

En este repo, feature-020 es **un rename cosmético del campo `name:`** en los 4 workflows de GitHub Actions: se elimina la palabra "Frontend" del título visible del workflow. Nada más. No cambian triggers, paths, jobs, steps, `concurrency.group`, env vars, ni la lógica de deploy.

Diffs reales (los 4 archivos, 2 líneas cambiadas cada uno — solo la línea 1):

| archivo | antes (`develop` 8c25e88) | después (SOURCE 3ffcf60) |
|---|---|---|
| `.github/workflows/ci-pr.yml` | `name: CI PR Frontend` | `name: CI PR` |
| `.github/workflows/deploy-dev.yml` | `name: Deploy Frontend DEV (Cloud Run + Hosting)` | `name: Deploy DEV (Cloud Run + Hosting)` |
| `.github/workflows/deploy-prod.yml` | `name: Deploy Frontend PROD (promote STAGING artifact)` | `name: Deploy PROD (promote STAGING artifact)` |
| `.github/workflows/deploy-staging.yml` | `name: Deploy Frontend STAGING (Cloud Run + Hosting)` | `name: Deploy STAGING (Cloud Run + Hosting)` |

## Objetivo

Unificar la nomenclatura de los workflows entre los repos FE y BE (probablemente parte de una consolidación de naming en el contexto de la migración `new-cns3` / `platform`), de modo que los títulos visibles en la pestaña Actions y en los checks de PR no incluyan "Frontend" / "Backend".

## Problema que resuelve

Cosmético / de organización. Los nombres con "Frontend"/"Backend" eran inconsistentes o redundantes (el repo ya identifica el stack). Es un cambio de presentación, no de comportamiento.

## Alcance en este repo (FE)

Solo el campo `name:` (línea 1) de los 4 YAML en `.github/workflows/`. **Cero** cambios funcionales en:
- triggers (`on.pull_request`, `on.push`, `workflow_dispatch`) — intactos.
- `paths` filtrados (`api/**`, `ui/**`, `Dockerfile.api`, `scripts/**`, `.github/workflows/<self>.yml`) — intactos.
- `concurrency.group` (siguen siendo `ponti-frontend-ci-pr-…`, `ponti-frontend-deploy-dev-…`, `ponti-frontend-deploy-staging-…`, `deploy-frontend-prod`) — **NO** cambian. Es decir, el slug interno "frontend" sigue presente en las groups; solo cambió el título humano.
- jobs/steps (lint, typecheck, test, build; deploy a Cloud Run + Firebase Hosting; promote prod) — intactos.
- env vars (`REGION`, `REGISTRY`, `REPOSITORY=ponti-frontend-registry`, `HOSTING_SITE_ID`, etc.) — intactas.

## Alcance en el otro repo (BE/core)

Cambio análogo: rename del `name:` de los workflows del backend (probablemente quitar "Backend"). Es el mismo feature-020 cross-repo. **No comparten archivos** (cada repo tiene su propio `.github/workflows/`), así que no hay conflicto físico; la coordinación es solo de criterio de naming, no de merge.

## Fuera de alcance

- Cualquier cambio de triggers, paths, concurrency, build, deploy, secrets, WIF, Cloud Run, Firebase Hosting → eso es **feature-021 (build-and-deploy-config)**, que comparte estos mismos 4 archivos. Ver `dependencies.md`.
- Hooks de git / lefthook → **feature-022**.
- El warning de la nota de feature ("pueden romper deploy si se traen sin el resto") aplica a feature-021, NO a este rename.

## Comportamiento esperado

Tras aplicar: en la pestaña Actions de GitHub y en los status checks de los PR, los workflows aparecen como "CI PR", "Deploy DEV/STAGING/PROD …" (sin "Frontend"). El deploy y la CI corren exactamente igual. Si hay branch protection que exige un check por **nombre** (ej. un required check llamado "CI PR Frontend"), ese matching podría romperse hasta reconfigurar la regla — ver riesgos.

## Estado en dp~1 (SHA 3ffcf60)

Completo y trivial. Los 4 archivos en el SOURCE ya tienen el `name:` sin "Frontend". `develop` (8c25e88) todavía tiene los nombres viejos con "Frontend", confirmado por `git show`. El cambio NO está aplicado en destino.

## Criterios de aceptación

1. Los 4 workflows en `develop` tienen `name:` sin la palabra "Frontend", coincidiendo byte a byte con la línea 1 de `3ffcf60`.
2. El resto de cada YAML queda idéntico a `develop` (no se arrastra ningún hunk de feature-021).
3. CI PR sigue disparándose en PR a `develop`/`main` y los jobs lint/typecheck/test/build pasan.
4. Las branch protection rules / required checks siguen verdes (reconfigurar nombres de checks si aplica).

## Endpoints / modelos / UI / DB / tests afectados

- **Endpoints:** ninguno.
- **Modelos/DTOs/tipos:** ninguno.
- **Componentes/hooks/stores:** ninguno.
- **DB / migraciones:** ninguna.
- **Tests:** ninguno (no se toca código). La CI sigue ejecutando `yarn --cwd ui {lint,typecheck,test,build}`.

## Dependencias

- **Intra-repo:** ninguna dura. Comparte físicamente los 4 archivos con **feature-021** (partial-hunks): el diff de 021 vive en las mismas líneas inferiores de estos YAML. Hay que aislar la línea 1.
- **Cross-repo:** feature-020 BE es independiente (archivos distintos). Coordinación solo de criterio.

## Riesgos

- **Funcional:** prácticamente nulo (rename de presentación).
- **Técnico:** required status checks definidos por nombre en branch protection podrían dejar de matchear → checks "pendientes" eternos. Mitigación en `risks.md`.
- **Extracción:** el verdadero riesgo es traer de más (hunks de feature-021) al hacer checkout del archivo entero. Usar `git restore -p` por línea.

## DECISIÓN recomendada

**EXTRAER TAL CUAL** (whole-line, partial-hunks). Es de bajísimo riesgo y autocontenido. Importarlo como cambio solo-de-`name:`, sin arrastrar feature-021. Si se prefiere, puede diferirse y mergearse **junto con feature-021** en un único PR de infra (son los mismos archivos) — ver `extraction-plan.md`. No requiere arreglos previos ni partición.
