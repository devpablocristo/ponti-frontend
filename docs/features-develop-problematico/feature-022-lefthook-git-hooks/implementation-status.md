# implementation-status — feature-022 · lefthook-git-hooks (FE)

## Estado general
- **completa** (como config). El archivo es funcional y autocontenido.
- **% completitud**: ~95% para el objetivo declarado. El -5% es la ausencia de instalación gestionada por el proyecto (lefthook no es devDependency, no hay auto-install).

## Estado en este repo (FE)
- `lefthook.yml` presente y completo en SOURCE (3ffcf60). 27 líneas. Status `A` respecto del rango `fefbe695..3ffcf60`.
- No existe en develop → port = add limpio sin conflicto.
- Define:
  - `pre-commit` (`parallel: true`): `eslint` + `typecheck`, ambos con `glob: "ui/src/**/*.{ts,tsx}"`.
  - `pre-push`: `tests` → `vitest run --passWithNoTests`.
- Confianza: **alta** (verificado por `git show` y `git diff` del rango).

## Estado en el otro repo (BE / core)
- Existe un `lefthook.yml` análogo (feature-022 BE) con comandos del stack Go. **Desconocido el detalle exacto** desde este repo (no inspeccionado acá; lo cubre el paquete del repo `core`). Sin impacto sobre el FE.

## Tests
- No agrega ni modifica tests.
- El hook `pre-push` invoca la suite existente de `ui` (`vitest run`); su éxito depende del estado de los tests en develop, no de esta feature.

## Pendientes / mejoras
- **BLOQUEANTE-para-mergear**: ninguno. El add es seguro.
- **mejora-futura**:
  1. Declarar `lefthook` como `devDependency` en `ui/package.json` (o raíz) + script `prepare`/`postinstall` que corra `lefthook install`, para que el setup sea automático y no dependa de instalación a nivel sistema.
  2. Documentar el setup en `README`/`CONTRIBUTING`.
  3. Evaluar extender hooks al sub-proyecto `api/` (hoy solo cubren `ui/`).
- **deuda-aceptable**:
  - `yarn eslint` / `yarn tsc` / `yarn vitest` invocan binarios directos en vez de los scripts npm (`lint`/`typecheck`/`test`). Funciona si los binarios son resolubles, pero diverge de los scripts oficiales (p. ej. `lint` real también corre `lint:notify-leaks` y `lint:responsive`). Es intencional (hooks más rápidos), pero conviene tenerlo presente.
- **duda-humana**:
  - ¿El equipo quiere lefthook como dependencia gestionada o como instalación manual? Define si se agrega (1) ahora o después.
  - ¿`typecheck` con `tsc -b` (build incremental, full-project) es aceptable en cada commit en términos de tiempo? Puede ser lento en repos grandes.

## Riesgo de mergear parcial
- N/A — es 1 solo archivo; no hay "parcial" posible. O está entero o no está.
