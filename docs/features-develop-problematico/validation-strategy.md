# Validation Strategy — extracciones de `develop-problematico`

> Análisis: 2026-05-30
> Repo: **Frontend monorepo** `web/` = `ui/` (React + Vite) + `api/` (BFF Node/Express). Gestor: **yarn 1.22** (Classic). **No hay workspaces** declarados: cada paquete se instala/buildea con `cd ui` / `cd api`.
> Fuente de extracción: `develop-problematico~1` (SHA `3ffcf60`) — el pico. **NUNCA** el tip (`develop-problematico` = `ac5dd2e`, un `restore` que vacía la app).
> Destino: `develop`.
> Rango fuente del análisis: `fefbe695..3ffcf60`.

Este documento define **cómo validar que cada extracción quedó completa y no rompe** antes de mergear a `develop`. Está dividido en: (A) comandos por capa, (B) checks manuales / detección de extracción incompleta, (C) riesgos de integración, (D) compatibilidad cross-repo (full-stack, BE-first), (E) checklist por tipo de feature.

---

## 0. Aclaración crítica: este repo es solo FE

La tabla de features incluye trabajo de **BE** (Go: `internal/...`, `wire/`, migraciones) y de **FE** (este repo). **El código Go vive en otro repo (`core`/`platform`), no acá.** Por lo tanto:

- Los comandos **BE** (`go build`, `go test`, `golangci-lint`, `migrate up`) **NO se corren en este repo** — se documentan abajo (sección A.1) porque las features full-stack (007, 008, 010, 011, 012, 018) dependen de que el BE esté validado **antes** de mergear el FE, pero ejecutalos en el checkout del repo de backend.
- Las features marcadas `en-este-repo=no` (001, 002, 003, 004, 005, 009, 013, 019, 023, 025, 027) **no tienen artefactos que validar acá**. Solo importan como **precondición** (BE-first) o por su contraparte FE (ej. 009 ↔ páginas en 014 / `ArchivedListPage` en 006).
- Si una feature es full-stack, la validación se parte: **primero** el repo BE (sección A.1, en su checkout), **después** este repo (A.2/A.3).

`go.mod` confirmado ausente en `web/` al 2026-05-30.

---

## A. Comandos de validación por capa

### A.1 Backend (Go) — correr en el repo `core`/`platform`, NO acá

Aplica a features full-stack y BE-only que sean precondición de un merge FE. Orden:

```bash
# 1. compila todo
go build ./...

# 2. tests
go test ./...

# 3. lint
golangci-lint run
```

**Migraciones** (features 002 → migr 227/228/232/233; 003 → 224/225; 007 → 223/226/231/234):

```bash
# verificar con humano: comando/herramienta exacta de migración (mirar Makefile del repo BE / cmd)
migrate up        # o el target Make equivalente (p.ej. `make migrate-up`)
```

- **Orden de migraciones importa.** Aplicar en orden numérico ascendente. Si dos features traen migraciones, mergear/aplicar en orden de dependencia (002 funda 009; 001 funda 003).
- **feature-003 (multitenant-db-hardening): backfill ANTES de constraints.** Las migr 224/225 hacen "backfill → constraints". Si hay datos *stale* (filas sin tenant), el paso de constraint **falla**. Validación: aplicar 224 (backfill), verificar que no quedan filas con `tenant_id` nulo/huérfano, recién después 225 (constraint). Si falla, NO forzar: revisar datos.
- **feature-001 (tenancy refactor): sin cambio de contrato API.** Es un drop de `MaybeTenantScope` → `tenancy.Scope` en ~23 repos. Validación = `go build ./...` + `go test ./...` verdes + `lint-tenant-leaks` (script de 019) sin findings.

> Para todos los comandos BE: si el nombre exacto del target no está claro, **verificar con humano** y como alternativa probable mirar el `Makefile` y `cmd/` del repo de backend.

### A.2 Frontend UI (`ui/`, React + Vite)

```bash
cd ui
yarn install            # o `yarn` — instala deps (lockfile: ui/yarn.lock)
yarn typecheck          # tsc --noEmit  (rápido, primero)
yarn build              # tsc -b && vite build --configLoader runner
yarn lint               # eslint .
yarn test               # vitest run
yarn test:e2e           # playwright test  (necesita app levantada / fixtures; ver C.4)
```

Desde la raíz también existe `yarn build:ui` (hace `cd ui && yarn build`).

