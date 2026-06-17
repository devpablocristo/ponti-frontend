# spec — registry-admin (rama `dedup-entidades`)

## Identidad

| Campo | Valor |
|---|---|
| slug | registry-admin |
| nombre | Mejoras al Registry Admin — deduplificación de entidades |
| rama | `dedup-entidades` |
| archivos afectados | ver sección Alcance |
| estado | En progreso (UI + BFF implementados, pendiente validación) |

## Resumen

Mejoras al panel unificado de administración de entidades (`pages/admin/database/registry/`).
El objetivo central es facilitar la detección y resolución de entidades duplicadas (actores, catálogos)
mostrando en qué proyectos activos se usa cada entidad — sin salir de la pantalla de listado.

## Problema que resuelve

1. **Cache stale en el BFF**: las mutaciones (create/update/archive/restore/delete) de actores y
   catálogos no invalidaban el cache del BFF, causando que las listas mostradas al usuario
   quedaran desactualizadas tras una operación.
2. **Dependencia circular en `cache`**: la instancia de `NodeCache` vivía en `routes/index.ts`,
   obligando a los routers individuales a importar de ese archivo y creando un grafo circular.
3. **Sin visibilidad de uso**: para saber si una entidad estaba en uso era necesario navegar a
   proyectos, lo que dificultaba el flujo de deduplicación.
4. **UX básica del Registry**: el drawer de actores usaba componentes genéricos (`InputField`,
   `Button`), el selector de tipo era un `<select>`, y los roles eran checkboxes. El listado
   usaba un `<select>` simple para filtrar, sin visibilidad de counts por tipo.

## Alcance

### BFF — nuevos/modificados

| Archivo | Cambio |
|---|---|
| `api/src/lib/cache.ts` | **Nuevo.** Extrae `NodeCache` de `index.ts` a módulo dedicado. Exporta `cache` e `invalidateCatalogCache(...prefixes)`. |
| `api/src/routes/index.ts` | Elimina la instanciación inline de `NodeCache` y re-exporta `{ cache }` desde `../lib/cache`. |
| `api/src/routes/actors.ts` | Importa `invalidateCatalogCache`. Llama `setImmediate(() => invalidateCatalogCache("customers", "investors", "managers"))` en archive y restore. |
| `api/src/routes/catalogFactory.ts` | Importa `invalidateCatalogCache`. Deriva `cachePrefix` del `corePath`. Llama `setImmediate(() => invalidateCatalogCache(cachePrefix))` en create, update, archive, restore y delete. |
| `api/src/routes/registry.ts` | **Nuevo endpoint** `GET /registry/usages` (ver detalles abajo). |

### FE — nuevos/modificados

| Archivo | Cambio |
|---|---|
| `ui/.../registry/UsagesPopover.tsx` | **Nuevo.** Popover flotante (portal) que muestra proyectos activos donde se usa la entidad. |
| `ui/.../registry/RegistryActorDrawer.tsx` | Rediseño completo de la UI del drawer (ver detalles). |
| `ui/.../registry/RegistryCatalogDrawer.tsx` | Rediseño del drawer de catálogos + selector de categoría cuando `base` está vacío. |
| `ui/.../registry/RegistryAdmin.tsx` | Overhauled: filtro multi-tipo, tabs de entidad, acciones archive/restore, integración de `UsagesPopover`. |

---

## Detalles por pieza

### `api/src/lib/cache.ts` — módulo de cache

```ts
export const cache = new NodeCache({ stdTTL, checkperiod });
export function invalidateCatalogCache(...prefixes: string[]): void
```

- Invalida todas las claves cuyo prefijo esté en `prefixes`, más la clave `"options"` (form-options).
- Se llama via `setImmediate` para no bloquear la respuesta HTTP.

### `GET /registry/usages` — endpoint de usos

**Query params:** `entity_type`, `id`, `name`, `roles` (CSV).

