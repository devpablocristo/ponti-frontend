# file-list.md — feature-024 · openapi-and-docs (FE)

Flist autoritativo: `/tmp/flists/fe-024.txt` (58 A + 2 M = 60 entradas).
Desglose por tipo: 8 `.md`, 45 `.png`, 7 `.txt`. SOURCE = `3ffcf60` (develop-problematico~1).

Leyenda extracción: `whole-file` = copiar entero/binario desde 3ffcf60 · `partial-hunks` = solo hunks propios vía `git restore -p` · `manual-port` = revisar y portar a mano · `do-not-extract-yet` = no traer con 024.

## Propios (alta limpia, no existen en develop)

### Docs de contenido (.md)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/CLAUDE.md` | A | md/guía | Guía onboarding FE: modelo de listas (OT/Labores/Insumos/Stock), catálogos, entry_type, notify+dark-mode, UX writing voseo/CRUDAR, convenciones filtros/CSV/respuestas BE | whole-file | No existe en develop; doc cohesivo | bajo | alta |
| `docs/RESPONSIVE_GUIDELINES.md` | A | md/guía | Contrato responsive: breakpoints, mobile-first, layout primitives, ResponsiveTable, drawers/modales, z-index scale, patrones prohibidos (lint), iOS Safari, touch, PDF export | whole-file | No existe en develop | bajo | alta |
| `PR-92.md` | A | md/changelog | Changelog narrativo PR #92 "Nueva Versión Ponti" (new-cns3→develop, 352 archivos). Describe TODAS las features del big-bang, no solo docs | whole-file | No existe en develop | bajo (engañoso si se lee como estado actual) | alta |

### Auditoría visual — texto (.md)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `docs/audit/drawers/report.md` | A | md/auditoría | Resultado de la normalización de drawers sobre DrawerShell; lista 21 escenarios verificados con Playwright | whole-file | No existe en develop | bajo | alta |
| `docs/audit/drawers/inventory.md` | A | md/auditoría | Tabla inventario PRE-migración: ruta / drawer / componente / botones / problemas detectados | whole-file | No existe en develop | bajo (es estado pre-migración) | alta |
| `docs/audit/drawers/drawer-standard.md` | A | md/auditoría | Contrato estructural/visual/botones del drawer estándar (DrawerShell, AppButton...) | whole-file | No existe en develop | bajo | alta |

### Auditoría visual — binarios after/ (.png, 25 archivos)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `docs/audit/drawers/after/*.png` (25 PNG: actors-{archived,new}, campaigns-{archived,new}, customers-{archived,new}, database-{items-new,supplies-new,tasks-new}, investors-{archived,new}, lots-{archived,edit}, managers-{archived,new}, products-{archived,new}, stock-new, supply-movements-{archived,new}, tasks-{archived,new}, workorders-{archived,new}) | A | png/evidencia | Screenshots POST-migración (drawers normalizados, 0 fallas) | whole-file (binario `git checkout`) | No existen en develop; copia byte a byte obligatoria | bajo | alta |

### Auditoría visual — binarios before/ (.png + .txt, 20 PNG + 7 TXT)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `docs/audit/drawers/before/*.png` (20 PNG: incluye OK como actors/campaigns/customers/investors/lots-archived/managers/tasks-archived/workorders-archived, y `*.failed.png` para database-items-new, database-tasks-new, lots-edit, products-new, stock-new, tasks-new, workorders-new) | A | png/evidencia | Screenshots PRE-migración; `*.failed.png` = escenarios que antes no abrían | whole-file (binario `git checkout`) | No existen en develop | bajo | alta |
| `docs/audit/drawers/before/*.failure.txt` (7 TXT: database-items-new, database-tasks-new, lots-edit, products-new, stock-new, tasks-new, workorders-new) | A | txt/evidencia | Stack/log Playwright de la falla `before` (locator no visible) | whole-file | No existen en develop; evidencia, no test ejecutable | bajo | alta |