- **`knip`**: la tabla (021) menciona `knip` en la config FE, pero al 2026-05-30 **no hay archivo de config de knip ni script `knip` en `ui/package.json`**. Si una extracción de 021 trae la config de knip, agregar el comando `npx knip` (o el script que la feature defina) y **verificar con humano**. Como alternativa: knip detecta exports/archivos/deps sin usar — útil precisamente para detectar extracción incompleta o sobrante (archivos huérfanos).
- **`format:check`** (`prettier --check`) disponible pero no bloqueante; correr antes de PR para evitar ruido de diff.

### A.3 Backend-for-Frontend (`api/`, Node/Express, BFF)

```bash
cd api
yarn install            # lockfile: package-lock.json en raíz (npm) — OJO, mixto (ver C.5)
yarn build              # tsc
yarn lint               # eslint .
yarn test               # npm run build && node --test test   (corre lotsRoute / partialPrice / workOrdersRoute)
```

Desde la raíz: `yarn build:api`.

### A.4 Build integrado / release

```bash
# raíz
yarn build              # build:ui + build:api + move:frontend (copia ui/dist a api/dist/public)

# smoke de release (app levantada en BASE_URL)
make smoke-release BASE_URL=http://localhost:3000
# == bash ./scripts/smoke_release.sh <BASE_URL>
```

El Makefile ofrece atajos: `make build` (ui+bff), `make typecheck`, `make lint`, `make test`, `make dev`, `make up/down` (docker compose).

---

## B. Detección de extracción incompleta

El peor caso de este tipo de extracción quirúrgica (`restore -p` / cherry de archivos sueltos): **compila pero faltan piezas de wiring**. "Verde no alcanza." Checks específicos:

### B.1 FE: ruta o página extraída pero no registrada

- **`ui/src/router.tsx` y `ui/src/main.tsx` son ARCHIVOS MEZCLADOS** (tocados por 006 + casi todas las features FE). Una página puede compilar y aun así no estar enrutada.
  - Check: por cada página nueva (014: customers/fields/lots/workorders/crops/investors/managers/labors/supplies/supply-movements/stock; 010 projects; 015 dashboard; 016 access/notifications; 017 dollar/commercialization; 018 data-integrity; 012 ai), `grep` su componente en `ui/src/router.tsx` y confirmar que hay una `<Route>` que lo monta.
  - `yarn build` NO falla por una ruta faltante. **Hay que navegar la app** (D.2) o revisar el router a mano.

### B.2 BFF: route file extraído pero no montado en el index

- **`api/src/routes/index.ts` es ARCHIVO MEZCLADO.** Hoy monta: projects, customers, campaigns, fields, lots, crops, supplies, categories, types, work-orders, labors, providers, supply_movements, stock_movements, stock, dashboard, reports, data-integrity, ai, admin, insights, form-options (+ auth público, resto detrás de `verifyToken`).
  - Check por feature full-stack: confirmar que el `import` + `router.use("/<path>", ...)` del nuevo dominio está presente. Ej: 007 → `actors`; 010 → `projects`; 012 → `ai`; 018 → `data-integrity`.
  - **TypeScript NO te avisa** si olvidaste el `router.use(...)`: el archivo importa pero la ruta nunca se sirve → FE recibe 404. Detección real: `yarn test` del BFF (si la ruta tiene test) o golpear el endpoint (D.1).
- También revisar `api/src/index.ts` (mezclado: middlewares, `authMiddleware`, `requestContext` para 008).

### B.3 BE: módulo extraído pero no cableado en wire/DI (feature-023)

- `wire/wire.go`, `wire/wire_gen.go`, `cmd/api/main.go` son **MEZCLADOS**. Un handler/usecase puede existir pero no estar provisto en el grafo de wire → no se registra la ruta.
  - Check: `go build ./...` cubre referencias rotas, pero un provider faltante puede compilar y dejar el endpoint sin montar. Confirmar que `wire/actor_providers` (007) / `companion_providers` (012) están referenciados en `wire.go` y regenerar (`go generate ./wire/...` o `wire ./...` — **verificar con humano** el comando exacto).
  - Detección funcional: levantar el BE y golpear el endpoint nuevo (D.1).

### B.4 Imports / símbolos colgando

- FE: `yarn typecheck` (tsc --noEmit) atrapa imports a módulos no extraídos. Si un util compartido (ej. `lib/format`, `lib/theme`, `lib/lifecycle` de 006) no vino, tsc falla → señal de que falta traer una dependencia de la feature.
- BFF: `yarn build` (tsc) cumple lo mismo.

