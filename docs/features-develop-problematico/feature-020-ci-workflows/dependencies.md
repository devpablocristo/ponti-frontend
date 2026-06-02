# feature-020 (FE) — dependencies

## Depende de

- **Nada (dura).** El rename de `name:` no requiere ninguna otra feature.

## Bloquea a

- **Nada.** Ninguna feature necesita este rename para funcionar.

## Relaciones

### Intra-repo

| relación | feature | fuerza | detalle |
|---|---|---|---|
| co-tenant de archivos (NO prerequisito) | **021 build-and-deploy-config** | débil / física | Los 4 YAML `.github/workflows/{ci-pr,deploy-dev,deploy-prod,deploy-staging}.yml` reciben hunks de 021 en líneas DISTINTAS de la línea 1. Conflicto solo si se mergean al mismo tiempo tocando líneas adyacentes (improbable: 021 toca `env`/`jobs`/`steps`, 020 toca línea 1). |
| convive en `.github/` | **022 lefthook-git-hooks** | nula | 022 toca hooks de git / lefthook, no estos workflows. |

### Cross-repo (FULL-STACK)

| relación | repo | fuerza | detalle |
|---|---|---|---|
| mismo feature-020, archivos separados | **core/platform (BE)** | incierta→débil | Cada repo tiene su propio `.github/workflows/`. No comparten archivos → sin conflicto de merge. La "dependencia" es solo de **criterio de naming** (que BE también quite "Backend"). Orden de merge indiferente. |

## Archivos / tipos / config / migraciones / APIs compartidos

- **Archivos compartidos (intra-repo):** los 4 YAML, compartidos con feature-021 a nivel de archivo (no de línea). Marcados partial-hunks en `file-list.md`.
- **Config compartida:** `concurrency.group` (`ponti-frontend-…`, `deploy-frontend-prod`) NO cambia → no introduce colisión nueva con BE.
- **Tipos / migraciones / APIs:** ninguno.
- **Lockfiles / routers / bootstrap (pistas de compartidos del repo):** NO tocados por 020.

## Recomendación de orden

1. feature-020 FE puede ir **en cualquier momento**, independiente de todo.
2. Respecto a feature-021 FE: indiferente. Si se quiere simplicidad, **fusionar 020 dentro del PR de 021** (mismos archivos) y ahorrar un PR. Si se mantienen separados, el que mergee segundo puede tener un rebase trivial.
3. Cross-repo: mergear feature-020 BE el mismo período para consistencia, sin orden obligatorio.
