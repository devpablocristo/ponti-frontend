# spec.md — feature-018 · data-integrity-admin (FE)

> ADVERTENCIA DE ALCANCE (leer primero)
> El nombre de la feature es "Data-integrity admin", pero la **flist autoritativa
> `/tmp/flists/fe-018.txt`** NO contiene ningún archivo de la página de data-integrity.
> Contiene exclusivamente un **refactor del hook `useDatabase/projects`** (split de
> `index.ts` en `queries.ts` + `mutations.ts`, defensa de arrays en el reducer y
> nuevos campos `actor_id`/`archived_at` en los tipos de Project).
>
> La verdadera UI de data-integrity (`Integrity.tsx`, `integrityUtils.ts`,
> `integrityUtils.test.ts`) está asignada a **`fe-014.txt`**, y la ruta BFF
> `api/src/routes/data-integrity.ts` **ya está en `develop`**. El BE de la feature
> (`internal/data-integrity/*`) está en **`be-018.txt`**.
>
> Este paquete documenta **lo que dice la flist** (el refactor de projects), y deja
> constancia explícita del desajuste para el agente humano/orquestador.

## Identificación

| Campo | Valor |
|---|---|
| id | feature-018 |
| nombre | Data-integrity admin |
| slug | data-integrity-admin |
| tipo | feature |
| merge | coordinado |
| repo | Frontend monorepo (`ui/` React + `api/` BFF Node) — `/home/pablocristo/Proyectos/pablo/ponti/web` |
| existe en FE | Sí (flist asignada: refactor de `useDatabase/projects`) |
| existe en BE | Sí (real data-integrity: `internal/data-integrity/*`, ver `be-018.txt`) |
| SOURCE de extracción | `develop-problematico~1` = SHA `3ffcf60` |
| rama destino | `develop` (tip `8c25e88`) |
| rango diff fuente-de-verdad | `fefbe695..3ffcf60` |

## Resumen

La flist `fe-018.txt` corresponde a un refactor del hook React `useProjects`
(`ui/src/hooks/useDatabase/projects/`). El `index.ts` monolítico (~441 líneas con
toda la lógica de fetch/save/update/delete inline) se parte en dos factories:

- `queries.ts` → `createProjectQueries({dispatch})`: `getProjects`,
  `getArchivedProjects`, `getProjectsDropdown`, `getProject`.
- `mutations.ts` → `createProjectMutations({dispatch})`: `saveProject`,
  `updateProject`, `deleteProject` (archive), `restoreProject`, `hardDeleteProject`.

El nuevo `index.ts` (~62 líneas) solo compone ambas factories vía `useMemo` y expone
el **mismo API público** que antes. Se agrega `index.test.ts` (vitest) que cubre el
contrato. El reducer ahora exporta el tipo `ProjectAction` y blinda `SET_PROJECTS` /
`SET_PROJECTS_DROPDOWN` contra payloads no-array. `types.ts` agrega campos opcionales
`actor_id` y `archived_at` a `Project.investors`, `admin_cost_investors`, `Data`,
`Field`, `Field.investors` y `Plot`.

El cambio funcional más relevante es que los services ahora usan **`formatError`
de `@/lib/format`** (con `translateBackendError`) en lugar del viejo
`extractErrorMessage`/`extractErrorStatus`. El test verifica traducciones al español:
`"project already exists"` → `"Ya existe un proyecto con ese nombre."` y
`"project not found or outdated"` → mensaje de optimistic-locking.

## Objetivo

- Reducir la complejidad del hook `useProjects` separando queries de mutations.
- Centralizar el manejo de errores en `formatError`/`translateBackendError`.
- Hacer el hook testeable y agregar cobertura (`index.test.ts`).
- Tolerar respuestas malformadas del BE (arrays no garantizados) en el reducer.
- Alinear los tipos del front con el modelo nuevo del BE (campos `actor_id`,
  `archived_at` que vienen del refactor de actores/tenancy/lifecycle).

## Problema

- `index.ts` era un archivo monolítico difícil de mantener y sin tests.
- El manejo de errores estaba hardcodeado por endpoint (códigos 409 inline), sin
  reutilizar la capa de traducción de errores del backend.
- Faltaba defensa ante payloads no-array (riesgo de `.map is not a function`).

## Alcance en este repo (FE)

Solo los 6 paths de `fe-018.txt`, todos bajo `ui/src/hooks/useDatabase/projects/`:
`index.ts` (M), `index.test.ts` (A), `mutations.ts` (A), `queries.ts` (A),
`projectReducer.ts` (M), `types.ts` (M). No toca `api/`.

## Alcance en el OTRO repo (BE — be-018.txt)

