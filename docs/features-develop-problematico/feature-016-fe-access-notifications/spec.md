# spec.md — feature-016 · fe-access-notifications

- **id:** feature-016
- **nombre:** FE access & notifications pages
- **tipo:** refactor (FE only)
- **repo:** Frontend monorepo `web` (ui/ React + api/ BFF NodeJS, yarn) — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE:** SÍ (2 archivos modificados)
- **existe-en-BE:** NO. Es Solo-FE. En BE no hay carpeta ni cambios. En el cross-repo-map del BE debe figurar como "feature-016: sin cambios BE".
- **rango fuente-de-verdad:** `fefbe695..3ffcf60`
- **SOURCE de extracción:** `develop-problematico~1` (SHA `3ffcf60`). NUNCA `develop-problematico` (tip = restore/vacío).
- **rama destino:** `develop` (tip `8c25e88`).

## Resumen

Refactor de dos páginas de administración (`Access` y `Notifications`) para alinearlas con el design-system nuevo (feature-006). Tres ejes de cambio, todos cosméticos/UX, sin tocar lógica de negocio ni endpoints:

1. **Notificaciones unificadas (toaster):** los banners de error/éxito in-page se reemplazan por el helper programático `notify.*` (`@/lib/notify`, basado en `sonner` + componente `<Notification>`).
2. **Dark mode:** se agregan clases `dark:*` de Tailwind a todos los contenedores, inputs, tablas y tarjetas.
3. **Componente de filtros propio + rename de paquete:**
   - `Notifications.tsx`: pasa de `FilterBar` (paquete externo `@devpablocristo/modules-ui-filters`) al componente local `AppFilterBar` (`../../../components/filters/AppFilterBar`).
   - `Access.tsx`: el import de `parseListItemsFromResponse` migra de `@devpablocristo/core-browser/crud` a `@devpablocristo/platform-browser/crud` (parte de la migración core→platform / new-cns3).

## Objetivo

Que las páginas de admin `Access` y `Notifications` consuman el design-system unificado: notificaciones flotantes consistentes, soporte dark-mode, y el filtro local en lugar del paquete externo, eliminando además la dependencia de `core-browser` en favor de `platform-browser`.

## Problema

- Cada página tenía su propio banner inline de error/éxito (`<div role="alert">` y `<p className="text-red-600">`), inconsistente con el resto de la app.
- No había soporte dark-mode en estas pantallas.
- `Notifications` dependía del paquete externo `@devpablocristo/modules-ui-filters` en lugar del componente compartido del repo.
- `Access` seguía importando del paquete deprecado `core-browser`.

## Alcance en este repo (web / FE)

- `ui/src/pages/admin/access/Access.tsx` (M): import `notify`, efectos que canalizan `error`/`result` al toaster, eliminación del banner inline, clases `dark:*`, rename de import `core-browser` → `platform-browser`.
- `ui/src/pages/admin/notifications/Notifications.tsx` (M): import `notify` + `AppFilterBar`, efecto que canaliza `error` al toaster y lo limpia, `FilterBar` → `AppFilterBar`, memoización de `isResolved`/`isUnread` con `useCallback` (corrige deps de `useMemo`), eliminación del `<p>` de error inline, clases `dark:*`, y quita el `p-4` del contenedor raíz.

## Alcance en el otro repo (BE / core)

Ninguno. Feature 100% FE.

## Fuera de alcance

- La creación de los artefactos del design-system (`notify.ts`, `AppFilterBar.tsx`, `Notification.tsx`, `copy/notifications.ts`, `fuzzySearch.ts`, `AppButton.tsx`, `ToolbarActionButton.tsx`) — pertenecen a **feature-006 (fe-design-system)** y son **dependencia previa**, no parte de esta feature.
- La migración del paquete `core-browser` → `platform-browser` a nivel `package.json`/`yarn.lock`/resto del código — es un cambio transversal (new-cns3). Aquí sólo aparece el rename de import en 1 archivo; el bump real de dependencias es compartido con feature-006 / 021.
- Cambios de lógica de negocio, endpoints, DTOs.

