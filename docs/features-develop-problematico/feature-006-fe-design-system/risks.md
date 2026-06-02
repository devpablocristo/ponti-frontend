# risks.md — feature-006 fe-design-system

## Riesgos funcionales

- **R-F1 — Regresión de feedback al usuario**. Al centralizar todo en `notify.*` y reemplazar banners locales, alguna pantalla puede quedar sin feedback (toast no disparado o `useState` huérfano). *Mitigación*: seguir el patrón canónico de `notify.md` (efecto `useEffect(() => { if (msg) notify.error(msg) }, [msg])`); revisar las excepciones listadas (ErrorBoundary, CreateSupplyInline, LoadingOverlay, Login, WorkOrders filtro, Dashboard retry).
- **R-F2 — Errores HTTP mal traducidos**. `formatError` decide entre `translateBackendError`, `userMessage` y fallback. Si el BE devuelve un `code`/`message` no contemplado, el usuario ve el fallback genérico. *Mitigación*: validar casos de error reales contra `copy/http.ts` y `translateBackendError`.
- **R-F3 — Dark mode incompleto**. Páginas con clases Tailwind hardcoded sin variante `dark:` quedarán inconsistentes. *Mitigación*: seguir los patrones de `copy/README.md` (bg-white→dark:bg-slate-800, etc.); QA visual en dark.

## Riesgos técnicos

- **R-T1 — No compila sin feature-014**. `router.tsx` importa `pages/admin/master-data/*`. *Mitigación*: mergear 006+014 juntas o recortar router (camino B en extraction-plan).
- **R-T2 — No compila sin feature-008**. `ProtectedLayout` importa `TenantProvider`; `client.ts` usa `X-Tenant-Id`. *Mitigación*: incluir 008 o rechazar esos hunks en el `restore -p`.
- **R-T3 — Paquete platform-authn ausente**. `authStorage.ts`/`client.ts` no resuelven imports. *Mitigación*: verificar `@devpablocristo/platform-authn` publicado/instalado antes de buildear.
- **R-T4 — Imports residuales a archivos eliminados**. `toast.ts`, `FormButtons`, `Card.tsx`, `TextAreaField`, `schemas.ts`, `useSupplyMovement`, `useLocalStorage`. *Mitigación*: grep (ver extraction-plan §"detectar incompleta") + `yarn build`.

## Riesgos de integración

- **R-I1 — Contrato de envelope `{success,data}`**. El interceptor de `client.ts` envuelve 2xx. Si una feature posterior consume el payload directo, romperá; si una response binaria (blob/arraybuffer) no se detecta bien, el export se corrompe. *Mitigación*: el código ya saltea blobs/arraybuffer; testear exports CSV/PDF.
- **R-I2 — Claves de copy**. `copy/*` es contrato consumido por 014/015/016/017/018. Renombrar o quitar claves rompe consumidores. *Mitigación*: tratar `copy/index.ts` como API pública; tests `copy/entities.test.ts`, `copy/http.test.ts`.

## Riesgos cross-repo

- **R-X1 — Bajo**. Solo-FE; no hay acople de despliegue con BE. El único punto de contacto es semántico (`X-Tenant-Id`, mensajes de error del BE), no bloqueante. Registrar en cross-repo-map del BE: "feature-006 sin cambios BE".

## Riesgos de datos / migración

- **Ninguno**. FE puro, sin DB ni migraciones. El único "dato" persistido nuevo es `localStorage["ponti:theme"]` y los `legacyKeys` de `authStorage` (compat con tokens viejos) — sin riesgo de pérdida.

## Riesgos de archivos compartidos (partial-hunks)

- **R-S1 — router.tsx mal recortado**. Es el archivo más mezclado (006/007/008/010/014/016/017). Un `restore -p` apresurado puede traer rutas de features no porteadas o dejar fuera el code-split. *Mitigación*: revisar hunk por hunk; el code-split (`lazy(...)`) y el `Navigate workspace→dashboard` son de 006; las rutas `master-data`/`actors`/`projects`/`notifications` son de otras features.
- **R-S2 — client.ts: separar 006 de 008**. El hunk de envelope `{success,data}` y el de migración platform-authn son de 006; el de `X-Tenant-Id` es de 008. Mezclarlos sin 008 deja un header tenant que el BE quizá no espera todavía. *Mitigación*: rechazar el hunk de tenant si 008 no entra.
- **R-S3 — Sidebar.tsx**. Mezcla toggle de tema (006) con ítems de menú de master-data/notifications (014/016). *Mitigación*: si va sin 014/016, recortar los ítems de menú que apunten a rutas inexistentes (o quedan links rotos).
- **R-S4 — index.css (699+/308-)**. Cambio enorme; difícil aislar dark-tokens de estilos de páginas nuevas. *Mitigación*: priorizar el bloque `.dark{}` y `--color-*`; si hay estilos de páginas 014/015, dejarlos para esos PRs o aceptarlos (CSS no rompe compilación).

## Riesgos de extracción parcial

- **R-E1 — Solape con #104 (DONE)**. `tableFilters.ts`/`useWorkspaceFilters.ts`/`workspaceQuery.ts` pueden duplicar/contradecir los filtros de tabla ya en `develop`. *Mitigación*: `git diff develop -- ui/src/lib/tableFilters.ts ui/src/hooks/useWorkspaceFilters.ts` antes de sobrescribir; decidir cuál gana.
- **R-E2 — Tests rojos por dependencias**. Tests que importan módulos de 008/014 (vía cadenas de import) podrían fallar si esas features faltan. *Mitigación*: correr `yarn test` y aislar fallos por dependencia vs fallos reales.

## Riesgo de mergear solo este repo / solo el otro

- **Solo FE (este repo)**: el único riesgo real. 006 sola no compila sin 014/008 (ver R-T1/R-T2). Es la razón de la decisión "partir en subfeatures / coordinar con 014/008".
- **Solo BE**: N/A — no hay BE en esta feature.
