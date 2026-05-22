# Guía de UX writing + sistema de notificaciones — Ponti

Esta carpeta es la **fuente única de copy** de la app: entidades, verbos,
plantillas de feedback, validaciones, mapping HTTP y duración de notificaciones.
Si vas a mostrar texto al usuario y no es un nombre de campo (label/placeholder),
debería pasar por acá.

## Sistema de notificaciones

**Una sola API**: `notify.success / .error / .warning / .info` desde
`@/lib/notify`. Internamente usa Sonner + el componente `<Notification>`
(`src/components/feedback/Notification.tsx`).

**Convenciones**:
- Posición: **siempre** top-right (configurado globalmente en `main.tsx`).
- Duración por severidad (definida en `src/copy/notifications.ts`):
  - `success`: 3500 ms — confirmación breve.
  - `info`: 4000 ms — neutro / estado.
  - `warning`: 6000 ms — el usuario necesita tiempo para leer.
  - `error`: 8000 ms — más persistente, suele requerir acción.
- Iconografía: `CheckCircle` / `Info` / `AlertTriangle` / `AlertCircle`.
- Sombra elevada + animación slide-in cuando se renderiza como toast.
- Responsive: en mobile el toast no desborda (`max-w-md w-[calc(100vw-2rem)]`).
- Dark mode: sí, con paleta dim (`dark:bg-red-950/40 ...`).

**Patrón canónico**: convertir un `useState<string>` en toast.

```ts
const [errorMessage, setErrorMessage] = useState("");
const [successMessage, setSuccessMessage] = useState("");

useEffect(() => { if (errorMessage) notify.error(errorMessage); }, [errorMessage]);
useEffect(() => { if (successMessage) notify.success(successMessage); }, [successMessage]);
```

El state se queda como tracking interno; el render sale al toast top-right.
Setear "" / null no produce toast (es la forma de "limpiar" el slot).

**Excepciones legítimas** (mantener inline, NO migrar a toast):
- `ErrorBoundary.tsx` — fallback global del árbol React.
- `ImportXPreview.tsx` — banner contextual del drawer de import (errores
  relacionados a filas del CSV).
- `WorkOrders.tsx` filtro por insumo, `Dashboard.tsx` error con retry,
  `Login.tsx`, `CreateSupplyInline.tsx` — banners interactivos con botones
  embebidos (toast no acepta children con acciones).
- `LoadingOverlay.tsx` — overlay, no es notificación.

## Dark mode

La app respeta una preferencia de tema persistida en `localStorage`
(`ponti:theme` = `light | dark | system`). El toggle está en el footer del
sidebar (íconos Sun → Moon → Monitor).

**Implementación**:
- Tailwind con `darkMode: "class"` ([tailwind.config.js](../../tailwind.config.js)).
- [ThemeProvider](../lib/theme/ThemeProvider.tsx) togglea `.dark` en el `<html>`.
- Tokens dark en [src/index.css](../index.css) bajo `.dark { ... }`: redefine
  `--color-bg`, `--color-surface`, `--color-text`, `--color-border`, sombras,
  etc. Cualquier componente que use `var(--color-X)` se vuelve dark
  automáticamente.
- Clases Tailwind hardcoded (`bg-white`, `text-slate-700`, etc.) reciben su
  variante `dark:bg-slate-800`, `dark:text-slate-200`, etc.

**Cuando agregues nueva UI**:
- Si usás design tokens (`bg-surface`, `text-text`, `var(--color-X)`), nada
  más que hacer.
- Si usás clases Tailwind hardcoded, agregá la variante `dark:` adyacente.
  Patrones canónicos:
  - `bg-white` → `bg-white dark:bg-slate-800`
  - `text-slate-700` → `text-slate-700 dark:text-slate-200`
  - `border-slate-200` → `border-slate-200 dark:border-slate-700`
  - `bg-slate-50` (hover) → `bg-slate-50 dark:bg-slate-900`
- Para colores semánticos (rojo/amber/verde/azul de notificación o badge):
  `bg-red-50 dark:bg-red-950/40` + `text-red-800 dark:text-red-200`.

Si querés probar dark mode rápido sin clickear el toggle: en consola
`document.documentElement.classList.toggle("dark")`.

## Estándar de tono y gramática

- **Voseo argentino** en imperativos al usuario: "Iniciá sesión", "Restaurá el
  lote", "Verificá los datos". Nunca "Inicia sesión" (tuteo).
- **Tercera persona impersonal** para confirmaciones de éxito: "Se archivó el
  cliente." / "Se importaron 12 órdenes.". Evitar primera persona
  ("Archivamos…").
- **Mayúscula inicial. Punto final siempre.** Sin emojis. Sin signos de
  exclamación salvo casos de éxito breve, y evitalos también ("¡Listo!").
- **Sin acentos faltantes**: "Ocurrió" (no "Ocurrio"), "búsqueda" (no
  "busqueda").

## Estructura de cada mensaje

Un mensaje al usuario tiene tres partes (pueden colapsar en mensajes cortos):

1. **Qué pasó** — hecho concreto. "No se pudo guardar el cliente".
2. **Por qué / impacto** — causa funcional, no técnica. "porque ya existe otro
   con el mismo CUIT".
3. **Acción sugerida** — qué puede hacer el usuario. "Verificá la información
   ingresada.".

## Terminología canónica

