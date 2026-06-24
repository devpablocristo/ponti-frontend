# administrar-entidades — Pantalla unificada "Administrar Entidades" (registry)

- **slug**: administrar-entidades
- **nombre**: Administrar Entidades (registry: actores + catálogos en una sola pantalla)
- **tipo**: feature FE (ui/ React + api/ BFF NodeJS)
- **repo (este paquete)**: Frontend monorepo `web` — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE**: SÍ — IMPLEMENTADO en la rama actual (working tree es la fuente de verdad).
- **existe-en-BE**: SÍ — `core`, módulos `internal/registry` + `internal/actors` + catálogos (FULL-STACK, BE-first ya satisfecho).
- **fuente-de-verdad**: el working tree de la rama actual. NO se usa `git`; se verificó archivo por archivo.

## 1. Propósito

Una sola pantalla (`/admin/database/registry`) para buscar, crear, editar y archivar entidades del negocio — actores (clientes, proveedores, inversores, responsables, contratistas, facturadores, arrendatarios) y catálogos (cultivos, tipos, tipos de arriendo, campañas) — con dedup por identidad y edición de alias.

## 2. Estado vs código actual (ya IMPLEMENTADO)

Todo lo descripto abajo **ya existe** en la rama actual; este spec documenta el estado final, no pide re-implementar.

- **Pantalla única** `RegistryAdmin.tsx` montada en `/admin/database/registry` (router + Sidebar). Verificado: `ui/src/router.tsx:16,120-121`, `ui/src/layout/Sidebar/Sidebar.tsx:73`.
- **Reemplazó y eliminó las pantallas viejas:** ya no existen `ui/src/pages/admin/database/actors/`, `ui/src/pages/admin/database/catalogs/`, `ui/src/components/Catalog/CatalogCrud.tsx` ni `ui/src/components/Actors/ActorCombobox.tsx` (verificado: los cuatro paths no existen en el working tree). No quedan rutas ni entradas de Sidebar hacia ellos.
- **Cliente FE nuevo** `ui/src/api/registry.ts`: `searchRegistry`, `getActor`, `setActorAliases`. Reusa `ui/src/api/actors.ts` y `ui/src/api/catalog.ts` **sin modificarlos**.
- **BFF nuevo** `api/src/routes/registry.ts` (GET `/registry` + PUT `/registry/actors/:id/aliases`), montado en `api/src/routes/index.ts:81` (`router.use("/registry", registry)`).
- **Catálogos por el factory genérico** con `{ archive: true }`: `api/src/routes/index.ts:85-88` monta `/catalog/{crops,types,lease-types,campaigns}` vía `catalogRouter(...,{archive:true})` (`api/src/routes/catalogFactory.ts:29,65-66`).

## 3. Alcance / archivos

### FE — ui/ (todos whole-file, nuevos)

- `ui/src/pages/admin/database/registry/RegistryAdmin.tsx` — pantalla:
  - Input "Buscar (nombre, CUIT/DNI, alias)" (`<Search>`, debounce 250 ms) + `<select>` Tipo (Todos · 7 roles · 4 catálogos) + `<select>` "+ Nuevo…" (Actor / Cultivo / Tipo / Tipo de arriendo / Campaña).
  - Toggle Activos/Archivados (`status: active|archived`), contador "{total} resultados".
  - **El filtrado es server-side** vía `searchRegistry` (no hay client-filter); cambiar q/tipo/estado resetea a página 1.
  - Tabla (Nombre · Tipo · CUIT/DNI), click en fila → drawer del tipo (actor → `RegistryActorDrawer`; catálogo → `RegistryCatalogDrawer`).
  - Paginado de a `PER_PAGE = 100`: "Página {page} de {maxPage}" + botones Anterior/Siguiente (disabled en extremos).
  - Prefill de alta: si `q` no es puramente numérico, se pasa como `prefillName` al drawer.
- `ui/src/pages/admin/database/registry/RegistryActorDrawer.tsx` — ver §"Cara FE del Identity Gate" (abajo).
- `ui/src/pages/admin/database/registry/RegistryCatalogDrawer.tsx` — drawer de catálogo (solo campo Nombre): create/update + archive/restore; 409 → "Ya existe un {singular} con ese nombre". Exporta el tipo `CatalogItem`.
- `ui/src/api/registry.ts` — tipos (`RegistryRow`, `RegistryPageInfo`, `RegistryResult`, `RegistryStatus`, `RegistryEntityType`) + `searchRegistry({q,type,status,page,perPage})`, `getActor(id)` (GET `/actors/:id`), `setActorAliases(id,aliases)` (PUT `/registry/actors/:id/aliases`).

