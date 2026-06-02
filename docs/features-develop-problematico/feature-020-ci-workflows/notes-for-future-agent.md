# feature-020 (FE) — notes-for-future-agent

## Resumen corto

feature-020 en el repo FE = **rename cosmético del campo `name:` de 4 workflows de GitHub Actions** (quitar la palabra "Frontend"). 4 archivos, 1 línea cada uno. Cero cambios funcionales. Riesgo bajísimo. Decisión: **extraer tal cual** (partial-hunks, solo la línea `name:`).

Mapa exacto del cambio (`develop` → SOURCE `3ffcf60`):
- `ci-pr.yml`: `CI PR Frontend` → `CI PR`
- `deploy-dev.yml`: `Deploy Frontend DEV (Cloud Run + Hosting)` → `Deploy DEV (Cloud Run + Hosting)`
- `deploy-staging.yml`: `Deploy Frontend STAGING (Cloud Run + Hosting)` → `Deploy STAGING (Cloud Run + Hosting)`
- `deploy-prod.yml`: `Deploy Frontend PROD (promote STAGING artifact)` → `Deploy PROD (promote STAGING artifact)`

## Qué está en FE y qué en BE

- **FE (este paquete):** rename en `.github/workflows/{ci-pr,deploy-dev,deploy-prod,deploy-staging}.yml`. SOURCE = `3ffcf60` (= `develop-problematico~1`). NUNCA `develop-problematico` (tip restore/vacío). Destino = `develop` (8c25e88), que aún tiene los nombres viejos.
- **BE (core/platform):** mismo feature-020, archivos distintos (su propio `.github/workflows/`), probablemente quitando "Backend". No inspeccionado aquí; coordinar con su paquete.

## Archivos esenciales

- Los 4 YAML de `.github/workflows/`. Solo importa la **línea 1** de cada uno.

## Archivos peligrosos / mezclados

- Los mismos 4 YAML son **compartidos con feature-021 (build-and-deploy-config)**: 021 cambia `env`/`jobs`/`steps`/triggers en líneas inferiores. NO arrastrarlos. El "puede romper deploy" de la nota de feature se refiere a 021, NO a este rename.

## Decisiones ya tomadas

- Extraer solo la línea `name:` por hunk (`git restore -p --source=3ffcf60`).
- Las `concurrency.group` (`ponti-frontend-…`, `deploy-frontend-prod`) NO se tocan — siguen con slug "frontend" y está bien.
- Orden cross-repo indiferente; mergear FE y BE en la misma ventana por consistencia visual.

## Dudas abiertas

- ¿Hay required status checks en branch protection que matcheen por **nombre** de workflow ("CI PR Frontend")? Si sí, reconfigurar tras el merge. Revisar Settings → Branches en GitHub (no verificable desde el repo).
- Estado exacto del feature-020 BE (no inspeccionado).

## Comandos a mirar primero

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-020.txt
git diff fefbe695..3ffcf60 -- .github/workflows/ci-pr.yml \
  .github/workflows/deploy-dev.yml .github/workflows/deploy-prod.yml .github/workflows/deploy-staging.yml
for f in ci-pr deploy-dev deploy-prod deploy-staging; do echo -n "$f develop: "; git show develop:.github/workflows/$f.yml | head -1; done
```

## Errores a evitar

- NO usar `develop-problematico` como source (usar `3ffcf60` = `~1`).
- NO `git checkout 3ffcf60 -- <archivo>` del archivo entero si feature-021 ya está en `develop` (arrastraría 021). Usar selección por hunk.
- NO tocar `concurrency.group`, `env`, `paths`, `jobs`. Solo la línea 1.
- NO ejecutar comandos que muten git desde el agente; los comandos de los docs son sugerencias para un humano.

## Camino más seguro

`git restore -p --source=3ffcf60` sobre los 4 YAML, aceptando solo el hunk `name:`; luego `git diff --cached` debe mostrar 4 hunks de 1 línea. Alternativa válida: **fusionar este cambio dentro del PR de feature-021** (son los mismos archivos) y ahorrar un PR.

## Qué PR del otro repo va antes/después

- **Ninguno obligatorio.** feature-020 BE es independiente (archivos separados). Recomendado: mergear ambos `feature-020` en la misma ventana para que la pestaña Actions quede consistente. Orden libre.
