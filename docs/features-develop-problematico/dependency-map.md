# Dependency Map — descomposición de `develop-problematico`

**Fecha del análisis:** 2026-05-30
**Repo:** Frontend monorepo `ui/` (React) + `api/` (BFF NodeJS, yarn) — `/home/pablocristo/Proyectos/pablo/ponti/web`
**Rango fuente:** `fefbe695..3ffcf60`
**SOURCE de extracción:** `develop-problematico~1` (SHA `3ffcf60`) — **NUNCA el tip** (el tip es un `restore` que vacía la rama)
**Destino del merge:** `develop`

> Este documento es el **grafo global de dependencias** entre las 27 features identificadas.
> Las dependencias provienen de la tabla autoritativa de features. Documenta tanto dependencias **intra-repo** (lo que vive en este repo FE) como **cross-repo** (BE que vive en el repo `core`/`platform` y que condiciona el orden de merge aunque su código no esté en este repo).
> Cualquier comando `git` aquí es **sugerencia**; este doc no toca código.

---

## 0. Leyenda

- **->** : "depende de / debe ir después de". `A -> B` significa B es prerequisito de A.
- **Fuerte**: si falta el prerequisito, la feature **no compila / rompe contrato / queda inutilizable**.
- **Débil**: la feature funciona aislada, pero comparte base/estilo/UX o conviene ordenar para evitar conflictos de merge.
- **Incierta**: dependencia plausible por archivos MEZCLADOS o solapamiento de superficie, a confirmar al portar.
- **Cross-repo**: el prerequisito vive en el repo BE (`core`/`platform`), no en este repo. Condiciona el **orden de deploy/merge**, no la compilación del FE.
- **`en-este-repo`**: si la feature tiene archivos en este monorepo FE. Las features BE-only (en-este-repo=no) se listan como **nodos cross-repo** porque otras features de este repo dependen de ellas.

Convención de tipos: refactor / feature / migration / infra / bugfix / config / docs / tests / cleanup.

---

## 1. Grafo raíz (vista ejecutiva)

```
develop
  │
  ├─[BE cross-repo, fundacional]
  │   001 (tenancy refactor) ─┬─> 003 (db hardening)
  │                           ├─> 007 (actor-system) <── 002, 003, 004, 006
  │                           ├─> 023 (wire/DI)
  │                           └─> 027 (domain purity)
  │   002 (lifecycle fw) ─────┬─> 009 (archive surface) ──> 010, 014(FE), 006(FE ArchivedListPage)
  │                           └─> 007
  │   004 (propername) ───────> 007
  │   005 (config modular) ──┬─> 012 (ai companion)
  │                           └─> 023
  │
  ├─[FE fundacional]
  │   006 (design-system) ───┬─> 007 (FE side)
  │                           ├─> 014 (master-data pages)
  │                           ├─> 015, 016, 017 (FE pages)
  │                           └─> 026 (fe-test-infra)
  │
  ├─[Full-stack, BE-first luego FE]
  │   007 ──> 008 (identity/tenant ctx) ──> (Navbar switcher, /me, login)
  │   007 + 009 ──> 010 (projects)
  │   007 + 009 ──> 014 (master-data pages, FE)
  │
  ├─[Independientes / coordinados]
  │   011 (campaign dto)      coordinado (shape change FE+BE, sin deps)
  │   012 (ai companion)      <── 005
  │   013 (csv export, BE)    independiente (pero revisar consumo FE)
  │   018 (data-integrity)    coordinado (FE+BE; excluir tentative-prices = DONE)
  │
  └─[Transversales por-repo / follow-up]
      019 (be tooling)        independiente
      020 (ci workflows)      por repo
      021 (build/deploy)      por repo (excluir dep-bumps go-jose/x-net = DONE #124)
      022 (lefthook)          por repo, opcional
      024 (openapi/docs)      independiente
      025 (be tests)          <── 001, 002, 009  (follow-up)
      026 (fe-test-infra)     <── 006
      027 (be cleanup)        <── 001
```

---

## 2. Tabla de dependencias declaradas (autoritativa)

