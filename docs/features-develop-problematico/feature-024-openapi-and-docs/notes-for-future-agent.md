# notes-for-future-agent.md — feature-024 · openapi-and-docs (FE)

## Resumen corto

Paquete (casi) 100% documentación del FRONTEND. 60 entradas en el flist: 58 nuevas (A) + 2 modificadas (M). Las 58 nuevas = 3 `.md` de contenido (`ui/CLAUDE.md`, `docs/RESPONSIVE_GUIDELINES.md`, `PR-92.md`) + 3 `.md` de auditoría (`docs/audit/drawers/{report,inventory,drawer-standard}.md`) + 45 PNG + 7 `.txt` de evidencia Playwright. CERO código en `ui/src`/`api/src`, deps, lockfiles o config. Es de las features más seguras de extraer: básicamente `git checkout 3ffcf60 -- <paths>`. El único cuidado real está en los 2 modificados (`README.md`, `ui/README.md`).

## Qué está en FE y qué en BE (full-stack feature-024)

- **FE (este paquete)**: `ui/CLAUDE.md` (guía onboarding FE), `docs/RESPONSIVE_GUIDELINES.md`, `PR-92.md` (changelog big-bang), `docs/audit/drawers/**` (visual regression de drawers: report/inventory/standard + before/after PNG + failure.txt).
- **BE (otro repo, mismo feature-024)**: `docs/OPENAPI.md` + `docs/openapi/{openapi,swagger}.{yaml,json}` (piloto 2 endpoints), `CLAUDE.md` (root BE), `CRUDAR_PLAN.md`, ERROR_CATALOG, OBSERVABILITY, crudar-lifecycle, archive-restore-policy, entity-capabilities, MULTI_TENANT_100_EVIDENCE, etc. Paquete en `/home/pablocristo/Proyectos/pablo/ponti/core/docs/features-develop-problematico/feature-024-openapi-and-docs/`.
- **No comparten archivos físicos.** El único vínculo es el contrato OpenAPI: BE produce `swagger.yaml`, FE lo consumiría con `yarn codegen:openapi` — pero ese codegen NO está en este flist FE.

## Archivos esenciales

- `ui/CLAUDE.md` (159 líneas): el doc más valioso. Explica por qué "Nuevo" significa cosas distintas en OT / Labores / Insumos / Stock, los catálogos, los tipos de `supply_movements` (`Remito oficial`/`Movimiento interno`/`Stock`/`Devolución`/`Consumo OT`), notify+dark-mode y las reglas de UX writing (voseo, verbos CRUDAR canónicos).
- `docs/RESPONSIVE_GUIDELINES.md`: contrato responsive (breakpoints xs..3xl, mobile-first, `ResponsiveTable`, z-index scale, patrones prohibidos lint-enforced, iOS Safari, touch).
- `docs/audit/drawers/report.md`: índice de la auditoría visual; linkea inventory/standard/before/after.

## Archivos peligrosos / mezclados

- `README.md` y `ui/README.md` (MODIFICADOS): sus hunks renombran deps `@devpablocristo/core-*`/`modules-*` → `platform-*`, `ponti-frontend`→`web`, y retiran `xlsx`→`read-excel-file`. **VERIFICADO**: develop tip (8c25e88) AÚN tiene los nombres viejos (`core-authn`, `ponti-frontend`, `xlsx`). Ese rename es de **feature-001 (platform-tenancy)** y **021 (build/deploy)**, NO de 024. NO traer estos hunks con 024; dejar el ownership a 001/021. La única parte "doc" propia es el copy OpenAPI/Axis-Companion (mínimo) — opcional vía `git restore -p`.
- `PR-92.md`: changelog del big-bang "Nueva Versión Ponti" (352 archivos). Describe features que en develop están parcialmente porteadas (lot-metrics, tentative-prices, table-select-filters, reports-dark-mode YA DONE) o aún no. NO leerlo como estado presente de develop; es histórico.
- `docs/audit/drawers/inventory.md`: describe el estado PRE-migración (drawers legacy con `<Drawer>` directo / `DrawerLayout`). Es el "antes", no obsolescencia.
- `before/*.failed.png` + `*.failure.txt`: artefactos de FALLA intencionales (escenarios que antes no abrían por filtros/selector). No son un error de la extracción.

