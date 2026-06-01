# file-list.md — feature-016 · fe-access-notifications

Fuente de la lista: `/tmp/flists/fe-016.txt` (autoritativa). Son **2 archivos**, ambos `M` (modified).
Diff de verdad: `git -C web diff fefbe695..3ffcf60`. SOURCE de extracción: `3ffcf60` (develop-problematico~1).

## Propios (de esta feature)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/pages/admin/access/Access.tsx` | M | página React (admin) | Página de Accesos: alta de tenants/usuarios. Cambios: `notify` (toaster), efectos error/result, quita banner inline, dark-mode, import `core-browser`→`platform-browser`. | **whole-file** | develop (8c25e88) tiene la misma base que el baseline en lo relevante; el diff es autocontenido. Reemplazar el archivo entero es lo más seguro. | bajo (en sí); alto si faltan deps | alta |
| `ui/src/pages/admin/notifications/Notifications.tsx` | M | página React (admin) | Página de Notificaciones/insights. Cambios: `notify` (toaster + limpieza de `error`), `FilterBar`→`AppFilterBar`, `useCallback` en `isResolved`/`isUnread`, quita `<p>` error inline + `p-4` raíz, dark-mode. | **whole-file** | igual que arriba; diff autocontenido. | bajo (en sí); alto si faltan deps | alta |

## Compartidos (partial-hunks) — NO en mi flist, pero mi feature los necesita

| path | status | tipo | rol | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/package.json` | M (fuera de mi flist) | manifiesto deps | rename `@devpablocristo/core-browser` → `@devpablocristo/platform-browser` (y familia platform-*). `sonner ^2.0.7` YA está en develop. | **do-not-extract-yet** (lo trae feature-006/021) | archivo compartido por casi todas las features FE; no me corresponde editarlo. | alto | alta |
| `ui/yarn.lock` | M (fuera de mi flist) | lockfile | entradas de `platform-browser` y familia | **do-not-extract-yet** (lo trae feature-006/021) | lockfile compartido; conflictos garantizados si lo toco yo. | alto | alta |

## Requeridos por dependencia (feature-006 fe-design-system) — NO en mi flist

Estos archivos fueron **creados** dentro del rango `fefbe695..3ffcf60` pero pertenecen a feature-006. Mis 2 archivos los importan. Listados para trazabilidad; **no los extraigo yo**.

| path | status | rol | extracción | motivo | confianza |
|---|---|---|---|---|---|
| `ui/src/lib/notify.ts` | A | helper toaster (`notify.error/success/...`) usado por ambas páginas | **do-not-extract-yet** (feature-006) | dependencia previa; no está en develop (8c25e88). | alta |
| `ui/src/components/feedback/Notification.tsx` | A | componente visual usado por `notify` | **do-not-extract-yet** (feature-006) | idem | alta |
| `ui/src/copy/notifications.ts` | A | duración/copys de toasts | **do-not-extract-yet** (feature-006) | idem | alta |
| `ui/src/components/filters/AppFilterBar.tsx` | A | filtro local que reemplaza `FilterBar` externo en `Notifications` | **do-not-extract-yet** (feature-006) | idem; no está en develop. | alta |
| `ui/src/lib/fuzzySearch.ts` | A | usado por `AppFilterBar` | **do-not-extract-yet** (feature-006) | idem | alta |
| `ui/src/components/Button/AppButton.tsx` | A | tipos/variantes usados por `AppFilterBar` | **do-not-extract-yet** (feature-006) | idem | media |
| `ui/src/components/Button/ToolbarActionButton.tsx` | A | botón usado por `AppFilterBar` | **do-not-extract-yet** (feature-006) | idem | media |

## Dudosos

(ninguno) — el diff de mis 2 archivos es inequívoco.

## NO traer todavía

- `ui/package.json` y `ui/yarn.lock`: cambios compartidos (core→platform). Llegan con feature-006/021.
- Todos los archivos de la sección "Requeridos por dependencia": pertenecen a feature-006.

## Notas de mapeo (DONE ya porteado)

- El soporte **dark-mode** se solapa conceptualmente con `reports-dark-mode` (FE #105, DONE). PERO los hunks `dark:*` de **mis 2 archivos** NO fueron porteados (#105 sólo tocó reports). Por eso siguen siendo parte de feature-016.
- `table-select-filters` (FE #104, DONE) introdujo filtros de tabla; `AppFilterBar` aquí es del design-system (006), no de #104. Sin colisión.
