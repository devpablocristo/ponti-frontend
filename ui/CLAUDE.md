# Ponti FE — guía rápida

## Modelo conceptual de listas (menú lateral)

Las cuatro vistas operativas del menú lateral muestran cosas con cardinalidades distintas. No son intercambiables y por eso sus botones "Nuevo" tampoco lo son.

| Ruta | Menú | 1 fila representa | Endpoint listado | Tabla origen | Nuevo crea | Componente / Editor |
|---|---|---|---|---|---|---|
| `/admin/work-orders` | Órdenes de Trabajo | 1 OT | `GET /work-orders` | `work_orders` | 1 OT | `WorkOrders.tsx` / `CreateOrder.tsx` |
| `/admin/tasks` | Labores | 1 OT (vista por labor) | `GET /labors/group` | `v4_report.labor_list` (join `work_orders` + `labors`) | 1 OT | `Labors.tsx` / `CreateOrder.tsx` (reusado) |
| `/admin/supply-movements` | Insumos | 1 movimiento de insumo | `GET /supply_movements` | `supply_movements` | 1 movimiento | `SupplyMovements.tsx` / `CreateSupplyMovement.tsx` |
| `/admin/stock` | Stock | 1 insumo + saldo agregado | `GET /stock/...` | `stock` (agregado) | 1 ingreso de stock | `Stock.tsx` / `CreateStockItem.tsx` |

> **Nota sobre nombres**: las rutas (`/admin/tasks`, `/admin/supply-movements`) quedan en inglés por compatibilidad con bookmarks existentes. Los componentes ya están renombrados para reflejar la entidad real (`Labors.tsx`, `SupplyMovements.tsx`). Las etiquetas del menú son en español (UX), independiente del path técnico.

### Por qué "Nuevo" significa cosas distintas

- **OT y Labores comparten editor**: `WorkOrder.LaborID` es 1:1 — cada OT lleva una sola labor. Por eso una fila en Labores = una OT y reutilizar `CreateOrder` para Nuevo es coherente.
- **Insumos NO comparte editor**: una OT puede generar **N** filas en `work_order_items` (1 por insumo), pero esas filas viven en otra tabla y NO aparecen en `/admin/supply-movements`. La página de Insumos muestra solo los `supply_movements` (manuales o importados). Crear desde acá quiere decir "registrar un movimiento manual" — distinto de "crear una OT".
- **Stock NO comparte editor**: cada fila es un insumo agregado por proyecto/inversor; Nuevo carga un `stock_movement` de tipo "Stock" que sobrescribe el conteo real, no crea una fila nueva de listado.

### Catálogos (separados de la vista de ejecución)

| Ruta | Catálogo de | Componente / Editor | Tabla |
|---|---|---|---|
| `/admin/database/labors` | Labores predefinidas — bulk add | `LaborsCatalog.tsx` (bulk rows) | `labors` |
| `/admin/database/labors/list` | Labores predefinidas — listado | `List.tsx` con `EntityFormDrawer` (1 fila) + Importar reutiliza `LaborsCatalog` | `labors` |
| `/admin/database/items` | Insumos del catálogo — bulk add | `SuppliesCatalog.tsx` (formulario inline + Importar embebido) | `supplies` |
| `/admin/database/items/list` | Insumos del catálogo — listado | `List.tsx` con `EntityFormDrawer` (1 fila) + Importar reutiliza `SuppliesCatalog` embebido | `supplies` |

Ambos catálogos tienen ahora **Importar accesible desde el listado**, en paralelo. El catálogo es la "biblioteca" desde la cual se eligen labores/insumos al crear OTs o cargar movimientos. Editarlo no afecta OTs ya creadas (las OTs guardan snapshots de nombre y precio al momento de crearse).

### Tipos de movimiento en `supply_movements`

Constantes en `internal/supply/usecases/domain/entry_type.go`:

- `Remito oficial` — entrada normal con factura/proveedor.
- `Movimiento interno` — transferencia saliente entre proyectos. Crea **automáticamente** un `Movimiento interno entrada` en el proyecto destino (no se crea por UI, lleva badge "Auto").
- `Movimiento interno entrada` — recepción auto-generada (read-only en UI).
- `Stock` — conteo manual que sobrescribe `stock_real_units`. No editable.
- `Devolución` — sale al proveedor (cantidad negativa, valida stock).

