# feature-020 (FE) — implementation-status

- **estado:** completa (en SOURCE `3ffcf60`); **NO aplicada** en `develop`.
- **% completitud (del cambio en sí):** 100% — el rename está hecho y es trivial.
- **% portado a develop:** 0% (develop aún tiene "Frontend" en los 4 `name:`).

## Estado en este repo (FE)

- Los 4 workflows en `3ffcf60` ya tienen `name:` sin "Frontend". Verificado byte a byte:
  - `ci-pr.yml` → `name: CI PR`
  - `deploy-dev.yml` → `name: Deploy DEV (Cloud Run + Hosting)`
  - `deploy-prod.yml` → `name: Deploy PROD (promote STAGING artifact)`
  - `deploy-staging.yml` → `name: Deploy STAGING (Cloud Run + Hosting)`
- `develop` (8c25e88) confirma los nombres viejos con "Frontend".
- Diff total del feature en este repo: 4 archivos × 1 línea = 4 líneas.

## Estado en el otro repo (BE/core)

- **Desconocido desde este paquete** (no inspeccioné el repo BE). Se asume cambio análogo (quitar "Backend") en su propio `.github/workflows/`. Confianza: media. Coordinar con el paquete BE de feature-020.

## Tests

- No hay tests de esta feature (no se toca código). La CI vigente sigue siendo `yarn --cwd ui lint/typecheck/test/build`. El rename no las altera.

## Pendientes

| item | categoría |
|---|---|
| Portar los 4 hunks de `name:` a `develop` sin arrastrar feature-021 | **BLOQUEANTE-para-mergear** (es la tarea en sí) |
| Reconfigurar required status checks si matchean por nombre de workflow | **duda-humana** (depende de cómo esté configurado branch protection; revisar en GitHub) |
| Coordinar merge de feature-020 BE | mejora-futura (consistencia visual) |
| Decidir si se fusiona con el PR de feature-021 | mejora-futura (ahorra un PR) |

## Bugs

- Ninguno detectado. El cambio no puede introducir bugs funcionales: el campo `name:` es puramente de presentación en GitHub Actions.

## Resumen por categoría

- **BLOQUEANTE-para-mergear:** aplicar el rename limpio (sin hunks de 021).
- **mejora-futura:** consistencia cross-repo; posible fusión con 021.
- **deuda-aceptable:** que las `concurrency.group` sigan diciendo "frontend" (no se toca y no molesta).
- **duda-humana:** branch protection / required checks por nombre.
