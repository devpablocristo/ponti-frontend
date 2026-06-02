# spec.md — feature-007 actor-system (FE)

## Identidad
- **id**: feature-007
- **slug**: actor-system
- **nombre**: Actor system ("Editor de Actores" / master-data Actores)
- **tipo**: feature
- **repo**: Frontend monorepo `ui/` (React) + `api/` (BFF NodeJS) — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE**: SÍ (este paquete)
- **existe-en-BE**: SÍ (feature-007 BE — mismo número, ver flist `be-007.txt`). FULL-STACK.
- **merge**: BE-first, luego FE.
- **SOURCE de extracción**: `develop-problematico~1` (SHA `3ffcf60`). Rango fuente-de-verdad del diff: `fefbe695..3ffcf60`.
- **Rama destino**: `develop` (tip `8c25e88`).

## Resumen
Sistema de "Actores" como entidad maestra unificada que reemplaza/agrupa el modelado legacy de Cliente, Inversor, Responsable, Arrendatario, Proveedor, Contratista y Facturador. Un actor es una persona física u organización con: nombre canónico/display, tipo (`actor_kind`), múltiples roles, perfil de persona u organización (mutuamente excluyentes), identificadores fiscales, aliases y notas. Soporta archivado/restore/hard-delete, detección de duplicados y merge.

En este repo la feature comprende:
- **BFF** `api/src/routes/actors.ts` — proxy REST hacia `/actors` del BE (manager API), con normalización de respuesta de lista, hidratación post-create/update y `cache.flushAll()`.
- **Hook FE** `ui/src/hooks/useActors/index.ts` — tipos del dominio (`Actor`, `ActorKind`, `ActorRole`, perfiles, identifiers, aliases, merge, duplicate-candidates) + servicio CRUD montado sobre `useEntityCrud`.
- **Componente** `ui/src/components/SmartEntityInput/SmartEntityInput.tsx` — input con autocompletar fuzzy + dropdown en portal, usado por el form de actores (y reutilizable por catálogos).
- **Página master-data** `ui/src/pages/admin/master-data/actors/*` — `ActorsList`, `ActorFormDrawer`, `ArchivedActors`/`ArchivedActorsByRole`, `DuplicateActors`, helpers (`actorContextFilters`, `actorCrudarRouting`, `constants`), `SPEC.md` y tests.

## Objetivo
Centralizar la administración de las contrapartes del negocio en un único modelo "Actor" con roles, eliminando la duplicación de personas/sociedades entre clientes, inversores y responsables, y reforzando unicidad global de nombre por tenant.

## Problema que resuelve
- Datos duplicados y desincronizados entre catálogos legacy (mismo proveedor cargado como cliente y como inversor).
- Sin unicidad de nombre normalizado por tenant → duplicados silenciosos.
- Display inconsistente de nombres canónicos/legacy en minúscula (`agro lajitas` → `Agro Lajitas`).

## Alcance en este repo (FE + BFF)
17 archivos, **todos status A (nuevos)**. Ver `file-list.md`. Resumen:
- BFF: 1 router con endpoints proxy a `/actors` (list, archived, duplicate-candidates, get, create, update, archive, restore, hard, roles, aliases, merge).
- Hook `useActors` con servicio CRUD + `addActorRole`, `addActorAlias`, `mergeActors`, `getDuplicateCandidates`.
- Componente `SmartEntityInput` (exclusivo de fe-007 — no aparece en fe-006 ni fe-014).
- Módulo de páginas `master-data/actors/` completo, con SPEC.md propio del editor.

## Alcance en el OTRO repo (BE)
Según la NOTA de la feature y `be-007.txt`: el BE expone `/api/v1/actors` y agrega migraciones **223 / 226 / 231 / 234** (tabla de actores, roles, aliases, identifiers, perfiles, índice único parcial sobre actores activos para unicidad de nombre normalizado por tenant, soporte de merge/duplicate-candidates). La unicidad de nombre NO puede depender del FE: el BE/DB debe reforzarla con conflicto de dominio + índice único parcial (lo dice el SPEC.md del editor). Coordinar con el paquete `feature-007` del repo BE.

