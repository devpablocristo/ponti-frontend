# notes-for-future-agent.md — feature-016 · fe-access-notifications

## Resumen corto

Refactor Solo-FE de 2 páginas admin (`Access`, `Notifications`). Tres cosas: (1) banners inline → toaster `notify.*`, (2) dark-mode (`dark:*`), (3) `Notifications` usa `AppFilterBar` local en vez de `FilterBar` externo, y `Access` migra import `core-browser` → `platform-browser`. Sin lógica de negocio, sin endpoints nuevos, sin BE.

## Qué está en FE y qué en BE

- **FE:** los 2 archivos de mi flist (`ui/src/pages/admin/access/Access.tsx`, `ui/src/pages/admin/notifications/Notifications.tsx`).
- **BE:** nada. Registrar en cross-repo-map del BE: "feature-016: sin cambios BE".

## Archivos esenciales

- `ui/src/pages/admin/access/Access.tsx` — alta tenants/usuarios; endpoints `GET/POST /admin/tenants`, `GET/POST /admin/users`.
- `ui/src/pages/admin/notifications/Notifications.tsx` — insights; usa `insightsClient`, `useWorkspaceFilters`, `AppFilterBar`, handoff a chat.

## Archivos peligrosos / mezclados (NO tocar en esta feature)

- `ui/package.json`, `ui/yarn.lock` — COMPARTIDOS. El rename core→platform vive ahí; lo aporta feature-006/021. Si los tocás vos, generás conflictos.
- Los `A` del design-system (`notify.ts`, `AppFilterBar.tsx`, `Notification.tsx`, `copy/notifications.ts`, `fuzzySearch.ts`, `AppButton.tsx`, `ToolbarActionButton.tsx`) — pertenecen a feature-006. No extraer aquí.

## Decisiones ya tomadas

- Extracción **whole-file** de los 2 archivos (diff autocontenido; develop no los cambió en lo relevante).
- NO incluir cambios de `package.json`/`yarn.lock` (vienen con 006/021).
- Dark-mode de estos 2 archivos es parte de feature-016 (NO lo cubrió `reports-dark-mode` #105, que sólo tocó reports).

## Dudas abiertas

- ¿Feature-006 monta el `<Toaster>` de `sonner` en el layout raíz? Si no, los toasts no se ven en runtime. Verificar.
- ¿Feature-006 incluye TODAS las transitivas de `AppFilterBar`? Si 006 se partió en subfeatures, confirmar.

## Qué comandos mirar primero

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-016.txt
git diff fefbe695..3ffcf60 -- ui/src/pages/admin/access/Access.tsx ui/src/pages/admin/notifications/Notifications.tsx
# estado destino:
git show 8c25e88:ui/src/pages/admin/access/Access.tsx | head
git show 8c25e88:ui/package.json | grep -iE "core-browser|platform-browser|sonner|modules-ui-filters"
# presencia de deps en develop:
git show 8c25e88:ui/src/lib/notify.ts            # falla => 006 no está
git show 8c25e88:ui/src/components/filters/AppFilterBar.tsx
```

## Errores a evitar

- NO usar `develop-problematico` como SOURCE (tip vacío/restore). Usar `develop-problematico~1` = `3ffcf60`.
- NO mergear antes que feature-006: build TS roto (imports `@/lib/notify`, `AppFilterBar`, `platform-browser`).
- NO editar `package.json`/`yarn.lock` en esta rama.
- NO retirar el paquete `@devpablocristo/modules-ui-filters` aquí (otras páginas podrían usarlo).

## Camino más seguro

1. Mergear feature-006 (design-system + bump core→platform) en develop.
2. Correr el gate de validación (validation.md).
3. `git checkout develop-problematico~1 -- <los 2 paths>`.
4. `yarn --cwd ui build` + smoke manual.
5. PR a develop.

## PR del otro repo antes/después

Ninguno. Solo-FE; no hay coordinación cross-repo. Único prerequisito es intra-repo: feature-006.