## Compartidos (partial) — NO traer con 024 (recomendado)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `README.md` | M | md/raíz | Hunk: renombra deps `@devpablocristo/core-*`/`modules-*` → `platform-*`; cambia copy de OpenAPI AI a "shape legacy ponti-ai / Axis Companion" | do-not-extract-yet | El rename `core→platform` es de **feature-001** (platform-tenancy-refactor). develop tip AÚN tiene nombres viejos. 024 no debe ser dueño del rename | medio (regresión de ownership) | alta |
| `ui/README.md` | M | md/raíz | Hunk: `ponti-frontend/docker-compose.yml`→`web/docker-compose.yml`; deps `core/modules`→`platform`; retiro `xlsx`→`read-excel-file` + `.xls` legacy; nota OpenAPI "ponti-ai legacy / Axis Companion" | do-not-extract-yet | Mezcla rename de 001 + cambio build/deps de **021** (retiro xlsx). develop tip AÚN dice `ponti-frontend`/`xlsx` | medio | alta |

## Requeridos por dependencia

Ninguno. 024-FE es documentación pura; no requiere artefactos de otras features para mergear.

## Dudosos

| path | status | nota | acción |
|---|---|---|---|
| `PR-92.md` | A | Changelog del big-bang completo. ¿Pertenece a 024 o debería ser un doc histórico fuera del flujo de extracción por-feature? El flist lo asigna a 024 | Traer whole-file pero ETIQUETAR como changelog histórico; no usar como spec de develop |
| `docs/audit/drawers/before/*.failed.png` + `*.failure.txt` | A | Artefactos de FALLA de la corrida `before`. ¿Vale versionar fallas? El report.md las menciona como evidencia | Traer (forman el set "before" completo); opcional discutir si se podan |

## NO traer todavía

- `README.md`, `ui/README.md` (ver Compartidos): omitir; dejar el rename `core→platform`/retiro `xlsx` a 001/021. Si 024 va primero, coordinar ownership y traer solo el hunk de copy OpenAPI/Axis-Companion vía `git restore -p`.

## Notas de volumen

- Total binario `docs/audit/`: ~3.6 MB en 55 objetos. Considerar Git LFS o poda de `before/*.failed.png` si pesa demasiado.
- Ningún archivo del flist toca `ui/src`, `api/src`, `package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`, `ui/src/router.tsx`, `ui/src/main.tsx`, `api/src/routes/index.ts`, `api/src/index.ts` (los archivos compartidos típicos de este repo NO aparecen en 024).

## Inventario adicional (completitud) — artefactos generados

Estos 52 paths son artefactos GENERADOS en masa por la corrida de auditoría visual de drawers (Playwright): capturas PNG y logs de falla. No se clasifican uno por uno; se agrupan por patrón de directorio. SOURCE = `3ffcf60` (develop-problematico~1).

| patrón / directorio | conteo | tipo | extracción | motivo | confianza |
|---|---|---|---|---|---|
| `docs/audit/drawers/after/*.png` | 24 | png/evidencia generada | do-not-extract-yet | artefacto de build/auditoría regenerable; no portar; agregar a .gitignore si corresponde | alta |
| `docs/audit/drawers/before/*.png` (incluye 14 OK + 7 `*.failed.png`) | 21 | png/evidencia generada | do-not-extract-yet | artefacto de build/auditoría regenerable; no portar; agregar a .gitignore si corresponde | alta |
| `docs/audit/drawers/before/*.failure.txt` | 7 | txt/log de falla generado | do-not-extract-yet | artefacto de build/auditoría regenerable; no portar; agregar a .gitignore si corresponde | alta |

Conteo exacto: 52 paths (24 en `after/` + 28 en `before/`; estos 28 = 21 PNG —de los cuales 7 son `*.failed.png`— + 7 `*.failure.txt`). Ejemplos representativos: `docs/audit/drawers/after/actors-new.png`, `docs/audit/drawers/before/products-new.failed.png`, `docs/audit/drawers/before/stock-new.failure.txt`. El resto sigue el mismo patrón de nombre `{ruta}-{new|archived|edit}[.failed].{png|txt}` bajo `after/` y `before/`.