El UI rechaza editar `Movimiento interno`, `Movimiento interno entrada` y `Stock` con un mensaje claro, alineado con `UseCases.UpdateSupplyMovement` del BE.

## Decisiones de diseño pendientes (deferred)

Estos dos puntos requieren cambios profundos que afectan modelo de datos o flujos completos. Quedan documentados como conscious gap, no como bug.

### Consumos de OT en `/admin/supply-movements` (#5 — resuelto)

`ListEntrySupplyMovements` ahora también fetchea `work_order_items` (join con `workorders` + `projects`) y los devuelve como `SupplyMovement` virtuales con `MovementType = "Consumo OT"`. Implementado vía Go merge (no SQL view) en [supply/repository_movement.go:listWorkOrderConsumptions](ponti-backend/internal/supply/repository_movement.go). Las filas virtuales:

- Tienen ID negativo (-`workorder_items.id`) para no chocar con IDs reales de `supply_movements`.
- Llevan badge "OT" azul en el FE.
- No son editables ni archivables (la `makeSelectColumn` recibe un predicate que oculta el checkbox; `isMovementEditionBlocked` incluye `"consumo ot"`).
- El read-only es por diseño: para modificarlos hay que ir a la OT origen.

### Stock vs Insumos como dos páginas (#12)

`/admin/supply-movements` lista movimientos (`supply_movements`). `/admin/stock` lista saldos agregados (`stock`). Ambas tocan inventario pero desde ángulos distintos. Vigente por decisión explícita del usuario.

Opciones si más adelante se reabre el tema:

- A) **Fusionar en una página con tabs** (Movimientos / Saldo / Cierre).
- B) **Mantener separadas** y reforzar el rol de cada una con copy y nav.
- C) **Eliminar `/admin/stock`** y migrar lo exclusivo (cerrar período, conteo real editable) a `/admin/supply-movements` con acciones puntuales. Más limpia conceptualmente, más disruptiva.

### Legacy invoice sync (BE)

`internal/invoice/repository.go` llama a `actorsync.SyncLegacyTextActor` en Create y Update para mantener el campo `Company` (texto libre) sincronizado con el catálogo de `actors`. Existe para que la data vieja (factura con string `"Don Roque SRL"`) genere un `actor` correspondiente con rol "Facturador".

Cuándo se podría deprecar:
- Cuando todas las facturas legacy hayan sido migradas (el `Company` se reemplaza por un `actor_id` directo).
- Hoy todavía se necesita porque hay flujos (importación, ETL) que escriben texto sin `actor_id`.
- Tracking: revisar `actorsync.LegacyInvoiceCompany` cuando se haga el cleanup masivo del catálogo.

## Notificaciones y dark mode

