# validation.md — feature-026 · fe-test-infra

## Checklist pre-PR

- [ ] `git -C <repo> diff --check` **limpio** (corregir tabs/espacios en `ui/e2e/helpers/auth.ts`, `ui/e2e/lots.spec.ts`, `ui/e2e/workorders-stock.spec.ts`).
- [ ] `git ls-files ui/.vite-smoke` → **vacío**.
- [ ] `git grep -n "vite-smoke" ui/` → solo `ui/eslint.config.js`.
- [ ] `.vite-smoke` agregado a `ui/.gitignore` (opcional pero recomendado).
- [ ] Dependencias presentes en develop: 006/007/008/010/011 (fuertes), 014/018 (medias).
- [ ] `git grep -n "e2eWorkspace\|installAuthenticatedSession" ui/e2e` → todos los specs importan del nuevo export sin nombres rotos.

## Tests sugeridos

### BFF (`api/`)
```bash
npm --prefix api ci
npm --prefix api run build         # genera api/dist/** (configService, routes/authMiddleware, utils/forwardQuery)
node --test api/test               # 4 suites: authMiddleware, configService, lotsRoute, workOrdersRoute
```
Esperado: verde. Si falla con `Cannot find module '../dist/...'` → falta dependencia 008/011 (no portar 026b todavía).

### UI e2e (`ui/`)
```bash
yarn --cwd ui playwright test --list          # enumera los 9 specs sin error de import
yarn --cwd ui test:e2e                         # corre Playwright (requiere app levantada / webServer del config)
# subset rápido:
yarn --cwd ui test:e2e ui/e2e/lots.spec.ts ui/e2e/customer-editor-canonical.spec.ts
```
Esperado: verde. "selector not found" / heading "Editar Proyecto" ausente → falta UI de 010/014 (no portar 026c).

### Unit FE (vitest) — sanity, no es parte del flist
```bash
yarn --cwd ui test     # vitest run; confirmar que nada se rompió por el cambio de export en auth.ts
```

## Manual / casos borde

- Workspace E2E: `auth.ts` fija customer 14 / project 29. Verificar que ese contexto existe en el entorno de test; si `/me/context` no resuelve tenant, exportar `E2E_TENANT_ID`.
- Dataset vacío: los specs asumen `lots[0]`, `items[0]`, `rows.length > 0`. Confirmar seed con datos.
- Paginación: `lots.spec.ts` solo clickea "2" si `total > 10`; ok con datasets chicos.
- `drawer-audit.spec.ts`: requiere que exista (o se cree) `docs/audit/drawers/after`; controlado por env `DRAWER_AUDIT_PHASE`.

## Qué revisar en UI / API / DB / env

- **UI:** que las rutas `/admin/lots`, `/admin/stock`, `/admin/work-orders` y el `CustomerEditor` unificado existan en develop.
- **API (BFF):** `api/dist/configService.js`, `dist/routes/authMiddleware.js` (export `decodeTokenPayload`), `dist/utils/forwardQuery.js` (export `buildForwardQuery`) presentes.
- **DB:** nada (sin migraciones).
- **Env:** `BASE_MANAGER_API`, `X_API_KEY` (usados por `configService`), `APP_ENV`/`LOCAL_DEV_AUTH`/`BFF_REQUIRE_TENANT` (validados en `configService.test.js`), `E2E_TENANT_ID`, `DRAWER_AUDIT_PHASE`.

## Qué validar en el otro repo (BE)

Nada que mergear. Solo confirmar (informativo) que el BE expone `/api/v1/me/context`, `/lots`, `/stock`, `/work-orders` con el contrato customer/campaign — lo cubren features BE 008/010/011.

## Señales de incompletitud / incompatibilidad

- `node --test` con `MODULE_NOT_FOUND` apuntando a `dist/` → dependencia faltante.
- `playwright test` con timeouts en `getByRole("heading", { name: "Editar Proyecto" })` → CustomerEditor (010) ausente.
- `git diff --check` con warnings → whitespace sin corregir.
- Reaparición de `ui/.vite-smoke/deps` en `git status` tras un build → falta el ignore.
