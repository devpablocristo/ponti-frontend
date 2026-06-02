# Cross-Repo Map — descomposición de `develop-problematico`

> **Repo actual (este doc):** Frontend monorepo — `ui/` (React) + `api/` (BFF NodeJS, yarn).
> Path: `/home/pablocristo/Proyectos/pablo/ponti/web`.
> **Otro repo:** Backend (`core` / `platform`, Go).
>
> **Fecha del análisis:** 2026-05-30.
> **Rango fuente FE:** `fefbe695..3ffcf60`.
> **SOURCE de extracción:** `develop-problematico~1` (SHA `3ffcf60`, el pico) — **NUNCA** el tip de `develop-problematico`.
> **Destino:** `develop`.
>
> **Por qué `~1`:** `develop-problematico` fue una rama de integración (new-cns3 + projects + admin + ...) cuyo **último commit es un `restore` que la vacía**. Por eso la fuente real es el commit anterior al tip (`develop-problematico~1`).
>
> Este documento es el **mapa global cross-repo**. Es conceptualmente idéntico al `cross-repo-map.md` del repo BE: describe, por feature, qué parte vive en cada repo, la dependencia entre repos, el orden de merge y el riesgo de desincronización.

---

## Cómo leer este doc

- **FE / BE:** si la feature toca cada repo.
- **en-este-repo:** si tiene archivos que se extraen del **FE monorepo** (este repo). Las features solo-BE no aparecen como paquetes acá, pero se listan igual para tener el panorama completo de coordinación.
- Las features **solo-BE** están marcadas explícitamente como **"sin cambios FE"**.
- Las features **solo-FE** están marcadas explícitamente como **"sin cambios BE"**.
- Los comandos `git` que aparezcan en notas son **sugerencias**, no acciones ejecutadas por este análisis.

> **Aclaración clave (009):** `feature-009 crudar-archive-surface` es una **carpeta solo-BE** (cambio de contrato de archivado), pero **su contraparte FE no es una feature aparte**: vive repartida en **014** (pages que consumen `POST /:id/archive`, `DELETE /:id/hard`, `GET /archived`) y en **006** (`ArchivedListPage`). No hay paquete FE "009".

---

## Tabla global de features