**Sistema único de notificaciones**: usar SIEMPRE `notify.success/error/warning/info`
desde `@/lib/notify`. Internamente despacha `toast.custom` con el componente
`<Notification>` (`src/components/feedback/Notification.tsx`). Configuración
global en `src/main.tsx` (top-right, closeButton). Duración por severidad
definida en `src/copy/notifications.ts` (success 3.5s, info 4s, warning 6s,
error 8s — error persiste más, por UX writing rule "más crítico → más
tiempo").

- **No usar `<Notification>` inline** salvo excepciones documentadas:
  `ErrorBoundary`, `ImportXPreview` (drawer header), `Dashboard` y `WorkOrders`
  banners con botones interactivos, `Login`, `CreateSupplyInline`.
- **No invocar `toast.X` directo de Sonner**: todo pasa por `notify.X`.
- Patrón estándar para errores de estado: `useEffect(() => { if (error)
  notify.error(error); }, [error]);` — convierte el state existente en toast
  sin tocar el resto del código.
- Patrón estándar para errores de catch: `formatError(err, { fallback: "No
  se pudo X." })` — combina interceptor axios + `translateBackendError` +
  copy fallback.

**Dark mode**: app global con toggle en sidebar (Sun → Moon → Monitor) que
cicla `light | dark | system`. `ThemeProvider` ([src/lib/theme/ThemeProvider.tsx](src/lib/theme/ThemeProvider.tsx))
persiste en `localStorage` (`ponti:theme`) y aplica la clase `.dark` al
`<html>`. Tailwind con `darkMode: "class"`. Los design tokens (`--color-bg`,
`--color-surface`, ...) se redefinen bajo `.dark` en
[src/index.css](src/index.css); componentes que usan Tailwind hardcoded
(`bg-white`, `text-slate-700`, etc.) tienen variantes `dark:` adyacentes.

Cuando agregues nueva UI:
- Si usás `bg-white`, agregá también `dark:bg-slate-800`.
- Si usás `text-slate-700/800/900`, agregá `dark:text-slate-100/200`.
- Si usás `border-slate-200/300`, agregá `dark:border-slate-700/600`.
- Si usás colores semánticos (red/amber/blue/green) para badges, usar
  `dark:bg-X-950/40 dark:text-X-200`.

## UX writing — copy de la app

**Fuente única**: [src/copy/](src/copy/) (entidades, verbos, plantillas
feedback, validaciones, mapping HTTP) + helpers en [src/lib/format/](src/lib/format/).
Documentación completa de tono, terminología y patrones en
[src/copy/README.md](src/copy/README.md).

Reglas mínimas que se aplican siempre:

- **Voseo argentino** para imperativos ("Iniciá sesión", "Restaurá el lote").
  Nunca tuteo ("Inicia sesión"). Tercera persona impersonal para success ("Se
  archivó el cliente.").
- **BE en inglés siempre**: `domainerr.Conflict("lot is archived")`. Los logs y
  los mensajes internos quedan en inglés. La traducción ocurre en el FE vía
  `translateBackendError` ([src/lib/translateBackendError.ts](src/lib/translateBackendError.ts)).
  Si agregás un nuevo mensaje BE, agregá su pattern al translator.
- **Errores al usuario**: SIEMPRE vía `formatError(err, { fallback: "..." })`
  desde `@/lib/format`. Nunca `extractErrorMessage(err, "fallback inglés")`
  directamente. Nunca fallbacks crípticos como "Error en el servicio" o
  "Error desconocido".
- **Acciones CRUDAR**: el verbo canónico es **Archivar** (soft-delete),
  **Restaurar** (undelete), **Eliminar permanentemente** / **Eliminar
  definitivamente** (hard-delete), **Crear**, **Editar**/**Actualizar**,
  **Importar**, **Exportar**. Sinónimos como "borrar", "dar de baja",
  "reactivar" están prohibidos.
- **Empty states**: plantilla `Todavía no hay {plural}…` vía `emptyList` o
  `formatEmpty`. Loading: `Cargando {plural}…` vía `loadingList` o
  `formatLoading`.
- **Sin prefix "Error:"** en `<Notification variant="error">`. El ícono y el
  color de la variante ya comunican el rol.

## Convenciones rápidas

- **Filtros workspace**: `useWorkspaceFilters(["customer","project","campaign","field"])`. Si una página depende de `projectId` para crear/exportar, usar `getGuardedWorkspaceActionWarning` antes de abrir el drawer.
- **CSV**: `parseCsv` detecta separador (`,` o `;`) y strippea BOM + línea `sep=;`. Headers se normalizan vía `normalizeText` (NFD, sin diacríticos, lowercase, `_` por whitespace).
- **Respuestas BE**: el BE devuelve el payload directo (sin envoltorio). El interceptor en [api/client.ts](src/api/client.ts) las envuelve en `{success: true, data: <body>}` para que los hooks legacy con `if (response.success)` funcionen sin tocar 74 sitios.
- **`/categories?type_id=N`**: el filtro `type_id` se respeta en el BE. `type_id=4` = rubros de labor (Siembra, Pulverización, Otras Labores, Riego, Cosecha).

### BE list method conventions

Tres patrones legítimos coexisten en los `List*` del BE. No es inconsistencia — cada uno aplica a un caso distinto. **Usar el que corresponda al tipo de parámetro**:

1. **Solo paginación** — `(ctx, page, perPage int)`. Ej: `ListFields`, `ListCrops`, `ListLeaseTypes`.
2. **Scope requerido** (el caller siempre lo pasa) — `(ctx, scopeID int64, page, perPage int)`. Ej: `ListLabor(ctx, page, perPage, projectID)`, `ListInvoices(ctx, projectID, page, perPage)`.
3. **Filtros opcionales múltiples o extensibles** — `(ctx, filters domain.ListFilters, page, perPage int)`. Ej: `ListActors`, `ListCategories`.

El patrón #3 es para cuando los filtros son opcionales (cualquiera o ninguno puede venir) o se prevén agregar más sin breaking signature. Si solo hay un parámetro requerido, usar #2; convertirlo a struct es overkill.