El backend de data-integrity (no es lo que extrae esta flist FE, pero es el
cross-repo de la feature):
`internal/data-integrity/handler.go`, `handler/dto/integrity_check.go`,
`usecases.go`, `usecases/domain/types.go`, `handler_test.go`,
`usecases_test.go`, `usecases_mock_test.go`, `usecases_tenant_test.go`.
Expone (vía BFF ya presente en develop) `GET data-integrity/costs-check?project_id=...`.

## Fuera de alcance

- **tentative-prices**: DONE en #121/#124. No tocar.
- La **página UI de data-integrity** (`pages/admin/master-data/data-integrity/*`):
  pertenece a **fe-014**, NO a fe-018.
- `@/lib/format` (formatError): pertenece a **fe-006** (prerrequisito, no se trae acá).
- Cualquier otro archivo de `useDatabase/*` que no sea `projects/`.

## Comportamiento esperado (del refactor)

- `useProjects()` devuelve exactamente las mismas claves que antes (API público
  intacto): estado `projects, totalHectares, projectsDropdown, pageInfo,
  projectsDropdownPagination, selectedProject, error, processing,
  processingDropdown, result` + acciones `getProjects, getArchivedProjects,
  getProjectsDropdown, getProject, saveProject, updateProject, deleteProject,
  restoreProject, hardDeleteProject`.
- Endpoints consumidos (sin cambio respecto del original): `GET /projects`,
  `GET /projects/archived`, `GET /projects/customers/:id`, `GET /projects/:id`,
  `POST /projects`, `PUT /projects/:id`, `POST /projects/:id/archive`,
  `POST /projects/:id/restore`, `DELETE /projects/:id/hard`.
- Errores traducidos por `formatError`.

## Estado en dp~1 (SHA 3ffcf60)

Completo y con tests. El refactor está cerrado: `index.ts` nuevo compila contra
`queries.ts`/`mutations.ts`, el test cubre save/update/archive/restore. No está
porteado a `develop` (4 de 6 archivos difieren o están ausentes en `develop`).

## Criterios de aceptación

- [ ] `yarn test` pasa `ui/src/hooks/useDatabase/projects/index.test.ts`.
- [ ] `yarn build` / `tsc` compila (requiere `@/lib/format` presente → fe-006 antes).
- [ ] Todos los consumidores de `useProjects` siguen funcionando (API público igual).
- [ ] Mensajes de error en español coinciden con los del test.

## Endpoints / modelos / UI / DB / tests afectados

- **Endpoints (consumidos, no definidos acá):** los 9 de `/projects` listados arriba.
- **Modelos/tipos:** `Project`, `Field`, `Plot`, `Data`, `ProjectPayload`,
  `ProjectDropdownPayload` (en `types.ts`); `ProjectAction` (ahora exportado).
- **UI:** ninguna directa. Indirectamente, todos los consumidores de `useProjects`
  (`useWorkspaceFilters.ts`, `pages/admin/customers/Customers.tsx`,
  `pages/admin/database/customers/*`, `pages/admin/master-data/actors/*`,
  `pages/admin/master-data/commerce/CommerceForm.tsx`, etc.).
- **DB / migraciones:** ninguna en FE.
- **Tests:** `index.test.ts` (nuevo, vitest).

## Dependencias

- **Intra-repo (FE):** `@/lib/format` (formatError + translateBackendError) →
  proviene de **fe-006**. HARD: sin esto no compila ni pasan los tests.
- **Cross-repo (BE):** los mensajes que `formatError` traduce
  (`"project already exists"`, `"project not found or outdated"`) los emite el BE de
  projects (feature-010 / crudar lifecycle). No es la data-integrity de be-018.
- **Cross-repo real de la feature-018:** `be-018.txt` (`internal/data-integrity/*`)
  — independiente de esta flist FE.

## Riesgos

- **Funcional:** si los strings que devuelve el BE cambian, las traducciones del
  test (y del usuario) se rompen silenciosamente. Confianza media.
- **Técnico:** dependencia dura de `@/lib/format` (fe-006). Si se portea esta flist
  sin fe-006, falla el build. Confianza alta.
- **De alcance/orquestación:** ALTA — la flist no coincide con el nombre de la
  feature. Riesgo de que el agente porte lo equivocado o duplique con fe-010/fe-014.

## DECISIÓN recomendada

**Arreglar antes / re-clasificar.** El contenido de esta flist es un refactor de
`useDatabase/projects` (territorio de projects, feature-010), no la data-integrity
admin. Recomendación:
1. Confirmar con el orquestador si estos 6 archivos deben moverse a **fe-010**
   (projects) y dejar fe-018-FE vacía/apuntando a fe-014 para la UI.
2. Si se mantiene tal cual, **extraer enteros** los 6 archivos, pero **solo después
   de fe-006** (dependencia de `@/lib/format`).
3. La data-integrity UI real se extrae en fe-014; el BE en be-018.
