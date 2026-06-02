# spec.md — feature-024 · openapi-and-docs (FE)

- **id**: feature-024
- **nombre**: OpenAPI & docs
- **tipo**: docs
- **repo**: Frontend monorepo (`ui/` React + `api/` BFF NodeJS, yarn) — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe en FE**: SÍ (este paquete)
- **existe en BE**: SÍ — FULL-STACK con el mismo `feature-024`. El BE aporta `docs/OPENAPI.md` + `docs/openapi/{openapi.yaml,swagger.yaml,swagger.json}`, `CLAUDE.md` (root BE), `CRUDAR_PLAN.md`, catálogo de errores, observabilidad, lifecycle/archive, multi-tenant-evidence, etc. Paquete BE en `/home/pablocristo/Proyectos/pablo/ponti/core/docs/features-develop-problematico/feature-024-openapi-and-docs/`.
- **SOURCE de extracción**: `develop-problematico~1` (SHA `3ffcf60`). NUNCA usar `develop-problematico` (su tip = restore/vacío).
- **RANGO diff (fuente de verdad)**: `fefbe695..3ffcf60`.
- **rama destino**: `develop` (tip `8c25e88`).
- **DEPENDE DE**: ninguna feature a nivel de contenido. Hay dependencias de *referencia* débiles (los docs apuntan a código/componentes de otras features 006/007/014/018) que NO bloquean el merge porque son documentación.

## Resumen

Paquete (casi) 100% documentación del frontend. Agrega 56 archivos nuevos (3 `.md` de contenido + 2 `.md` de auditoría + 45 `.png` de visual regression + 7 `.txt` de fallas Playwright) y modifica 2 docs existentes (`README.md`, `ui/README.md`). No toca código fuente de `ui/src`, `api/src`, deps, ni config. Cubre tres bloques:

1. **Guía de arquitectura/onboarding FE** (`ui/CLAUDE.md`): modelo conceptual de listas del menú lateral (OT, Labores, Insumos, Stock), catálogos, tipos de movimiento de `supply_movements`, sistema de notificaciones + dark mode, UX writing (voseo, verbos CRUDAR), convenciones de filtros workspace / CSV / respuestas BE.
2. **Lineamientos responsive** (`docs/RESPONSIVE_GUIDELINES.md`): breakpoints, mobile-first, layout primitives, `ResponsiveTable`, modales/drawers, escala z-index, patrones prohibidos (lint-enforced), iOS Safari, touch targets, PDF export.
3. **Auditoría visual de drawers** (`docs/audit/drawers/`): `report.md` + `inventory.md` + `drawer-standard.md` + 45 PNG (before/after) + 7 `.txt` de artefactos de falla Playwright. Documenta la normalización de drawers laterales sobre `DrawerShell`.

Adicionalmente, `PR-92.md` (raíz) es el changelog narrativo del PR #92 "Nueva Versión Ponti" (new-cns3 → develop): describe TODAS las features funcionales y técnicas del big-bang, no solo docs.

## Objetivo

Dejar versionada la documentación de referencia del frontend: guía de onboarding Claude para `ui/`, lineamientos responsive canónicos, y evidencia de auditoría visual de la migración de drawers — sin tocar comportamiento. Más el changelog histórico del PR #92.

## Problema que resuelve

- Falta de documentación canónica del modelo de listas FE (por qué "Nuevo" significa cosas distintas en OT vs Insumos vs Stock), del sistema de notificaciones/dark-mode y de las reglas de UX writing (voseo, verbos CRUDAR).
- Falta de un contrato responsive escrito (breakpoints, primitivas, z-index, patrones prohibidos por lint).
- Auditoría visual de la migración de drawers sin versionar (evidencia before/after).
- Drift de tipos BE↔FE: parte del contrato OpenAPI (consumo `yarn codegen:openapi`) se documenta del lado BE; este paquete FE NO contiene el `openapi.yaml` (lo produce el BE).

## Alcance en este repo (FE)

Archivos nuevos (A) — agrupados por bloque:

- **Docs de contenido**: `ui/CLAUDE.md`, `docs/RESPONSIVE_GUIDELINES.md`, `PR-92.md`.
- **Auditoría visual (texto)**: `docs/audit/drawers/report.md`, `docs/audit/drawers/inventory.md`, `docs/audit/drawers/drawer-standard.md`.
- **Auditoría visual (binarios)**: 25 PNG en `docs/audit/drawers/after/`, 20 PNG en `docs/audit/drawers/before/` (incluye `*.failed.png`), 7 `docs/audit/drawers/before/*.failure.txt`.

