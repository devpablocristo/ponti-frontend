# Análisis de descomposición de `develop-problematico` — Frontend (web)

> **Documento GLOBAL** del análisis de descomposición de la rama de integración `develop-problematico`.
> Aplica al monorepo **Frontend** (`web`): `ui/` (React) + `api/` (BFF NodeJS, yarn).
> Las features marcadas como BE viven en el otro repo (`core`/`platform`) y se listan aquí **solo para trazabilidad y orden de merge**; en este repo no tienen archivos.

---

## Resumen ejecutivo

`develop-problematico` fue una **rama de integración** que acumuló múltiples líneas de trabajo en paralelo (new-cns3 + projects + admin + tooling + ...) sobre una base común. Su **último commit es un `restore`** (`ac5dd2e — restore: app a estado pre-new-cns3 + mantener tooling local actual`) que **vacía la rama** dejándola en estado pre-new-cns3. Por eso el **pico real de trabajo** —y la fuente de extracción— **no es el tip**, sino el commit anterior.

- **SOURCE de extracción = `develop-problematico~1` (SHA `3ffcf60`, "done")** — NUNCA el tip.
- **Tip (a ignorar) = `ac5dd2e`** (restore que vacía la rama).
- **Destino de todas las extracciones = `develop`.**

El objetivo es **descomponer** ese pico en features independientes, documentadas y extraíbles una por una, priorizando merges seguros (BE-first donde hay full-stack) y agrupando los cambios grandes (familias master-data, archive-surface) en **PRs por entidad**.

> **GUARDRAIL:** este documento es **solo análisis**. Cero cambios a código. Todo comando `git` que aparezca en la documentación es una **sugerencia**, no algo a ejecutar.

---

## Datos del análisis

| Campo | Valor |
|---|---|
| **Fecha del análisis** | 2026-05-30 |
| **Repo** | Frontend monorepo `web` — `ui/` (React) + `api/` (BFF NodeJS, yarn) |
| **Path** | `/home/pablocristo/Proyectos/pablo/ponti/web` |
| **Rama base (destino)** | `develop` |
| **Rama problemática** | `develop-problematico` (tip = `ac5dd2e`, restore que la vacía) |
| **SOURCE real de extracción** | `develop-problematico~1` = **`3ffcf60`** ("done") — el pico |
| **Rango fuente** | `fefbe695..3ffcf60` |
| **Archivos cambiados en este repo (FE)** | **582** |
| **Archivos cambiados en el otro repo (BE)** | 427 (referencia, no aplica a este repo) |
| **Features globales** | **27** |
| **Features con cambios en este repo (FE)** | **16** (006, 007, 008, 010, 011, 012, 014, 015, 016, 017, 018, 020, 021, 022, 024, 026) |

---

## Tabla de features

Leyenda:
- **FE / BE**: tiene cambios de Frontend / Backend.
- **Este repo**: tiene archivos en `web` (FE).
- **Listo extraer**: `sí` (definido y aislable) · `parcial` (parte ya en `develop` o requiere coordinación) · `no` (vive en el otro repo).
- **Orden**: orden recomendado de extracción/merge (los `—` son BE-first en el otro repo; se respetan sus deps).

