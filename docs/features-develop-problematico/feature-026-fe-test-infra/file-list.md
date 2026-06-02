# file-list.md — feature-026 · fe-test-infra

Rango: `fefbe695..3ffcf60` (SOURCE = `develop-problematico~1`). Total paths en flist: **59**
(5 `api/`, 44 `ui/.vite-smoke/deps`, 10 `ui/e2e`).

Leyenda extracción: `whole-file` / `partial-hunks` / `manual-port` / `do-not-extract-yet`.

---

## Propios (núcleo real de la feature: tests e2e nuevos)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/e2e/actors-archive-crudar.spec.ts` | A | e2e spec | test archive/crudar de actores | whole-file → do-not-extract-yet hasta 007/009 | depende de UI de actores+archive | medio | media |
| `ui/e2e/customer-editor-canonical.spec.ts` | A | e2e spec | editor canónico de customer | whole-file → do-not-extract-yet hasta 010/014 | depende de CustomerEditor | medio | media |
| `ui/e2e/customer-editor-identity.spec.ts` | A | e2e spec | editor + identity/actores (287 ln) | whole-file → do-not-extract-yet hasta 008/010 | depende de identity-tenant + projects | alto | media |
| `ui/e2e/customer-editor-responsive.spec.ts` | A | e2e spec | layout responsive del editor | whole-file → do-not-extract-yet hasta 006/010 | depende de design-system + editor | medio | media |
| `ui/e2e/customer-editor-smart-entity.spec.ts` | A | e2e spec | smart-entity (autocompletar actor) | whole-file → do-not-extract-yet hasta 007/008 | depende de actores+identity | alto | media |
| `ui/e2e/drawer-audit.spec.ts` | A | e2e spec | auditoría visual de drawers (249 ln) | whole-file → do-not-extract-yet hasta 018 | escribe a `docs/audit/drawers/$phase`; depende de drawers | medio | media |
| `ui/e2e/project-responsibles-admin-drawer.spec.ts` | A | e2e spec | drawer responsables/inversores (308 ln) | whole-file → do-not-extract-yet hasta 010/018 | depende de projects + admin drawers | alto | media |

> Estos 7 specs son "propios" de la feature de test infra, pero su valor depende de que el código de producción que ejercitan ya esté en `develop`. Por eso se marcan whole-file con gate de dependencia.