### B.5 Assets / generados

- 021 FE incluye "generated client" y lockfiles. Si se extrae código que consume un cliente generado que no vino, falla en typecheck/build. Si vino el generado pero no su fuente (openapi en 024), puede quedar desincronizado.

---

## C. Riesgos de integración (este repo)

### C.1 Archivos compartidos / peligrosos (resolver conflicto, NO sobrescribir)

`ui/src/router.tsx`, `ui/src/main.tsx`, `api/src/routes/index.ts`, `api/src/index.ts`, `package.json`, `ui/package.json`, `ui/yarn.lock`, `package-lock.json`.

- Estos cambian en **varias** features. Traerlos con `restore` de una sola feature pisa el aporte de las otras. Estrategia: **merge manual** — sumar solo las líneas (rutas, imports, `router.use`, deps) que la feature en cuestión necesita.

### C.2 Orden de merge (dependencias)

- **006 (design-system) es la base de todo el FE.** Mergear primero; el resto de FE depende de sus primitivos + `ArchivedListPage` + `lib`.
- 014 depende de 006/007/009. 007 depende de 001/002/003/004/006. 008 depende de 007. 010 depende de 007/009.
- Mergear en orden topológico evita "compila contra símbolos que aún no existen".

### C.3 Trabajo ya DONE — NO re-extraer