## Fuera de alcance
- Sincronización de entidades legacy (customer/manager/investor) con el actor: el `ActorFormDrawer` "no debe conocer reglas de clientes, proyectos, campos, lotes ni movimientos"; esa sincronización vive en el feature consumidor (Administrar Entidades → feature-014). El helper `actorCrudarRouting.ts` SÍ mapea actor→entidad legacy para archivado, pero la lógica de negocio de sync no está en este módulo.
- La página "Administrar Entidades" (GeneralEntities) y `entities.ts`/`fileTransfer.ts` → feature-014.
- El design system (crud/*, feedback/*, filters/*, useEntityCrud, properName, fuzzySearch, entityNameMatcher) → feature-006.
- El wiring en `ui/src/router.tsx` (feature-006) y `api/src/routes/index.ts` (feature-014): son archivos COMPARTIDOS no incluidos en este flist; ver "dependencias".

## Comportamiento esperado (del SPEC.md del editor)
- Layout: `Nombre` primero, luego `Tipo`, `Email`, `Telefono` (mismo ancho); roles; perfil condicional (Persona vs Empresa/Sociedad); luego Identificadores, Aliases, Notas.
- Display: subtítulo del drawer y el input `Nombre` aplican reglas de display (`formatProperName`), nunca el valor raw/canónico. Bug de regresión cubierto por tests.
- Nombre: obligatorio; búsqueda fuzzy/trigrama sobre actores existentes; sugerencias limitadas a los roles seleccionados (o `defaultRoles`); si no hay roles, no muestra todos. Unicidad GLOBAL por tenant del nombre normalizado, reforzada por BE/DB. Seleccionar una sugerencia existente bloquea (no crea duplicado), con mensaje claro mencionando el nombre existente.
- Tipo: persona → guarda `person_profile`, `organization_profile = null`; organización → al revés; otro/sin definir → ambos null.
- Roles: array; `defaultRoles` preseleccionados en creación; en edición prevalecen los del actor. Un rol no crea relaciones legacy por sí solo.
- Identificadores: vacíos no se envían; tipo+valor requeridos; si ninguno es principal, el primero válido lo es; país vacío → `AR`.
- Aliases: vacíos no se envían; source default `ui_create` (crear) / `ui_edit` (editar).

## Estado en dp~1 (3ffcf60)
Código presente y aparentemente completo: 17 archivos, 3478 líneas, con tests (vitest) para SmartEntityInput, ActorFormDrawer, ArchivedActorsByRole, actorContextFilters, actorCrudarRouting, y un SPEC.md/SDD con casos enumerados. Ver `implementation-status.md`.

## Criterios de aceptación (FE)
1. `yarn workspace ui build` (tsc -b + vite) compila tras incorporar dependencias de fe-006/fe-014.
2. `yarn workspace ui test` (vitest run) verde para los 5 tests del módulo + SmartEntityInput.
3. Navegar `/admin/master-data/actors` lista actores; crear/editar via drawer respeta el SPEC (display, unicidad, perfil condicional, identifiers, aliases).
4. `/admin/master-data/actors/duplicates` muestra candidatos y permite merge.
5. `/admin/master-data/actors/archived` lista archivados y permite restore/hard-delete.
6. BFF responde en `/api/.../actors*` (requiere `feature-007 BE` mergeado primero).

## Endpoints (BFF `api/src/routes/actors.ts`, montado en `/actors` por feature-014 vía routes/index.ts)
| Método | Ruta (BFF) | Proxy BE | Notas |
|---|---|---|---|
| GET | `/actors` | `/actors` + query | `normalizeListResponse` → `{data, total}` desde `page_info.total` |
| GET | `/actors/archived` | `/actors/archived` | idem |
| GET | `/actors/duplicate-candidates` | `/actors/duplicate-candidates` | |
| GET | `/actors/:id` | `/actors/:id` | |
| POST | `/actors` | `/actors` → hidrata GET `/actors/:id` | flushAll cache; 201 |
| PUT | `/actors/:id` | `/actors/:id` → re-GET | flushAll |
| POST | `/actors/:id/archive` | idem | flushAll |
| POST | `/actors/:id/restore` | idem | flushAll |
| DELETE | `/actors/:id/hard` | idem | flushAll |
| POST | `/actors/:id/roles` | idem (body `{role}`) | flushAll |
| POST | `/actors/:id/aliases` | idem (body `{alias, source}`) | flushAll, 201 |
| POST | `/actors/merge` | `/actors/merge` | flushAll |

Headers: `X-API-KEY` (config) + `X-User-Id` (de `req.user.userID`). 401 si no autenticado.

## Modelos / tipos clave (`useActors/index.ts`)
- `ActorKind = "natural_person" | "organization" | "other" | "unknown"`
- `ActorRole = "cliente" | "responsable" | "inversor" | "arrendatario" | "proveedor" | "contratista" | "facturador"`
- `Actor` (id, tenant_id, actor_kind, display_name, normalized_name, primary_email/phone, notes, archived_at, merged_into_actor_id, roles, aliases, identifiers, person_profile, organization_profile, timestamps)
- `ActorPayloadInput`, `ActorAlias`, `ActorIdentifier`, `ActorMergeImpact`, `DuplicateCandidate`
- `create`/`update` aplican `canonicalizeName(display_name)` (de `@/lib/properName`, feature-006).

## UI afectada
- Rutas (registradas en `ui/src/router.tsx`, archivo de feature-006 — NO en este flist):
  `master-data/actors`, `.../clientes`, `.../inversores`, `.../responsables`, `.../proveedores`, `.../contratistas`, `.../duplicates`, `.../archived` (varias con `<ActorsList rolePreset=...>`).
- Componentes: `ActorsList`, `ActorFormDrawer`, `ArchivedActors`, `ArchivedActorsByRole`, `DuplicateActors`, `SmartEntityInput`.

## DB / migraciones
Ninguna en este repo (FE). Migraciones 223/226/231/234 viven en el repo BE (feature-007 BE).

## Tests afectados (este repo)
`SmartEntityInput.test.tsx`, `ActorFormDrawer.test.tsx`, `ArchivedActorsByRole.test.tsx`, `actorContextFilters.test.ts`, `actorCrudarRouting.test.ts`. Runner: vitest (`yarn workspace ui test`).

## Dependencias
- **Intra-repo (FE)**: fuerte con **feature-006** (design system: `crud/*`, `feedback/*`, `filters/AppFilterBar`, `hooks/useEntityCrud`, `lib/properName`, `lib/fuzzySearch`, `lib/entityNameMatcher`, `Modal/copy`, `ArchivedListPage`, además del wiring en `router.tsx`). Fuerte con **feature-014** (master-data: `pages/admin/entities.ts`, `pages/admin/fileTransfer.ts`, `useInvestors`, `useManagers`, `useCustomers`, `ArchivedCustomers/Investors/Managers`, GeneralEntities, y el wiring en `api/src/routes/index.ts`).
- **Cross-repo**: depende de **feature-007 BE** (endpoints `/api/v1/actors` + migr 223/226/231/234). También listadas como dependencias de la feature: 001/002/003 (tenancy/CRUDAR/multitenant BE) y 004 (shared-text-propername BE — contraparte del `properName` FE).

## Riesgos
- **Funcional**: unicidad de nombre depende del BE/DB; si BE no está mergeado, el FE muestra UI pero falla en runtime (404/parse).
- **Técnico**: el módulo NO compila sin las dependencias de feature-006 y feature-014 (todas ausentes en `develop`). El wiring vive en archivos compartidos de otros features.
- Ver `risks.md`.

## DECISIÓN recomendada
**Extraer tal cual, pero NO en aislamiento: mergear DESPUÉS de feature-006 (design system) y feature-014 (master-data + routes/index.ts), y DESPUÉS de feature-007 BE.** El código de fe-007 es coherente y autocontenido en su carpeta, pero inutilizable/no-compilable sin esas dependencias. No partir en subfeatures (es cohesivo). Orden sugerido: BE-007 → FE-006 → FE-014 → FE-007. El único acoplamiento "huérfano" a resolver son los hunks de wiring en `router.tsx` (006) y `routes/index.ts` (014): coordinar para que esos features incluyan las líneas de actors, o portarlas como partial-hunks acordados.