### FE — shell compartido (edits puntuales, NO whole-file)

- `ui/src/router.tsx` — import `RegistryAdmin` + ruta `database/registry`.
- `ui/src/layout/Sidebar/Sidebar.tsx` — entrada `{ name: "Administrar Entidades", route: "/admin/database/registry" }`.

### BFF — api/

- `api/src/routes/registry.ts` (nuevo) — proxy a core `/registry/*`; reenvía `X-API-KEY` + `X-User-Id`; mapea `error.status` del core al HTTP de salida (incl. 409).
- `api/src/routes/index.ts` (edit) — import + `router.use("/registry", ...)` + montaje de `/catalog/*` con `{archive:true}`.
- `api/src/routes/catalogFactory.ts` — factory genérico (ya existente) que expone create/update/archive/restore por catálogo.

### Eliminado (parte del alcance — limpieza)

`ui/src/pages/admin/database/actors/*`, `ui/src/pages/admin/database/catalogs/*`, `ui/src/components/Catalog/CatalogCrud.tsx`, `ui/src/components/Actors/ActorCombobox.tsx`, y sus rutas/entradas de Sidebar.

## Cara FE del Identity Gate (flujo actor) — `RegistryActorDrawer.tsx`

Integrada en este spec (no se separa: vive enteramente en esta pantalla). Es la cara FE del Pilar 3 (dedup / alta estricta / rekey / alias).

- **Campos:** Nombre; CUIT/DNI (input fuerza solo dígitos vía `replace(/\D/g,"")`, obligatorio en alta); Tipo (`org` Empresa / `person` Persona / `unknown` Sin definir); Roles (checkboxes de los 7); Alias (chips, agregar con Enter, dedup case-insensitive en el cliente).
- **Alta estricta** (sin `actorId`): valida nombre + CUIT/DNI + ≥1 rol → `resolveActor({ name, tax_id, role: checked[0], reject_existing: true })` → `setActorRoles` → `setActorAliases`. `reject_existing: true` exige que el BE rechace reuso (409) si el nombre o el CUIT ya existen.
- **Edición** (con `actorId`): carga con `getActor`; al guardar, si cambió el CUIT → `setActorTaxID` (rekey: rota TAX_ID, el `actor_id` NO cambia → lo ya cargado sigue colgado); luego `updateActor({display_name, party_type})`; luego `setActorRoles`; luego `setActorAliases`. Nota visible en UI: "Corregir la clave no afecta lo ya cargado".
- **Mensajes 409 por operación** (cada paso distingue su choque):
  - `setActorTaxID` → "Ese CUIT/DNI ya lo usa otra identidad".
  - `updateActor` → "Ese nombre ya lo usa otra identidad".
  - `setActorAliases` → "Un alias ya lo usa otra identidad".
  - `resolveActor` (alta) → "Ya existe un actor con ese nombre o CUIT — editalo en la lista".
- **Archivar / Restaurar** vía `archiveActor` / `restoreActor` (restore puede dar error si otra identidad tomó la clave).

## 4. Dependencias (contrato BE — BE-first, ya satisfecho)

El FE consume el core en `:8080` base `/api/v1`. Todos los endpoints ya existen (verificado en `core`):

- **GET `/registry`** (`internal/registry/handler.go:54`, `Search`) — `?q&type&status&page&per_page` → `{ data:[{entity_type,id,name,tax,roles,archived}], page_info:{page,per_page,total,max_page} }`. Resultado por `UNION ALL` (actores una vez + 4 catálogos; `internal/registry/repository.go:103,118,137`). `type ∈ {all, customer, provider, investor, manager, contractor, biller, lessee, crops, types, lease-types, campaigns}`. Tenant-scoped flag-gated.
- **PUT `/registry/actors/:actor_id/aliases`** (`internal/registry/handler.go:55`, `SetActorAliases`) — `{aliases:[]}`, rota claves ALIAS, 409 si choca.
- **Actores** (`internal/actors/handler.go:60-78`, grupo `/actors`): `POST ""` (ResolveActor), `GET ""` (ListActors), `GET /search`, `GET /by-tax-id`, `GET /similar`, `GET /:actor_id`, `PUT /:actor_id` (UpdateActor — rota clave de nombre, 409), `DELETE /:actor_id`, `POST /:actor_id/archive`, `POST /:actor_id/restore`, `PUT /:actor_id/roles` (SetActorRoles), `PUT /:actor_id/tax-id` (SetActorTaxID — rekey, 409 si choca, 400 si no numérico, `actor_id` NO cambia).
- **Catálogos** con lifecycle: list `?status=active|archived|all`; create/update con dedup por nombre normalizado (trigger → 409 en create y en rename); `archive`/`restore`. Expuestos por el BFF en `/catalog/*` con `{archive:true}`.

