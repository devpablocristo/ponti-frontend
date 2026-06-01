# implementation-status.md — feature-026 · fe-test-infra

## Estado global

**Parcial-extraíble** (el código en `3ffcf60` está completo, pero su portabilidad depende de features de producción que pueden no estar en `develop`).

- **% completitud del CÓDIGO en source (3ffcf60):** ~95% (specs y tests escritos y consistentes entre sí).
- **% portabilidad a `develop` HOY:** ~30% (solo el cleanup `.vite-smoke` es 100% seguro; el resto está gated por 6+ features).

## Estado en este repo (FE)

| componente | estado | nota |
|---|---|---|
| `ui/.vite-smoke/deps/*` (borrado x44) | **completo, portable ya** | basura de Vite versionada; borrado correcto |
| `api/test/authMiddleware.test.js` | completo | requiere `dist/routes/authMiddleware` (008) |
| `api/test/configService.test.js` | completo | requiere `dist/configService` (008/005) |
| `api/test/lotsRoute.test.js` (M) | completo | requiere `dist/utils/forwardQuery` (011) |
| `api/test/workOrdersRoute.test.js` (M) | completo | cambia semántica `hasWorkOrderScope` (008/011) |
| `api/src/mocks/handlers.ts` (M) | completo, ruidoso | reindent masivo + quita login/JWT; revisar por hunks |
| `ui/e2e/helpers/auth.ts` (M) | completo, con whitespace dañado | base de toda la suite e2e |
| 7 specs e2e nuevos | completos (147–308 ln) | gated por UI de 007/008/010/014/018 |
| `ui/e2e/lots.spec.ts`, `workorders-stock.spec.ts` (M) | completos, whitespace dañado | asserts data-driven |

## Estado en el otro repo (BE)

**Sin cambios BE.** No aplica.

## Tests

Esta feature ES la capa de tests. No tiene "sus propios tests"; el criterio de éxito es que la suite **corra verde** sobre `develop` con las dependencias presentes:
- `node --test api/test` (4 suites).
- `playwright test` (9 specs: 7 nuevos + 2 modificados; más los preexistentes del repo).

## Pendientes

### BLOQUEANTE para mergear
1. **Whitespace dañado** en `ui/e2e/helpers/auth.ts`, `ui/e2e/lots.spec.ts`, `ui/e2e/workorders-stock.spec.ts` (tabs mezclados con espacios en líneas re-indentadas). → corregir y verificar `git diff --check`.
2. **Dependencias de producción**: 026b necesita 008+011 en develop; 026c necesita 007/008/010 (+014/018). Sin ellas, `api/test` no compila y los e2e fallan.
3. **Workspace E2E**: `auth.ts` fija customer 14/project 29 ("SOALEN SRL"/"CAMPO COTY"). Confirmar que ese contexto existe en el entorno de test/seed; si no, todos los e2e fallan al cargar datos.

### Mejora futura
- Agregar `.vite-smoke` a `ui/.gitignore` para que no vuelva a versionarse.
- `drawer-audit.spec.ts` escribe PNG/JSON a `docs/audit/drawers/$phase`: considerar marcarlo como tooling y no como gate de CI.

### Deuda aceptable
- `handlers.ts` quedó con reindent masivo (sin newline final original); cosmético.
- Los specs e2e quedan acoplados al primer registro del payload (data-driven) — robusto pero asume dataset no vacío.

### Duda humana
- ¿Los runners (`ui/package.json` test:e2e, `api/package.json` `node --test`, `playwright.config.ts`) ya están en `develop`? No están en este flist pero `ui/package.json` SÍ cambia en el rango (otra feature). Verificar antes de 026b/026c.
- Orden 007 vs 010 para `customer-editor-smart-entity`.

## Bugs detectados

- Daño de whitespace (no es bug funcional pero rompe lint/`diff --check`).
- Riesgo de falso-rojo si el seed E2E no coincide con workspace 29.
