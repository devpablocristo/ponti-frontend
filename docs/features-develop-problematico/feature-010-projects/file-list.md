# file-list.md — feature-010 projects (FE / repo web)

Flist autoritativo: `/tmp/flists/fe-010.txt` (6 entradas). SOURCE = `3ffcf60` (develop-problematico~1).
Estado verificado contra `develop` (tip `8c25e88`).

Leyenda extracción: `whole-file` | `partial-hunks` | `manual-port` | `do-not-extract-yet`.

## Propios (módulo `ui/src/pages/admin/projects/`)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/pages/admin/projects/ProjectEditor.tsx` | A | componente React (2083 líneas) | Editor de proyectos operativo (default export `ProjectEditor`, `ProjectEditorProps`) | whole-file | nuevo en develop; pieza central | ALTO — importa ~9 archivos de 014/007/009 que faltan en develop; no compila aislado | alta |
| `ui/src/pages/admin/projects/projectEditorScope.ts` | A | módulo TS puro | Lógica de scope/filtrado de dropdowns (`buildProjectEditorScope`, `filterProjectEditorOptions`, etc.) | whole-file | nuevo; importa solo tipos de `master-data/customers/types` + `entityNameMatcher` + `Project` | MEDIO — depende de `entityNameMatcher` (014) y de campos `actor_id`/`archived_at` en `Project` (007/009) | alta |
| `ui/src/pages/admin/projects/ProjectEditor.test.tsx` | A | test (vitest + testing-library, 355 líneas) | Tests de UI del editor | whole-file | acompaña al componente | MEDIO — mockea `@/api/client`, `notify`, `useSelection`; falla si el componente no compila | alta |
| `ui/src/pages/admin/projects/projectEditorScope.test.ts` | A | test unitario (vitest) | Tests de scope/filtrado y fuzzy | whole-file | acompaña a scope; usa `fuzzySearchOptions` real | MEDIO — importa `lib/fuzzySearch` (014) | alta |
| `ui/src/pages/admin/projects/SPEC.md` | A | doc SDD | Spec del módulo (gobierna `/admin/projects/new`) | whole-file | doc; sin impacto de compilación | BAJO | alta |

## Compartidos (partial-hunks)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `api/src/routes/projects.ts` | M | ruta BFF (Express) | Cache bypass + verbo archive/restore + forwardQuery + fix `/hard` | partial-hunks | el archivo existe en develop; solo traer los hunks de esta feature; NO el resto | ALTO — importa `buildForwardQuery` de `api/src/utils/forwardQuery.ts` (ausente en develop, NO en flist) | alta |

Hunks concretos a portar en `projects.ts` (diff `fefbe695..3ffcf60`):
- `+import { buildForwardQuery } from "../utils/forwardQuery";`
- helpers nuevos `isTruthyQueryValue` + `shouldBypassProjectCache(req)`.
- `GET /` : quitar `setImmediate(...)` alrededor de `cache.set` (set directo).
- `GET /archived` + `GET /customers/archived` : agregar `const query = buildForwardQuery(req)` y sufijo `${query}`.
- `GET /:id` : `bypassCache` -> condicionar lectura y escritura de cache.
- `POST /`, `PUT /:id`, `DELETE labors/:id`, `DELETE /:id` : `cache.flushAll()` directo (sin `setImmediate`).
- `PUT /:id/archive` -> `POST /:id/archive`.
- `PUT /:id/restore` -> `POST /:id/restore`.
- `DELETE /:id/hard` : backend `/projects/${id}/hard` (antes `/projects/${id}`); `cache.flushAll()` directo.
- subrecursos `dollar-values` / `labors` / `commercializations` : `cache.set/flushAll` directo (sin `setImmediate`).

## Requeridos por dependencia (NO en flist 010 — traer vía sus features)

| path | feature dueña | extracción aquí | motivo | riesgo | confianza |
|---|---|---|---|---|---|
| `api/src/utils/forwardQuery.ts` | 009 (archive surface) o 013 (csv-export) | do-not-extract-yet aquí / coordinar | `projects.ts` lo importa; ausente en develop; sin él `api/` no compila | ALTO | alta |
| `ui/src/pages/admin/master-data/customers/types.ts` | 014 | do-not-extract-yet | `ProjectEditor`+scope importan `ActorOption`, `EntityOption`, `SelectionValue`, etc. | ALTO | alta |
| `ui/src/pages/admin/master-data/customers/helpers.ts` | 014 | do-not-extract-yet | `createEmptyProject`, `normalizeProject`, regex, `NEW_VALUE`, etc. | ALTO | alta |
| `ui/src/pages/admin/master-data/customers/customerEditorValidation.ts` | 014 | do-not-extract-yet | `buildProjectPayloadForSave`, `validate*`, `ProjectNameOption` | ALTO | alta |
| `ui/src/pages/admin/master-data/customers/_components/EditableList.tsx` | 014 | do-not-extract-yet | `AddButton`, `EditableList`, `RemoveButton` | ALTO | alta |
| `ui/src/components/SmartEntityInput/SmartEntityInput.tsx` | 014 | do-not-extract-yet | selector relacional usado por todos los dropdowns | ALTO | alta |
| `ui/src/lib/fuzzySearch.ts` | 014 | do-not-extract-yet | `fuzzySearchOptions` (usado por scope.test) | ALTO | alta |
| `ui/src/lib/entityNameMatcher.ts` | 014 | do-not-extract-yet | `normalizeEntityName` (usado por scope) | ALTO | alta |
| `ui/src/lib/lifecycle/filterActive.ts` | 009 (archive) | do-not-extract-yet | `filterActive` (usado por ProjectEditor) | MEDIO | alta |
| `ui/src/hooks/useDatabase/projects/types.ts` | 007/009 | do-not-extract-yet | en develop le faltan `actor_id?`/`archived_at?` que scope espera | MEDIO | alta |

## Dudosos

| path | observación | recomendación | confianza |
|---|---|---|---|
| `ui/src/router.tsx` | NO está en flist 010. En SOURCE `/admin/projects/new` apunta a `CustomersList projectsOnly`, no a `ProjectEditor` directo | lo trae 014/wiring; no tocar desde 010 | media |
| `api/src/utils/forwardQuery.ts` | el flist 010 no lo lista pero `projects.ts` lo importa | ver sección "Requeridos por dependencia"; coordinar con 009/013 | alta |

## NO traer todavía (DONE / fuera)

| path / concepto | motivo |
|---|---|
| Cambios de lot-metrics / total_tons / tentative-prices en `projects.ts` u otros | YA PORTEADO (#117/#121/#124); NO re-extraer; al hacer partial-hunks de `projects.ts` evitar pisar esos hunks |
| Limpieza de json-tags de dominio BE | va en feature-027, no aquí |
