# feature-020 (FE) — extraction-plan

- **repo:** `ponti/web` (Frontend monorepo: `ui/` + `api/`)
- **rama base:** `develop` (tip `8c25e88`)
- **SOURCE:** `develop-problematico~1` = SHA `3ffcf60` (NUNCA `develop-problematico`)
- **rama sugerida:** `pr/feature-020-ci-workflows-fe`

## PR title

`chore(ci): unificar nombres de workflows (quitar "Frontend") [feature-020]`

## PR description (sugerida)

> Rename cosmético del campo `name:` en los 4 workflows de GitHub Actions del repo FE, alineado con feature-020 cross-repo (BE hace lo análogo en su `.github/workflows/`).
>
> - `CI PR Frontend` → `CI PR`
> - `Deploy Frontend DEV (Cloud Run + Hosting)` → `Deploy DEV (Cloud Run + Hosting)`
> - `Deploy Frontend STAGING (…)` → `Deploy STAGING (…)`
> - `Deploy Frontend PROD (promote STAGING artifact)` → `Deploy PROD (promote STAGING artifact)`
>
> SIN cambios funcionales: triggers, paths, `concurrency.group` (siguen `ponti-frontend-…` / `deploy-frontend-prod`), jobs, steps, env y lógica de deploy quedan idénticos. Los hunks de build/deploy (feature-021) NO se incluyen aquí.
>
> Atención: si hay required status checks en branch protection que matchean por nombre, reconfigurar los nombres tras el merge.

## Pasos ordenados

1. Partir de `develop` limpio.
2. Crear rama `pr/feature-020-ci-workflows-fe`.
3. Traer SOLO la línea 1 (`name:`) de cada uno de los 4 YAML desde `3ffcf60`, sin arrastrar el resto del diff (que es feature-021). Como cada archivo solo difiere en esa línea **en este rango**, traer el archivo entero también funcionaría, PERO solo si feature-021 todavía no fue mergeado a `develop`. Para ser seguro y a prueba de orden, usar selección por hunk.
4. Verificar que el diff resultante son exactamente 4 hunks de 1 línea cada uno.
5. `yarn --cwd ui lint && yarn --cwd ui typecheck && yarn --cwd ui build` localmente (sanity de que la CI sigue verde — opcional, no afecta YAML).
6. Commit + push + PR contra `develop`.

## Archivos enteros vs parciales

- **Parciales (partial-hunks):** los 4 YAML — solo la línea `name:`.
- **Enteros:** ninguno recomendado, para no acoplar con feature-021. (Si 021 NO está en `develop`, el archivo entero coincide con el cambio de 020; aun así preferir `restore -p` por robustez.)

## Migraciones / tests a incluir

Ninguna migración. Ningún test nuevo. La CI existente (`lint`/`typecheck`/`test`/`build` sobre `ui/`) sigue siendo la validación.

## Dependencias previas

Ninguna. Se puede mergear en cualquier momento, independientemente de 021. Si 020 y 021 se mergean por separado, **mergear 020 primero o 021 primero da igual** siempre que cada PR toque líneas distintas (020 = línea 1; 021 = resto). Si chocan, resolver dejando línea 1 del estilo 020.

## Coordinación con el otro repo (cross-repo)

- **Orden:** indiferente (COORD suave). FE y BE no comparten archivos. Recomendado mergear ambos `feature-020` el mismo día para que la pestaña Actions quede consistente entre repos.
- No hay BE-first ni FE-first obligatorio.

## Comandos git SUGERIDOS (para un humano — NO ejecutar desde el agente)

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web

# 0) inspección (solo lectura)
git diff fefbe695..3ffcf60 -- .github/workflows/ci-pr.yml .github/workflows/deploy-dev.yml \
  .github/workflows/deploy-prod.yml .github/workflows/deploy-staging.yml

# 1) rama
git checkout develop
git checkout -b pr/feature-020-ci-workflows-fe

# 2a) OPCIÓN SEGURA: traer solo la línea name: por hunk (interactivo)
git restore -p --source=3ffcf60 -- \
  .github/workflows/ci-pr.yml \
  .github/workflows/deploy-dev.yml \
  .github/workflows/deploy-prod.yml \
  .github/workflows/deploy-staging.yml
# -> en cada hunk, aceptar SOLO el cambio de la línea `name:`; rechazar cualquier
#    hunk de build/deploy (feature-021).

# 2b) OPCIÓN RÁPIDA (solo si feature-021 NO está aún en develop): archivo entero
# git checkout 3ffcf60 -- .github/workflows/ci-pr.yml .github/workflows/deploy-dev.yml \
#   .github/workflows/deploy-prod.yml .github/workflows/deploy-staging.yml

# 3) verificar
git diff --cached --stat
git diff --cached            # deben verse 4 hunks de 1 línea (name:)
git diff --check             # sin conflict markers / whitespace

# 4) commit
git add .github/workflows/*.yml
git commit -m 'chore(ci): unificar nombres de workflows (quitar "Frontend") [feature-020]'
```

> Nota interactiva: `git restore -p` y `git add -p` no están soportados por el agente; estos comandos son para que los corra un humano.

## Qué NO traer

- Ningún hunk que toque `on:`, `paths:`, `concurrency:`, `env:`, `jobs:`, `steps:` → eso es feature-021.
- Ningún otro archivo `.github/workflows/*` no listado.

## Qué podría romperse

- **Required status checks por nombre** en branch protection de `develop`/`main`: si la regla exige un check llamado literalmente "CI PR Frontend", el PR podría quedar con check pendiente. Mitigación: actualizar la regla al nuevo nombre, o (mejor) que el required check apunte al **job** (`lint`/`typecheck`/`test`/`build`), no al workflow `name`.
- Nada en runtime/deploy: el deploy no depende del campo `name:`.

## Cómo detectar extracción incompleta / de más

- **De más:** `git diff --cached` muestra hunks fuera de la línea `name:` → se coló feature-021. Revertir esos hunks.
- **Incompleta:** algún `name:` sigue con "Frontend" → comparar `git show develop:.github/workflows/<f>.yml | head -1` debe NO contener "Frontend" tras el merge.

## Qué validar antes del PR

- `head -1` de cada YAML == línea 1 de `3ffcf60` (sin "Frontend").
- Resto del archivo == `develop` (sin diffs adicionales).
- Opcional: `yarn --cwd ui lint && yarn --cwd ui typecheck && yarn --cwd ui build` verdes.

## Qué hacer después de mergear

- Confirmar en la pestaña Actions que los workflows aparecen renombrados.
- Reconfigurar branch protection / required checks si matcheaban por nombre.
- Coordinar el merge de feature-020 BE para consistencia visual entre repos.
