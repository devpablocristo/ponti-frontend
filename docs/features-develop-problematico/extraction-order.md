# Orden de extracción — descomposición de `develop-problematico`

> **Documento GLOBAL** de orden de extracción/merge para descomponer la rama de integración `develop-problematico`.
> Complementa a [`index.md`](index.md) (catálogo de features + checklists). Acá vive **el orden, la justificación por posición, qué validar tras cada PR, qué va en paralelo, qué no mezclar, qué postergar, cuándo BE-first vs FE-first, y qué necesita coordinación cross-repo**.
>
> **GUARDRAIL:** solo análisis. Cero cambios a código. Todo comando `git` es **sugerencia**, no algo a ejecutar.

---

## Premisa de la fuente (leer antes de tocar nada)

- **SOURCE de extracción = `develop-problematico~1` = `3ffcf60` ("done") — el pico.** NUNCA el tip.
- **Tip a ignorar = `ac5dd2e`** (`restore: app a estado pre-new-cns3 + mantener tooling local actual`). Ese commit **vacía** la rama; si extraés desde el tip, no traés nada.
- **Destino de todas las extracciones = `develop`.**
- **Rango fuente = `fefbe695..3ffcf60`** (582 archivos FE en este repo; 427 BE en el otro).
- Convención de extracción para archivos compartidos: traer por hunks (`git restore -p <SHA-fuente> -- <archivo>`) acompañando a su módulo, **nunca el archivo entero de bloque**.

---

## Criterio de ordenamiento (de menor a mayor acoplamiento)

1. **Base / bajo riesgo primero** (001, 004, 005, 006, 019, 027): fundaciones sin contrato API que cambie, o tooling aislado. Desbloquean el resto sin arrastrar dependencias.
2. **Fundaciones BE** (002, 003): framework de lifecycle y hardening multitenant. Sostienen archive-surface y actores.
3. **Contratos full-stack BE-first** (007 → 008 → 009 → 010): se mergea BE, se valida el contrato, luego entra el FE consumidor.
4. **Shapes sensibles** (011, 009): cambios de forma de payload que rompen el FE si desync. Requieren coordinación de timing.
5. **FE consumidor** (014, 015–018): páginas que dependen de 006 (+ 007/009 en master-data).
6. **Infra / tests / docs al final** (020–026): no bloquean, pueden romper deploy si entran sueltos, mejor como cierre.

> Regla de oro: **006 antes de cualquier FE**, y en full-stack **el BE del otro repo se mergea y valida antes del FE de este repo**.

---

## Orden recomendado GLOBAL (ambos repos)

Esta es la secuencia completa 1→27 mezclando ambos repos. El orden por posición y su porqué.