## Decisiones ya tomadas

- 56 nuevos → whole-file / binario vía `git checkout 3ffcf60 -- <path>` (sin conflicto; no existen en develop — verificado).
- 2 modificados → `do-not-extract-yet` (omitir; ownership a 001/021).
- NO traer `ui/src/generated/ponti-ai.openapi.*` ni `ui/src/types/ai.ts` (referenciados en README pero son de 012, fuera del flist).
- 024-FE mergea INDEPENDIENTE; ninguna dep fuerte.
- Excluidos por ya estar DONE en develop y NO ser de 024: table-select-filters (#104), reports-dark-mode (#105), lot-metrics (#117/121/124), tentative-prices (#121/124). `PR-92.md` los menciona pero no los porta.

## Dudas abiertas (para humano)

1. ¿`README.md`/`ui/README.md` van con 024 o con 001/021? (recomendación: 001/021 dueños del rename; 024 los omite).
2. ¿Versionar los artefactos de FALLA (`before/*.failed.png` + 7 `*.failure.txt`) o podarlos? El report.md los cuenta como evidencia.
3. ¿`PR-92.md` debería vivir en `docs/history/` en vez de la raíz?
4. ¿Git LFS para los ~3.6 MB de PNG de auditoría?

## Qué comandos mirar primero

```bash
REPO=/home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-024.txt
git -C "$REPO" diff --name-status fefbe695..3ffcf60 -- README.md ui/README.md
git -C "$REPO" diff fefbe695..3ffcf60 -- README.md ui/README.md          # ver los 2 modificados (rename core→platform + xlsx)
git -C "$REPO" show 3ffcf60:ui/CLAUDE.md | head -60                       # confirmar guía
git -C "$REPO" show 3ffcf60:docs/audit/drawers/report.md | head -40       # confirmar auditoría
git -C "$REPO" ls-tree -r 3ffcf60 docs/audit/ | wc -l                     # esperado 55 objetos
# confirmar que develop AÚN tiene nombres viejos (=> no traer READMEs con 024):
git -C "$REPO" show 8c25e88:ui/README.md | grep -nE 'core-authn|ponti-frontend|xlsx'
```

## Errores a evitar

- NO copiar PNG a mano (corrompe). SIEMPRE `git checkout 3ffcf60 -- docs/audit/drawers/{before,after}/`.
- NO traer los hunks de rename de `README.md`/`ui/README.md` (son de 001/021; develop aún tiene nombres viejos).
- NO traer código de `ui/src`/`api/src`/lockfiles: NINGUNO está en el flist de 024-FE.
- NO usar `develop-problematico` (tip vacío). SOURCE = `3ffcf60` = `develop-problematico~1`.
- NO tratar `PR-92.md` ni `inventory.md` como estado actual de develop.

## Camino más seguro

1. `git checkout -b pr/feature-024-openapi-and-docs-fe` desde develop.
2. `git checkout 3ffcf60 -- ui/CLAUDE.md docs/RESPONSIVE_GUIDELINES.md PR-92.md`
3. `git checkout 3ffcf60 -- docs/audit/drawers/report.md docs/audit/drawers/inventory.md docs/audit/drawers/drawer-standard.md`
4. `git checkout 3ffcf60 -- docs/audit/drawers/after/ docs/audit/drawers/before/`
5. OMITIR `README.md` / `ui/README.md`.
6. Verificar `git diff 3ffcf60 -- ui/CLAUDE.md docs/RESPONSIVE_GUIDELINES.md PR-92.md docs/audit/` vacío + `git diff --check` limpio + `git status` solo docs.
7. PR a develop, etiquetando `PR-92.md` como changelog histórico.

## PR del otro repo: antes/después

- Para la parte OpenAPI: **BE-024 antes** (publica `swagger.yaml`) si alguna vez se agrega el `yarn codegen:openapi` al FE — pero hoy ese codegen no está en el flist FE, así que no hay bloqueo.
- Para la doc pura: orden libre, FE-024 y BE-024 son independientes.
- Coordinación única recomendada: que 001/021 (en cada repo) sean dueños del rename de READMEs; ambos paquetes 024 lo omiten.
