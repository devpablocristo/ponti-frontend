# implementation-status.md — feature-021 Build & deploy config (FE)

## Estado global
**Parcialmente extraíble.** A nivel de archivos en `dp~1` (SHA `3ffcf60`) la config está **completa y funcional**, pero está **fuertemente acoplada** a la migración platform, a 006, 024 y 008. La porción genuina de "build & deploy config" es extraíble sola (Ola A); el resto viaja con otras features.

- **% completitud (como feature de config aislada):** ~85% del valor concentrado en Ola A; el resto son hunks que pertenecen a otras features.
- **% extraíble limpio AHORA (Ola A):** ~55% de los archivos (`api/eslint.config.js`, `api/.eslintignore`, `ui/knip.json`, 2 scripts, deletes de locks, hunks lock/chokidar).

## Estado en este repo (FE)
| área | estado | nota |
|------|--------|------|
| Bloqueo `package-lock.json` + deletes | completa | autocontenida, mergeable ya |
| `api/eslint.config.js` flat-config | completa | reemplaza `.eslintignore` |
| `ui/eslint.config.js` warn→error | completa | verificar que el código actual no rompa con `error` |
| `ui/knip.json` | completa | nuevo |
| Scripts lint (notify-leaks, responsive) | completa pero acoplada | referencian módulos de 006 |
| docker-compose chokidar | completa | fix ENOSPC |
| docker-compose puerto 3001 | dudosa | confirmar intención |
| `ui/package.json` deps swap | NO-021 | platform-migration |
| `ui/yarn.lock` | regenerable | no copiar literal |
| `ui/tailwind.config.js` darkMode/screens/zIndex | NO-021 | feature-006 |
| `ui/vite.config.ts` chunks | NO-021 | platform/006 |
| `ui/src/api/generated/*` | NO-021 | feature-024, regenerar |
| `api/src/clients/ApiClient.ts` | NO-021 | feature-008 (X-Tenant-Id) |

## Estado en el otro repo (BE)
- 021 BE: Dockerfile/compose + go.mod/go.sum. **Bumps go-jose/x/net YA porteados (#124)** → excluir de 021.
- 024 BE: debe publicar `core/docs/openapi/swagger.yaml` para el codegen FE.
- Desconocido desde este paquete el grado exacto de avance del BE; coordinar.

## Tests
- No hay tests unitarios/e2e nuevos en 021.
- Afecta gates: `yarn lint` (3 etapas), knip, e ignores de playwright/eslint.
- Validación = ejecutar lint/build/compose (ver validation.md).

## Pendientes
- Confirmar puerto BFF `3001:3000`.
- Decidir si cablear `lint:notify-leaks`/`lint:responsive` en `lint` antes de que 006 exista.
- Regenerar `yarn.lock` y `generated/types.ts` en lugar de copiarlos.

## Bugs / observaciones
- Los `.sh` usan `set -u` (no `set -e`) y devuelven exit 1 solo ante hits → seguros aunque falten los módulos referenciados.
- `git diff` muestra que muchos archivos cambian TODAS sus líneas: es reescritura de line-endings (CRLF↔LF) además del cambio real. Al extraer con `git restore -p`, revisar que no se cuele un cambio masivo de EOL no deseado (`git diff --check`).

## Clasificación
### BLOQUEANTE para mergear (Ola A)
- Verificar que `eslint .` (ui, reglas en `error`) no rompa el árbol de develop.
- Asegurar que NO se cuela `ApiClient.ts` ni hunks de deps platform en la PR de config.
- `git diff --check` limpio (sin marcadores ni cambios masivos de EOL).

### Mejora futura
- Cablear scripts de lint en CI tras 006.
- Regenerar cliente OpenAPI tras 024.

### Deuda aceptable
- Cambios de line-ending en archivos config (cosmético, si se normaliza).

### Duda humana
- Puerto BFF 3001.
- ¿Activar guardrails antes de 006?