| Feature | Tipo | FE | BE | en-repo | deps (de la tabla) | Bloquea a |
|---|---|---|---|---|---|---|
| 001 be-platform-tenancy-refactor | refactor | no | sí | no | — | 003, 007, 023, 025, 027 |
| 002 be-crudar-lifecycle-framework | refactor | no | sí | no | — | 009, 007*, 025 |
| 003 be-multitenant-db-hardening | migration | no | sí | no | 001 | 007 |
| 004 shared-text-propername | feature | no | sí | no | — | 007 |
| 005 be-config-modularization | infra | no | sí | no | — | 012, 023 |
| 006 fe-design-system | refactor | sí | no | sí | — | 007(FE), 014, 015, 016, 017, 026, 009(FE) |
| 007 actor-system | feature | sí | sí | sí | 001,002,003,004,006 | 008, 010, 014, 023(actor_providers) |
| 008 identity-tenant-context | feature | sí | sí | sí | 007 | — |
| 009 crudar-archive-surface | refactor | no | sí | no | 002 | 010, 014, 006(ArchivedListPage), 025 |
| 010 projects | feature | sí | sí | sí | 007,009 | — |
| 011 campaign-dto-projectid | bugfix | sí | sí | sí | — | — |
| 012 ai-companion-integration | feature | sí | sí | sí | 005 | 023(companion_providers) |
| 013 be-csv-export | refactor | no | sí | no | — | — (impacta consumo FE de exports) |
| 014 fe-master-data-pages | feature | sí | no | sí | 006,007,009 | — |
| 015 fe-dashboard-consolidation | refactor | sí | no | sí | 006 | — |
| 016 fe-access-notifications | refactor | sí | no | sí | 006 | — |
| 017 fe-dollar-commerce-forms | feature | sí | no | sí | 006 | — |
| 018 data-integrity-admin | feature | sí | sí | sí | — | — (excluir tentative-prices = DONE) |
| 019 be-local-tooling-db-scripts | infra | no | sí | no | — | — |
| 020 ci-workflows | infra | sí | sí | sí | — | — |
| 021 build-and-deploy-config | config | sí | sí | sí | — | — (excluir dep-bumps = DONE #124) |
| 022 lefthook-git-hooks | config | sí | sí | sí | — | — |
| 023 be-wire-di | infra | no | sí | no | 001,005,007,008,009,012 | — |
| 024 openapi-and-docs | docs | sí | sí | sí | — | — |
| 025 be-test-coverage | tests | no | sí | no | 001,002,009 | — |
| 026 fe-test-infra | tests | sí | no | sí | 006 | — |
| 027 be-cleanup-domain-purity | cleanup | no | sí | no | 001 | — |

\* 002 es prerequisito de 007 vía la cadena lifecycle/archive (007 lista 002 en sus deps).

---

## 3. Dependencias por feature (quién depende de quién)

### 3.1 BE fundacional (cross-repo, `en-este-repo=no`)

- **001 be-platform-tenancy-refactor** — RAÍZ del BE. Sin deps.
  - Bloquea (fuerte, cross-repo): **003** (las constraints multitenant asumen el `tenancy.Scope`), **007** (los repos de actors usan el nuevo scope), **023** (wire), **025** (los `repository_tenant_test` validan este refactor), **027** (cleanup se apoya en el dominio ya migrado).
  - Naturaleza: refactor interno SIN cambio de contrato API (drop `MaybeTenantScope` -> `tenancy.Scope` en ~23 repos). Es la base de todo el BE.

- **002 be-crudar-lifecycle-framework** — Sin deps. `internal/shared/lifecycle` + migraciones 227/228/232/233.
  - Bloquea (fuerte): **009** (archive surface se construye sobre el lifecycle), **007** (cadena CRUDAR), **025**.

- **003 be-multitenant-db-hardening** — `-> 001` (fuerte). Migraciones 224/225 (backfill -> constraints).
  - Bloquea (fuerte): **007**.
  - **Riesgo:** si hay datos stale, el backfill/constraint puede fallar. Ordenar después de 001 y antes de 007.

- **004 shared-text-propername** — Sin deps. Util chico.
  - Bloquea (fuerte): **007** (normalización de nombres de actores).

- **005 be-config-modularization** — Sin deps. `cmd/config` split + `.env.example`.
  - Bloquea (fuerte): **012** (el cliente Companion lee config modular) y **023** (wire/cmd/api).

### 3.2 FE fundacional (intra-repo)

- **006 fe-design-system** — RAÍZ del FE. Sin deps. Consolida primitivos (feedback, button/drawer, input, modal, card, filters, ArchivedListPage), `lib` (format/theme/lifecycle), router/main shell.
  - Bloquea (fuerte): **007**(lado FE, usa primitivos), **014**, **015**, **016**, **017**, **026**, y la **ArchivedListPage** que consume la superficie de archive de **009**.
  - **Archivos MEZCLADOS:** `ui/src/router.tsx`, `ui/src/main.tsx` se tocan aquí y en casi todas las features FE -> conflictos de merge garantizados. Portar 006 primero y resolver el resto sobre esa base.

### 3.3 Full-stack (BE-first, luego FE)

- **007 actor-system** — `-> 001, 002, 003, 004, 006` (todas fuertes). LA feature grande.
  - BE: expone `/api/v1/actors` (+migr 223/226/231/234).
  - FE: `useActors` + `master-data/actors` + BFF `api/src/routes/actors.ts`.
  - Bloquea (fuerte): **008**, **010**, **014**, y `wire/actor_providers` de **023**.
  - Orden: BE-first (con sus 4 deps BE listas) y 006 ya en FE; recién entonces el lado FE de 007.

- **008 identity-tenant-context** — `-> 007` (fuerte, full-stack).
  - BE: admin `me_context` (`/me` con array de tenants).
  - FE: `TenantContext` + Navbar switcher + `general-entities-admin` + login; BFF `me.ts`/`authMiddleware`/`requestContext`.
  - No bloquea a otras del set (hoja), pero es prerequisito en **023** (wire DI lista 008).

- **010 projects** — `-> 007, 009` (fuertes, full-stack).
  - BE: `project-archive-entidades-bridge` + scope/creator.
  - FE: `pages/admin/projects` + BFF `projects.ts`.
  - Nota: depende de 009 porque el bridge usa la superficie de archive.

- **012 ai-companion-integration** — `-> 005` (fuerte). BE-first.
  - BE: `internal/axis` (cliente Companion + JWT) + `ai` adapter + `companion_providers`.
  - FE: `pages/admin/ai` + BFF `ai.ts`/`managerChatStreamProxy`.
  - Bloquea (fuerte): `companion_providers` de **023**.

- **011 campaign-dto-projectid** — bugfix, sin deps formales, **coordinado** (shape change FE+BE).
  - BE serializa `project_id`/`id`/`name` en minúscula; FE `campaigns`.
  - **Dependencia de sincronía (fuerte pero simétrica):** si FE y BE desincronizan el shape, el dropdown de campañas queda vacío. Mergear FE y BE en la misma ventana.

- **018 data-integrity-admin** — coordinado (FE+BE), sin deps formales.
  - FE `pages/admin/data-integrity` + `useDatabase`; BE `internal/data-integrity`.
  - **Excluir** la parte `tentative-prices` (ya DONE en #121).

### 3.4 BE-only follow-up / cleanup (cross-repo)

- **009 crudar-archive-surface** — `-> 002` (fuerte). CONTRATO: `DELETE /:id` -> `POST /:id/archive` + `DELETE /:id/hard` + `GET /archived`, en ~20 dominios (123 archivos).
  - Su contraparte FE vive en **014** (pages) y **006** (ArchivedListPage).
  - Bloquea (fuerte, contrato): **010**, **014**, **025**.
  - **Cambio de contrato API** -> coordinar con FE; sugerir PRs por-entidad.

- **013 be-csv-export** — sin deps. Borra excel; endpoints export pasan de XLSX a CSV.
  - **Dependencia inversa débil:** revisar el consumo FE de exports (si algún `pages/*` o BFF asume XLSX, romper de forma silenciosa). No bloquea features de este repo pero impacta runtime.

- **023 be-wire-di** — `-> 001, 005, 007, 008, 009, 012` (todas fuertes). `wire/` + `cmd/api`.
  - `wire/actor_providers` -> **007**; `companion_providers` -> **012**.
  - **MEZCLADOS:** `wire.go`/`wire_gen.go`/`cmd/api/main.go` -> traer con `restore -p` (parcial) junto a cada módulo, no de una.
  - Es el "ensamblador": va al final de cada módulo BE.

- **025 be-test-coverage** — `-> 001, 002, 009` (fuertes). `handler_test` + `repository_tenant_test` + `repository_archived_refs_test` (45 archivos).
  - Validan 001/009. Pueden ir como **follow-up** detrás de cada módulo.

- **027 be-cleanup-domain-purity** — `-> 001` (fuerte). staticcheck + json-tag removal del dominio report + remove `core/governance` + borrar jwt utils legacy.
  - Incluye la limpieza de json-tags que NO se porteó con reports-dark-mode (#105).

### 3.5 FE independientes (solo dependen de 006)

- **014 fe-master-data-pages** — `-> 006, 007, 009` (fuertes). FAMILIA de 212 archivos.
  - Entidades: customers/fields/lots/workorders/crops/investors/managers/labors/supplies/supply-movements/stock + hooks + BFF routes/utils.
  - **IMPRESCINDIBLE:** agrupar la file-list POR ENTIDAD y proponer **1 PR por entidad**. `lots`/`workorders` parcialmente DONE (#104/#117).
  - Depende de 007 (actors es master-data) y de 009 (archive surface usada por las pages de listado/archivados).

- **015 fe-dashboard-consolidation** — `-> 006` (fuerte). `pages/admin/dashboard` + `useDashboard`. FE independiente.
- **016 fe-access-notifications** — `-> 006` (fuerte). `pages/admin/access` + notifications. FE independiente.
- **017 fe-dollar-commerce-forms** — `-> 006` (fuerte). `pages/admin/dollar` + commercialization. FE independiente.
- **026 fe-test-infra** — `-> 006` (fuerte). `ui/.vite-smoke` + `ui/e2e` + `api/test` + `api/src/mocks`. FE independiente.

### 3.6 Transversales por-repo (sin deps de feature)

- **019 be-local-tooling-db-scripts** — sin deps. `scripts/` + Makefile. Bajo riesgo, independiente.
- **020 ci-workflows** — sin deps, **por repo**. `.github/workflows` en ambos repos.
  - **Riesgo:** pueden romper deploy si se traen sin el resto. Mergear por repo, idealmente al final.
- **021 build-and-deploy-config** — sin deps, **por repo**.
  - BE: Dockerfile/compose/go.mod-sum (los dep-bumps go-jose/x-net YA están DONE #124 -> **separar/excluir**).
  - FE: vite/tailwind/eslint/knip/tsconfig/lockfiles/generated client.
  - **Archivos MEZCLADOS:** `package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`.
- **022 lefthook-git-hooks** — sin deps, **por repo**, opcional. `lefthook.yml` en ambos.
- **024 openapi-and-docs** — sin deps, independiente.
  - BE `docs/openapi` + CRUDAR/error-catalog/multi-tenant-evidence + CLAUDE.md/CRUDAR_PLAN.md; FE `docs/` + `docs/audit` (posible generado) + RESPONSIVE_GUIDELINES + PR-92.md.

---

## 4. Clasificación de aristas: fuertes / débiles / inciertas

### 4.1 Fuertes (rompen compilación / contrato / inutilizan)

| Arista | Por qué es fuerte |
|---|---|
| 001 -> 003 | constraints multitenant asumen `tenancy.Scope` |
| 001 -> 007, 023, 025, 027 | repos/wire/tests/cleanup compilan contra el nuevo scope |
| 002 -> 009 | archive surface se construye sobre `lifecycle` |
| 002 -> 007, 025 | cadena CRUDAR |
| 003 -> 007 | actors lee datos ya hardened |
| 004 -> 007 | normalización de nombres de actores |
| 005 -> 012, 023 | config modular alimenta Companion y wire |
| 006 -> 007(FE),014,015,016,017,026,009(FE) | primitivos compartidos; sin ellos el FE no monta |
| 007 -> 008, 010, 014 | esas features consumen `/api/v1/actors` y `useActors` |
| 009 -> 010, 014, 025 | cambio de contrato (archive/hard/archived) |
| 012 -> 023(companion_providers) | wire del módulo AI |
| 007/008/009/012 -> 023 | wire ensambla esos providers |

### 4.2 Débiles (orden conveniente, no bloqueante)

| Arista | Por qué es débil |
|---|---|
| 006 -> resto FE (conflicto de merge) | router.tsx/main.tsx MEZCLADOS: ordenar primero evita rebases, pero compilan aislados con stubs |
| 013 -> consumo FE de exports | si el FE asume XLSX puede romper en runtime; no bloquea build |
| 020 / 021 / 022 entre sí | configs por repo; conviene agruparlas al final del repo |
| 025 -> sus módulos | tests siguen al módulo como follow-up, no lo bloquean |
| 011 FE <-> BE | sincronía de shape: simétrica; ventana de merge coordinada |
| 018 FE <-> BE | coordinado; cada lado compila pero la feature requiere ambos |

### 4.3 Inciertas (a confirmar al portar)

| Arista | Duda |
|---|---|
| 023 (wire) MEZCLADO | `wire.go`/`wire_gen.go`/`cmd/api/main.go` mezclan providers de 007/008/009/012; el `restore -p` parcial puede arrastrar líneas de módulos aún no porteados |
| 021 lockfiles MEZCLADOS | `yarn.lock`/`package-lock.json` pueden traer deltas de 006/014/026; al portar 021 hay que verificar que el lock refleje solo lo ya mergeado |
| 014 vs 009 (alcance FE de archive) | parte de la superficie de archived-list está en 006 (ArchivedListPage) y parte en 014 (pages por entidad): el corte exacto se confirma con la file-list por entidad |
| 024 docs/audit | "posible generado" (visual regression) -> puede depender implícitamente del estado de 006/014; tratar como docs independiente salvo que regenere artefactos |
| 018 vs DONE tentative-prices | confirmar que el slice tentative-prices (#121) quede fuera del paquete 018 al cortar archivos |

---

## 5. Cross-repo vs intra-repo

- **Intra-repo (tienen archivos en este monorepo FE):** 006, 007, 008, 010, 011, 012, 014, 015, 016, 017, 018, 020, 021, 022, 024, 026.
- **Cross-repo (BE-only, viven en `core`/`platform`):** 001, 002, 003, 004, 005, 009, 013, 019, 023, 025, 027.
  - Aunque su código no está en este repo, **condicionan el orden de merge/deploy** de las full-stack que sí están aquí:
    - 007(FE) **no debe** desplegarse antes de que 001/002/003/004 + 007(BE) estén en el BE.
    - 014/010(FE) dependen del contrato de 009(BE) ya desplegado.
    - 008(FE Navbar/login) requiere 007(BE) + 008(BE me_context).
    - 012(FE) requiere 005 + 012(BE) + (en runtime) wire 023.

**Pares de coordinación FE+BE estricta:** 007, 008, 010, 011, 012, 018.
Para cada uno: **BE-first** (salvo 011/018 que son shape-coordinados y van en la misma ventana).

---

## 6. Orden de merge sugerido (topológico)

> Sugerencia, no obligatorio. Respeta todas las aristas fuertes.

**Ola 0 — fundaciones (paralelizable entre repos):**
- BE: `001`, `002`, `004`, `005` (sin deps entre sí) -> luego `003` (tras 001).
- FE: `006`.

**Ola 1 — núcleo full-stack:**
- BE: `009` (tras 002).
- BE: `007` (tras 001,002,003,004) -> FE de `007` (tras 006).

**Ola 2 — dependientes de 007/009:**
- `008` (tras 007), `010` (tras 007,009), `014` por-entidad (tras 006,007,009).
- BE: `012` (tras 005).

**Ola 3 — FE independientes y coordinados:**
- `015`, `016`, `017`, `026` (tras 006).
- `011` y `018` (ventanas coordinadas FE+BE).

**Ola 4 — ensamblado y follow-up:**
- BE: `023` (tras 001,005,007,008,009,012), `025` (tras 001,002,009), `027` (tras 001), `013`, `019`.

**Ola 5 — transversales por repo (al final):**
- `020`, `021` (excluir dep-bumps DONE), `022`, `024`.

---

## 7. Exclusiones (DONE — ya en develop, no empaquetar)

- `table-select-filters`: FE #104.
- `reports-dark-mode`: FE #105. **OJO:** la limpieza de json-tags del dominio BE NO está porteada -> va en **027**.
- `lot-metrics` / `total_tons`: FE+BE #117/#121/#124.
- `tentative-prices`: FE+BE #121/#124 -> **excluir de 018**.
- `dependency-bumps` (go-jose, x/net): BE #124 -> **excluir de 021**.
- `lots`/`workorders` (FE master-data): parcialmente DONE #104/#117 -> recortar de **014**.

---

## 8. Notas de riesgo de merge

- **Archivos MEZCLADOS (alto riesgo de conflicto), conocidos en este repo:**
  `ui/src/router.tsx`, `ui/src/main.tsx`, `api/src/routes/index.ts`, `api/src/index.ts`, `package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`.
  Portar **006 primero** para fijar el shell de router/main; el resto se rebasa encima.
- **BE MEZCLADO:** `wire.go`/`wire_gen.go`/`cmd/api/main.go` (feature 023) -> usar `git restore -p` (parcial) por módulo, nunca el archivo entero.
- **Migraciones BE** (002: 227/228/232/233; 003: 224/225; 007: 223/226/231/234): respetar numeración; 003 tiene **riesgo de datos stale** en el backfill.
- **Recordatorio de fuente:** extraer siempre desde `develop-problematico~1` (`3ffcf60`); el tip es un `restore` vacío.