Archivos modificados (M): `README.md`, `ui/README.md`.

## Alcance en el otro repo (BE, mismo feature-024)

El BE publica el contrato OpenAPI (`docs/openapi/swagger.yaml` — piloto de 2 endpoints: `GET /me/context`, `POST /data-integrity/verify-costs/{projectId}` / `GET /data-integrity/costs-check`), `docs/OPENAPI.md`, `CLAUDE.md` (root BE), `CRUDAR_PLAN.md` (810 líneas, un plan FE viviendo en el repo BE), catálogo de errores, observabilidad, lifecycle/archive. El consumo `yarn codegen:openapi` que regenera tipos FE a partir de ese yaml NO está en este flist (el script/output viven en `ui/` pero no aparecen en el diff de 024).

## Fuera de alcance

- El contrato OpenAPI propiamente dicho (`openapi.yaml`/`swagger.yaml`) — es BE.
- El rename de tooling `core/*`→`platform/*`, `ponti-frontend`→`web`, retiro de `xlsx` — los hunks de `README.md`/`ui/README.md` los tocan, pero ese rename pertenece a feature-001 (platform-tenancy-refactor) / 021 (build-and-deploy-config). Ver "DECISIÓN".
- Cualquier código que los docs describen (CRUDAR primitives → 006/014; actors → 007; data-integrity → 018; dark mode/notify → ya DONE en #105 parcial). 024 solo documenta, no porta ese código.
- `ui/src/generated/ponti-ai.openapi.{json,ts}` y `ui/src/types/ai.ts` — referenciados en README pero NO en el flist (son de 012 ai-companion).

## Comportamiento esperado

Ninguno en runtime. Son docs estáticos + binarios de evidencia. El único "comportamiento" es que `docs/RESPONSIVE_GUIDELINES.md` referencia un lint CI (`ui/scripts/lint-responsive-antipatterns.sh`) que NO está en este flist (es de 020 ci-workflows). El doc puede mergear aunque ese script aún no exista (queda como referencia adelantada).

## Estado en dp~1 (3ffcf60)

- Los 56 archivos nuevos existen y son legibles/coherentes. Confirmado: `ui/CLAUDE.md` (159 líneas), `docs/RESPONSIVE_GUIDELINES.md` (~150 líneas), `PR-92.md` (~150 líneas), `docs/audit/drawers/{report,inventory,drawer-standard}.md`.
- `docs/audit/drawers/` pesa ~3.6 MB en 55 objetos binarios+texto. El `report.md` declara: corrida `before` dejó 28 archivos (screenshots + artefactos de falla); corrida `after` dejó 21 screenshots y 0 fallas.
- Ninguno de los nuevos existe en `develop` (8c25e88) — verificado: alta limpia, sin posibilidad de conflicto.
- Los 2 modificados (`README.md`, `ui/README.md`) ya existen en develop con el contenido VIEJO (nombres `core-authn`, `ponti-frontend`, `xlsx`). El hunk de 024 los renombra a `platform-*`/`web`/retiro `xlsx` — overlap con 001/021.

## Criterios de aceptación

1. Los 56 archivos nuevos aparecen idénticos a `3ffcf60` en `develop` tras el merge (`git diff 3ffcf60 -- <paths>` vacío).
2. Los PNG/`.txt` binarios se copian byte a byte (usar `git checkout`, NO copy-paste manual).
3. `git diff --check` limpio en los `.md` (riesgo bajo; son markdown).
4. No se introduce ningún cambio en `ui/src`, `api/src`, `package.json`, `ui/package.json`, lockfiles ni config.
5. Para `README.md`/`ui/README.md`: o bien se OMITEN (recomendado, dejar el rename a 001/021), o se traen SOLO si 024 va antes que 001/021 y se coordina el ownership del rename.

## Endpoints / modelos / UI / DB / tests afectados

- **Endpoints/rutas**: documentados, no creados. `ui/CLAUDE.md` referencia rutas FE (`/admin/work-orders`, `/admin/tasks`, `/admin/supply-movements`, `/admin/stock`, `/admin/database/{labors,items,actors,investors,managers,campaigns}/...`) y endpoints BE listados (`GET /work-orders`, `GET /labors/group`, `GET /supply_movements`, `GET /stock/...`, `/categories?type_id=N`).
- **Modelos/DTOs/tipos**: ninguno creado. `ui/CLAUDE.md` menciona tipo `EntityCopy`, tablas BE (`work_orders`, `labors`, `supply_movements`, `stock`, `supplies`, `actors`), enums `entry_type.go` (Remito oficial / Movimiento interno / Stock / Devolución / Consumo OT).
- **Componentes/hooks/stores**: ninguno creado. Referencia componentes CRUDAR (`EntityFormDrawer`, `ArchivedDrawer`, `DrawerShell`, `AppButton`, `ToolbarActionButton`, `ResponsiveTable`), hooks (`useIsMobile`, `useBreakpoint`, `useWorkspaceFilters`, `useEntityCrud`), libs (`@/lib/notify`, `ThemeProvider`, `translateBackendError`, `formatError`, `parseCsv`).
- **UI**: ninguna pantalla nueva. La auditoría documenta drawers EXISTENTES.
- **DB**: ninguna migración.
- **Tests**: ninguno de código. Los `.failure.txt` son output de Playwright (visual regression) — evidencia, no suite ejecutable incluida.

## Dependencias

- **Intra-repo (débiles, de referencia)**: los docs apuntan a componentes/hooks de 006 (design-system), 007 (actors), 014 (master-data-pages), 018 (data-integrity), al lint `ui/scripts/lint-responsive-antipatterns.sh` (020) y a `tailwind.config.js`. Todos son referencias informativas; ningún doc "se rompe" si esos paths aún no existen.
- **Cross-repo (débil)**: `ui/CLAUDE.md` y `PR-92.md` describen contratos BE (entry_type.go, repository_movement.go, endpoints). El consumo del contrato OpenAPI BE (`yarn codegen:openapi`) NO está en este flist. Coordinación recomendada pero NO bloqueante.

## Riesgos

- **Funcionales**: nulos (docs + binarios).
- **Técnicos**: conflicto/regresión en `README.md`/`ui/README.md` si se traen sus hunks: pisan el rename `core→platform`/`ponti-frontend→web`/retiro `xlsx`, que es terreno de 001/021. develop AÚN tiene los nombres viejos → traer el hunk de 024 adelantaría un rename que debería ser dueño otra feature.
- **Doc desactualizada / engañosa**: `PR-92.md` es un changelog histórico del big-bang; describe features que en develop pueden estar parcialmente porteadas (lot-metrics, tentative-prices, table-select-filters, reports-dark-mode ya DONE). NO tratarlo como estado presente de develop. `inventory.md` describe el estado PRE-migración (drawers legacy); `report.md`/`drawer-standard.md` el POST.
- **Peso del repo**: +3.6 MB de PNG binarios. Aceptable para evidencia, pero considerar si el equipo prefiere Git LFS o excluir los `before/*.failed.png`.
- **Extracción parcial de binarios**: copiar PNG a mano corrompe; SIEMPRE `git checkout 3ffcf60 -- <path>`.

## DECISIÓN recomendada

**Extraer tal cual los 56 nuevos (whole-file/binario vía git checkout); OMITIR o coordinar los 2 modificados.**

- Los 56 nuevos (`ui/CLAUDE.md`, `docs/RESPONSIVE_GUIDELINES.md`, `PR-92.md`, `docs/audit/**`): `whole-file` / copia binaria directa desde `3ffcf60`. Seguro, sin conflicto posible (no existen en develop).
- Los 2 modificados (`README.md`, `ui/README.md`): `do-not-extract-yet` / `manual-port`. Recomendación: NO traerlos con 024. Su contenido (rename a `platform-*`/`web`, retiro `xlsx`) pertenece a feature-001 (platform-tenancy) y 021 (build/deploy). Si 024 debe mergear antes y se quiere consistencia, traer SOLO esos hunks vía `git restore -p` y dejar nota de ownership. La parte propiamente "docs" de esos READMEs (sección OpenAPI/Axis Companion) es mínima y puede esperar.
- No partir en subfeatures: el bloque es pequeño y cohesivo. Único cuidado real: los 2 READMEs y el peso binario.