## Compartidos (partial-hunks — sirven a varias intenciones/features)

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/e2e/helpers/auth.ts` | M | e2e helper COMPARTIDO | sesión autenticada para TODOS los specs | partial-hunks | hunk multitenant (`tenant_id`, `/me/context`) es de 008; cambio de workspace 17/30→14/29 es propio de test infra; daño de whitespace | **alto** | media |
| `api/src/mocks/handlers.ts` | M | mock MSW COMPARTIDO | mock data del BFF para varios dominios | partial-hunks | hunk que quita login/JWT (`jsonwebtoken`, `generateToken`, `MOCK_USER`) es de 008 (auth movido a middleware); reindent masivo arrastra ruido | medio | media |
| `api/test/lotsRoute.test.js` | M | unit BFF COMPARTIDO | valida contrato lots+cache | partial-hunks | añade customer_id/campaign_id+`buildForwardQuery` (011) y reordena params (lot-metrics DONE) | medio | media |
| `api/test/workOrdersRoute.test.js` | M | unit BFF COMPARTIDO | valida scope/cache work-orders | partial-hunks | scope con customer/campaign (008/011); cambia semántica `hasWorkOrderScope` | medio | media |

## Requeridos por dependencia (no se traen acá; deben existir antes en develop)

| path (NO en flist) | feature dueña | por qué lo necesita 026 |
|---|---|---|
| `api/src/configService.ts` → `api/dist/configService.js` | 008/005 | `configService.test.js` hace `require("../dist/configService")` |
| `api/src/routes/authMiddleware.ts` → `dist/routes/authMiddleware.js` | 008 | `authMiddleware.test.js` importa `decodeTokenPayload` |
| `api/src/utils/forwardQuery.ts` → `dist/utils/forwardQuery.js` | 011 | `lotsRoute.test.js` importa `buildForwardQuery` |
| `api/src/utils/queryParams.ts` (customer/campaign) | 011 | nuevos asserts de `parseFieldProjectQueryParams` |
| `ui/src/**` CustomerEditor / drawers / actores stores | 007/010/014/018 | selectores y rutas de los specs e2e |
| `ui/package.json` (scripts test/test:e2e), `ui/playwright.config.ts`, `api/package.json` (`node --test`) | 020/022 (tooling) | runners; cambian en el rango pero NO en este flist |

## Dudosos

| path | status | duda | recomendación |
|---|---|---|---|
| `ui/e2e/drawer-audit.spec.ts` | A | escribe archivos PNG/JSON a `../docs/audit/drawers/$phase`; ¿es test o herramienta de auditoría one-off? | traer, pero NO bloquear CI con él (puede saltarse si no hay UI); confianza media |
| `api/src/mocks/handlers.ts` | M | el reindent (último hunk `\ No newline at end of file`) puede tapar cambios reales | revisar hunk por hunk con `git restore -p` |

## NO traer todavía (artefactos / cleanup separable)

| path | status | tipo | extracción | motivo |
|---|---|---|---|---|
| `ui/.vite-smoke/deps/_metadata.json` y los **43** `ui/.vite-smoke/deps/*.js` + `*.js.map` + `package.json` | D | artefacto build (cache optimize-deps Vite) | **whole-file (borrado) — subfeature 026a, sin gate** | basura versionada; ya ignorada por `ui/eslint.config.js`. El borrado es correcto y NO depende de ninguna feature. Es lo único 100% seguro de portar ya. |

### Detalle de los 44 `.vite-smoke/deps` borrados (todos status D)

`_metadata.json`, `package.json`, `axios.js(.map)`, `chunk-7KIVJFBE.js(.map)`, `chunk-DC5AMYBS.js(.map)`, `chunk-MX6SYE36.js(.map)`, `chunk-SITVF2AJ.js(.map)`, `chunk-YLDSBLSF.js(.map)`, `flowbite.js(.map)`, `html2canvas.esm-VCVW5XKW.js(.map)`, `index.es-WFZLP7RR.js(.map)`, `jwt-decode.js(.map)`, `lucide-react.js(.map)`, `purify.es-WBKO7BOE.js(.map)`, `react-dom.js(.map)`, `react-dom_client.js(.map)`, `react-router-dom.js(.map)`, `react-to-pdf.js(.map)`, `react.js(.map)`, `react_jsx-dev-runtime.js(.map)`, `react_jsx-runtime.js(.map)`, `sonner.js(.map)`, `xlsx.js(.map)`.

> Confirmado: están **trackeados** en destino (`8c25e88`) y NO mencionados en `ui/vite.config.ts` (que usa `cacheDir: ".vite"`, no `.vite-smoke`). Solo aparecen en `ui/eslint.config.js` ignores.

## Inventario adicional (completitud) — artefactos generados

Para cobertura 100% se completan los **23** paths restantes del flist (`/tmp/flists/missing-fe-026.txt`). Se clasifican AGRUPADOS por patrón de directorio, no uno por uno: son sourcemaps de build regenerables más dos specs ya cubiertos arriba.

| patrón / path | status | conteo | tipo | extracción | motivo | confianza |
|---|---|---|---|---|---|---|
| `ui/.vite-smoke/deps/*.js.map` (sourcemaps del cache optimize-deps de Vite) | D | **21** | artefacto build/auditoría | **do-not-extract-yet** | artefacto de build/auditoría regenerable; no portar; agregar a `.gitignore` si corresponde | alta |
| `ui/e2e/lots.spec.ts`, `ui/e2e/workorders-stock.spec.ts` (specs e2e ya descritos en secciones previas) | M | **2** | e2e spec | **do-not-extract-yet** | artefacto de build/auditoría regenerable; no portar; agregar a `.gitignore` si corresponde | alta |

Los **21** sourcemaps son las compañías `.js.map` de los `.js` ya listados en la sección "NO traer todavía". Ejemplos representativos: `ui/.vite-smoke/deps/react.js.map`, `ui/.vite-smoke/deps/react-dom.js.map`, `ui/.vite-smoke/deps/axios.js.map`; el resto (`chunk-*.js.map`, `flowbite.js.map`, `lucide-react.js.map`, `xlsx.js.map`, etc.) sigue el mismo patrón bajo `ui/.vite-smoke/deps/`. Total cubierto en esta sección: **23** (21 sourcemaps + 2 specs), con lo que el flist queda al **100%**.