El FE NO tiene migraciones. La dependencia dura es este contrato; ya está mergeado en `core` (migraciones 241–247: actors_registry, fks, tenant_not_null, prevent_duplicate_name, tenant default+NOT NULL, fine permissions, actor_taxid_trgm). No hay bloqueo BE-first pendiente.

## 5. Plan de implementación

**Estado: COMPLETO.** No queda nada por implementar de esta feature en la rama actual. Pasos (ya ejecutados, para trazabilidad):

1. BFF: router `registry.ts` (GET + PUT aliases) + montaje en `index.ts`; catálogos por `catalogFactory` con `{archive:true}`. — HECHO.
2. FE API: `registry.ts` (`searchRegistry`, `getActor`, `setActorAliases`), reusando `actors.ts` / `catalog.ts`. — HECHO.
3. FE UI: `RegistryAdmin.tsx` + `RegistryActorDrawer.tsx` + `RegistryCatalogDrawer.tsx`. — HECHO.
4. Cableado shell: ruta en `router.tsx` + entrada en `Sidebar.tsx`. — HECHO.
5. Limpieza: borrar pantallas/components viejos (actors/*, catalogs/*, CatalogCrud, ActorCombobox) y sus rutas/entradas. — HECHO.

## 6. Validación

- **Typecheck / build:** `yarn build` (= `tsc -b` + `vite build`) en `ui/`; `tsc` en `api/`.
- **Lint:** `yarn lint` (eslint) en `ui/` y `api/`.
- **Unit:** `yarn test` (vitest).
- **Smoke manual** (flags ON local): crear actor con CUIT nuevo (201); reintentar mismo nombre/CUIT con alta estricta → 409 con mensaje; editar CUIT (rekey) y confirmar que lo cargado sigue; agregar alias que choca → 409 "alias…"; crear catálogo duplicado → 409; archivar/restaurar; buscar por nombre y por CUIT; paginar.

## 7. Riesgos y decisiones pendientes

- **Tipos futuros del registry:** campos, proyectos, insumos y labores **no** están en el `type` del registry (hoy: 7 roles de actor + 4 catálogos). Sumarlos implica nuevas ramas del `UNION ALL` en el BE y opciones en `TYPE_OPTIONS` / `CREATE_OPTIONS` del FE. Fuera de alcance.
- **Edición de "entidades pesadas":** los drawers editan la cara liviana (nombre/CUIT/tipo/roles/alias del actor; nombre del catálogo). Atributos pesados de las entidades portadoras (datos fiscales extendidos, relaciones) no se editan acá; pendiente decidir si entran a esta pantalla o quedan en flujos dedicados.
- **Reglas de búsqueda / paginado / alias:**
  - Búsqueda server-side con debounce 250 ms; q matchea `display_name` + `actor_keys` (LEGAL_NAME/PERSON_NAME/ALIAS ILIKE, TAX_ID por prefijo) + `name` de catálogos. No hay orden configurable (BE ordena por `name ASC`).
  - Paginado fijo a 100/pág; sin "ir a página N" (solo Anterior/Siguiente).
  - Alias: dedup case-insensitive solo en el cliente; la unicidad real (409) la impone el BE por-tenant. El set se reemplaza completo en cada guardado.
- **Merge de actores:** no implementado (fuera de alcance). Corregir la clave (rekey) NO fusiona identidades.
- **Flags:** la pantalla asume `TENANT_ENFORCEMENT` e `IDENTITY_GATE` activos (scoping y dedup tenant-scoped). Con flags OFF el comportamiento del BE cambia (scoping/rechazo) — validar antes de exponer en entornos con flags distintos.
- **¿Spec separado identity-gate-fe?** Se decidió integrarlo como sección de este spec (la cara FE del actor vive enteramente en `RegistryActorDrawer.tsx` + `registry.ts`, dentro de esta misma pantalla; un segundo archivo duplicaría sin agregar alcance).
