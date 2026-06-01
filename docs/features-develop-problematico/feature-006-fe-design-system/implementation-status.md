# implementation-status.md — feature-006 fe-design-system

## Estado general

- **Estado**: COMPLETA en el SOURCE (`develop-problematico~1`, 3ffcf60) como fundación funcional.
- **% completitud (en el SOURCE)**: ~95%. El sistema (notify, theme, copy, format, crud primitivos, hooks) está implementado, documentado (SPEC.md, README.md, notify.md) y testeado (16 tests).
- **% extraíble limpio a develop sin tocar otras features**: ~70%. El núcleo (feedback/button/drawer/input/modal/card/filters/layout/lib/copy/hooks genéricos + tests + eliminaciones + rename) sale whole-file. El ~30% restante son archivos shell compartidos que requieren partial-hunks y dependencias (008/014).

## Estado en este repo (FE)

- Núcleo de primitivos: **implementado y testeado**.
- Sistema de notificaciones: **implementado** (`notify.ts` + `Notification.tsx` + `copy/notifications.ts`), con doc de contrato (`notify.md`) y mención a `scripts/lint-notify-leaks.sh` (verificar si el script existe — puede venir en 021/026).
- Dark mode: **implementado** (`ThemeProvider`, tokens en `index.css`, toggle en Sidebar).
- Pipeline de errores: **implementado** (`formatError`, `translateBackendError`, `fetchErrorAdapter` para fetch/SSE de aiClient/insightsClient).
- Migración auth: **implementada** (`platform-authn`, `lib/authStorage.ts`).
- Primitivos CRUD: **implementados** (`crud/*`, `ArchivedListPage`, `EntityFormDrawer`, `DrawerShell`, `AppFilterBar`).

## Estado en el otro repo (BE)

- **N/A — sin cambios BE.** Solo-FE.

## Tests

- 16 tests nuevos en el flist, alineados con SDD donde hay SPEC (AppFilterBar, DrawerShell). Cobertura: notify, formatError, fetchErrorAdapter, copy/entities, copy/http, lifecycle/filterActive, properName, entityNameMatcher, tableFilters, workspaceActionGuards, workspaceQuery, dataDisplay, useWorkspaceFilters, ArchivedListPage.
- No verificado en este análisis si pasan en verde en `develop` (requiere `yarn test`). Confianza media en que pasen sin las dependencias (008/014).

## Pendientes

### BLOQUEANTE para mergear (este repo)
1. `router.tsx` referencia páginas `pages/admin/master-data/*` (014) → no compila si 014 no entra junto o no se recorta el router.
2. `ProtectedLayout.tsx` importa `TenantProvider`/`TenantContext` (008) → no compila si 008 no entra o no se rechaza ese hunk.
3. `client.ts` importa `@devpablocristo/platform-authn/...` → falla si el paquete no está publicado.
4. Confirmar 0 referencias residuales a archivos eliminados (`toast.ts`, `FormButtons`, `Card.tsx`, `TextAreaField`, `schemas.ts`, `useSupplyMovement`, `useLocalStorage`).

### Mejora futura
- Cablear `scripts/lint-notify-leaks.sh` a `yarn lint` para hacer cumplir el contrato de notify (probablemente feature-021/026).
- Migrar consumidores legacy que aún muestren `<p className="text-red-600">{error}</p>` a `notify`/`FieldError` (trabajo continuo de páginas).

### Deuda aceptable
- `crud/CreateSupplyInline.tsx`, `crud/SupplyItemsTable.tsx`, `Dropdown/SupplyDropdown.tsx`, `hooks/useInvestors`, `hooks/useManagers` viven en componentes "genéricos" pero están acoplados a entidades concretas. Aceptable como base, pero conceptualmente rozan feature-014.

### Duda humana
- ¿`lib/tableFilters.ts` / `useWorkspaceFilters.ts` / `workspaceQuery.ts` chocan o duplican lo ya porteado por #104 (table-select-filters, DONE)? Requiere comparar el diff contra el estado actual de `develop`.
- ¿`properName.ts`/`entityNameMatcher.ts` dependen de un contrato del BE de feature-004 (shared-text-propername)? En FE parecen autocontenidos, pero confirmar.
- ¿El bloque de `index.css` arrastra estilos específicos de páginas de 014/015, o es todo tokens/dark del design-system?

## Bugs / observaciones

- El interceptor de envelope en `client.ts` envuelve 2xx en `{success:true, data}` para satisfacer hooks legacy. Es un parche de compatibilidad (documentado en el propio código): si una feature futura asume el payload directo del BE, romperá. Tenerlo presente.
- `main.tsx` cambió de CRLF a LF (el diff muestra "No newline at end of file" en la versión vieja). Cosmético.

## Confianza

- Núcleo whole-file: **alta**.
- Archivos shell (router/main/ProtectedLayout/Sidebar/client): **alta** sobre qué hunks son de 006, **media** sobre el resultado de compilación sin 008/014.
- Solape con #104 y dependencia de 004: **media/baja** — necesita verificación humana con diff.
