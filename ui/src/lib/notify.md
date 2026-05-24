# Sistema unificado de notificaciones — contrato

> **Regla absoluta**: TODA notificación visible al usuario (success / warning / info / error) pasa por este módulo. No existen excepciones — los `<p className="text-red-600">{error}</p>`, `alert()`, banners locales improvisados, `toast()` paralelos, etc. están prohibidos y bloqueados por `yarn lint` (script `scripts/lint-notify-leaks.sh`).

## API pública

```ts
import { notify } from "@/lib/notify";

notify.success("Cambios guardados correctamente.");
notify.error("No se pudo completar la operación.");
notify.warning("La operación se completó parcialmente.");
notify.info("No hay resultados para los filtros seleccionados.");

// Opciones (raro):
notify.error("Error crítico", { duration: Infinity });   // sticky
notify.error("Detalle", { prefix: "Validación:" });       // "Validación: Detalle"
```

Duraciones por defecto (en `copy/notifications.ts`):

- `success`: 3500 ms (verde, ícono ✓)
- `info`: 4000 ms (azul, ícono i)
- `warning`: 6000 ms (amarillo, ícono ⚠)
- `error`: 8000 ms (rojo, ícono ✕)

Colores e iconos son fijos. No se overridean desde el caller — la consistencia visual es parte del contrato.

## Banner inline (en lugar de toast)

Para feedback persistente atado a una page / sección con CTA pegado (ej. "Reintentar"), usar `<Notification>`:

```tsx
import { Notification } from "@/components/feedback/Notification";

<Notification variant="error" className="mt-4">
  <div className="flex items-center justify-between gap-3">
    <span>{error}</span>
    <Button onClick={retry}>Reintentar</Button>
  </div>
</Notification>
```

## Validación inline de campo de formulario

NO usar `notify` para errores de validación de campo (sería molesto un toast por keypress). Usar `<FieldError>` debajo del input:

```tsx
import { FieldError } from "@/components/feedback/FieldError";

<InputField name="email" value={email} onChange={...} />
<FieldError message={errors.email} />
```

## Manejo de errores HTTP / catch blocks

**Patrón obligatorio**:

```ts
import { formatError } from "@/lib/format/formatError";

try {
  await apiClient.put("/lots/123/tons", { tons: 12 });
} catch (err) {
  // formatError elige la mejor copy disponible:
  //   1. translateBackendError(err.response.data.message) si matchea pattern de dominio
  //   2. err.userMessage si el interceptor / fetchErrorAdapter clasificó status HTTP
  //   3. fallback (siempre en español, obligatorio)
  setError(formatError(err, { fallback: "No se pudieron actualizar las toneladas." }));
}
```

**NUNCA**:

```ts
// ❌ MAL — expone .message crudo del backend (JSON, jerga técnica)
setError(err.message);
setError(error.message);
setError(err.response.data.message);

// ❌ MAL — alert nativo
alert("Error: " + err.message);

// ❌ MAL — JSON crudo
<div>{JSON.stringify(error)}</div>
```

## Pipeline interno

```
Request HTTP
  ↓
axios (apiClient) o fetch (aiClient / insightsClient)
  ↓
─── Si falla ───
  ↓
client.ts interceptor (axios) → anota error.userMessage = HTTP_COPY[kind]
fetchErrorAdapter.wrapFetchResponse (fetch) → arma FetchApiError con userMessage
  ↓
catch del hook → setError(formatError(err, { fallback }))
  ↓
useEffect → notify.error(error) (toast unificado)
  o
<Notification variant="error" message={error} /> (banner inline accionable)
  o
<FieldError message={fieldError} /> (validación inline de campo)
```

## Mapping HTTP → copy

`copy/http.ts` define la copy oficial:

| Status | Categoría | Copy |
|---|---|---|
| 401 | unauthorized | "Tu sesión expiró. Iniciá sesión nuevamente." |
| 403 | forbidden | "No tenés permisos para realizar esta acción." |
| 404 | notFound | "El recurso solicitado no existe o fue eliminado." |
| 409 | conflict | "Ya existe un registro con esa información." |
| 422 | validation | "Los datos enviados no son válidos. Revisá los campos del formulario." |
| 4xx | validation | (mismo que 422) |
| 5xx | serverError | "Ocurrió un error interno. Intentá nuevamente en unos minutos." |
| timeout | timeout | "El servidor tardó demasiado en responder. Intentá nuevamente en unos segundos." |
| network | network | "No se pudo conectar con el servidor. Verificá tu conexión a internet." |
| unknown | unknown | "Ocurrió un error inesperado. Si el problema persiste, contactá a soporte." |

## Mensajes de dominio (BE en inglés → español)

`lib/translateBackendError.ts` tiene 30+ patterns para mensajes específicos del BE: `"lot is archived"`, `"X has N active references"`, `"work order date cannot be in the future"`, etc. Cuando el BE devuelve un mensaje conocido, `translateBackendError` gana sobre el copy HTTP genérico.

Para agregar un pattern nuevo:
1. Verificar que el BE devuelve el mensaje en inglés (catálogo en `docs/ERROR_CATALOG.md`).
2. Agregar entrada en `translateBackendError.ts` ordenada de más específico a más genérico.
3. Test en `lib/format/formatError.test.ts`.

## Salvaguardas

- `yarn lint` corre ESLint + `scripts/lint-notify-leaks.sh`.
- El script falla si encuentra: `setError(err.message)`, `<p text-red-*>{error}</p>`, `JSON.stringify(error)`, `alert(...)` con texto, o `import sonner` fuera del wrapper oficial.
- Si tu PR rompe el script, NO es un falso positivo — migrá el patrón al módulo unificado.
