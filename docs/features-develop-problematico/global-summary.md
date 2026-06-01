# Global Summary — Descomposición de `develop-problematico` (Frontend monorepo `web`)

> Fecha del análisis: **2026-05-30**
> Repo: `/home/pablocristo/Proyectos/pablo/ponti/web` — monorepo FE: `ui/` (React + Vite + Tailwind, yarn) + `api/` (BFF NodeJS/Express, yarn).
> **SOURCE de extracción:** `develop-problematico~1` = SHA **`3ffcf60`** (el "pico"). **NUNCA** el tip.
> Rango fuente analizado: **`fefbe695..3ffcf60`**.
> **Destino:** `develop` (SHA `8c25e88`).

---

## 0. Por qué la fuente es `~1` y no el tip

`develop-problematico` fue una rama de **integración** que apiló varias líneas de trabajo (new-cns3 + projects + admin + ...). Su **último** commit, `ac5dd2e` (`restore: app a estado pre-new-cns3 + mantener tooling local actual`), es un **restore que VACÍA la rama** (vuelve la app a pre-new-cns3 conservando solo tooling local). Por eso el contenido real a descomponer está en el commit **anterior**, `3ffcf60` (`done`).

Si se extrae desde el tip se obtiene casi-nada (el revert). Toda referencia a "la fuente" en este paquete = **`3ffcf60`**.

**Verificación de que la extracción hace falta:** `3ffcf60` tiene **196 commits que no están en `develop`** (`develop..3ffcf60` = 196), y `develop` solo tiene 4 commits que no están en la fuente. Es decir, el pico está esencialmente desconectado de `develop`; hay que portar feature por feature, no mergear la rama.

---

## 1. Magnitud del cambio (rango `fefbe695..3ffcf60`)

```
582 files changed, 61119 insertions(+), 171196 deletions(-)
A(dded)=333  M(odified)=150  D(eleted)=75  R(enamed)=24
```

El gran volumen de borrado (~171k) se explica por el rebarajado del FE (consolidación de design-system, reescritura de páginas legacy a familias por entidad, eliminación de assets/legacy y de lockfiles redundantes). No es un repo "que crece": es un repo **reorganizado**.

### Áreas tocadas (por carpeta de primer/segundo nivel)

| Área | Archivos | Qué es |
|---|---:|---|
| `ui/src` | 413 | El grueso del FE: páginas admin, hooks, componentes, lib, router/main |
| `docs/audit` | 55 | **PNGs de visual-regression** (drawers/cards before/after). Casi seguro **generado** → feature-024 |
| `ui/.vite-smoke` | 44 | Infra de smoke tests Vite → feature-026 |
| `api/src` | 32 | BFF (rutas, middleware, utils, mocks) |
| `ui/e2e` | 10 | E2E (Playwright) → feature-026 |
| `.github/workflows` | 4 | CI/deploy → feature-020 |
| `api/test` | 4 | Tests del BFF → feature-026 |
| varios root | — | `package.json`, lockfiles, `docker-compose.yml`, `lefthook.yml`, `.gitignore`, `tailwind/vite/eslint/knip/tsconfig` → 021/022 |

> **Nota importante de alcance del repo:** este es el repo **FE**. Las features marcadas `en-este-repo=no` en la tabla (001, 002, 003, 004, 005, 009, 013, 019, 023, 025, 027) son **BE** y viven en el otro repo (`core`/`platform`). Aquí solo aparece su **huella de consumo** (ej. endpoints `/archive`, CSV vs XLSX, `/me`, `/actors`). No hay carpeta `be/` ni migraciones SQL en este repo.

---

## 2. Cambios transversales (los "ejes" del FE)

Dos refactors atraviesan casi todo lo demás. **Hay que portarlos primero.**

### Eje A — Design System (feature-006) — *base de todo el FE*
Consolida primitivos y librería compartida. Evidencia en el rango:
- `components/feedback` (10), `Button` (5), `Input` (5), `Drawer` (5), `Modal` (2), `Card` (2), `filters` (3), `crud` (12), `SmartEntityInput` (2), `ArchivedListPage` (2).
- `lib/format` (6), `lib/theme` (4), `lib/lifecycle` (2).
- Shell de la app: `layout/` (Navbar 3, Sidebar 2), `router.tsx`, `main.tsx`.
- Config visual: `tailwind.config.js`, `vite.config.ts`.

