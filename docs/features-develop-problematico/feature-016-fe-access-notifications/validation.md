# validation.md — feature-016 · fe-access-notifications

## Pre-condiciones (gate de dependencias)

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web
test -f ui/src/lib/notify.ts && echo "OK notify" || echo "FALTA notify (feature-006)"
test -f ui/src/components/filters/AppFilterBar.tsx && echo "OK AppFilterBar" || echo "FALTA AppFilterBar (feature-006)"
grep -q "platform-browser" ui/package.json && echo "OK platform-browser" || echo "FALTA bump core->platform"
grep -q "sonner" ui/package.json && echo "OK sonner" || echo "FALTA sonner"
```

Si algo falla → no continuar.

## Checklist pre-PR

- [ ] Los 2 archivos provienen de `develop-problematico~1` (3ffcf60), no de `develop-problematico`.
- [ ] `git diff --check` sin errores de whitespace.
- [ ] `grep -rn "modules-ui-filters" ui/src/pages/admin/notifications/Notifications.tsx` → 0 resultados.
- [ ] `grep -rn "core-browser" ui/src/pages/admin/access/Access.tsx` → 0 resultados.
- [ ] `grep -rn "role=\"alert\"" ui/src/pages/admin/access/Access.tsx` → 0 (banner inline eliminado).
- [ ] `grep -c "dark:" ui/src/pages/admin/notifications/Notifications.tsx` → > 0.
- [ ] `ui/package.json` y `ui/yarn.lock` NO están en el diff de esta rama (los aporta 006/021).

## Tests / build sugeridos (FE)

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web
yarn --cwd ui install        # si el lockfile cambió por feature-006
yarn --cwd ui build          # debe compilar sin errores TS
# typecheck directo si existe script:
yarn --cwd ui tsc --noEmit   # o el comando de lint/typecheck del repo
```

> BE: N/A (sin cambios BE). No correr `go test`.

## Smoke manual — página Access (`/admin/access` o ruta equivalente)

- [ ] Crear tenant con nombre válido → toast verde (`notify.success`), lista de tenants actualizada.
- [ ] Crear tenant duplicado/erróneo → toast rojo (`notify.error`).
- [ ] Crear usuario (con/sin "send reset link") → toast de éxito; si error de backend → toast rojo.
- [ ] Ya NO aparece el banner inline al pie del grid.
- [ ] Tabla "Usuarios (Tenant Actual)" legible; estados vacíos muestran "Sin usuarios para mostrar.".
- [ ] Dark-mode: cards `dark:bg-slate-800`, inputs `dark:bg-slate-900`, textos legibles.

## Smoke manual — página Notifications

- [ ] `AppFilterBar` renderiza con los mismos filtros que antes (proyecto/workspace).
- [ ] Contador "X sin leer" + alta severidad correcto.
- [ ] Toggle "incluir resueltos" funciona.
- [ ] Acciones (marcar leído/no leído, resolver, reabrir) optimistas; error → toast rojo (y `error` se limpia, sin re-disparo).
- [ ] Estado vacío "No hay notificaciones por ahora." se ve bien (incluido dark-mode).
- [ ] Ya NO aparece el `<p className="text-red-600">` de error inline.
- [ ] Handoff a chat (`NOTIFICATION_CHAT_HANDOFF_KEY`) sigue funcionando (no se tocó la lógica).

## Casos borde

- Backend offline / 500 al cargar insights → toast de error, no crash.
- Crear usuario con tenant inexistente → mensaje de error vía toast.
- Lista de insights vacía + sin error → estado vacío, no spinner colgado.
- Tema oscuro activo al cargar (no sólo al togglear).

## Qué revisar en UI / API / DB / env

- **UI:** toasts visibles (requiere `<Toaster>` de sonner montado por 006); dark-mode; sin banners viejos.
- **API:** sin cambios de contrato; `apiClient` apunta al BFF correcto.
- **DB:** N/A.
- **env:** sin nuevas variables.

## Qué validar en el otro repo

Nada. Solo-FE.

## Señales de incompletitud / incompatibilidad

- Build falla con "Cannot find module '@/lib/notify'" o "'.../AppFilterBar'" → feature-006 no está.
- Build falla con "Cannot find module '@devpablocristo/platform-browser/crud'" → bump core→platform no está.
- App corre pero ningún toast aparece → `<Toaster>` no montado (006 incompleta).
- Aparecen tanto el banner inline como el toast → el archivo no se reemplazó entero.
