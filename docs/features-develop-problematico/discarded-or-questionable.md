# Descartado / Dudoso / Decisión humana — `develop-problematico`

Análisis: 2026-05-30
Repo: Frontend monorepo `ui/` (React) + `api/` (BFF NodeJS, yarn) — `/home/pablocristo/Proyectos/pablo/ponti/web`
Rango fuente: `fefbe695..3ffcf60`
SOURCE de extracción: **`develop-problematico~1` (SHA `3ffcf60`)** — el pico de la rama de integración. **NUNCA el tip** (`ac5dd2e`), que es un `restore` que vacía la rama.
Destino: `develop`.

> Alcance de este documento: clasifica lo que **NO** debería entrar tal cual a `develop`, lo que **requiere decisión humana**, los **archivos dudosos**, las **preguntas abiertas**, y la lista de lo **YA PORTEADO (DONE)** con su PR#. Los comandos `git` que aparezcan son **sugerencias**, no se ejecutan.

---

## 0. TL;DR — qué excluir del porteo

| # | Ítem | Veredicto | Por qué |
|---|------|-----------|---------|
| 1 | `docs/audit/drawers/before/*.failed.png` + `*.failure.txt` (12 archivos) | **DISCARD** | Artefactos efímeros de Playwright en estado de fallo. El propio `.gitignore` ignora los de `after/`; los de `before/` quedaron commiteados por descuido. |
| 2 | `*.reference.tsx` (CustomerEditor.project-drawer.reference, ProjectEditorDrawer.reference) | **DECISIÓN HUMANA / riesgo** | Snapshots "congelados" marcados como "disconnected from production" pero **sí están cableados a una ruta viva** (ver §2.1). |
| 3 | `ui/.vite-smoke/deps/*` (38 borrados) | **OK borrar, pero falta gitignore** | Son artefactos de build pre-bundleados de Vite que estaban commiteados; el diff los elimina (bien), pero no se agregan a `.gitignore` → reaparecerán. |
| 4 | `**/package-lock.json` borrados | **OK** | yarn es el manager oficial; el `.gitignore` ahora los bloquea. Coherente. Va con feature-021. |
| 5 | Rutas/páginas `Legacy*` y `*V2` | **DECISIÓN HUMANA (no es basura)** | Dual-routing transicional intencional, no código muerto (ver §3). |
| 6 | `reviewproxy` (BE) | **DISCARD** | No vive en este repo (es BE). Mencionado por completitud: no portar. |
| 7 | PDFs / `.claude` local | **DISCARD** | No presentes en este diff FE; si aparecen en el set BE, no portar. |
| 8 | DONE (#104/#105/#117/#121/#124) | **NO re-portar** | Ya en `develop` (ver §6). |

---

## 1. Basura / artefactos de debugging (DISCARD directo)

### 1.1 Screenshots y logs de fallo de Playwright (`before/`)
Commiteados en `docs/audit/drawers/before/`:

```
database-items-new.failed.png      database-items-new.failure.txt
database-tasks-new.failed.png      database-tasks-new.failure.txt
lots-edit.failed.png               lots-edit.failure.txt
products-new.failed.png            products-new.failure.txt
stock-new.failed.png               stock-new.failure.txt
tasks-new.failed.png               tasks-new.failure.txt
workorders-new.failed.png          workorders-new.failure.txt
```

- Contenido típico (`lots-edit.failure.txt`): stack de un `expect(locator).toBeVisible()` que **falló** (`element(s) not found`, timeout 2000ms). Es output de una corrida de auditoría visual que no pasó.
- **Inconsistencia clave**: el `.gitignore` agregado en este mismo rango ignora `docs/audit/drawers/after/*.failed.png` y `after/*.failure.txt`, pero **no** los de `before/`. O sea, el propio autor consideró que estos artefactos NO deben versionarse; los `before/` quedaron por accidente.
- **Veredicto**: no portar. Si se trae la carpeta `docs/audit/drawers/` (feature-024 / docs visual-regression), excluir explícitamente los `*.failed.png` y `*.failure.txt`. Sugerencia: extender el gitignore para cubrir también `before/`.

### 1.2 `ui/.vite-smoke/deps/*` (38 borrados)
Son chunks pre-bundleados de Vite (react, react-dom, axios, lucide, xlsx, etc.) + sourcemaps + `_metadata.json`, que **estaban commiteados** en una rama previa. El diff los **borra** — esto es correcto (limpieza). Pero:

- No se agregó `ui/.vite-smoke/` (o `**/.vite-smoke/`) a ningún `.gitignore` (verificado: sin match ni en root ni en `ui/`).
- **Riesgo**: si se portan estos borrados sin agregar la regla de ignore, el directorio puede volver a aparecer en la próxima corrida de smoke (feature-026 introduce `ui/.vite-smoke`). 
- **Veredicto**: portar los borrados **junto con** una regla de gitignore para `**/.vite-smoke/deps/`. Va emparejado a feature-026 (fe-test-infra).

---

## 2. Baja confianza / decisión humana — código que entra a producción

### 2.1 Archivos `*.reference.tsx` "congelados" pero cableados a ruta viva  ⚠️ (el hallazgo importante)
```
ui/src/pages/admin/master-data/customers/CustomerEditor.project-drawer.reference.tsx
ui/src/pages/admin/master-data/entities/ProjectEditorDrawer.reference.tsx
```
Ambos abren con un comentario explícito:
> *"Frozen reference … Keep this file disconnected from production flows. Update it only when intentionally taking a new reference snapshot."* (fechado 2026-05-29)

**Pero la cadena de imports los conecta a una ruta de producción:**
- `router.tsx` rutea `master-data/entities` → `<GeneralEntities />`.
- `GeneralEntities.tsx` importa y renderiza `<EntityCatalogProjectModule />` (línea ~1021).
- `EntityCatalogProjectModule.tsx` importa `ProjectEditorReferenceBody` desde `CustomerEditor.project-drawer.reference` y lo **renderiza** (línea ~133).
- `ProjectEditorDrawer.reference.tsx` a su vez envuelve el mismo body congelado.

Es decir: un **snapshot de referencia de debugging quedó montado en la ruta `/admin/master-data/entities`**, contradiciendo su propio comentario. Esto es exactamente la clase de "incompleto / transicional" que no debería entrar silenciosamente a `develop`.

- **Decisión humana requerida**: o (a) se promueve la lógica a un componente real no-`.reference` antes de portar, o (b) `EntityCatalogProjectModule` se recablea a la implementación canónica y los `.reference.tsx` se descartan. No portar como están.
- Pertenece al universo de feature-014 (master-data/entities) / feature-010 (projects). Marcarlo como bloqueante de esos PRs.

### 2.2 `dashboardV2/` borrado vs `reportV2/` que sobrevive — no confundir
- **DASHBOARD**: el diff **borra** la variante V2 entera (`DashboardV2.tsx`, `dashboardV2/CostByCropCardV2`, `DashboardKpiRow`, `ManagementBalanceCardV2`, `OperationalIndicatorsV2`, `ProgressBar`). Consolidación correcta → feature-015. PR-92.md lo documenta ("Se eliminó la variante V2"). **No es dudoso**: es limpieza deseada.
- **REPORTES**: acá "V2" es la pila **vigente**, no muerta. `reportV2/` mayormente sobrevive (Modified): `CostCompositionDonut`, `CropBadgeV2`, `HarvestPaymentStrip`, `InvestorDistributionBars`, `InvestorShareCard`, `InvestorShareRow`, `lib/investorPalette`. Lo que se **borra** son los reportes *viejos* (`ByFieldOrCropReportV2.tsx`, `InvestorContributionReport.tsx`, `InvestorContributionTable.tsx`, `ContributionAdjustmentsList`, `ReportKpiCard`). `router.tsx` rutea `InvestorContributionReportV2` (como `InvestorContributionV2`), `ByFieldOrCropReport` y `SummaryResultsReport` (nuevo).
- **Cuidado al porteo**: no borrar `reportV2/*` pensando que es código muerto. La nomenclatura "V2" es engañosa: en reportes es lo actual. Va con feature-006/reports.

---

## 3. Dual-routing transicional `Legacy*` — decisión de producto, no basura

El SOURCE deja **conviviendo** las páginas viejas (`Legacy*`) con las nuevas de `master-data/`. Verificado: todas las `Legacy*` siguen **cableadas en `router.tsx`** (lazy imports + rutas activas):

```
LegacyWorkOrders  → import("./pages/admin/workorders/LegacyWorkOrders")
LegacyLots        → import("./pages/admin/lots/LegacyLots")
LegacyTasks       → import("./pages/admin/tasks/LegacyTasks")
LegacySupplyMovements → import("./pages/admin/supply-movements/LegacySupplyMovements")
LegacyStock       → import("./pages/admin/stock/LegacyStock")
LegacyCustomers, LegacyDatabaseCustomers, LegacyArchivedCustomers,
LegacyArchivedProjects, LegacyDatabaseItems, LegacyDatabaseTasksForm  (imports directos)
```
Más componentes `LegacyLotDrawer`, `LegacyLotsHeader`, `LegacyLotsIndicators`, `useLegacyLotColumns` usados por la pila legacy y aún referenciados por `Lots.tsx` / `LotEditDrawer.tsx`.

- **No es código muerto** y **no es basura**: es un estado de migración con doble juego de rutas (viejo + master-data nuevo) corriendo en paralelo.
- **Decisión humana requerida**: definir si `develop` quiere (a) traer el dual-routing tal cual (más superficie, dos UIs para lo mismo), o (b) portar solo las páginas nuevas `master-data/*` y dejar las rutas viejas como están en `develop`. Esto impacta directamente el diseño de los PRs de feature-014 (master-data por entidad) y debe coordinarse con feature-006 (router.tsx es archivo MEZCLADO).
- **Riesgo si se trae a medias**: rutas que apuntan a un `Legacy*` no portado (o viceversa) → pantallas en blanco / 404 de chunk lazy. `router.tsx` debe portarse de forma consistente con el set de páginas que efectivamente se traiga.

---

## 4. Archivos compartidos / peligrosos (MEZCLADOS) — manejar con cuidado, no "discard"

Tocados por múltiples features; **no** descartar, pero **no** traer enteros de un solo PR:

- `ui/src/router.tsx` — mezcla feature-006 (shell) + 014 (master-data) + 010 (projects) + Legacy dual-routing + reportes. Es el nudo central de §2.1 y §3.
- `ui/src/main.tsx` — feature-006 (ThemeProvider, AppToaster, ConfirmDialogProvider) + 008 (TenantContext).
- `api/src/routes/index.ts`, `api/src/index.ts` — registran rutas BFF de actors/me/investors/managers (007/008/014).
- `package.json`, `ui/package.json`, `ui/yarn.lock`, (`package-lock.json` borrado) — feature-021. Atención: los bumps `go-jose`/`x/net` (BE) ya están DONE (#124), pero eso es BE; acá es lockfile FE.

**Veredicto**: traerlos por *cherry-pick parcial* (`git restore -p` / edición a mano) junto a su módulo, nunca como blob. Pregunta abierta: ¿se reconstruye `ui/yarn.lock` desde cero en `develop` o se trae el del SOURCE? (riesgo de drift de deps).

---

## 5. Dudosos menores / preguntas abiertas

- **`ui/src/api/generated/index.ts` + `generated/types.ts`** — cliente/typedefs **generados** (knip los implica; `scripts/generate-ai-types.mjs` está en knip.ignore). **Pregunta**: ¿se regeneran en `develop` desde el OpenAPI BE, o se commitean? Si son generados, no revisarlos a mano; regenerarlos tras portar el BE correspondiente. Va con feature-021/024.
- **`PR-92.md`** (raíz del repo) — nota de release "Nueva Versión Ponti" (352 archivos, +25.690/−164.534). Es documentación de la mega-merge original. **Pregunta**: ¿se quiere este `.md` en la raíz de `develop`? Probablemente mover a `docs/` (feature-024) o descartar. Baja prioridad.
- **`ui/CLAUDE.md`, `docs/RESPONSIVE_GUIDELINES.md`, `docs/audit/drawers/*.md`** — docs/guías. OK traer (feature-024) salvo los artefactos de §1.1.
- **`ui/knip.json`, `lefthook.yml`, `ui/scripts/lint-*.sh`, `api/eslint.config.js`** — tooling local (feature-021/022). Opcional; no rompen runtime. `lefthook` es opt-in.
- **Renames masivos `useXReducer.ts` → `xReducer.ts`** (R100/R091/R078/R055): customers, categories, dashboard, providers, reporting, stock, lots, login/useLocalStorage→authStorage. Son renames limpios (similaridad alta) pero tocan imports en muchos lados → portar el rename **completo** o ninguno, para no dejar imports rotos. No es dudoso en sí, pero es trampa de porteo parcial.
- **`useSupplyMovement/` → `useSupplyMovements/`** (carpeta renombrada + archivos nuevos): mismo cuidado; el viejo `useSupplyMovement/index.ts` se borra. Verificar que ningún import quede apuntando al singular.

---

## 6. YA PORTEADO (DONE) — NO re-portar

Confirmado contra `develop` (commits recientes incluyen estos PRs). **Excluir de cualquier paquete nuevo:**

| Feature / ítem | PR# | Estado | Nota de exclusión |
|----------------|-----|--------|-------------------|
| table-select-filters (FE, filtros de tabla) | **#104** | DONE | — |
| reports-dark-mode (FE) | **#105** | DONE | La limpieza de json-tags del **dominio BE** NO está porteada → eso va aparte en feature-027. |
| lot-metrics / `total_tons` (FE) | **#117** | DONE | — |
| lot-metrics / `total_tons` (BE) | **#121 / #124** | DONE | — |
| tentative-prices (FE+BE, "GetTentativePrices") | **#121 / #124** | DONE | **Excluir de feature-018** (data-integrity-admin): la parte tentative-prices ya está. |
| dependency-bumps (`go-jose/v4`, `x/net`) (BE) | **#124** | DONE | **Excluir de feature-021** (build-and-deploy-config): los bumps de deps BE ya están. |

Referencia en `develop` (HEAD actual): `003a9b8f` (merge #124), `d0b57aed` GetTentativePrices, `b43537b9` total_tons, `2c10dd50` ci prefetch platform, `3de0b453` go-jose/x/net bump.

---

## 7. DISCARD explícitos (fuera de este repo FE, mencionados por completitud)

Estos pertenecen al universo BE / local del análisis cross-repo y **no deben portarse**:

- **`reviewproxy` (BE)** — utilitario/experimento de BE. No vive en este monorepo FE; si aparece en el set de extracción del repo `core`/`platform`, **DISCARD**.
- **PDFs** — cualquier `.pdf` de artefactos/reportes. No presentes en este diff FE. DISCARD si aparecen.
- **`.claude` local** — configuración/memoria local de la herramienta. DISCARD; jamás versionar a `develop`.

---

## 8. Riesgos de traer esto a `develop`

1. **Frozen reference en producción (§2.1)**: si se portan los `master-data/entities` sin resolver los `.reference.tsx`, `develop` queda con un componente de debugging montado en una ruta real. **Alto** — resolver antes de mergear feature-014/010.
2. **Dual-routing inconsistente (§3)**: portar `router.tsx` parcial deja rutas → chunks lazy inexistentes (pantalla en blanco). **Alto** — `router.tsx` es MEZCLADO; portar coherente con el set de páginas.
3. **Confundir `reportV2/` con código muerto (§2.2)**: borrar lo vigente. **Medio** — `reportV2/*` se queda; lo que muere son los reportes no-V2.
4. **Artefactos re-versionados (§1.1/§1.2)**: traer borrados sin las reglas de gitignore → `.vite-smoke/deps` y `before/*.failed.png` reaparecen. **Bajo** — agregar gitignore al portear.
5. **Renames a medias (§5)**: imports rotos si se trae el rename de reducers / `useSupplyMovements` parcialmente. **Medio** — portar rename completo.
6. **Lockfile drift (§4)**: `ui/yarn.lock` del SOURCE vs `develop`. **Medio** — decidir regenerar vs traer; correr `yarn install` y `yarn build` post-merge.
7. **Re-porteo de DONE (§6)**: duplicar #104/#105/#117/#121/#124 genera conflictos. **Bajo si se respeta esta lista**.