Excluir de las extracciones (ya en `develop`):
- **table-select-filters** → FE #104.
- **reports-dark-mode** → FE #105 (pero la limpieza de json-tags del dominio BE **sigue pendiente** → va en 027).
- **lot-metrics / total_tons** → #117/#121/#124.
- **tentative-prices** → #121/#124 → **excluir de feature-018**.
- **dependency-bumps** (go-jose, x/net) → #124 → **excluir de feature-021** (BE).
- 014: **lots/workorders parcialmente DONE** (#104/#117) → al extraer 014, NO re-traer lo ya mergeado de esas dos entidades; validar que no haya duplicación de rutas/hooks.

### C.4 Playwright e2e

- `ui/e2e/` trae `lots.spec.ts` y `workorders-stock.spec.ts` (+ `helpers/`, `deps/`). Necesitan la app + BFF + posiblemente fixtures/mocks (MSW: `api/src/mocks/`). Si se extrae 026 (test-infra) sin sus mocks/handlers, los specs fallan por entorno, no por la feature. Validar 026 junto a su `api/src/mocks` y `ui/.vite-smoke`.

### C.5 Gestor de paquetes mixto (yarn vs npm)

- Raíz y `ui/` usan **yarn 1.22** (`ui/yarn.lock`). Pero hay un `package-lock.json` en la raíz (npm) y `api/test` corre con `npm run build && node --test`. **Riesgo:** lockfiles desincronizados al extraer 021. Validación: tras tocar deps, `yarn install` en ui y confirmar que `ui/yarn.lock` queda consistente; no mezclar `npm install` y `yarn install` en el mismo paquete. **Verificar con humano** cuál es el gestor canónico de `api/`.

---

## D. Compatibilidad cross-repo (full-stack, regla BE-first)

Features full-stack: **007, 008, 010, 011, 012, 018**. Regla: **el BE se mergea y despliega primero**; el FE recién después de confirmar que el endpoint nuevo responde con el shape esperado.

### D.1 Golpear el endpoint nuevo ANTES de mergear el FE

```bash
# con el BE corriendo (su checkout, BE-first), token válido:
curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:<be-port>/api/v1/actors | jq .   # 007
curl -sS -H "Authorization: Bearer $TOKEN" http://localhost:<be-port>/api/v1/me | jq .        # 008 (array de tenants)
```

- Confirmar **status 2xx** y **shape**. El FE asume el contrato; si el BE no está, el FE rompe en runtime (no en build).

### D.2 Shape-changes que rompen en silencio

- **feature-011 (campaign-dto-projectid):** el BE serializa `project_id` / `id` / `name` en **minúscula**. Si el FE se mergea contra un BE que aún manda `ProjectId`/`Id`/`Name`, **el dropdown de campañas queda vacío** y no hay error. Validación: inspeccionar el JSON real de `/campaigns` y confirmar claves en minúscula **antes** de mergear el FE de 011. Merge **coordinado** (no BE-first puro: si desincronizás en cualquier dirección, se rompe).
- **feature-018 (data-integrity):** coordinado; recordar **excluir tentative-prices** (DONE #121).

### D.3 Contrato archive (feature-009 ↔ FE)

- 009 cambia contrato en ~20 dominios: `DELETE /:id` → `POST /:id/archive` + `DELETE /:id/hard` + `GET /archived`. Su contraparte FE vive en **014** (pages) y **006** (`ArchivedListPage`).
- **Riesgo de desync:** si el FE de 014/006 llama `POST /:id/archive` pero el BE de 009 no está desplegado, archivar falla; o si el BE de 009 está pero el FE sigue haciendo `DELETE /:id`, borra en duro sin querer. Validar BE-first por-entidad (009 sugiere PRs por-entidad) y confirmar que el FE de esa entidad usa los verbos nuevos.

### D.4 CSV vs XLSX (feature-013, BE)

- 013 cambia endpoints de export de **XLSX → CSV** y borra excel. **Revisar consumo FE:** buscar en `ui/` cualquier descarga/parse que asuma `.xlsx` o `Content-Type` de excel. Si el FE espera XLSX y el BE ahora manda CSV, la descarga se corrompe. Validación manual: descargar el export desde la UI tras desplegar 013 y confirmar que abre como CSV.

### D.5 CI / deploy traídos a medias (020, 021, 022)

- 020 (`.github/workflows`), 021 (Docker/compose/vite/tailwind/eslint/knip/tsconfig/lockfiles), 022 (`lefthook.yml`) **pueden romper deploy si se traen sin el resto**. No mergear workflows/config de build aislados de las features que los necesitan. Validar que el pipeline de `develop` sigue verde tras cada extracción de config.

---

## E. Checklist por tipo de feature

**FE-only (006, 014, 015, 016, 017, 026):**
- [ ] `cd ui && yarn install && yarn typecheck && yarn build && yarn lint && yarn test`
- [ ] Rutas registradas en `ui/src/router.tsx` (B.1) — navegar la página en la app
- [ ] Si toca BFF (014 trae routes/utils): `cd api && yarn build && yarn test` + ruta montada en `api/src/routes/index.ts` (B.2)
- [ ] Para 014: **agrupar y validar POR ENTIDAD**; no re-traer lots/workorders ya DONE (C.3)
- [ ] e2e Playwright (si aplica) con mocks de 026 presentes

**Full-stack (007, 008, 010, 011, 012, 018):**
- [ ] BE-first: en su repo `go build ./... && go test ./... && golangci-lint run` (A.1)
- [ ] Migraciones aplicadas en orden; para 003 backfill antes de constraints
- [ ] Endpoint nuevo responde con shape correcto (D.1) **antes** de mergear FE
- [ ] DI/wire cableado (B.3) — endpoint efectivamente montado
- [ ] FE: A.2 + A.3 verdes; ruta FE + route BFF registradas (B.1/B.2)
- [ ] Shape-change validado (011 minúsculas D.2; 009 verbos archive D.3)

**BE-only (001, 002, 003, 004, 005, 009, 013, 019, 023, 025, 027):** — no se valida en este repo
- [ ] En repo BE: `go build`, `go test`, `golangci-lint run`
- [ ] Migraciones en orden (002, 003)
- [ ] 013: revisar consumo FE de exports (D.4)
- [ ] 009: contraparte FE (014/006) usa verbos nuevos (D.3)

**Config / infra / docs (020, 021, 022, 024):**
- [ ] No traer aislado de las features que lo requieren (D.5)
- [ ] 021: excluir dependency-bumps DONE (#124); cuidar lockfiles mixtos (C.5)
- [ ] Pipeline `develop` queda verde

---

## F. Notas para validar con humano

- Comando exacto de **migración** del BE (`migrate up` vs target Make) — verificar; alternativa: mirar `Makefile` y `cmd/` del repo backend.
- Comando exacto de regeneración de **wire** (`wire ./...` vs `go generate`) — verificar en repo backend.
- **`knip`**: no hay config/script en `ui/package.json` al 2026-05-30; si 021 lo trae, agregar `npx knip` y verificar.
- Gestor canónico de **`api/`** (yarn vs npm): hay `package-lock.json` en raíz y `api/test` usa `npm`; confirmar para no desincronizar lockfiles (C.5).
- Puertos reales del BE/BFF para los `curl` de D.1 — tomar de `.env.example` (005) / docker-compose.

> Comandos `git` en este doc son **sugerencias**, no se ejecutan. Cero cambios de código.