| ID | Nombre | Tipo | FE | BE | Estado | Tamaño (este repo) | Riesgo | Deps | Listo extraer | Orden |
|---|---|---|---|---|---|---|---|---|---|---|
| [001](#) | be-platform-tenancy-refactor | refactor | no | sí | otro repo | — | medio (base BE) | — | no (BE) | 1 |
| [002](#) | be-crudar-lifecycle-framework | refactor | no | sí | otro repo | — | medio | — | no (BE) | 2 |
| [003](#) | be-multitenant-db-hardening | migration | no | sí | otro repo | — | alto (datos stale) | 001 | no (BE) | 3 |
| [004](#) | shared-text-propername | feature | no | sí | otro repo | — | bajo | — | no (BE) | 4 |
| [005](#) | be-config-modularization | infra | no | sí | otro repo | — | bajo | — | no (BE) | 5 |
| [006](feature-006-fe-design-system/) | fe-design-system | refactor | sí | no | **este repo** | grande (base FE) | alto (router/main MEZCLADOS) | — | **sí** | 6 |
| [007](feature-007-actor-system/) | actor-system | feature | sí | sí | **este repo** | grande | alto | 001,002,003,004,006 | **parcial** (BE-first) | 7 |
| [008](feature-008-identity-tenant-context/) | identity-tenant-context | feature | sí | sí | **este repo** | mediano | alto | 007 | **parcial** (BE-first) | 8 |
| [009](#) | crudar-archive-surface | refactor | no | sí | otro repo | — | alto (cambio contrato) | 002 | no (BE; FE en 014/006) | 9 |
| [010](feature-010-projects/) | projects | feature | sí | sí | **este repo** | mediano | medio | 007,009 | **parcial** (BE-first) | 10 |
| [011](feature-011-campaign-dto-projectid/) | campaign-dto-projectid | bugfix | sí | sí | **este repo** | chico | medio (shape desync) | — | **parcial** (coordinado) | 11 |
| [012](feature-012-ai-companion-integration/) | ai-companion-integration | feature | sí | sí | **este repo** | mediano | medio | 005 | **parcial** (BE-first) | 12 |
| [013](#) | be-csv-export | refactor | no | sí | otro repo | — | medio (XLSX→CSV, revisar FE) | — | no (BE) | 13 |
| [014](feature-014-fe-master-data-pages/) | fe-master-data-pages | feature | sí | no | **este repo** | **muy grande (212 arch.)** | alto | 006,007,009 | **parcial** (1 PR/entidad; lots/workorders DONE) | 14 |
| [015](feature-015-fe-dashboard-consolidation/) | fe-dashboard-consolidation | refactor | sí | no | **este repo** | mediano | bajo | 006 | **sí** | 15 |
| [016](feature-016-fe-access-notifications/) | fe-access-notifications | refactor | sí | no | **este repo** | mediano | bajo | 006 | **sí** | 16 |
| [017](feature-017-fe-dollar-commerce-forms/) | fe-dollar-commerce-forms | feature | sí | no | **este repo** | mediano | bajo | 006 | **sí** | 17 |
| [018](feature-018-data-integrity-admin/) | data-integrity-admin | feature | sí | sí | **este repo** | mediano | medio | — | **parcial** (excluir tentative-prices #121) | 18 |
| [019](#) | be-local-tooling-db-scripts | infra | no | sí | otro repo | — | bajo | — | no (BE) | 19 |
| [020](feature-020-ci-workflows/) | ci-workflows | infra | sí | sí | **este repo** | chico | alto (puede romper deploy) | — | **parcial** (por repo) | 20 |
| [021](feature-021-build-and-deploy-config/) | build-and-deploy-config | config | sí | sí | **este repo** | mediano | medio | — | **parcial** (deps bumps #124 ya DONE → separar) | 21 |
| [022](feature-022-lefthook-git-hooks/) | lefthook-git-hooks | config | sí | sí | **este repo** | chico | bajo (opcional) | — | **sí** (por repo) | 22 |
| [023](#) | be-wire-di | infra | no | sí | otro repo | — | medio (MEZCLADOS) | 001,005,007,008,009,012 | no (BE) | 23 |
| [024](feature-024-openapi-and-docs/) | openapi-and-docs | docs | sí | sí | **este repo** | mediano | bajo | — | **sí** (independiente) | 24 |
| [025](#) | be-test-coverage | tests | no | sí | otro repo | — | bajo | 001,002,009 | no (BE; follow-up) | 25 |
| [026](feature-026-fe-test-infra/) | fe-test-infra | tests | sí | no | **este repo** | mediano | bajo | 006 | **sí** | 26 |
| [027](#) | be-cleanup-domain-purity | cleanup | no | sí | otro repo | — | bajo | 001 | no (BE) | 27 |

> Los IDs sin carpeta en este repo (001–005, 009, 013, 019, 023, 025, 027) son **BE puro**: aparecen para trazabilidad de orden y dependencias; la extracción real ocurre en el repo `core`/`platform`.

---

## Notas clave por feature (FE)

- **006 fe-design-system** — Base de todo el FE: primitivos (feedback, button/drawer, input, modal, card, filters, `ArchivedListPage`), lib (format/theme/lifecycle), router/main shell. **`ui/src/router.tsx` y `ui/src/main.tsx` son MEZCLADOS** → traer con cuidado.
- **007 actor-system** — Full-stack. FE: `useActors` + `master-data/actors` + BFF `api/src/routes/actors.ts`. Mergear **BE-first, luego FE**.
- **008 identity-tenant-context** — Full-stack. FE: `TenantContext` + Navbar switcher + `general-entities-admin` + login; BFF `me.ts`/`authMiddleware`/`requestContext`. **BE-first**.
- **010 projects** — Full-stack. FE: `pages/admin/projects` + BFF `projects.ts`. **BE-first**.
- **011 campaign-dto-projectid** — Bugfix coordinado (shape change `project_id`/`id`/`name` minúscula). Si desync, el dropdown de campañas queda **vacío**.
- **012 ai-companion-integration** — Full-stack. FE: `pages/admin/ai` + BFF `ai.ts`/`managerChatStreamProxy`. **BE-first**.
- **014 fe-master-data-pages** — **FAMILIA (212 archivos)**: customers/fields/lots/workorders/crops/investors/managers/labors/supplies/supply-movements/stock + hooks + BFF routes/utils. **IMPRESCINDIBLE: agrupar el file-list POR ENTIDAD y proponer 1 PR por entidad.** `lots`/`workorders` parcialmente **DONE** (#104/#117).
- **015 / 016 / 017** — FE independiente sobre 006: dashboard / access+notifications / dollar+commercialization.
- **018 data-integrity-admin** — Full-stack. FE: `pages/admin/data-integrity` + `useDatabase`. **OJO: tentative-prices ya está DONE (#121) → excluirla.**
- **020 ci-workflows** — `.github/workflows` en ambos repos. **Pueden romper deploy si se traen sin el resto** → por repo.
- **021 build-and-deploy-config** — FE: vite/tailwind/eslint/knip/tsconfig/lockfiles/generated client. **deps bumps ya DONE (#124) → separar.**
- **022 lefthook-git-hooks** — `lefthook.yml`, local tooling, opcional.
- **024 openapi-and-docs** — FE: `docs/` + `docs/audit` (visual regression, posible generado) + `RESPONSIVE_GUIDELINES` + `PR-92.md`. Independiente.
- **026 fe-test-infra** — `ui/.vite-smoke` + `ui/e2e` + `api/test` + `api/src/mocks`. Independiente sobre 006.

### Trabajo YA en `develop` (DONE — sin paquete / a excluir)

- **table-select-filters** — FE #104.
- **reports-dark-mode** — FE #105 (la limpieza de json-tags del dominio BE NO está porteada → va en **027**).
- **lot-metrics / total_tons** — FE+BE #117/#121/#124.
- **tentative-prices** — FE+BE #121/#124 → **excluir de 018**.
- **dependency-bumps (go-jose, x/net)** — BE #124 → **excluir de 021**.

### Archivos compartidos / peligrosos (este repo)

`ui/src/router.tsx` · `ui/src/main.tsx` · `api/src/routes/index.ts` · `api/src/index.ts` · `package.json` · `ui/package.json` · `ui/yarn.lock` · `package-lock.json`

> Estos archivos suelen recibir aportes de **varias** features a la vez. Al extraer, traerlos con `git restore -p` (selección por hunks) acompañando a cada módulo, no de bloque.

---

## Checklist por feature

Estado de avance de cada feature a lo largo del pipeline de descomposición. Marcá según corresponda.
`dp actualizada/descartada` = la rama `develop-problematico` se actualizó o se descartó para esa feature.

### feature-006 — fe-design-system → [feature-006-fe-design-system/](feature-006-fe-design-system/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-007 — actor-system → [feature-007-actor-system/](feature-007-actor-system/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-008 — identity-tenant-context → [feature-008-identity-tenant-context/](feature-008-identity-tenant-context/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-010 — projects → [feature-010-projects/](feature-010-projects/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-011 — campaign-dto-projectid → [feature-011-campaign-dto-projectid/](feature-011-campaign-dto-projectid/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-012 — ai-companion-integration → [feature-012-ai-companion-integration/](feature-012-ai-companion-integration/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-014 — fe-master-data-pages → [feature-014-fe-master-data-pages/](feature-014-fe-master-data-pages/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-015 — fe-dashboard-consolidation → [feature-015-fe-dashboard-consolidation/](feature-015-fe-dashboard-consolidation/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-016 — fe-access-notifications → [feature-016-fe-access-notifications/](feature-016-fe-access-notifications/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-017 — fe-dollar-commerce-forms → [feature-017-fe-dollar-commerce-forms/](feature-017-fe-dollar-commerce-forms/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-018 — data-integrity-admin → [feature-018-data-integrity-admin/](feature-018-data-integrity-admin/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-020 — ci-workflows → [feature-020-ci-workflows/](feature-020-ci-workflows/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-021 — build-and-deploy-config → [feature-021-build-and-deploy-config/](feature-021-build-and-deploy-config/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-022 — lefthook-git-hooks → [feature-022-lefthook-git-hooks/](feature-022-lefthook-git-hooks/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-024 — openapi-and-docs → [feature-024-openapi-and-docs/](feature-024-openapi-and-docs/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

### feature-026 — fe-test-infra → [feature-026-fe-test-infra/](feature-026-fe-test-infra/)
- [ ] documentada
- [ ] validada
- [ ] extraída
- [ ] PR creado
- [ ] PR mergeado
- [ ] dp actualizada/descartada

---

### Features BE puro (en el otro repo — sin carpeta en este repo)

Trazabilidad únicamente; la descomposición y los checklists viven en el repo `core`/`platform`.

- **001** be-platform-tenancy-refactor · **002** be-crudar-lifecycle-framework · **003** be-multitenant-db-hardening · **004** shared-text-propername · **005** be-config-modularization · **009** crudar-archive-surface · **013** be-csv-export · **019** be-local-tooling-db-scripts · **023** be-wire-di · **025** be-test-coverage · **027** be-cleanup-domain-purity
