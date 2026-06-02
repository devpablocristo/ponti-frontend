# implementation-status.md — feature-016 · fe-access-notifications

## Estado global

- **Estado:** COMPLETA en el SOURCE (`3ffcf60`). Diff limpio, autocontenido, sin TODOs ni código muerto.
- **% completitud (en el código fuente):** 100% para los 2 archivos de la feature.
- **% portabilidad a develop hoy:** ~0% efectivo SIN feature-006 (imports no resuelven). Con feature-006 mergeada: directo (~100%).

## Estado en este repo (FE)

| archivo | estado | nota |
|---|---|---|
| `ui/src/pages/admin/access/Access.tsx` | completo en 3ffcf60 | toaster + dark-mode + rename core→platform; banner inline eliminado |
| `ui/src/pages/admin/notifications/Notifications.tsx` | completo en 3ffcf60 | toaster (+limpieza de error) + dark-mode + AppFilterBar + useCallback; `<p>` error inline eliminado |

En `develop` (8c25e88) ambos archivos están en su versión anterior (con `core-browser`, `FilterBar`, banners inline, sin dark-mode).

## Estado en el otro repo (BE)

N/A — feature Solo-FE. Sin cambios ni carpeta en BE.

## Tests

- No hay tests específicos de estas páginas ni en el SOURCE ni en develop. La infraestructura de tests FE es feature-026.
- Verificación = build/typecheck + smoke manual (ver validation.md).

## Pendientes

### BLOQUEANTE para mergear

1. **feature-006 (fe-design-system)** mergeada en `develop` (provee `notify`, `AppFilterBar` y transitivas).
2. **Bump `core-browser` → `platform-browser`** en `ui/package.json` + `ui/yarn.lock` (compartido 006/021). Sin esto `Access.tsx` no compila.
3. Verificar que el `<Toaster>` de `sonner` esté montado en el layout raíz (parte de 006) — si no, los toasts no se ven en runtime.

### Mejora futura

- Retirar el paquete `@devpablocristo/modules-ui-filters` de `package.json` una vez que todas las páginas migraron a `AppFilterBar` (no es tarea de esta feature; coordinar con 006).
- Agregar tests de render para ambas páginas (feature-026).

### Deuda aceptable

- `Notifications.tsx` limpia `error` con `setError("")` dentro de un `useEffect` tras notificar: patrón funcional pero acopla efecto+estado. Aceptable; no bloquea.

### Duda humana

- Confirmar que feature-006 realmente incluye TODAS las transitivas de `AppFilterBar` (`AppButton`, `ToolbarActionButton`, `fuzzySearch`). Si 006 se partió en subfeatures, validar que la subfeature de filtros esté incluida. Revisar: `git show <tip-develop-tras-006>:ui/src/components/filters/AppFilterBar.tsx`.

## Bugs conocidos

- Ninguno en los 2 archivos. El único "riesgo" es de integración (deps faltantes), no un bug del código.