| ID  | Nombre | FE | BE | Merge recomendado | Riesgo cross-repo | Notas |
|-----|--------|----|----|-------------------|-------------------|-------|
| 001 | be-platform-tenancy-refactor | no | sí | BE independiente | Bajo | **Sin cambios FE.** Interno, sin cambio de contrato API (drop `MaybeTenantScope` -> `tenancy.Scope` en ~23 repos). Base de todo el BE. |
| 002 | be-crudar-lifecycle-framework | no | sí | BE-first | Bajo | **Sin cambios FE.** `internal/shared/lifecycle` + migr 227/228/232/233. Funda 009. |
| 003 | be-multitenant-db-hardening | no | sí | BE-first (deps 001) | Medio | **Sin cambios FE.** Migr 224/225 (backfill -> constraints). Riesgo si hay datos stale. |
| 004 | shared-text-propername | no | sí | BE independiente | Bajo | **Sin cambios FE.** Util chico. Bloquea 007 (normalización de nombres de actores). |
| 005 | be-config-modularization | no | sí | BE independiente | Bajo | **Sin cambios FE.** `cmd/config` split + `.env.example`. Funda 012 y 023. |
| 006 | fe-design-system | sí | no | FE independiente | Medio | **Sin cambios BE.** Base de todo el FE. `router.tsx`/`main.tsx` son **MEZCLADOS**. Aporta `ArchivedListPage` (contraparte FE de 009). |
| 007 | actor-system | sí | sí | **BE-first, luego FE** | **Alto** | **FULL-STACK.** BE: `/api/v1/actors` (+migr 223/226/231/234). FE: `useActors` + `master-data/actors` + BFF `api/src/routes/actors.ts`. La feature grande. |
| 008 | identity-tenant-context | sí | sí | **BE-first, luego FE** | **Alto** | **FULL-STACK.** BE: admin `me_context` (`/me` con array de tenants). FE: `TenantContext` + Navbar switcher + `general-entities-admin` + login; BFF `me.ts`/`authMiddleware`/`requestContext`. |
| 009 | crudar-archive-surface | (014/006) | sí | BE-first (FE en 014/006) | **Alto** | **Carpeta solo-BE**, contraparte FE en **014 + 006**. CONTRATO: `DELETE /:id` -> `POST /:id/archive` + `DELETE /:id/hard` + `GET /archived`, en ~20 dominios. |
| 010 | projects | sí | sí | **BE-first, luego FE** | **Alto** | **FULL-STACK.** BE: project-archive-entidades-bridge + scope/creator. FE: `pages/admin/projects` + BFF `projects.ts`. |
| 011 | campaign-dto-projectid | sí | sí | **coordinado (shape change)** | **Alto** | **FULL-STACK.** BE serializa `project_id`/`id`/`name` en minúscula; FE `campaigns`. Si desync, el dropdown de campañas queda **vacío**. |
| 012 | ai-companion-integration | sí | sí | BE-first | Medio | **FULL-STACK.** BE: `internal/axis` (cliente Companion+JWT) + ai adapter + `companion_providers`. FE: `pages/admin/ai` + BFF `ai.ts`/`managerChatStreamProxy`. |
| 013 | be-csv-export | no | sí | BE-first | **Alto** | **Cambio de contrato sin código FE en el paquete.** `internal/shared/csvexport` + csv-service por dominio; borra excel. **Endpoints export pasan de XLSX a CSV -> revisar consumo FE.** |
| 014 | fe-master-data-pages | sí | no | FE tras 007/009 | **Alto** | **Sin cambios BE** (consume contratos de 007/009). FAMILIA (212 archivos). **Agrupar file-list POR ENTIDAD -> 1 PR por entidad.** `lots`/`workorders` parcial DONE (#104/#117). |
| 015 | fe-dashboard-consolidation | sí | no | FE independiente | Bajo | **Sin cambios BE.** `pages/admin/dashboard` + `useDashboard`. |
| 016 | fe-access-notifications | sí | no | FE independiente | Bajo | **Sin cambios BE.** `pages/admin/access` + notifications. |
| 017 | fe-dollar-commerce-forms | sí | no | FE independiente | Bajo | **Sin cambios BE.** `pages/admin/dollar` + commercialization. |
| 018 | data-integrity-admin | sí | sí | **coordinado** | Medio | **FULL-STACK.** FE: `pages/admin/data-integrity` + `useDatabase`. BE: `internal/data-integrity`. **OJO:** tentative-prices ya DONE (#121) -> **excluirla**. |
| 019 | be-local-tooling-db-scripts | no | sí | BE independiente | Bajo | **Sin cambios FE.** `scripts/` (db, data-audit, lint-tenant-leaks, golden-master, smoke-companion, export-ai, reset-local-db-from-prod) + Makefile. |
| 020 | ci-workflows | sí | sí | **por repo** | Medio | `.github/workflows` en ambos repos. **Pueden romper deploy si se traen sin el resto.** |
| 021 | build-and-deploy-config | sí | sí | **por repo** | Medio | BE Dockerfile/compose/go.mod-sum (**deps bumps YA DONE #124 -> separar**); FE vite/tailwind/eslint/knip/tsconfig/lockfiles/generated client. |
| 022 | lefthook-git-hooks | sí | sí | **por repo** | Bajo | `lefthook.yml` en ambos. Local tooling, opcional. |
| 023 | be-wire-di | no | sí | acompaña a su módulo | Medio | **Sin cambios FE.** `wire/` + `cmd/api`. `wire.go`/`wire_gen.go`/`cmd/api/main.go` **MEZCLADOS**: traer con `restore -p` junto a cada módulo. |
| 024 | openapi-and-docs | sí | sí | independiente | Bajo | Docs en ambos. BE `docs/openapi` + CRUDAR/error-catalog/...; FE `docs/` + `docs/audit` + RESPONSIVE_GUIDELINES + PR-92.md. |
| 025 | be-test-coverage | no | sí | sigue a su módulo | Bajo | **Sin cambios FE.** `handler_test` + `repository_tenant_test` + `repository_archived_refs_test` (45 archivos). Validan 001/009. Follow-up. |
| 026 | fe-test-infra | sí | no | FE independiente | Bajo | **Sin cambios BE.** `ui/.vite-smoke` + `ui/e2e` + `api/test` + `api/src/mocks`. Infra de tests. |
| 027 | be-cleanup-domain-purity | no | sí | BE independiente | Bajo | **Sin cambios FE.** staticcheck + report domain json-tag removal + remove `core/governance` + borrar jwt utils legacy. |

---

## Detalle por feature (foco cross-repo)

### feature-001 — be-platform-tenancy-refactor (refactor)
- **FE:** no · **BE:** sí · **en-este-repo:** no.
- **Parte en este repo (FE):** ninguna. **Sin cambios FE.**
- **Parte en el otro repo (BE):** drop `MaybeTenantScope` -> `tenancy.Scope` en ~23 repos.
- **Dependencia cross-repo:** ninguna hacia el FE. Es base de 003/007/023/025/027 (todo BE).
- **Orden de merge:** BE independiente, lo antes posible (es cimiento).
- **Riesgo de desync:** bajo — interno, sin contrato.
- **Contratos API:** sin cambio. · **Migraciones:** no. · **Config/env:** no. · **Flags:** no.

### feature-002 — be-crudar-lifecycle-framework (refactor)
- **FE:** no · **BE:** sí · **en-este-repo:** no. **Sin cambios FE.**
- **BE:** `internal/shared/lifecycle` + migraciones 227/228/232/233. Funda 009.
- **Cross-repo:** ninguna interacción con FE.
- **Merge:** BE-first. · **Riesgo desync:** bajo.
- **Migraciones:** 227/228/232/233. · **Contratos:** no (habilita 009). · **Env/Flags:** no.

### feature-003 — be-multitenant-db-hardening (migration)
- **FE:** no · **BE:** sí · **en-este-repo:** no. **Sin cambios FE.**
- **BE:** migraciones 224/225 (backfill -> constraints). **deps: 001.**
- **Cross-repo:** ninguna hacia FE.
- **Merge:** BE-first. · **Riesgo desync:** **medio** — riesgo si hay **datos stale** al aplicar constraints.
- **Migraciones:** 224 (backfill) y 225 (constraints), aplicar en orden. · **Contratos/Env/Flags:** no.

### feature-004 — shared-text-propername (feature)
- **FE:** no · **BE:** sí · **en-este-repo:** no. **Sin cambios FE.**
- **BE:** util chico de texto. **Bloquea 007** (normalización de nombres de actores).
- **Cross-repo:** indirecta — al normalizar nombres de actores, el FE de 007 verá los nombres ya normalizados; no requiere cambio de shape.
- **Merge:** BE independiente, antes de 007. · **Riesgo desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-005 — be-config-modularization (infra)
- **FE:** no · **BE:** sí · **en-este-repo:** no. **Sin cambios FE.**
- **BE:** `cmd/config` split + `.env.example`. **Funda 012 y 023.**
- **Cross-repo:** ninguna hacia FE.
- **Merge:** BE independiente. · **Riesgo desync:** bajo.
- **Config/env:** **sí** — nuevo `.env.example` (variables del BE; ver 012/023). · **Contratos/Migr/Flags:** no.

### feature-006 — fe-design-system (refactor)
- **FE:** sí · **BE:** no · **en-este-repo:** sí. **Sin cambios BE.**
- **Parte en este repo (FE):** consolida primitivos (feedback, button/drawer, input, modal, card, filters, **ArchivedListPage**), lib (format/theme/lifecycle), router/main shell.
- **Parte en el otro repo:** ninguna.
- **Contraparte de 009:** `ArchivedListPage` es el componente FE genérico que consume el surface de archivado de **009**.
- **Cross-repo:** ninguna directa. Es **base de todo el FE** — 007/008/010..018/026 dependen de él.
- **Archivos MEZCLADOS:** `ui/src/router.tsx`, `ui/src/main.tsx` (también tocados por features que registran rutas). Traer la base acá y luego añadir rutas por feature.
- **Merge:** FE independiente, **primero entre los FE**. · **Riesgo desync:** medio (por archivos mezclados, no por contrato).
- **Contratos/Migr/Env:** no. · **Flags:** no.

### feature-007 — actor-system (feature) · **FULL-STACK**
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `useActors` + `master-data/actors` + BFF `api/src/routes/actors.ts`.
- **Parte en el otro repo (BE):** expone `/api/v1/actors` (+migraciones 223/226/231/234).
- **Dependencia cross-repo:** FE **consume** `/api/v1/actors`. El FE no funciona sin el BE desplegado.
- **deps:** 001, 002, 003, 004, 006.
- **Orden de merge:** **BE-first, luego FE.** Mergear y desplegar BE; recién entonces el FE.
- **Riesgo de desync:** **Alto** — feature grande, contrato nuevo. Si el FE llega antes que el BE, las pages de actors fallan.
- **Contratos API:** `/api/v1/actors` (nuevo). · **Migraciones (BE):** 223/226/231/234. · **Env/Flags:** no.

### feature-008 — identity-tenant-context (feature) · **FULL-STACK**
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `TenantContext` + Navbar switcher + `general-entities-admin` + login; BFF `me.ts` / `authMiddleware` / `requestContext`.
- **Parte en el otro repo (BE):** admin `me_context` — `/me` devuelve **array de tenants**.
- **Dependencia cross-repo:** FE depende del nuevo shape de `/me` (array de tenants) para el switcher y el `requestContext` del BFF.
- **deps:** 007.
- **Orden de merge:** **BE-first, luego FE.**
- **Riesgo de desync:** **Alto** — si el BFF/FE esperan array de tenants y el BE aún devuelve el shape viejo (o viceversa), rompe login/switch de tenant.
- **Contratos API:** `/me` (shape: array de tenants). · **Migr:** no propias (apoya en 007). · **Env/Flags:** no.

### feature-009 — crudar-archive-surface (refactor) · carpeta solo-BE, contraparte FE en 014/006
- **FE:** contraparte en 014/006 · **BE:** sí · **en-este-repo:** no (la carpeta), sí (su contraparte vía 014/006).
- **Parte en el otro repo (BE):** **CONTRATO** — `DELETE /:id` -> `POST /:id/archive` + `DELETE /:id/hard` + `GET /archived`, en ~20 dominios (123 archivos: handlers/usecases/repos).
- **Parte en este repo (FE):** **no es paquete propio.** Se reparte en:
  - **014** — las pages por entidad que llaman a `POST /:id/archive`, `DELETE /:id/hard`, `GET /archived`.
  - **006** — `ArchivedListPage` (el componente genérico de listado de archivados).
- **Dependencia cross-repo:** el FE de 014/006 depende del nuevo surface de archivado del BE. **Es un cambio de contrato**: el viejo `DELETE /:id` deja de borrar y pasa a ser `hard`.
- **deps:** 002.
- **Orden de merge:** **BE-first.** Luego 006 (componente) y 014 (consumo por entidad). **Sugerir PRs por-entidad** (alinear con el split por entidad de 014).
- **Riesgo de desync:** **Alto** — si el FE sigue mandando `DELETE /:id` esperando archivar, hace **hard delete**; si manda `archive` antes de desplegar el BE, 404.
- **Contratos API:** `POST /:id/archive`, `DELETE /:id/hard`, `GET /archived` (en ~20 dominios). · **Migr (BE):** vía 002 (227/228/232/233). · **Env/Flags:** no.

### feature-010 — projects (feature) · **FULL-STACK**
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `pages/admin/projects` + BFF `projects.ts`.
- **Parte en el otro repo (BE):** project-archive-entidades-bridge + scope/creator.
- **Dependencia cross-repo:** FE consume el dominio projects del BE (incluye el bridge de archivado y el scope por creador).
- **deps:** 007, 009.
- **Orden de merge:** **BE-first, luego FE.**
- **Riesgo de desync:** **Alto** — depende de 007 (actors) y 009 (archive surface). Mergear esos primero.
- **Contratos API:** endpoints projects (+ bridge de archivado de 009). · **Migr:** las de 007/009. · **Env/Flags:** no.

### feature-011 — campaign-dto-projectid (bugfix) · **FULL-STACK**
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `campaigns`.
- **Parte en el otro repo (BE):** serializa `project_id` / `id` / `name` en **minúscula**.
- **Dependencia cross-repo:** **shape change del DTO de campañas.** FE espera las claves en minúscula.
- **deps:** ninguna.
- **Orden de merge:** **coordinado** — FE y BE deben acordar el shape y desplegar juntos.
- **Riesgo de desync:** **Alto** — **si desync, el dropdown de campañas queda vacío** (claves no matchean).
- **Contratos API:** DTO de campañas (`project_id`/`id`/`name` minúscula). · **Migr/Env/Flags:** no.

### feature-012 — ai-companion-integration (feature) · **FULL-STACK**
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `pages/admin/ai` + BFF `ai.ts` / `managerChatStreamProxy`.
- **Parte en el otro repo (BE):** `internal/axis` (cliente Companion + JWT) + ai adapter + `companion_providers`.
- **Dependencia cross-repo:** el BFF proxea el stream del chat hacia el BE (Companion). FE depende de los endpoints ai del BE.
- **deps:** 005 (config modularization).
- **Orden de merge:** **BE-first.**
- **Riesgo de desync:** medio — proxy de streaming; requiere endpoints BE up y config (Companion URL/JWT) presente.
- **Contratos API:** endpoints ai/chat stream. · **Config/env:** **sí** — credenciales/URL de Companion (via 005). · **Migr:** `companion_providers` (BE). · **Flags:** posible flag de habilitación de AI (verificar en BE).

### feature-013 — be-csv-export (refactor)
- **FE:** no (en el paquete) · **BE:** sí · **en-este-repo:** no. **El paquete no trae código FE, pero impacta al FE.**
- **Parte en el otro repo (BE):** `internal/shared/csvexport` + csv-service por dominio; **borra excel**.
- **Impacto cross-repo:** los **endpoints de export pasan de XLSX a CSV**. Si el FE descarga/abre como XLSX o setea content-type, hay que **revisar consumo FE** (nombre de archivo, mime, parser).
- **deps:** ninguna.
- **Orden de merge:** **BE-first**, y revisar el consumo en FE (puede requerir un ajuste FE no contemplado como paquete).
- **Riesgo de desync:** **Alto** — cambio de formato de respuesta de export sin un paquete FE espejo.
- **Contratos API:** endpoints export (XLSX -> CSV). · **Migr/Env/Flags:** no.

### feature-014 — fe-master-data-pages (feature) · FAMILIA
- **FE:** sí · **BE:** no · **en-este-repo:** sí. **Sin cambios BE** (consume contratos de 007/009 ya existentes).
- **Parte en este repo (FE):** FAMILIA de 212 archivos — customers / fields / lots / workorders / crops / investors / managers / labors / supplies / supply-movements / stock + hooks + BFF routes/utils.
- **Parte en el otro repo:** ninguna (depende de contratos BE de 007 y 009, ya entregados por esos).
- **deps:** 006, 007, 009.
- **Orden de merge:** **FE tras 007 y 009** (necesita `/api/v1/actors` y el archive surface vivos).
- **Riesgo de desync:** **Alto** — consume contratos de 007/009; si esos no están desplegados, las pages fallan (incluido el archivado, contraparte de 009).
- **IMPRESCINDIBLE:** **agrupar el file-list POR ENTIDAD y proponer 1 PR por entidad.**
- **Estado:** `lots` / `workorders` **parcialmente DONE** (#104/#117) — excluir lo ya porteado.
- **Contratos API:** consume actors (007) + archive surface (009). · **Migr/Env:** no propios. · **Flags:** no.

### feature-015 — fe-dashboard-consolidation (refactor)
- **FE:** sí · **BE:** no · **en-este-repo:** sí. **Sin cambios BE.**
- **FE:** `pages/admin/dashboard` + `useDashboard`. · **deps:** 006.
- **Cross-repo:** ninguna (consume endpoints existentes).
- **Merge:** FE independiente. · **Riesgo desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-016 — fe-access-notifications (refactor)
- **FE:** sí · **BE:** no · **en-este-repo:** sí. **Sin cambios BE.**
- **FE:** `pages/admin/access` + notifications. · **deps:** 006.
- **Cross-repo:** ninguna. · **Merge:** FE independiente. · **Riesgo desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-017 — fe-dollar-commerce-forms (feature)
- **FE:** sí · **BE:** no · **en-este-repo:** sí. **Sin cambios BE.**
- **FE:** `pages/admin/dollar` + commercialization. · **deps:** 006.
- **Cross-repo:** ninguna. · **Merge:** FE independiente. · **Riesgo desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-018 — data-integrity-admin (feature) · **FULL-STACK**
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `pages/admin/data-integrity` + `useDatabase`.
- **Parte en el otro repo (BE):** `internal/data-integrity`.
- **Dependencia cross-repo:** FE consume el dominio data-integrity del BE.
- **deps:** ninguna.
- **Orden de merge:** **coordinado.**
- **Riesgo de desync:** medio.
- **OJO (excluir):** la parte **tentative-prices ya está DONE (#121)** -> **excluirla** del paquete (FE y BE).
- **Contratos API:** endpoints data-integrity. · **Migr/Env/Flags:** no (tentative-prices ya entregado).

### feature-019 — be-local-tooling-db-scripts (infra)
- **FE:** no · **BE:** sí · **en-este-repo:** no. **Sin cambios FE.**
- **BE:** `scripts/` (db, data-audit, lint-tenant-leaks, golden-master, smoke-companion, export-ai, reset-local-db-from-prod) + Makefile. Son los 18 sobrevivientes del 3-dot + más.
- **Cross-repo:** ninguna. · **Merge:** BE independiente. · **Riesgo desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-020 — ci-workflows (infra) · ambos repos
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `.github/workflows` del monorepo FE.
- **Parte en el otro repo (BE):** `.github/workflows` del BE.
- **Dependencia cross-repo:** independientes por repo, pero **pueden romper deploy si se traen sin el resto** de su feature.
- **Orden de merge:** **por repo.** · **Riesgo de desync:** medio.
- **Contratos/Migr:** no. · **Config/env:** CI secrets/vars (verificar por repo). · **Flags:** no.

### feature-021 — build-and-deploy-config (config) · ambos repos
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** vite / tailwind / eslint / knip / tsconfig / lockfiles / generated client.
- **Parte en el otro repo (BE):** Dockerfile / compose / `go.mod`-`go.sum`.
- **Excluir (BE):** **deps bumps YA DONE (#124)** (go-jose, x/net) -> **separar** del paquete.
- **Dependencia cross-repo:** independientes por repo.
- **Orden de merge:** **por repo.** · **Riesgo de desync:** medio (lockfiles / generated client deben ir con su feature).
- **Archivos MEZCLADOS (FE):** `package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`. · **Env:** build vars. · **Flags:** no.

### feature-022 — lefthook-git-hooks (config) · ambos repos
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `lefthook.yml` (FE). · **Parte en el otro repo (BE):** `lefthook.yml` (BE).
- **Cross-repo:** local tooling, **opcional**, independiente por repo.
- **Orden de merge:** **por repo.** · **Riesgo de desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-023 — be-wire-di (infra)
- **FE:** no · **BE:** sí · **en-este-repo:** no. **Sin cambios FE.**
- **BE:** `wire/` + `cmd/api`. `wire/actor_providers` -> 007; `companion_providers` -> 012.
- **Archivos MEZCLADOS (BE):** `wire.go` / `wire_gen.go` / `cmd/api/main.go` — **traer con `restore -p` (sugerencia)** junto a cada módulo.
- **deps:** 001, 005, 007, 008, 009, 012.
- **Orden de merge:** **acompaña a su módulo** (no va suelto). · **Riesgo de desync:** medio (mezclado).
- **Contratos/Migr/Env/Flags:** no.

### feature-024 — openapi-and-docs (docs) · ambos repos
- **FE:** sí · **BE:** sí · **en-este-repo:** sí.
- **Parte en este repo (FE):** `docs/` + `docs/audit` (visual regression, **posible generado**) + RESPONSIVE_GUIDELINES + PR-92.md.
- **Parte en el otro repo (BE):** `docs/openapi` + CRUDAR / error-catalog / multi-tenant-evidence + CLAUDE.md / CRUDAR_PLAN.md.
- **Cross-repo:** independiente. · **Orden de merge:** independiente. · **Riesgo de desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-025 — be-test-coverage (tests)
- **FE:** no · **BE:** sí · **en-este-repo:** no. **Sin cambios FE.**
- **BE:** `handler_test` + `repository_tenant_test` + `repository_archived_refs_test` (45 archivos). Validan 001/009.
- **deps:** 001, 002, 009.
- **Orden de merge:** **sigue a su módulo** (puede ir como **follow-up**). · **Riesgo de desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-026 — fe-test-infra (tests)
- **FE:** sí · **BE:** no · **en-este-repo:** sí. **Sin cambios BE.**
- **FE:** `ui/.vite-smoke` + `ui/e2e` + `api/test` + `api/src/mocks`. · **deps:** 006.
- **Cross-repo:** ninguna (mocks del BFF, no BE real). · **Merge:** FE independiente. · **Riesgo desync:** bajo.
- **Contratos/Migr/Env/Flags:** no.

### feature-027 — be-cleanup-domain-purity (cleanup)
- **FE:** no · **BE:** sí · **en-este-repo:** no. **Sin cambios FE.**
- **BE:** staticcheck + report domain json-tag removal + remove `core/governance` + borrar jwt utils legacy.
- **Nota:** incluye la **limpieza de json-tags del dominio BE** que NO entró con reports-dark-mode (#105).
- **deps:** 001.
- **Orden de merge:** BE independiente. · **Riesgo de desync:** bajo (la limpieza de json-tags es interna; el shape público no debería cambiar — **verificar** que ningún tag removido afecte respuestas consumidas por FE).
- **Contratos API:** en principio no (interno). · **Migr/Env/Flags:** no.

---

## DONE (ya en `develop`, sin paquete)

Estas piezas **ya están mergeadas** en `develop` y **NO** deben re-extraerse. Se listan para evitar duplicar trabajo y para marcar las exclusiones dentro de features vivas.

| Tema | Repos | PRs | Acción |
|------|-------|-----|--------|
| table-select-filters | FE | #104 | Filtros de tabla. **Excluir** de 014 (`lots`/`workorders` parcial). |
| reports-dark-mode | FE | #105 | **OJO:** la limpieza de json-tags del **dominio BE NO está porteada** -> va en **027**. |
| lot-metrics / total_tons | FE + BE | #117 / #121 / #124 | **Excluir** de 014 (FE) y del BE correspondiente. |
| tentative-prices | FE + BE | #121 / #124 | **Excluir de 018** (data-integrity-admin), ambas patas. |
| dependency-bumps (go-jose, x/net) | BE | #124 | **Excluir de 021** (build-and-deploy-config, pata BE). |

---

## Resumen de coordinación cross-repo

**Full-stack que exigen BE-first + deploy antes del FE:**
- **007** (actor-system) — contrato `/api/v1/actors`.
- **008** (identity-tenant-context) — shape de `/me` (array de tenants).
- **010** (projects) — depende de 007 + 009.
- **012** (ai-companion-integration) — proxy de chat + config Companion.

**Full-stack coordinados (shape change, desplegar juntos):**
- **011** (campaign-dto-projectid) — **alto**: si desync, dropdown de campañas vacío.
- **018** (data-integrity-admin) — coordinado (excluir tentative-prices, ya DONE).

**Cambio de contrato BE con impacto FE no empaquetado:**
- **009** (archive surface) — su FE vive en **014 + 006**; PRs por-entidad.
- **013** (csv-export) — XLSX -> CSV; **revisar consumo FE**.

**Solo-FE (sin cambios BE):** 006, 014, 015, 016, 017, 026.
**Solo-BE (sin cambios FE):** 001, 002, 003, 004, 005, 013(*), 019, 023, 025, 027.
**Por repo (config/CI/hooks, espejados):** 020, 021, 022, 024.

> (*) 013 es solo-BE en cuanto a archivos, pero **rompe el consumo FE** de export si no se revisa.

**Archivos compartidos/peligrosos en este repo (FE):**
`ui/src/router.tsx`, `ui/src/main.tsx`, `api/src/routes/index.ts`, `api/src/index.ts`, `package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`.

---

*Fuente: `develop-problematico~1` (SHA `3ffcf60`). Destino: `develop`. Análisis 2026-05-30. Los comandos `git` en este doc son sugerencias.*