| Acción | Verbo canónico | Sinónimos PROHIBIDOS |
|---|---|---|
| Soft-delete | **Archivar** | Eliminar, desactivar, borrar, dar de baja. |
| Soft-undelete | **Restaurar** | Rehabilitar, reactivar, recuperar. |
| Hard-delete | **Eliminar permanentemente** / **Eliminar definitivamente** | Borrar, destruir, purgar. |
| Crear nuevo | **Crear** | Agregar, alta, "nuevo" (como verbo). |
| Modificar | **Editar** / **Actualizar** | Cambiar, modificar (verbo principal). |
| Cargar archivo | **Importar** | Subir, cargar (como verbo principal). |
| Bajar archivo | **Exportar** | Descargar, bajar. |
| Suspender visibilidad | **Ocultar** | Esconder. |

## Cómo usar el catálogo

### Importar
```ts
import {
  ENTITIES_BY_KEY,
  successCreate,
  emptyList,
  loadingList,
  validation,
} from "@/copy";
```

### Empty state
```tsx
<EmptyState
  icon={Briefcase}
  {...emptyList(ENTITIES_BY_KEY.workOrder, "en este proyecto")}
/>
// → "Todavía no hay órdenes de trabajo en este proyecto."
//   "Creá una desde el botón 'Nuevo' o importá un archivo."
```

### Loading state
```tsx
<InlineSpinner label={loadingList(ENTITIES_BY_KEY.lot)} />
// → "Cargando lotes…"
```

### Confirmaciones
```tsx
const copy = confirmBulkArchive(ENTITIES_BY_KEY.customer, selectedCount);
const ok = await confirm({ ...copy, severity: "warning" });
```

### Errores
Todo catch debe usar `formatError(err, { fallback: "..." })`. El fallback va en
español y es **el mensaje que ve el usuario si nada matchea** (interceptor
axios + translateBackendError + raw BE). Nunca usar:

- `extractErrorMessage(err, "fallback inglés")` directamente para mostrar al
  usuario.
- Fallbacks crípticos tipo `"Error en el servicio"`, `"Error desconocido"`,
  `"boom"`.

```ts
import { formatError } from "@/lib/format";

try { ... } catch (err) {
  setError(formatError(err, { fallback: "No se pudo guardar el cliente." }));
}
```

### Validaciones
```ts
import { formatValidation } from "@/lib/format";

if (!form.name.trim()) {
  setError(formatValidation("El nombre", "required"));
}
if (!isValidEmail(form.email)) {
  setError(formatValidation("El email", "invalidEmail"));
}
```

## Cuándo agregar al catálogo

| Caso | Acción |
|---|---|
| El BE devuelve un nuevo mensaje en inglés sin pattern. | Agregar pattern en `translateBackendError.ts`. |
| Necesitás un mensaje de feedback nuevo. | Agregar función helper en `feedback.ts`. |
| Una nueva entidad CRUDAR aparece en la UI. | Agregar a `ENTITIES_BY_KEY` en `entities.ts` (más `BACKEND_ENTITY_ALIAS` si el BE la nombra). |
| Un campo nuevo necesita validación con copy específico. | Agregar a `validation.ts` y exponer en `formatValidation`. |
| Un nuevo HTTP status necesita copy específico. | Extender `HTTP_COPY` en `http.ts`. |

## Cuándo NO usar el catálogo

- **Labels de formulario**: el `label` del `InputField` es un nombre de campo;
  queda donde está (`<InputField label="Nombre" />`). Si lo movés al catálogo,
  agregás indirección sin beneficio.
- **Placeholders sin acción**: "Escribí algo…", "Ingresá el código" — quedan
  inline.
- **Strings en tests**: pueden quedar en cualquier idioma siempre que sean
  internos al test.

## Convención BE ↔ FE

- El **BE siempre en inglés**: `domainerr.Conflict("lot is archived")`, no
  `domainerr.Conflict("el lote está archivado")`. Logs y errores internos
  permanecen en inglés.
- El **FE traduce al display** vía `translateBackendError`. Cuando agregás un
  nuevo error en el BE, agregá su pattern en el translator.
- Excepción: mensajes de campo dentro de payloads estructurados
  (`failures[].message`) — aún están migrándose y conviven con el FE; en esos
  casos preferí mensajes en inglés y un mapping inline si la página los muestra
  directamente.

## Glosario de patterns BE soportados hoy

Lista no exhaustiva; ver `translateBackendError.ts` para la versión vigente.

- `lot is archived`, `field is archived`, `project is archived`, ...
- `customer not found or outdated`, `campaign not found or outdated`, ...
- `X already exists`, `work order already exists for number ...`
- `failed to restore X`, `failed to archive X`, `failed to delete X`
- `cannot restore X while project is archived`
- `X already archived`, `X must be archived before hard delete`
- `X has N <dep>; archive or hard-delete them first`
- `has historical references`
- `BLOCKED_BY_WORKORDERS:N|...`
- `work order date cannot be in the future`
- `harvest area exceeds lot surface`
- `cannot publish work order draft with pending supplies`
- `remito X already includes supply Y`, `devolución X already includes supply Y`
- `no stock for this supply in the project`, `not enough stock to return the requested quantity`
- `internal movements cannot be edited`, `stock movements cannot be edited`
- `supply X does not belong to project Y`
- `investor X not found`, `provider X not found`
- `invalid request payload`, `invalid (tenant_)?id`
- `network error`, `... dependencies ...`
