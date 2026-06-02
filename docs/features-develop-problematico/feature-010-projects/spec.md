# spec.md — feature-010 projects (FE / repo web)

## Identidad

- **id:** feature-010
- **slug:** projects
- **nombre:** Projects feature ("Editor de Proyectos")
- **tipo:** feature
- **repo:** Frontend monorepo `web` (`ui/` React + `api/` BFF NodeJS, yarn) — path `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE:** SÍ (este paquete) — `ui/src/pages/admin/projects/*`
- **existe-en-BE:** SÍ (cross-repo, mismo `feature-010` en el repo `core/platform`) — bridge de entidades project-archive + scope/creator
- **merge:** BE-first, luego FE
- **SOURCE de extracción:** `develop-problematico~1` (SHA `3ffcf60`). NUNCA usar `develop-problematico` (su tip es un restore/vacío).
- **rama destino:** `develop` (tip `8c25e88`)
- **rango fuente-de-verdad (diff):** `fefbe695..3ffcf60`

## Resumen

Introduce el **Editor de Proyectos** operativo en `/admin/projects/new`: una pantalla
selection-only que configura un proyecto EXISTENTE (cliente -> proyecto -> campaña) y
edita valores/asignaciones operativas (responsables, inversores, costo administrativo,
campos, arrendatarios, lotes, cultivos). NO crea entidades de catálogo (eso vive en
`/admin/master-data/entities`).

El componente `ProjectEditor.tsx` es la pieza central: es la evolución del antiguo
`CustomerEditor` en "modo proyecto", parametrizado con banderas (`selectionOnlyRelations`,
`createNewProject`, `contextProject`, `projectNameScope`, etc.). El archivo
`projectEditorScope.ts` aporta la lógica pura de scoping/filtrado que acota los dropdowns
al contexto (cliente+campaña o proyecto) y evita el fallback global.

En el lado BFF (`api/src/routes/projects.ts`) hay cambios de **cache** (bypass por
`?fresh=1` / `?no_cache` / headers `no-cache`, y eliminación de `setImmediate`), de
**verbo HTTP** (archive/restore pasan de `PUT` a `POST`), de **forwarding de query** a
`/projects/archived` y `/customers/archived`, y fix de `/:id/hard` (ahora llama
`/projects/:id/hard` en el backend en vez de `/projects/:id`).

## Objetivo

- Separar el flujo operativo de proyecto (selección + valores) de la administración de
  catálogo de entidades.
- Garantizar que `/admin/projects/new` use `PUT /projects/:id` y nunca `POST /projects`.
- Acotar todos los selectores relacionales al contexto del proyecto/cliente+campaña,
  con búsqueda fuzzy/trigrama aplicada DESPUÉS del filtro de contexto (no revelar
  opciones fuera de scope).

## Problema que resuelve

El editor previo (`CustomerEditor`) mezclaba creación de catálogo con configuración
operativa, y los dropdowns mostraban opciones globales fuera del contexto del proyecto.
Eso permitía crear entidades por accidente y elegir actores/campos/lotes que no
pertenecían al proyecto.

## Alcance en ESTE repo (web / FE+BFF)

Archivos propios (5 nuevos):
- `ui/src/pages/admin/projects/ProjectEditor.tsx` (2083 líneas) — componente editor.
- `ui/src/pages/admin/projects/projectEditorScope.ts` — lógica pura de scope/filtrado.
- `ui/src/pages/admin/projects/ProjectEditor.test.tsx` (355 líneas) — tests de UI (vitest + testing-library).
- `ui/src/pages/admin/projects/projectEditorScope.test.ts` — tests unitarios de scope.
- `ui/src/pages/admin/projects/SPEC.md` — spec SDD del módulo (cosechado abajo).

Archivo compartido (1 modificado, partial-hunks):
- `api/src/routes/projects.ts` — solo los hunks de cache/verbo/forwardQuery/`/hard`.

## Alcance en el OTRO repo (core/platform / BE)

Según la nota de la feature: "BE project-archive-entidades-bridge + scope/creator".
El BE expone los endpoints que el BFF consume:
- `GET /projects`, `GET /projects/:id`, `GET /projects/archived`, `GET /customers/archived`
- `POST /projects`, `PUT /projects/:id`, `DELETE /projects/:id`, `DELETE /projects/:id/hard`
- `POST /projects/:id/archive`, `POST /projects/:id/restore` (el backend SIEMPRE recibió POST;
  el cambio en el BFF es solo el verbo expuesto al UI).
- subrecursos: `/projects/:id/dollar-values`, `/projects/:id/labors`, `/projects/:id/commercializations`.

La parte de "scope/creator" y "archive bridge" del BE debe estar mergeada ANTES (BE-first)
para que el filtrado por contexto y el bypass de cache tengan respaldo real.

## Fuera de alcance

- Creación/edición/archivado/restauración de entidades de catálogo (vive en feature-014
  fe-master-data-pages, `/admin/master-data/entities`).
- `router.tsx`, `main.tsx`, `api/src/routes/index.ts` (registries/bootstrap) — NO están en
  el flist de esta feature; los toca feature-014 / wiring general.
- `api/src/utils/forwardQuery.ts` — dependencia IMPORTADA por `projects.ts` pero NO incluida
  en el flist (ver dependencies.md; probablemente pertenece a 009/013).

## Comportamiento esperado (del SPEC.md del módulo)

- `/admin/projects/new` solo selecciona entidades existentes; prohibido crear clientes,
  proyectos, campañas, responsables, inversores, arrendatarios, campos, lotes, cultivos.
- Flujo base: Cliente/Sociedad -> Proyecto existente del cliente -> Campaña. Sin los tres
  no se abre la configuración operativa.
- Guardar usa `PUT /projects/:id`; nunca `POST /projects` en selection-only.
- Todo selector relacional usa `SmartEntityInput` con `fuzzySearchOptions`.
- Scope construido por `buildProjectEditorScope` (customerId, projectId, campaignId,
  projectName, hasConcreteScope). Con `projectId` no se muestran opciones fuera del proyecto;
  con `customerId+campaignId` (sin projectId) no se muestran opciones fuera de ese cliente/campaña;
  sin fallback global cuando hay scope concreto. Actores filtrados además por rol.

## Estado en dp~1 (3ffcf60)

- FE: módulo `projects/` COMPLETO y con tests (UI + unit). Implementación madura.
- BFF: `projects.ts` con los hunks descritos. Funcional PERO importa `buildForwardQuery`
  de `api/src/utils/forwardQuery.ts`, que NO existe en `develop` y NO está en el flist.

## Criterios de aceptación

1. `/admin/projects/new` no muestra botones `Administrar` ni flujos de creación de entidades.
2. Dropdown de clientes muestra todos los clientes activos; solo se puede elegir uno existente.
3. Dropdown de proyectos se limita al cliente elegido; no permite escribir/crear uno nuevo.
4. Guardar en `/admin/projects/new` invoca `PUT /projects/:id`, no `POST /projects`.
5. Responsables/inversores/campos/lotes/cultivos se acotan al proyecto o cliente+campaña.
6. La búsqueda fuzzy encuentra opciones dentro del contexto y NO revela opciones fuera.
7. No hay fallback global cuando existe scope concreto.
8. `yarn test` verde para `ProjectEditor.test.tsx` y `projectEditorScope.test.ts`.
9. `ui/` y `api/` compilan (type-check + build).

## Endpoints / modelos / UI / DB / tests afectados

- **Endpoints BFF (en `api/src/routes/projects.ts`):**
  - `GET /projects` (cache 5min, sin `setImmediate`).
  - `GET /projects/:id` (bypass cache por `?fresh=1`/`?no_cache`/`Cache-Control: no-cache`/`Pragma: no-cache`).
  - `GET /projects/archived` y `GET /customers/archived` (con `buildForwardQuery(req)` reenviando query+paginación default page=1/per_page=1000).
  - `POST /projects/:id/archive`, `POST /projects/:id/restore` (antes `PUT`).
  - `DELETE /projects/:id/hard` -> backend `/projects/:id/hard` (antes `/projects/:id`).
- **Modelos/tipos FE:** `Project` (`ui/src/hooks/useDatabase/projects/types.ts`) — usado por
  scope; en el rango ganó `actor_id?` y `archived_at?` (cambio que pertenece a 007/009, NO al flist 010).
  Tipos consumidos de `master-data/customers/types`: `ActorOption`, `EntityOption`,
  `SelectionValue`, `ProjectDetailResponse`, `ProjectListResponse`, `FieldPayload`, etc.
- **UI/componentes/hooks:** `ProjectEditor` (default export), props `ProjectEditorProps`;
  funciones de scope exportadas: `buildProjectEditorScope`, `filterProjectEditorOptions`,
  `collectTenantReferences`, `filterScopedFieldOptions`, `filterScopedLotOptions`,
  `collectScopedCropOptions`. Consume `SmartEntityInput`, `EditableList`/`AddButton`/`RemoveButton`,
  `customerEditorValidation`, `helpers` (de `master-data/customers/`), `fuzzySearch`, `entityNameMatcher`, `filterActive`, `useSelection`.
- **DB / migraciones:** ninguna en este repo (FE no tiene migraciones). Las migraciones de
  archive/scope viven en el repo BE.
- **Tests:** `ProjectEditor.test.tsx`, `projectEditorScope.test.ts`.

## Dependencias

- **Intra-repo (FE):** depende de feature-014 (fe-master-data-pages: `master-data/customers/*`,
  `SmartEntityInput`, `fuzzySearch`, `entityNameMatcher`, `filterActive`) y de feature-007
  (actor-system: `actor_id`/roles en tipos y opciones) y feature-009 (crudar-archive-surface:
  `archived_at`, endpoints archive/restore). Sin ellas, `ProjectEditor.tsx` NO compila.
- **Cross-repo (BE):** depende del paquete feature-010 del BE (project-archive-entidades-bridge
  + scope/creator) y de 009 (archive surface). BE-first.
- **Dependencia oculta:** `api/src/utils/forwardQuery.ts` (no en flist). Ver dependencies.md.

## Riesgos

- **Funcional:** si el BE no respeta el filtrado por contexto, los dropdowns pueden quedar
  vacíos o mostrar opciones fuera de scope.
- **Técnico (alto):** `ProjectEditor.tsx` no compila sin ~9 archivos de 014/007/009. Extraer
  010 FE en aislamiento rompe el build de `ui/`.
- **Técnico (BFF):** `projects.ts` importa `forwardQuery` ausente -> el build de `api/` rompe
  si no se trae también ese util.

## DECISIÓN recomendada

**Partir + arreglar antes (no extraer tal cual).**
- FE: extraer los 5 archivos del módulo `projects/` SOLO después de (o junto con) feature-014/007/009;
  por sí solos no compilan. Mantener orden: 007 -> 009 -> 014 -> 010(FE).
- BFF: extraer `projects.ts` por **partial-hunks**, e INCLUIR `api/src/utils/forwardQuery.ts`
  (whole-file) aunque no esté en el flist, o coordinar que lo traiga 009/013 antes. Sin ese
  util el BFF no compila.
- Cross-repo: BE-first (paquete BE feature-010 + 009) antes del FE.