## Comportamiento esperado

- Al crear tenant/usuario en `Access`: éxito → toast verde (`notify.success`), error → toast rojo (`notify.error`). Ya no hay banner inline al final del grid.
- En `Notifications`: errores transitorios de carga/acción → toast rojo; el estado `error` se limpia tras notificar para no re-disparar en re-renders. El `<p>` de error inline desaparece.
- Ambas páginas se ven correctamente en dark-mode.
- Filtros de `Notifications` renderizados por `AppFilterBar` (mismo contrato `filters` que `FilterBar`).

## Estado en dp~1 (3ffcf60)

Implementación **completa y coherente** en ambos archivos. El diff es limpio, sólo presentación + wiring de notificaciones. No hay TODOs ni código muerto. Depende de artefactos del design-system que en `3ffcf60` existen pero en `develop` (8c25e88) NO.

## Criterios de aceptación

1. `Access.tsx` y `Notifications.tsx` compilan en `develop` tras la extracción.
2. `@/lib/notify` y `../../../components/filters/AppFilterBar` resuelven (requiere feature-006).
3. El import `@devpablocristo/platform-browser/crud` resuelve (requiere bump de paquete core→platform en `ui/package.json` + `yarn.lock`).
4. `yarn --cwd ui build` / `tsc` sin errores de tipo.
5. Toasts de éxito/error visibles; banners inline eliminados; dark-mode aplicado.

## Endpoints / modelos / UI / DB / tests afectados

- **Endpoints (sin cambios, sólo consumidos en `Access`):** `GET /admin/tenants`, `GET /admin/users`, `POST /admin/tenants`, `POST /admin/users` (vía `apiClient`). En `Notifications`: `listInsights`, `markInsightRead`, `markInsightUnread`, `reopenInsight`, `resolveInsight` (vía `@/api/insightsClient`, sin cambios).
- **Modelos/tipos:** `Tenant`, `UserRow`, `CreateUserResponse` (Access), `InsightItem` (Notifications) — sin cambios.
- **UI/componentes:** consume `notify`, `AppFilterBar`, `Button`, `Header`, hook `useWorkspaceFilters` (presente en develop).
- **DB:** ninguna.
- **Tests:** no se agregan/modifican tests en esta feature (ver feature-026 fe-test-infra).

## Dependencias

- **Intra-repo (FUERTE):** feature-006 (fe-design-system) provee `notify.ts`, `AppFilterBar.tsx`, `Notification.tsx`, `copy/notifications.ts`, `fuzzySearch.ts`, `AppButton.tsx`, `ToolbarActionButton.tsx`. **DEBE mergearse antes.**
- **Intra-repo (FUERTE, compartida):** rename `core-browser` → `platform-browser` en `ui/package.json` + `ui/yarn.lock`. Compartido con feature-006/021 (build-and-deploy-config) y la migración new-cns3.
- **Intra-repo (presente en develop, OK):** `useWorkspaceFilters`, `insightsClient`, `notificationChatHandoff`, `apiClient`.
- **Cross-repo:** ninguna. (Solo-FE.)

## Riesgos

- **Funcional (bajo):** comportamiento de usuario cambia (toasts en vez de banners); aceptable y esperado.
- **Técnico (alto si se extrae aislado):** ROMPE el build si feature-006 y el bump core→platform no están en develop primero (imports no resueltos). Ver risks.md.
- **Extracción parcial:** no aplica a estos 2 archivos en sí, pero el rename de `platform-browser` arrastra cambios de lockfile compartidos.

## DECISIÓN recomendada

**Extraer tal cual, pero NO de forma aislada — ordenar después de feature-006.** Los 2 archivos son whole-file safe (develop no los modificó respecto del baseline en lo relevante; ver file-list.md). El bloqueante real es que `develop` aún no tiene los artefactos del design-system ni el paquete `platform-browser`. Secuencia: feature-006 (design-system + bump core→platform) → feature-016. Si feature-006 no llega, **postergar**.
