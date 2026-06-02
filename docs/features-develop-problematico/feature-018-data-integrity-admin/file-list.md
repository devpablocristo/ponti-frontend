# file-list.md — feature-018 (FE)

Fuente autoritativa: `/tmp/flists/fe-018.txt`. Total: 6 paths, todos bajo
`ui/src/hooks/useDatabase/projects/`. STATUS: A=created, M=modified.

> NOTA: ninguno de estos archivos es de la página data-integrity. Son el refactor
> del hook `useProjects`. Ver `spec.md` para el desajuste de alcance.

## Propios (refactor de useDatabase/projects)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/hooks/useDatabase/projects/index.ts` | M | hook compositor | reescrito: compone queries+mutations vía useMemo, API público intacto | whole-file | reescritura total (441→62 líneas), no es un hunk parcial | medio | alta |
| `ui/src/hooks/useDatabase/projects/queries.ts` | A | service factory | `createProjectQueries`: get/getArchived/getDropdown/getProject | whole-file | archivo nuevo | bajo | alta |
| `ui/src/hooks/useDatabase/projects/mutations.ts` | A | service factory | `createProjectMutations`: save/update/delete(archive)/restore/hardDelete | whole-file | archivo nuevo | bajo | alta |
| `ui/src/hooks/useDatabase/projects/index.test.ts` | A | test (vitest) | cobertura del hook + traducciones de error | whole-file | archivo nuevo de test | bajo | alta |
| `ui/src/hooks/useDatabase/projects/projectReducer.ts` | M | reducer | exporta `ProjectAction`; blinda SET_PROJECTS/DROPDOWN contra no-arrays | partial-hunks | cambio chico (6 líneas); puede convivir con cambios de projects en develop | medio | media |
| `ui/src/hooks/useDatabase/projects/types.ts` | M | tipos | agrega `actor_id?`/`archived_at?` a investors/Data/Field/Plot | partial-hunks | aditivo; puede colisionar con cambios de tipos en develop por actores/projects | medio | media |

## Compartidos (partial-hunks)

`projectReducer.ts` y `types.ts` son los candidatos a partial-hunks: son archivos
que también evolucionan en feature-010 (projects) y feature-007/008 (actores/tenancy:
`actor_id`, `archived_at`). No son archivos "globales" de routing/bootstrap, pero su
diff sirve a varias intenciones (refactor + alineación de tipos con tenancy). Si al
portear `develop` ya los cambió, extraer **solo los hunks** de esta feature.

No hay en esta flist archivos globales compartidos del repo
(`ui/src/router.tsx`, `ui/src/main.tsx`, `api/src/routes/index.ts`, `api/src/index.ts`,
`package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`).

## Requeridos por dependencia (NO están en esta flist — traer desde otra feature)

| path | dónde vive | por qué se necesita |
|---|---|---|
| `ui/src/lib/format/*` (formatError, translateBackendError, index) | **fe-006** | `queries.ts`/`mutations.ts` importan `formatError` de `@/lib/format`; el test depende de las traducciones | 
| `ui/src/hooks/useDatabase/projects/actions.ts` | ya en `develop` | symbols de acciones usados por queries/mutations/reducer (no requiere cambio) |

## Dudosos

| path | duda | cómo resolver |
|---|---|---|
| `types.ts` (campos `actor_id`/`archived_at`) | ¿pertenecen a fe-018 o a fe-007/008 (actores/tenancy)? | revisar si develop ya los tiene vía actores; si sí, omitir esos hunks |

## NO traer todavía

- Nada de `pages/admin/master-data/data-integrity/*` (eso es **fe-014**).
- Nada de `api/src/routes/data-integrity.ts` (ya en develop).
- Nada de tentative-prices (DONE #121/#124).
