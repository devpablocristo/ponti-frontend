# extraction-plan.md — feature-016 · fe-access-notifications

- **repo:** `web` (FE monorepo) — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **rama base:** `develop` (tip `8c25e88`)
- **SOURCE:** `develop-problematico~1` (SHA `3ffcf60`). NUNCA `develop-problematico` (tip vacío/restore).
- **rama sugerida:** `pr/feature-016-fe-access-notifications-fe`

## PR title

`feat(fe): access & notifications pages — toaster unificado, dark-mode y AppFilterBar`

## PR description (sugerida)

> Refactor de las páginas admin `Access` y `Notifications` para alinearlas con el design-system (feature-006):
> - Reemplaza banners inline de error/éxito por el toaster programático `notify.*` (sonner + `<Notification>`).
> - Agrega soporte dark-mode (`dark:*`) en contenedores, inputs, tablas y tarjetas.
> - `Notifications`: migra de `FilterBar` (`@devpablocristo/modules-ui-filters`) a `AppFilterBar` local; memoiza `isResolved`/`isUnread` con `useCallback` (corrige deps de `useMemo`).
> - `Access`: migra import de `core-browser/crud` a `platform-browser/crud`.
>
> Sin cambios de lógica ni endpoints. Solo-FE (sin contraparte BE).
> **Requiere feature-006 (fe-design-system) y el bump core→platform mergeados antes.**

## Dependencias previas (BLOQUEANTES)

1. **feature-006 (fe-design-system)** debe estar en `develop`. Provee: `ui/src/lib/notify.ts`, `ui/src/components/feedback/Notification.tsx`, `ui/src/copy/notifications.ts`, `ui/src/components/filters/AppFilterBar.tsx`, `ui/src/lib/fuzzySearch.ts`, `ui/src/components/Button/AppButton.tsx`, `ui/src/components/Button/ToolbarActionButton.tsx`.
2. **Bump `core-browser` → `platform-browser`** en `ui/package.json` + `ui/yarn.lock` (compartido con 006/021). Sin esto, `Access.tsx` no compila.

Verificar antes de empezar:

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web
git checkout develop && git pull
test -f ui/src/lib/notify.ts && echo "OK notify" || echo "FALTA notify (feature-006 no mergeada)"
test -f ui/src/components/filters/AppFilterBar.tsx && echo "OK AppFilterBar" || echo "FALTA AppFilterBar"
grep -q "platform-browser" ui/package.json && echo "OK platform-browser" || echo "FALTA bump core->platform"
```

Si alguno falla → **NO continuar**; postergar feature-016 hasta que 006 esté mergeada.

## Archivos enteros vs parciales

- **Whole-file (extracción directa):** ambos archivos de mi flist.
  - `ui/src/pages/admin/access/Access.tsx`
  - `ui/src/pages/admin/notifications/Notifications.tsx`
- **Parciales / NO traer:** `ui/package.json`, `ui/yarn.lock` (vienen con 006/021).

## Pasos ordenados

1. Confirmar dependencias previas (bloque de verificación de arriba). Si faltan, STOP.
2. Crear rama desde `develop`.
3. Traer los 2 archivos enteros desde `3ffcf60`.
4. `git diff --check` (whitespace) y revisar `git diff develop -- <los 2 paths>`.
5. `yarn --cwd ui install` (si el lockfile cambió por 006) y `yarn --cwd ui build` / `tsc`.
6. Smoke manual de ambas páginas (ver validation.md).
7. PR contra `develop`.

## Comandos git SUGERIDOS (para un humano — NO los ejecuta el agente)

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web
git checkout develop
git checkout -b pr/feature-016-fe-access-notifications-fe

# Traer los 2 archivos enteros desde el SOURCE correcto:
git checkout develop-problematico~1 -- ui/src/pages/admin/access/Access.tsx
git checkout develop-problematico~1 -- ui/src/pages/admin/notifications/Notifications.tsx

# Revisar:
git diff --check
git diff develop -- ui/src/pages/admin/access/Access.tsx ui/src/pages/admin/notifications/Notifications.tsx

# Si por algún motivo querés sólo algunos hunks (p.ej. omitir el rename core->platform
# porque el bump aún no llegó), usar selección parcial:
git restore -p --source=develop-problematico~1 -- ui/src/pages/admin/access/Access.tsx
```

> Nota: usar `develop-problematico~1` (= `3ffcf60`) explícitamente. No usar `develop-problematico`.

## Qué NO traer

- `ui/package.json`, `ui/yarn.lock` (compartidos 006/021).
- Cualquier archivo `A` del design-system (notify, AppFilterBar, Notification, fuzzySearch, AppButton, ToolbarActionButton): los aporta feature-006.

## Qué podría romperse

- **Build TS roto** si `@/lib/notify`, `../../../components/filters/AppFilterBar` o `@devpablocristo/platform-browser/crud` no resuelven (feature-006 / bump faltante).
- **Runtime:** si `sonner` no tiene su `<Toaster>` montado en el layout raíz (verificar que feature-006 lo agregó), los `notify.*` no se ven.

## Cómo detectar extracción incompleta

- `grep -rn "modules-ui-filters" ui/src/pages/admin/notifications/Notifications.tsx` → debe dar **0** (si aparece, no se aplicó el cambio a `AppFilterBar`).
- `grep -rn "core-browser" ui/src/pages/admin/access/Access.tsx` → debe dar **0**.
- `grep -rn "role=\"alert\"" ui/src/pages/admin/access/Access.tsx` → debe dar **0** (banner inline eliminado).
- `grep -c "dark:" ui/src/pages/admin/notifications/Notifications.tsx` → debe ser > 0.

## Qué validar antes del PR

- `yarn --cwd ui build` y typecheck limpios.
- Toasts visibles, dark-mode OK, sin banners inline. Ver validation.md.

## Qué hacer después de mergear

- Confirmar que ninguna otra página seguía importando `FilterBar` de `modules-ui-filters` si el plan es retirar ese paquete (no es tarea de esta feature; coordinar con 006).
- Verificar que el paquete `modules-ui-filters` puede salir de `package.json` sólo cuando TODAS las páginas migraron a `AppFilterBar`.

## Coordinación con el otro repo

Ninguna. Feature Solo-FE. No hay orden BE-first/FE-first. En el cross-repo-map del BE registrar "feature-016: sin cambios BE".
