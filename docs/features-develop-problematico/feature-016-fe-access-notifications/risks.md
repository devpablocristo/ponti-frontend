# risks.md — feature-016 · fe-access-notifications

## Riesgos funcionales

- **Cambio de UX (bajo):** banners inline → toasts flotantes. Es el comportamiento deseado, pero un usuario acostumbrado al banner persistente al pie del grid de `Access` puede notar el cambio. Mitigación: ninguna necesaria; documentar en release notes.
- **Notifications limpia `error` tras notificar (bajo):** `setError("")` en `useEffect` evita re-disparos en re-render; si una futura feature lee `error` para otra cosa, se rompería esa lectura. Mitigación: si se agrega consumo de `error`, no asumir persistencia.

## Riesgos técnicos

- **ALTO — imports no resueltos:** `@/lib/notify` y `../../../components/filters/AppFilterBar` NO existen en `develop` (8c25e88). Mergear esta feature sin feature-006 rompe el build TS. Mitigación: gate de verificación previo (ver extraction-plan.md), mergear 006 primero.
- **ALTO — paquete `platform-browser` ausente:** `Access.tsx` importa `@devpablocristo/platform-browser/crud`; develop aún declara `core-browser`. Falla de resolución de módulo. Mitigación: el bump de `package.json`/`yarn.lock` (006/021) debe estar antes.
- **MEDIO — `<Toaster>` no montado:** si feature-006 no montó el provider de `sonner` en el layout raíz, `notify.*` se ejecuta sin error pero no se ve nada. Mitigación: verificar montaje del `<Toaster>` en runtime.

## Riesgos de integración

- **Orden de merge:** única dependencia es feature-006. No hay BE. Riesgo concentrado en el orden intra-repo.

## Riesgos cross-repo

- Ninguno. Solo-FE. Mergear este repo solo NO afecta BE y NO requiere cambios BE. (Mergear "solo el otro repo" no aplica: BE no tiene contraparte.)

## Riesgos de datos / migración

- Ninguno. Sin DB, sin migraciones, sin cambios de contrato de API.

## Riesgos de archivos compartidos

- `ui/package.json` / `ui/yarn.lock`: el rename core→platform vive ahí y es compartido por 006/021 y el resto del FE. Si feature-016 los tocara, habría conflictos de merge. Mitigación: **NO editarlos en esta feature**; dejar que los traiga 006/021.
- `Notifications.tsx` deja de usar `@devpablocristo/modules-ui-filters`: NO retirar el paquete del manifiesto en esta feature (otras páginas podrían seguir usándolo). Mitigación: retiro coordinado con 006.

## Riesgos de extracción parcial

- Si por error se trae sólo `Notifications.tsx` y no `Access.tsx` (o viceversa): no hay acople entre ambos, así que compilan independientemente, pero la feature queda a medias. Mitigación: traer los 2 juntos.
- Si se usa `develop-problematico` (tip vacío) en lugar de `develop-problematico~1` como SOURCE: se traería contenido restaurado/vacío. Mitigación: usar SIEMPRE `develop-problematico~1` (= `3ffcf60`).

## Riesgo de mergear solo este repo / solo el otro

- **Solo este repo (FE):** seguro siempre que feature-006 esté antes. No hay efecto sobre BE.
- **Solo el otro repo (BE):** N/A — no hay cambios BE.
