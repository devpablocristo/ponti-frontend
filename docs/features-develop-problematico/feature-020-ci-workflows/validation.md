# feature-020 (FE) — validation

## Checklist pre-PR

- [ ] Rama `pr/feature-020-ci-workflows-fe` creada desde `develop` (8c25e88).
- [ ] `git diff --cached` muestra **exactamente 4 hunks, 1 línea cada uno**, todos en la línea `name:`.
- [ ] Ningún hunk toca `on:`, `paths:`, `concurrency:`, `env:`, `jobs:`, `steps:` (eso sería feature-021).
- [ ] Línea 1 de cada YAML coincide con `3ffcf60`:
  - `ci-pr.yml` → `name: CI PR`
  - `deploy-dev.yml` → `name: Deploy DEV (Cloud Run + Hosting)`
  - `deploy-prod.yml` → `name: Deploy PROD (promote STAGING artifact)`
  - `deploy-staging.yml` → `name: Deploy STAGING (Cloud Run + Hosting)`
- [ ] `git diff --check` sin marcadores de conflicto ni whitespace.
- [ ] `concurrency.group` siguen intactos (`grep -n 'group:' .github/workflows/*.yml` → `ponti-frontend-…` / `deploy-frontend-prod`).

### Comandos de verificación (solo lectura)

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web

# ningún name: debe contener "Frontend" tras el cambio
for f in ci-pr deploy-dev deploy-prod deploy-staging; do
  echo -n "$f.yml: "; head -1 .github/workflows/$f.yml
done

# el resto del archivo no debe diferir de develop (solo línea 1)
for f in ci-pr deploy-dev deploy-prod deploy-staging; do
  echo "=== $f ==="; git diff develop -- .github/workflows/$f.yml
done

# concurrency intacto
grep -n 'group:' .github/workflows/*.yml
```

## Validación manual (post-merge, en GitHub)

- [ ] Pestaña **Actions**: los workflows aparecen como "CI PR", "Deploy DEV/STAGING/PROD …" (sin "Frontend").
- [ ] Abrir un PR de prueba a `develop`: el workflow "CI PR" se dispara y los jobs `lint`/`typecheck`/`test`/`build` pasan.
- [ ] Settings → Branches: required status checks siguen verdes (reconfigurar si matcheaban "CI PR Frontend").
- [ ] Un push a `develop` dispara "Deploy DEV" correctamente (Cloud Run + Firebase Hosting).

## Tests sugeridos

- **FE (sanity, no obligatorio para YAML):**
  - `yarn --cwd ui lint`
  - `yarn --cwd ui typecheck`
  - `yarn --cwd ui test`
  - `yarn --cwd ui build`
- No hay tests específicos del rename.

## Casos borde

- Required check por **nombre de workflow** vs por **job**: si es por nombre, romperá hasta reconfigurar (ver risks).
- Badges/README/integraciones que linkeen al nombre viejo → quedan desactualizados (buscar string "Frontend DEV"/"CI PR Frontend").
- Si feature-021 ya está en `develop`: el archivo entero ya difiere en más líneas → obligatorio usar selección por hunk; NO `checkout` del archivo completo.

## Qué revisar en UI / API / DB / env

- **UI:** nada (no se toca `ui/`).
- **API:** nada (no se toca `api/`).
- **DB:** nada.
- **env / secrets / WIF / vars:** nada cambia; `REPOSITORY=ponti-frontend-registry`, `HOSTING_SITE_ID`, `CLOUD_RUN_SERVICE_FRONTEND_DEV`, WIF providers → intactos. Solo confirmar que no se editaron por accidente.

## Qué validar en el otro repo (BE)

- Que feature-020 BE haya quitado "Backend" de sus `name:` análogamente.
- Que ningún archivo `.github/workflows/*` colisione (no deberían: son repos separados).
- Que las required checks del repo BE no rompan por el rename.

## Señales de incompletitud / incompatibilidad

- Algún `name:` aún contiene "Frontend" → extracción incompleta.
- Aparecen cambios en jobs/steps/env → se coló feature-021 (extracción de más).
- Check requerido "pendiente" eterno en PR → branch protection por nombre desactualizada.