| # | Feature | Repo | Por qué en esta posición |
|---|---|---|---|
| 1 | 001 be-platform-tenancy-refactor | BE | Base de TODO el BE (`tenancy.Scope` en ~23 repos). Sin contrato API que cambie → bajo riesgo de romper FE. Va primero porque 003, 007, 023, 025, 027 dependen de él. |
| 2 | 002 be-crudar-lifecycle-framework | BE | Funda el archive-surface (009) y aporta migraciones 227/228/232/233. Independiente de 001 pero conviene antes de 003/009. |
| 3 | 003 be-multitenant-db-hardening | BE | Migraciones 224/225 (backfill → constraints). **Riesgo alto con datos stale**: correr en orden, validar backfill antes del constraint. Dep: 001. |
| 4 | 004 shared-text-propername | BE | Util chico, independiente. Bloquea 007 (normalización de nombres de actores) → entra antes que 007. |
| 5 | 005 be-config-modularization | BE | `cmd/config` split + `.env.example`. Funda 012 y 023. Independiente → temprano y barato. |
| 6 | **006 fe-design-system** | **FE (este repo)** | **Base de TODO el FE.** Primitivos + lib + router/main shell. Todo FE (014–018, 026) depende. **Primero del lado FE, sí o sí.** |
| 7 | 007 actor-system | BE+FE | Full-stack grande. **BE-first** (`/api/v1/actors` + migr 223/226/231/234), luego FE (`useActors` + `master-data/actors` + BFF `actors.ts`). Deps: 001,002,003,004,006. |
| 8 | 008 identity-tenant-context | BE+FE | Full-stack. **BE-first** (`/me` con array de tenants), luego FE (`TenantContext` + Navbar switcher + login + BFF `me.ts`). Dep: 007. |
| 9 | 009 crudar-archive-surface | BE (FE en 014/006) | **Cambio de contrato** en ~20 dominios: `DELETE /:id` → `POST /:id/archive` + `DELETE /:id/hard` + `GET /archived`. BE-first; su FE entra con 014 y 006. Dep: 002. **PRs por entidad.** |
| 10 | 010 projects | BE+FE | Full-stack. **BE-first** (project-archive bridge + scope/creator), luego FE (`pages/admin/projects` + BFF `projects.ts`). Deps: 007,009. |
| 11 | 011 campaign-dto-projectid | BE+FE | **Shape change coordinado** (`project_id`/`id`/`name` minúscula). Si desync, dropdown de campañas vacío. No depende de fundaciones → puede entrar antes, pero **BE y FE deben mergear juntos/cerca**. |
| 12 | 012 ai-companion-integration | BE+FE | Full-stack. **BE-first** (`internal/axis` + companion_providers), luego FE (`pages/admin/ai` + BFF `ai.ts`). Dep: 005. |
| 13 | 013 be-csv-export | BE | XLSX→CSV en endpoints export. **Revisar consumo FE** antes de mergear (puede romper descargas). Independiente, BE-first. |
| 14 | **014 fe-master-data-pages** | **FE (este repo)** | **Familia de 212 archivos.** 1 PR por entidad. Deps: 006,007,009. Va tras el BE de 007/009 ya validado. `lots`/`workorders` parcialmente DONE (#104/#117). |
| 15 | 015 fe-dashboard-consolidation | FE | FE independiente sobre 006. Bajo riesgo. |
| 16 | 016 fe-access-notifications | FE | FE independiente sobre 006. Bajo riesgo. |
| 17 | 017 fe-dollar-commerce-forms | FE | FE independiente sobre 006. Bajo riesgo. |
| 18 | 018 data-integrity-admin | BE+FE | Full-stack coordinado. **Excluir tentative-prices (#121 DONE).** FE `pages/admin/data-integrity` + `useDatabase`; BE `internal/data-integrity`. |
| 19 | 019 be-local-tooling-db-scripts | BE | Scripts + Makefile. Bajo riesgo, independiente. Puede ir temprano (no bloquea) o como cierre. |
| 20 | 020 ci-workflows | BE+FE | `.github/workflows` en ambos. **Puede romper deploy si entra sin el resto** → por repo, al final. |
| 21 | 021 build-and-deploy-config | BE+FE | **Separar deps bumps (#124 DONE).** FE: vite/tailwind/eslint/knip/tsconfig/lockfiles/generated client. Por repo. |
| 22 | 022 lefthook-git-hooks | BE+FE | `lefthook.yml`. Local tooling, opcional. Por repo. |
| 23 | 023 be-wire-di | BE | `wire/` + `cmd/api`. **Acompaña a su módulo** (actor_providers→007, companion_providers→012). `wire.go`/`wire_gen.go`/`main.go` MEZCLADOS → `restore -p`. Deps: 001,005,007,008,009,012. |
| 24 | 024 openapi-and-docs | BE+FE | Docs. Independiente, sin riesgo runtime. |
| 25 | 025 be-test-coverage | BE | Tests que validan 001/009 (45 archivos). **Follow-up** tras sus módulos. Deps: 001,002,009. |
| 26 | 026 fe-test-infra | FE | Infra de tests FE sobre 006. Independiente. |
| 27 | 027 be-cleanup-domain-purity | BE | Cleanup (staticcheck, json-tag removal, remove governance, jwt legacy). Bajo riesgo. Dep: 001. **Incluye la limpieza de json-tags del dominio que NO entró con reports-dark-mode #105.** |

---

## Orden recomendado para ESTE repo (web — solo FE)

Filtrando a las 16 features con archivos en `web`. Las deps BE se anotan como **gate** (precondición a mergear en el otro repo y validar antes de tocar el FE).

| Paso | Feature (este repo) | Gate BE (otro repo) | Riesgo | Tipo de PR |
|---|---|---|---|---|
| 1 | **006 fe-design-system** | — | alto (router/main mezclados) | 1 PR base (cuidado con `router.tsx`/`main.tsx`) |
| 2 | 007 FE (actor-system) | 001,002,003,004 + BE de 007 mergeado y `/api/v1/actors` vivo | alto | 1 PR |
| 3 | 008 FE (identity-tenant-context) | BE de 008 (`/me`) mergeado | alto | 1 PR |
| 4 | 011 FE (campaign-dto-projectid) | BE de 011 (shape minúscula) mergeado **junto/cerca** | medio | PR coordinado con BE |
| 5 | 010 FE (projects) | 009 + BE de 010 mergeado | medio | 1 PR |
| 6 | 012 FE (ai-companion) | 005 + BE de 012 mergeado | medio | 1 PR |
| 7 | **014 fe-master-data-pages** | 007,009 BE validados | alto | **1 PR por entidad** (ver abajo) |
| 8 | 015 fe-dashboard | — (solo 006) | bajo | 1 PR |
| 9 | 016 fe-access-notifications | — (solo 006) | bajo | 1 PR |
| 10 | 017 fe-dollar-commerce-forms | — (solo 006) | bajo | 1 PR |
| 11 | 018 FE (data-integrity) | BE de 018 mergeado (sin tentative-prices) | medio | 1 PR (excluir #121) |
| 12 | 020 ci-workflows (FE) | coordinar con BE | alto (deploy) | 1 PR por repo, al final |
| 13 | 021 build-and-deploy-config (FE) | separar #124 | medio | 1 PR (sin deps bumps) |
| 14 | 022 lefthook (FE) | — | bajo | opcional |
| 15 | 024 openapi-and-docs (FE) | — | bajo | independiente |
| 16 | 026 fe-test-infra | — (solo 006) | bajo | independiente |

### 014 — desglose por entidad (PR por entidad, IMPRESCINDIBLE)

No mergear 014 como bloque. Agrupar el file-list por entidad y abrir 1 PR por cada una:
`customers · fields · crops · investors · managers · labors · supplies · supply-movements · stock`
(+ hooks + BFF routes/utils que toque cada una).

- **`lots` y `workorders`**: parcialmente **DONE** (#104/#117) → traer **solo el delta**, no re-mergear lo que ya está en `develop`.
- Cada PR de entidad depende de que el BE de **007** y **009** (archive-surface de esa entidad) ya esté en `develop`.

---

## Qué va en PARALELO

Una vez **006** está en `develop`, estos no se pisan entre sí y pueden avanzar en simultáneo (distintas personas / branches):

- **Grupo FE-independiente (solo dep 006):** 015, 016, 017, 026, 024, 022.
- **Grupo full-stack BE-first (independientes entre sí tras sus gates):** 007 y 012 no comparten dominio FE → paralelizables una vez sus BE están mergeados (007 igual es gate de 008/010/014).
- **Cada entidad de 014** es un PR paralelo respecto a las otras entidades (comparten solo BFF utils/hooks → cuidar el orden de esos archivos compartidos).
- Lado BE: 001, 002, 004, 005 son independientes entre sí → paralelizables al inicio.

---

## Qué NO mezclar (archivos compartidos / peligrosos)

Estos archivos reciben aportes de varias features a la vez. **No traerlos de bloque**; usar `git restore -p` por hunks, asociando cada hunk a su feature:

`ui/src/router.tsx` · `ui/src/main.tsx` · `api/src/routes/index.ts` · `api/src/index.ts` · `package.json` · `ui/package.json` · `ui/yarn.lock` · `package-lock.json`

Reglas concretas:
- **`router.tsx` / `main.tsx`**: pertenecen a 006 (shell) pero cada página (007/010/012/014/015–018) agrega rutas. Traer el shell con 006; agregar rutas por feature en su propio PR.
- **`api/src/routes/index.ts`**: registra routers (`actors.ts`, `me.ts`, `projects.ts`, `ai.ts`, ...). Agregar el registro en el PR de cada feature, no de una.
- **Lockfiles (`yarn.lock`, `package-lock.json`) + `package.json`**: un solo PR debe ser dueño del bump de cada dep. **Separar los deps bumps ya DONE (#124)** de 021. No traer el lockfile entero del pico (mezcla deps de muchas features).
- **No mezclar BE-DI (023)**: `wire.go`/`wire_gen.go`/`cmd/api/main.go` van con `restore -p` junto a cada módulo (actor_providers→007, companion_providers→012), no como PR único.

---

## Qué POSTERGAR

- **020 ci-workflows**: al final, por repo. Si entra antes que el resto del código, puede disparar pipelines/deploys contra código que aún no existe → **romper deploy**.
- **025 be-test-coverage**: follow-up tras 001/002/009 (valida esos módulos; no aporta features).
- **021 build-and-deploy-config**: tras estabilizar deps; primero separar lo ya DONE (#124).
- **022 lefthook**: opcional, cuando convenga (tooling local).
- **019 be-local-tooling-db-scripts**: bajo riesgo, no bloquea; puede ir temprano o tarde indistintamente.

---

## Cuándo BE-first vs FE-first

- **BE-first (mergear BE + validar contrato, luego FE):** 007, 008, 009, 010, 012, 018. El FE consume endpoints; si el FE entra antes, rompe en runtime (404/500/shape).
- **Coordinado (BE y FE juntos o muy cerca):** 011 (shape `project_id` minúscula). Si el BE cambia y el FE no, **dropdown de campañas vacío**; si el FE cambia y el BE no, idem inverso.
- **FE-only (sin gate BE más allá de 006):** 006, 014 (es FE puro, pero **necesita el contrato BE de 007/009 ya en `develop`** porque consume archive-surface y actores), 015, 016, 017, 024, 026, 022.
- **Nunca FE-first** en este set: ninguna feature FE debe adelantar a su contrato BE.

---

## Coordinación cross-repo (full-stack)

Features que tocan **ambos repos** y necesitan secuenciar merges entre `web` (FE) y `core`/`platform` (BE):

| Feature | Secuencia | Síntoma si desync |
|---|---|---|
| 007 actor-system | BE (`/api/v1/actors` + migr) → validar → FE | `useActors`/`master-data/actors` rompe (404 / lista vacía) |
| 008 identity-tenant-context | BE (`/me` array tenants) → validar → FE | Navbar switcher sin tenants / login falla |
| 009 crudar-archive-surface | BE (contrato archive) → FE de 014/006 | Botones archive/restore apuntan a endpoint viejo (DELETE) |
| 010 projects | BE (bridge + scope) → FE | `pages/admin/projects` sin datos |
| 011 campaign-dto-projectid | **BE y FE juntos** | **Dropdown de campañas vacío** |
| 012 ai-companion-integration | BE (`internal/axis`) → FE | Chat AI sin respuesta / proxy roto |
| 018 data-integrity-admin | BE (`internal/data-integrity`) → FE | `useDatabase` falla; **excluir tentative-prices #121** |
| 020 / 021 / 022 | por repo, coordinado en timing | CI/deploy/build desincronizado entre repos |

---

## Qué validar tras CADA PR (checklist de smoke por tipo)

### Tras 006 (base FE)
- `yarn build` (ui) y `yarn build` (api) verdes; sin imports rotos.
- App arranca; router resuelve rutas existentes; primitivos (button/modal/drawer/input/card/filters/feedback) renderizan.
- `ArchivedListPage` y lib (format/theme/lifecycle) importables.

### Tras cada full-stack BE-first (007, 008, 009, 010, 012, 018)
- **Primero**: el endpoint BE responde en `develop` (curl/openapi) antes de mergear el FE.
- FE: la página consume el endpoint sin 404/500; shape del payload coincide con el tipo TS.
- 007: `/api/v1/actors` lista; `master-data/actors` CRUD + archive.
- 008: `/me` devuelve array de tenants; Navbar switcher cambia de tenant; login OK.
- 009: para cada entidad, `POST /:id/archive`, `DELETE /:id/hard`, `GET /archived` responden; el FE de 014/006 usa los nuevos verbos (no `DELETE /:id`).
- 010: crear/listar projects; scope/creator correctos.
- 012: chat stream proxy responde; JWT a Companion OK.
- 018: data-integrity carga; **verificar que tentative-prices NO se re-introduce** (ya está en `develop` por #121).

### Tras 011 (shape coordinado)
- BE serializa `project_id`/`id`/`name` en minúscula.
- FE: **dropdown de campañas con opciones** (no vacío). Probar selección y submit.

### Tras cada PR de entidad de 014
- La entidad lista/crea/edita/archiva; hooks y BFF route de esa entidad sin romper las ya mergeadas.
- BFF utils compartidos no rompieron entidades previas (regresión rápida).
- Para `lots`/`workorders`: confirmar que solo entró el delta (no duplicar #104/#117).

### Tras FE-independientes (015, 016, 017, 024, 026)
- Build verde; la página/área renderiza; sin regresión en navegación.
- 026: la suite de tests corre (`ui/.vite-smoke`, `ui/e2e`, `api/test`, `api/src/mocks`).

### Tras infra/config (020, 021, 022)
- 020: el workflow corre sin romper deploy; **coordinado entre repos**.
- 021: `vite`/`tailwind`/`eslint`/`knip`/`tsconfig` OK; lockfile coherente; **sin re-traer deps bumps #124**; generated client regenera igual.
- 022: hooks de lefthook corren localmente (opcional).

### Regla transversal
Tras cada merge a `develop`: build de ambos paquetes verde + smoke de la feature + no regresión en lo ya mergeado. Recién entonces marcar el checklist en `index.md` y `dp actualizada/descartada`.

---

## Excluir del alcance (ya DONE en `develop`)

- **table-select-filters** — FE #104.
- **reports-dark-mode** — FE #105 (la limpieza de json-tags del dominio BE NO está porteada → va en **027**).
- **lot-metrics / total_tons** — FE+BE #117/#121/#124.
- **tentative-prices** — FE+BE #121/#124 → **excluir de 018**.
- **dependency-bumps (go-jose, x/net)** — BE #124 → **excluir de 021**.

---

## Resumen de secuencia (una línea)

`001 ∥ 002 ∥ 004 ∥ 005` → `003` → **`006`** → `007(BE→FE)` → `008(BE→FE)` → `009(BE)` + `010(BE→FE)` → `011(coord)` → `012(BE→FE)` → `013` → **`014 (1 PR/entidad)`** + `015 ∥ 016 ∥ 017 ∥ 024 ∥ 026 ∥ 022` → `018(BE→FE, sin #121)` → `019` → **postergados:** `020 → 021(sin #124) → 023(con su módulo) → 025(follow-up) → 027`.