| `entity_type` | Lógica |
|---|---|
| `campaigns` | Busca proyectos con `campaign_id=<id>` (en el BFF). |
| `actor` | Para rol `customer`: busca customer por nombre → proyectos por `customer_id`. Para `investor`/`manager`: fetch `/projects?per_page=200` y filtra por nombre en los arrays. Otros roles (`contractor`, `provider`, `biller`, `lessee`): devuelve `unsupported_roles`. |
| `crops`, `types`, `lease-types` | Proxy al backend Go (`/registry/usages`), que devuelve los proyectos que usan esa entidad de catálogo. |
| `lot`, `field`, `project` | Proxy al backend Go. Para estos, "usos" = proyecto(s) en cuya jerarquía vive la entidad (Go resuelve el join `projects → fields → lots`). `lot` y `field` devuelven 1 proyecto; `project`, el proyecto mismo. Si el id no matchea → `items: [], total: 0`. |

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "items": [{ "id": 1, "name": "...", "customer": "...", "campaign": "..." }],
    "total": 1,
    "unsupported_roles": [],   // solo en actor
    "not_supported": false     // solo en tipos no soportados
  }
}
```

### `UsagesPopover` — componente FE

- Icono `Info` (lucide) en cada fila; al hover se muestra, al click se abre.
- Abre un popover vía `createPortal(document.body)` para evitar problemas de overflow.
- Posicionamiento: se abre hacia abajo por defecto; si no hay espacio, se abre hacia arriba.
- Cierra al click fuera o al scroll fuera del popover.
- Muestra loading spinner, lista de proyectos (nombre + cliente + campaña), y footer con conteo.
- Para tipos no soportados muestra aviso en lugar de lista.
- `roles` vacíos → muestra solo el label del tipo de entidad.

### `RegistryActorDrawer` — rediseño

**Antes:** `InputField` / `Button` genéricos, `<select>` para tipo, checkboxes para roles, `h2` simple.

**Después:**
- Header con ícono `User`, label "Actor" y título dinámico.
- Secciones con labels `text-[11px] uppercase tracking-widest`: "Información básica", "Roles", "Alias".
- Inputs nativos con clases Tailwind consistentes (`focus:ring-2 focus:ring-primary-300`).
- Campo CUIT/DNI con `font-mono`.
- Tipo: botones pill horizontal (`PARTY_TYPES = [{value: "org"|"person"|"unknown", ...}]`).
- Roles: botones pill toggle (activo = `bg-primary-700 text-white`, inactivo = outline).
- Alias: chips con X, input + botón "Agregar", igual estilo que el resto.
- Footer: solo Cancelar + Guardar (se eliminaron los botones Archive/Restore del drawer).
- Validaciones: `!taxId.trim()` → error; `!checked.length` → error; 409 con mensajes contextuales.

### `RegistryAdmin` — overhauled

**Cambios principales:**

1. **Carga paralela activos+archivados:** `Promise.all([searchRegistry(active), searchRegistry(archived, perPage:1)])` para tener ambos conteos sin esperar la carga completa de archivados.
2. **Filtrado client-side:** `PER_PAGE` subió de 100 a 200; el filtro de tipos ya no va al servidor — se aplica con `useMemo` sobre los datos locales. Esto permite cambiar filtros sin hacer nuevas requests.
3. **`TypeFilterDropdown`:** nuevo componente inline — popover con buscador, grupos (Actores / Catálogo), checkbox "Seleccionar todo" con estado indeterminado, acciones Limpiar/Aplicar. Se posiciona con portal fijo.
4. **Tabs de entidad:** "Catálogo" | "Actores" con conteo activo. Cambiar tab al hacer click en un tab de entidad desactiva el tab "Archivados". En modo archivado se usa tabla unificada.
5. **Filtro mixto:** si se seleccionan tipos de actor Y de catálogo simultáneamente, los tabs se ocultan y se muestra una tabla unificada con todas las columnas.
6. **ActionButtons (por fila):** aparecen al hover (`opacity-0 group-hover:opacity-100`). Incluyen: `UsagesPopover`, botón editar (lápiz), botón archivar/restaurar.
7. **Confirmación de archivado:** `BaseModal` antes de ejecutar archive/restore.
8. **Dos tablas diferenciadas:**
   - `ActorsTable`: columnas Nombre / Tipo (badge) / Roles (chips) / CUIT-DNI / Acciones.
   - `CatalogTable`: columnas Nombre / Tipo (badge) / Acciones. `table-fixed` con 60% para nombre.
9. **Botón "+ Nuevo":** dropdown con "Actor" y "Catálogo" (el segundo abre `RegistryCatalogDrawer` sin base, dejando al usuario elegir la categoría dentro del drawer).
10. **Paginación:** solo se muestra si `maxPage > 1`.

### `RegistryCatalogDrawer` — rediseño

- Header con ícono `BookOpen`, label de tipo, título dinámico (igual patrón que RegistryActorDrawer).
- Inputs nativos con mismo estilo.
- Cuando `base === ""` (creación desde "Nuevo > Catálogo"): muestra un selector de categoría
  (`CATALOG_TYPES`) con botones pill, antes del campo nombre.
- Se eliminaron los botones Archive/Restore del footer del drawer (ahora viven en la tabla via `ActionButtons`).

---

## Lo que queda pendiente

- [ ] **Roles contractor/provider/biller/lessee en usages**: `GET /registry/usages?entity_type=actor` devuelve `unsupported_roles` para estos; requiere que el BE exponga filtrado por work-orders.
- [x] **Cultivos, tipos y tipos de arriendo en usages**: resuelto — el BFF proxea `crops`/`types`/`lease-types` a `/registry/usages` del backend Go.
- [x] **Lotes, campos y proyectos en usages**: resuelto — el BFF proxea `lot`/`field`/`project` al backend Go (Go agregó esos casos al switch de `GetUsages` con join `projects → fields → lots`). Para estos, "usos" = proyecto(s) en cuya jerarquía vive la entidad.
- [ ] **Merge de actores desde la UI del registry**: la API de merge ya existe en `actors.ts` BFF, pero no hay flujo UI de deduplicación en el registry. El flujo completo de merge vive en `feature-007` (`/admin/master-data/actors/duplicates`).
- [ ] **Tests**: no hay tests unitarios ni de integración para `UsagesPopover`, `TypeFilterDropdown`, ni el nuevo endpoint `/registry/usages`.
- [ ] **Validación manual end-to-end**: verificar que la invalidación de cache funcione correctamente en todos los escenarios de mutación.

---

## Dependencias

- `archiveActor` / `restoreActor`: `@/api/actors` (ya en develop).
- `archiveCatalog` / `restoreCatalog`: `@/api/catalog` (ya en develop).
- `BaseModal`: `@/components/Modal/BaseModal` (ya en develop).
- `searchRegistry` / `RegistryRow` / `RegistryStatus`: `@/api/registry` (ya en develop).
- `node-cache`: ya instalado en `api/`.

---

## Decisiones de diseño tomadas

1. **Cache en módulo dedicado** en lugar de en `index.ts` para evitar dependencias circulares. Los routers importan de `../lib/cache` directamente.
2. **`setImmediate` para invalidar** el cache: no bloquea la respuesta al cliente; el próximo request verá datos frescos.
3. **Filtrado client-side** con `PER_PAGE=200`: a escala actual la lista cabe en memoria; si el tenant crece a miles de entidades, habría que volver a filtrar server-side.
4. **Archive/Restore fuera del drawer**: los drawers ahora son solo para crear/editar. Archive y restore viven en la fila de la tabla, con modal de confirmación. Esto simplifica el drawer y hace las acciones destructivas más deliberadas.
5. **Portal para popovers**: `UsagesPopover` y `TypeFilterDropdown` usan `createPortal(document.body)` para no verse cortados por `overflow: hidden` de contenedores padre.
