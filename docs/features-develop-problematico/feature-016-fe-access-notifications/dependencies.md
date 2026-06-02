# dependencies.md — feature-016 · fe-access-notifications

## Resumen direccional

- **Depende de:** feature-006 (fe-design-system) — FUERTE; bump core→platform (compartido 006/021) — FUERTE.
- **Bloquea a:** nada directo. Es hoja del grafo FE.
- **Cross-repo:** ninguna (Solo-FE).

## Depende de (intra-repo)

### FUERTE — feature-006 (fe-design-system)

Mis 2 archivos importan artefactos que **sólo existen tras feature-006**. En `develop` (8c25e88) NO están; en `3ffcf60` SÍ (creados en el rango).

| import en mis archivos | archivo que lo provee | feature |
|---|---|---|
| `import { notify } from "@/lib/notify"` (ambos) | `ui/src/lib/notify.ts` | 006 |
| (transitiva de notify) | `ui/src/components/feedback/Notification.tsx`, `ui/src/copy/notifications.ts` | 006 |
| `import { AppFilterBar } from "../../../components/filters/AppFilterBar"` (Notifications) | `ui/src/components/filters/AppFilterBar.tsx` | 006 |
| (transitivas de AppFilterBar) | `ui/src/lib/fuzzySearch.ts`, `ui/src/components/Button/AppButton.tsx`, `ui/src/components/Button/ToolbarActionButton.tsx` | 006 |

Comprobación de presencia en cada rama:
- `notify.ts`: ausente en `fefbe695` y `8c25e88`; presente en `3ffcf60`.
- `AppFilterBar.tsx`: ausente en `8c25e88`; presente en `3ffcf60`.

### FUERTE (compartida) — bump `core-browser` → `platform-browser`

- `Access.tsx` cambia `@devpablocristo/core-browser/crud` → `@devpablocristo/platform-browser/crud`.
- En `develop` (8c25e88) `ui/package.json` aún declara `@devpablocristo/core-browser ^0.4.0` y `@devpablocristo/modules-ui-filters ^0.1.0`.
- En `3ffcf60` declara la familia `@devpablocristo/platform-*` (`platform-browser ^0.1.0`, `platform-authn`, `platform-http`, `platform-ui-data-display`).
- Este rename de paquete es **transversal new-cns3** y se materializa en `ui/package.json` + `ui/yarn.lock` (archivos COMPARTIDOS). Lo aporta feature-006 (o el lote de build 021). Mi feature **no** debe editar esos archivos.

### Presentes en develop (OK, no bloqueantes)

- `ui/src/hooks/useWorkspaceFilters.ts` — presente en 8c25e88.
- `ui/src/api/insightsClient.ts` — presente en 8c25e88.
- `ui/src/lib/notificationChatHandoff.ts` — presente en 8c25e88.
- `@/api/client` (`apiClient`) — presente.
- `sonner ^2.0.7` — YA en `ui/package.json` de develop (no requiere bump por esta feature).

## Archivos / tipos / config / APIs compartidos

- **Compartidos (no editar aquí):** `ui/package.json`, `ui/yarn.lock` (cambios core→platform).
- **Tipos consumidos sin modificar:** `InsightItem` (insightsClient), `Tenant`/`UserRow`/`CreateUserResponse` (locales a Access).
- **APIs/endpoints consumidos sin cambios:** `/admin/tenants`, `/admin/users` (GET/POST); insights CRUD vía `insightsClient`.
- **Migraciones:** ninguna.

## Bloquea a

- Nada en el grafo. Si feature-006 retira el paquete `@devpablocristo/modules-ui-filters`, esa limpieza requiere que TODAS las páginas (incluida `Notifications` de esta feature) ya usen `AppFilterBar`. Es decir: feature-016 es **prerequisito** para esa limpieza, no al revés.

## Cross-repo

Ninguna dependencia BE. Registrar en el cross-repo-map del BE: "feature-016: sin cambios BE".

## Recomendación de orden

1. **feature-006 (fe-design-system)** + bump core→platform (package.json/yarn.lock).
2. **feature-016** (esta).

Mergear 016 **antes** de 006 = build roto garantizado. No hay coordinación con BE.
