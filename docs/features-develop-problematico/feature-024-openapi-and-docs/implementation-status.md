# implementation-status.md — feature-024 · openapi-and-docs (FE)

## Estado global

**COMPLETA** (como paquete de documentación). Los 56 archivos nuevos existen, son legibles y coherentes en `3ffcf60`. Los 2 READMEs modificados son el único punto con matices (overlap de ownership, no incompletitud).

- **% completitud (contenido)**: ~100% para los archivos que define este flist. No hay TODOs visibles ni secciones a medias en los `.md` cosechados.
- **% completitud (objetivo "documentar todo el FE")**: parcial por naturaleza — `ui/CLAUDE.md` cubre el modelo de listas/notify/UX writing pero no es exhaustivo de toda la app; `RESPONSIVE_GUIDELINES` cubre los patrones clave. Es documentación viva, no un contrato cerrado.

## Estado en este repo (FE)

| bloque | estado | nota |
|---|---|---|
| `ui/CLAUDE.md` | completo | 159 líneas, coherente. Referencia código de 006/007/014/018 que puede o no estar en develop |
| `docs/RESPONSIVE_GUIDELINES.md` | completo | ~150 líneas. Referencia lint CI (020) y primitivas (006) aún no necesariamente en develop |
| `docs/audit/drawers/{report,inventory,drawer-standard}.md` | completo | report.md declara 21 escenarios verificados, 0 fallas en `after` |
| `docs/audit/drawers/after/*.png` (25) | completo | evidencia POST-migración |
| `docs/audit/drawers/before/*.png` (20) + `*.failure.txt` (7) | completo | evidencia PRE-migración (incluye fallas intencionales) |
| `PR-92.md` | completo | changelog histórico del big-bang |
| `README.md` (M) | overlap | hunk de rename `core→platform` + copy OpenAPI/Axis-Companion. NO recomendado traer con 024 |
| `ui/README.md` (M) | overlap | hunk de rename + retiro `xlsx` + copy OpenAPI. NO recomendado traer con 024 |

## Estado en el otro repo (BE, mismo feature-024)

- BE-024 documentado como COMPLETO en su propio paquete (`core/docs/.../feature-024-openapi-and-docs/`): 17 nuevos + 3 modificados. El contrato OpenAPI es **piloto de 2 endpoints** (`/me/context`, `/data-integrity/...`); ~48 handlers sin anotar (pendiente declarado en `docs/OPENAPI.md`).
- El consumo FE del swagger (`yarn codegen:openapi`) NO está en este flist FE → no hay parte FE "a medias" del OpenAPI aquí.

## Tests

- No hay tests de código en 024-FE.
- Los `*.failure.txt` son OUTPUT de Playwright (visual regression), evidencia histórica — no una suite incluida ni ejecutable desde este paquete.

## Pendientes (por categoría)

### BLOQUEANTE para mergear

- **Ninguno** para los 56 nuevos. Decisión sobre los 2 READMEs (omitir vs coordinar con 001/021) es lo único a resolver antes del PR, y la recomendación es OMITIR → no bloquea.

### Mejora futura

- Anotar el OpenAPI BE completo y actualizar la nota de codegen en `ui/CLAUDE.md`/`ui/README.md`.
- Mover `PR-92.md` a `docs/history/` para no ensuciar la raíz.
- Evaluar Git LFS o poda de `before/*.failed.png` (~3.6 MB de PNG).
- Materializar el lint `ui/scripts/lint-responsive-antipatterns.sh` (020) que `RESPONSIVE_GUIDELINES` referencia.

### Deuda aceptable

- `PR-92.md`, `MULTI_TENANT`/auditorías: snapshots históricos con datos/fechas que no matchean develop presente. Aceptable como evidencia fechada; no tratar como estado actual.
- `inventory.md` describe el estado PRE-migración (drawers legacy) — intencional, no obsolescencia.

### Duda humana

1. ¿`README.md`/`ui/README.md` van con 024 o con 001/021? (recomendación: 001/021 dueños; 024 omite).
2. ¿Versionar los artefactos de FALLA (`before/*.failed.png` + `*.failure.txt`) o podarlos?
3. ¿`PR-92.md` debería vivir en la raíz o en un `docs/history/`?

## Bugs

- Ninguno funcional (no hay código).
- Riesgo de "bug documental": leer `PR-92.md` como estado actual de develop induce a error (describe features parcialmente porteadas o aún pendientes). Mitigado con etiqueta de changelog histórico.
