# risks — feature-022 · lefthook-git-hooks (FE)

## Funcionales
- **Nulo en runtime de la app.** El archivo solo lo consume el binario `lefthook` localmente. No afecta el bundle, ni el BFF `api/`, ni endpoints, ni datos.

## Técnicos
- **lefthook no es dependencia del proyecto** (verificado: no aparece en `package.json`/`ui/package.json`/`api/package.json` en 3ffcf60). Consecuencia:
  - Dev SIN lefthook instalado y sin `lefthook install` → los hooks simplemente no corren. Degradación silenciosa, **no rompe nada** (riesgo bajo, pero reduce el valor del feature).
  - *Mitigación*: documentar en README/CONTRIBUTING; o agregar `lefthook` como devDependency + `prepare` script (mejora futura).
- **Comandos invocan binarios directos** (`yarn eslint`, `yarn tsc`, `yarn vitest`) en vez de scripts npm. Si en algún momento esos binarios dejan de ser resolubles desde `ui/` (cambio de deps), el hook falla y **bloquea el commit local**.
  - *Mitigación*: el hook usa `cd ui &&`; confirmar que `ui/node_modules/.bin` tiene `eslint`/`tsc`/`vitest`. Hoy existen (scripts `lint`/`typecheck`/`test` los usan).
- **`tsc -b` en pre-commit puede ser lento** (build incremental full-project en cada commit). Riesgo de fricción/DX, no de correctitud.
  - *Mitigación*: el comando intenta `--noEmit 2>/dev/null` primero; aceptable, monitorear tiempos.
- **`glob` cubre solo `ui/src/**`**: cambios en `api/`, en `ui/` fuera de `src`, o config raíz no disparan hooks. Cobertura parcial intencional, pero puede dar falsa sensación de seguridad.

## Integración
- Posible colisión con hooks preexistentes en `.git/hooks` si algún dev tenía husky u hooks manuales. lefthook gestiona/sobrescribe vía `lefthook install`; en este repo no hay husky/.husky (verificado), así que el riesgo es bajo y queda en el entorno local del dev.

## Cross-repo
- El `lefthook.yml` del repo `core` es independiente. Riesgo de **inconsistencia de DX** si solo se mergea uno (devs tendrían hooks en un repo y no en el otro). Cosmético, no técnico.
- No hay contrato compartido entre ambos YAML → mergear uno no rompe al otro.

## Datos / migración
- Ninguno. No hay DB, migraciones ni estado persistente.

## Archivos compartidos
- Ninguno involucrado. `lefthook.yml` es nuevo y aislado; no toca `ui/yarn.lock`, `package.json`, routers ni bootstrap. **Sin riesgo de partial-hunk.**

## Extracción parcial
- No aplica (1 archivo). Único modo de fallo: olvidar copiar el archivo o copiarlo truncado.
  - *Detección*: `diff <(git show 3ffcf60:lefthook.yml) lefthook.yml` debe ser vacío; el archivo debe tener 27 líneas y terminar en la línea `run: cd ui && yarn vitest run --passWithNoTests`.

## Riesgo de mergear SOLO este repo (FE) / SOLO el otro (BE)
- **Solo FE**: seguro. Devs tienen hooks en frontend; backend sin hooks hasta que se mergee BE-022. Sin impacto técnico.
- **Solo BE**: seguro y simétrico. Sin impacto sobre el FE.
- En ambos casos el único "costo" es DX inconsistente entre repos, temporal y reversible.

## Severidad global
- **Baja.** Cambio de tooling local, aditivo, opcional, sin efectos en runtime/CI/build/datos.