Todo lo de `pages/admin/**` y `hooks/**` **depende** de estos primitivos → 006 es prerequisito de 014/015/016/017 y de la parte FE de 007/008/010.

### Eje B — Master-data por entidad (feature-014) — *la familia grande del FE*
`pages/admin/master-data/` se reorganiza **por entidad** (junto con sus hooks y rutas BFF). Distribución dentro de `master-data/`:

```
entities 13 | actors 13 | customers 12 | labors 7 | crops 7 | supplies 5
fields 5 | campaigns 5 | managers 4 | investors 4 | data-integrity 3
work-orders 1 | projects 1 | lots 1 | dollar 1 | commerce 1
```

> **`actors` (13) vive físicamente dentro de `master-data/` pero pertenece a feature-007** (actor-system), no a 014. Separar al agrupar.
> `lots` y `workorders` están **parcialmente DONE** (ya porteados en #104/#117) → al armar PRs de 014, **excluir lo ya mergeado** y traer solo el delta.
> `data-integrity` aquí (3) es la parte FE de feature-018; **excluir tentative-prices** (DONE #121).

### Ecos del BE en el FE (consumo de contratos)
- **Archive surface (009, BE):** aparece `ArchivedListPage`, `database/projects/ArchivedProjects.tsx`, y rutas BFF que ahora hablan `POST /:id/archive`, `DELETE /:id/hard`, `GET /archived`. El FE/BFF **ya asume** el contrato nuevo → al portar páginas hay que coordinar con el merge BE de 009.
- **CSV export (013, BE):** revisar si algún botón de export del FE espera XLSX. No se detectó cambio masivo de export en el FE del rango, pero validar al portar 013.
- **Tenancy (001, BE):** sin cambio de contrato API; transparente para el FE.

---

## 3. Áreas FE por feature (mapa rápido)

| Feature | Huella principal en `ui/src` |
|---|---|
| 006 design-system | `components/*`, `lib/*`, `layout/*`, `router.tsx`, `main.tsx`, `tailwind/vite` |
| 007 actor-system (parte FE) | `master-data/actors` (13), `hooks/useActors`, BFF `routes/actors.ts` |
| 008 identity-tenant-context (FE) | `pages/login/context/TenantContext*`, `useTenant.ts`, `meContextPayload*`, `layout/Navbar/TenantSwitcher.tsx`, `Login.tsx`; BFF `routes/me.ts`, `authMiddleware.ts`, `requestContext.ts` |
| 010 projects (FE) | `pages/admin/projects` (5), `hooks/useDatabase/projects/*`, `database/projects/ArchivedProjects.tsx`, BFF `routes/projects.ts` |
| 011 campaign-dto-projectid (FE) | `hooks/useCampaigns`, `master-data/campaigns` (5), BFF `routes/campaigns.ts` |
| 012 ai-companion (FE) | `pages/admin/ai-assistant/AIAssistant.tsx`, `types/aiChat.ts`, BFF `routes/ai.ts`, `lib/managerChatStreamProxy.ts` |
| 014 master-data pages | familia `master-data/**` + `hooks/use{Customers,Fields,Lots,WorkOrders,Crops,Investors,Managers,Labors,Supplies,SupplyMovements,Stock}` + BFF routes |
| 015 dashboard | `pages/admin/dashboard` (10, incl. `DashboardV2` + `dashboardV2/*`), `hooks/useDashboard` |
| 016 access/notifications | `pages/admin/access/Access.tsx`, `copy/notifications.ts`, `components/feedback/Notification.tsx` |
| 017 dollar/commerce forms | `hooks/useDollar`, `hooks/useCommercializations`, `master-data/commerce`, `master-data/dollar` |
| 018 data-integrity (FE) | `pages/admin/database` (5), `hooks/useDatabase`, `master-data/data-integrity` (3) — **excluir tentative-prices (DONE)** |

---

## 4. Archivos críticos / compartidos / "mezclados"

Estos archivos son tocados por **varias features a la vez**. **No** se pueden asignar a un solo paquete: hay que portarlos con `restore -p` (hunk a hunk) o reconstruirlos manualmente al integrar cada feature.

| Archivo | Δ (en el rango) | Por qué es peligroso |
|---|---|---|
| `ui/src/router.tsx` | **+280 / -62** | Registra rutas de **todas** las páginas (admin, projects, ai, master-data, login). Conflicto garantizado entre 006/007/010/012/014/015/016/017. |
| `ui/src/main.tsx` | +20 / -14 | Shell/providers (incl. `TenantContext` de 008). Mezcla 006 + 008. |
| `api/src/routes/index.ts` | +90 / -11 | Monta **todas** las rutas BFF nuevas (actors, me, investors, managers, ...). Mezcla 007/008/010/012/014. |
| `api/src/index.ts` | +4 / -0 | Bootstrap del BFF (middleware de 008). |
| `ui/package.json` / `ui/yarn.lock` | +23/-19 ; **+980/-334** | Bumps de deps mezclados (parte ya DONE en BE #124, pero acá es el lockfile FE). → feature-021. |
| `api/src/routes/options.ts`, `types.ts` | M | Tipos/listas compartidas por varias entidades de 014. |

**Recomendación:** portar `router.tsx` / `main.tsx` / `routes/index.ts` **al final**, reensamblando las entradas de cada feature ya integrada, en lugar de copiarlos enteros.

---

## 5. Cambios sospechosos / experimentales

- **`DashboardV2` + carpeta `dashboardV2/`** (`CostByCropCardV2`, `DashboardKpiRow`, `ManagementBalanceCardV2`, `OperationalIndicatorsV2`, `ProgressBar`) **conviven** con `Dashboard.tsx`/`CostByCropTable.tsx` "V1". Hay que decidir si V2 reemplaza o coexiste; verificar a qué versión apunta `router.tsx`. **Riesgo de arrastrar UI muerta.** → feature-015.
- **Páginas `Legacy*`** renombradas pero **conservadas**: `LegacyTasks.tsx` (ex `Tasks.tsx`), `LegacyWorkOrders.tsx`, `WorkspaceSelector.tsx`/`FieldSearch.tsx` borrados en login. Las renames `R` (24) y los `Legacy*` indican una migración a medias — revisar si el legacy sigue ruteado.
- **`CreateOrder.tsx` (+2321) y `UpdateOrder.tsx` (+2147)** son reescrituras masivas de workorders; alto riesgo de regresión. Parte de workorders ya está DONE (#117) → portar solo el delta no-DONE.
- **`docs/audit/**` (55 PNGs):** snapshots de visual-regression. Probablemente **artefactos generados**; no tratarlos como código. → feature-024, opcional/independiente.
- **Lockfiles borrados en la raíz** (`package-lock.json`, `api/package-lock.json`) + migración a **yarn** y `knip.json`/`lefthook.yml` nuevos: cambio de herramienta de package management. → 021/022. Traer junto con el resto o se rompe `yarn install`/CI.

---

## 6. Migraciones, configuración y CI

- **Migraciones SQL:** **ninguna en este repo** (son BE). Las migraciones citadas en la tabla (223–234, 224/225, 227/228/232/233) viven en `core`/`platform`. Aquí solo se consume el resultado vía API/BFF.
- **Config FE:** `vite.config.ts` (+9), `tailwind.config.js` (+40/-..), `ui/eslint.config.js`, `ui/knip.json` (nuevo), `ui/tsconfig*`. → feature-021.
- **Config BFF:** `api/eslint.config.js` (nuevo, reemplaza `.eslintignore` borrado). → 021.
- **Docker:** `docker-compose.yml` (M) → 021.
- **Hooks:** `lefthook.yml` (nuevo, raíz) → feature-022, opcional.
- **CI:** `.github/workflows/{ci-pr,deploy-dev,deploy-staging,deploy-prod}.yml` (4 M). → feature-020. **Pueden romper deploy si se traen sin el resto** (asumen yarn + nuevas rutas). Traer al final o coordinado.

---

## 7. Tests afectados (feature-026, FE)

- `ui/.vite-smoke/**` (44) — smoke tests de arranque Vite.
- `ui/e2e/**` (10) — Playwright (incluye specs de lots/work-orders, ya hechos resilientes a drift en `develop`).
- `api/test/**`: nuevos `authMiddleware.test.js`, `configService.test.js`; modificados `lotsRoute.test.js`, `workOrdersRoute.test.js`.
- `api/src/mocks/handlers.ts` (MSW) — mocks del BFF.
- Tests unitarios dispersos en páginas: `importWorkOrders.test.ts`, `meContextPayload.test.ts`, `utils.test.ts`, `fileTransfer.test.ts`, `useDatabase/projects/index.test.ts`.

Los tests **siguen a su feature** (ej. `authMiddleware.test.js` con 008; e2e de lots con 014). No portarlos sueltos.

---

## 8. Lo que ya está DONE en `develop` (NO re-portar)

Confirmado por `git log develop`:
- **#104** table-select-filters (FE) — `967bd55`.
- **#105** reports-dark-mode (FE) — `967bd55`. *(la limpieza de json-tags del dominio BE NO está porteada → va en 027, BE)*.
- **#117** lot-metrics / `TentativePricesChip` (FE) — `967bd55` / `43e4a3e`.
- **#121/#124** tentative-prices + total_tons (FE+BE) — **excluir de 018 y 021**.
- **dependency-bumps** (go-jose, x/net, BE #124) — excluir de 021 (lado BE).
- e2e de lots/work-orders ya resilientes — `1c39ba2`.

→ Al armar PRs de **014 (lots/workorders)**, **018 (data-integrity)** y **021 (deps/lockfiles)**, **restar** explícitamente lo de arriba para no introducir conflictos ni regresiones.

---

## 9. Riesgos generales de extracción

1. **`develop` divergió fuerte** (196 vs 4 commits): NO mergear la rama; portar feature por feature con `git restore -p <3ffcf60> -- <paths>` (sugerencia, no se ejecuta aquí).
2. **Archivos mezclados** (`router.tsx`, `main.tsx`, `routes/index.ts`, lockfiles): conflicto seguro. Reensamblar al final, no copiar enteros.
3. **Orden de dependencias FE:** 006 antes que cualquier página; la parte FE de 007/008/010 requiere su BE-first en el otro repo (contratos `/actors`, `/me`, archive).
4. **DONE parcial** (lots/workorders/tentative): traer solo deltas; alto riesgo de duplicar/pisar #104/#105/#117/#121.
5. **UI experimental** (`DashboardV2`, `Legacy*`): decidir incluir/excluir; no arrastrar páginas muertas o doble-ruteadas.
6. **Cambio de tooling** (npm→yarn, knip, lefthook, eslint flat config): 020/021/022 son **todo-o-nada** relativo entre sí; si se trae uno sin los otros, `yarn install`/CI/hooks rompen.
7. **`docs/audit` generado:** no revisar como código; regenerar tras integrar el FE.

---

## 10. Recomendaciones (orden sugerido de portado)

1. **BE-first (otro repo):** 001 → 002/003/004/005 → 009 → 007(BE) → 008(BE) → 010(BE)/012(BE)/013. Sin esto, el FE rompe contra contratos viejos.
2. **FE base:** **006** (design-system) — primer PR FE, habilita todo lo demás.
3. **FE full-stack (tras su BE):** 007(FE) → 008(FE) → 010(FE) → 011 → 012(FE) → 018(FE, sin tentative-prices).
4. **FE familia 014:** **1 PR por entidad** (customers, fields, crops, supplies, supply-movements, stock, labors, managers, investors, ...). Excluir lots/workorders ya DONE; tratar `actors` como 007.
5. **FE independientes:** 015 (decidir V1/V2), 016, 017.
6. **Infra/config:** 020 (CI), 021 (build/deps, restando bumps DONE), 022 (lefthook, opcional), 026 (tests, siguiendo a su feature), 024 (docs/audit, independiente).
7. **Archivos mezclados al final:** reensamblar `router.tsx`, `main.tsx`, `api/src/routes/index.ts` con las entradas de las features ya integradas.

> Todos los comandos `git` (`restore -p`, etc.) en este doc son **sugerencias**. Este análisis **no modifica código** ni ejecuta merges.

---

## 11. Relación con el otro repo (`core`/`platform`, BE)

- Este FE **consume** los contratos que el BE introduce: `/api/v1/actors` (007), `/me` con array de tenants (008), archive surface `POST /:id/archive` + `GET /archived` + `DELETE /:id/hard` (009), AI Companion proxy (012), CSV export (013).
- Por eso el patrón de merge de las full-stack (007/008/010/012) es **BE-first, luego FE**: si el FE entra antes que su BE, el BFF pega contra endpoints inexistentes.
- 011 (campaign-dto `project_id`/`id`/`name` en minúscula) es un **shape change coordinado**: si FE y BE desincronizan, el dropdown de campañas queda vacío. Mergear ambos lados juntos.
- 001 (tenancy) es transparente para el FE (sin cambio de contrato), pero es la base de todo el BE; su estado condiciona 003/007/023.
- Lo ya DONE cruza ambos repos: #117/#121/#124 tocaron FE+BE; al portar acá hay que respetar lo que ya entró allá.
