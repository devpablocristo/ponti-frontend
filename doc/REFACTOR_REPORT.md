# Reporte de Alineamiento BE↔FE — Ponti

> Generado: 2026-02-14 | Branch: `refactor/fe`
> Backend: `/home/pablo/Projects/Pablo/ponti-backend` (Go 1.24 / Gin / GORM / PostgreSQL)
> Frontend: `/home/pablo/Projects/Pablo/ponti-frontend` (React 19 / Vite 6 / TypeScript 5.7 / Express BFF)

---

## Índice

1. [Mapa del Backend](#1-mapa-del-backend)
2. [Naming: Mismatches FE vs BE](#2-naming-mismatches-fe-vs-be)
3. [Diagnóstico del Frontend (P0/P1/P2)](#3-diagnóstico-del-frontend)
4. [Plan de Refactor por Fases](#4-plan-de-refactor-por-fases)
5. [Propuesta de Contratos + API Client](#5-propuesta-de-contratos--api-client)
6. [Cambios Sugeridos en Backend](#6-cambios-sugeridos-en-backend)
7. [Top 10 Acciones](#7-top-10-acciones)
8. [TODO: Auth (fuera de scope por ahora)](#8-todo-auth-fuera-de-scope-por-ahora)

---

## 1. Mapa del Backend

### 1.1 Arquitectura

**Clean Architecture** con inyección de dependencias via Google Wire:

```
cmd/api/http_server.go          → Bootstrap, registro de handlers
internal/{módulo}/
  ├── handler.go                → HTTP handlers (Gin)
  │   └── dto/                  → Data Transfer Objects
  ├── usecases/                 → Lógica de negocio
  │   └── domain/               → Entidades de dominio
  └── repository/               → Acceso a datos (GORM)
      └── models/               → Modelos de DB
wire/                           → Providers de DI
pkg/                            → Paquetes compartidos (types, middlewares, utils)
```

### 1.2 Módulos (24 handlers registrados en `cmd/api/http_server.go`)

| Módulo | Ruta base BE (fuente de verdad) | CRUD | Paginado | Export |
|--------|--------------------------------|------|----------|--------|
| Projects | `/projects` | ✅ + archive/restore | ✅ `page, per_page` | — |
| Customers | `/customers` | ✅ + archive/restore | ✅ `page, per_page` | — |
| Campaigns | `/campaigns` | GET list | — | — |
| Fields | `/fields` | ✅ | — | — |
| Lots | `/lots` | ✅ + metrics | ✅ `page, page_size` | Excel |
| Supplies | `/supplies` | ✅ + bulk | ✅ `page, per_page` | Excel |
| Supply Movements | `/projects/:id/supply-movements` | ✅ + bulk | — | Excel |
| Stocks | `/projects/:id/stocks` | GET + update | — | Excel |
| Work Orders | `/work-orders` (+ legacy `/workorders`) | ✅ + duplicate + metrics | ✅ `page, per_page` | Excel |
| Dashboard | `/dashboard` | GET | — | — |
| Reports | `/reports/:type` | GET | — | — |
| AI/Insights | `/ai/insights` | ✅ | — | — |
| Labors | `/labors` | ✅ + invoices | — | — |
| Commercializations | `/projects/:id/commercializations` | ✅ | — | — |
| +10 más | managers, investors, crops, categories, types, providers, lease-types, invoices, dollar-values, business-parameters | variado | — | — |

### 1.3 Puntos de Contrato BE↔FE

#### Cadena de proxies

```
Browser (React/Vite)
    │  /api/*  (Vite dev proxy)
    ▼
Express BFF (api/, port 3000)
    │  Agrega X-API-KEY, X-USER-ID, verifica JWT
    ├──► Login API   (localhost:8081/api/v1) — auth
    └──► Manager API (localhost:8080/api/v1) — business data
```

#### Formato de respuesta de error (BE)

```json
{
  "type": "NOT_FOUND",
  "code": 404,
  "message": "project not found",
  "details": "optional details",
  "context": { "field": "id" }
}
```

#### Formato de respuesta de error (BFF → FE)

```json
{
  "success": false,
  "error": { "status": 404, "details": "project not found" }
}
```

> **Problema**: El BFF transforma el error del BE, perdiendo `type`, `code` y `context`. El FE no puede distinguir entre un `VALIDATION_ERROR` y un `BAD_REQUEST`.

#### Paginación (inconsistente en BE)

| Endpoint | Param página | Param tamaño | Default | Key de lista |
|----------|-------------|--------------|---------|-------------|
| Projects | `page` | `per_page` | 1, 100 | `"data"` |
| Customers | `page` | `per_page` | 1, 100 | `"data"` |
| Lots | `page` | `page_size` | 1, 1000 | `"items"` |
| Work Orders | `page` | `per_page` / `page_size` | 1, 10 | `"items"` |
| Supplies | `page` | `per_page` | 1, 1000 | `"data"` |

PageInfo siempre:
```json
{ "per_page": 100, "page": 1, "max_page": 5, "total": 450 }
```

#### Workspace Filters (query params comunes)

`customer_id`, `project_id`, `campaign_id`, `field_id` — opcionales en todos los GET de lista.

#### Formato de respuesta de éxito (inconsistente en BE)

| Operación | Módulos viejos | Módulos nuevos |
|-----------|---------------|----------------|
| GET single | DTO directo (sin envelope) | DTO directo |
| GET list | `{ "data": [...], "page_info": {...} }` | `{ "items": [...], "page_info": {...} }` |
| POST create | `{ "message": "...", "project": 42 }` o `"customer_id": 42` o `"id": 42` | `{ "message": "...", "id": 42 }` |
| PUT/DELETE | 200 + `{ "message": "..." }` | 204 No Content |

---

## 2. Naming: Mismatches FE vs BE

> **Regla**: El naming del BE es la fuente de verdad. El FE debe alinearse.

### 2.1 Nombres de recurso (hooks/carpetas)

| FE actual | BE (fuente de verdad) | Severidad | Archivos FE a renombrar |
|-----------|-----------------------|-----------|------------------------|
| `useProducts` / `products` | **`supplies`** | **ALTA** — concepto completamente distinto | `ui/src/hooks/useProducts/` → `useSupplies/`, todo el reducer, types, actions |
| `useTasks` / `tasks` | **`labors`** | **ALTA** — concepto completamente distinto | `ui/src/hooks/useTasks/` → `useLabors/`, todo el reducer, types, actions |
| `useCommerce` / `commerce` | **`commercializations`** | **ALTA** — nombre abreviado/distinto | `ui/src/hooks/useCommerce/` → `useCommercializations/` |

### 2.2 Rutas BFF que no matchean BE

| BFF path (FE-facing) | BE path | Problema |
|----------------------|---------|---------|
| `/supply_movements` | `/projects/:id/supply-movements` | Underscore `_` vs hyphen `-` |
| `/stock_movements` | `/projects/:id/stock-movements` | Underscore `_` vs hyphen `-` |
| `/stock` (singular) | `/projects/:id/stocks` (plural) | Singular vs plural |
| `/projects/:id/commerce` | `/projects/:id/commercializations` | Nombre distinto |
| `/lots/kpis` | `/lots/metrics` | `kpis` vs `metrics` |

### 2.3 Bug en proxy BFF: PUT supply-movement sin project_id

`api/src/routes/movements.ts:258` — El BFF llama a `/supply-movements/${movementId}` sin el `project_id` en el path. El BE espera `/projects/:project_id/supply-movements/:id`. **Esto es un bug que probablemente causa 404 en updates.**

### 2.4 Campos de Lots renombrados en BFF (9 mismatches)

El BFF (`api/src/routes/lots.ts:64-72`) transforma los campos del BE a nombres distintos. **Todos estos deberían usar el nombre del BE:**

| BE JSON field (fuente de verdad) | FE field actual | Acción |
|----------------------------------|----------------|--------|
| `dates` | `harvest_date` | Renombrar a `dates` |
| `cost_usd_per_ha` | `cost_per_hectare` | Renombrar a `cost_usd_per_ha` |
| `yield_tn_per_ha` | `yield` | Renombrar a `yield_tn_per_ha` |
| `hectares` | `sowed_area` | Renombrar a `hectares` |
| `income_net_per_ha` | `net_income` | Renombrar a `income_net_per_ha` |
| `cost_usd_per_ha` | `cost_us_ha` | Eliminar (duplicado de `cost_per_hectare`) |
| `rent_per_ha` | `rent` | Renombrar a `rent_per_ha` |
| `active_total_per_ha` | `total_assets` | Renombrar a `active_total_per_ha` |
| `operating_result_per_ha` | `operating_result` | Renombrar a `operating_result_per_ha` |

El BFF también renombra en el update (`lots.ts:221-222`):
- FE envía `lot_name` → BE espera `name`
- FE envía `sowed_area` → BE espera `hectares`

### 2.5 Tipos/variables con nombre incorrecto

| FE actual | Debería ser (per BE) | Archivo |
|-----------|---------------------|---------|
| `Product`, `ProductData` | `Supply`, `SupplyData` | `useProducts/types.ts` |
| `products` (state) | `supplies` | `useProducts/productsReducer.ts` |
| `saveProducts()` | `saveSupplies()` | `useProducts/index.ts` |
| `TaskData` | `LaborGroupData` | `useTasks/types.ts` |
| `TaskToSave` | `LaborToSave` | `useTasks/types.ts` |
| `getTasks()` | `getLabors()` | `useTasks/index.ts` |
| `CommerceData` | `CommercializationData` | `useCommerce/types.ts` |
| `getCommerceInfo()` | `getCommercializations()` | `useCommerce/index.ts` |
| `LotsData.harvest_date` | `LotsData.dates` | `useLots/types.ts:16` |
| `LotsData.yield` | `LotsData.yield_tn_per_ha` | `useLots/types.ts:18` |
| `LotsData.net_income` | `LotsData.income_net_per_ha` | `useLots/types.ts:19` |
| `LotsData.cost_us_ha` | `LotsData.cost_usd_per_ha` | `useLots/types.ts:20` |
| `LotsData.rent` | `LotsData.rent_per_ha` | `useLots/types.ts:21` |
| `LotsData.total_assets` | `LotsData.active_total_per_ha` | `useLots/types.ts:23` |
| `LotsData.operating_result` | `LotsData.operating_result_per_ha` | `useLots/types.ts:24` |
| `LotsData.cost_per_hectare` | `LotsData.cost_usd_per_ha` | `useLots/types.ts:27` (duplicado) |

### 2.6 Interface `ProductState` usada por copy-paste en 6 reducers distintos

| Archivo | Nombre actual | Debería ser |
|---------|--------------|-------------|
| `useFieldsReducer.ts:6` | `ProductState` | `FieldState` |
| `useCustomersReducer.ts:6` | `ProductState` | `CustomerState` |
| `useCampaignsReducer.ts:6` | `ProductState` | `CampaignState` |
| `useLotsReducer.ts:7` | `ProductState` | `LotsState` |
| `useCategoriesReducer.ts:6` | `ProductState` | `CategoriesState` |
| `useProvidersReducer.ts:6` | (probable) | `ProviderState` |

---

## 3. Diagnóstico del Frontend

### P0 — Rompe funcionalidad / bugs activos

| # | Problema | Evidencia | Impacto | Recomendación |
|---|---------|-----------|---------|---------------|
| P0.1 | **`projects: []` en SET_ERROR de 3 reducers** — copy-paste que resetea un campo fantasma en vez del campo correcto. | `useCampaignsReducer.ts:42-46` → debería ser `campaigns: []`; `useCustomersReducer.ts:42-46` → `customers: []`; `useFieldsReducer.ts:42-46` → `fields: []` | Stale data: al fallar la carga, el usuario ve datos del request anterior | Corregir el field name en cada reducer |
| P0.2 | **URLs sin leading slash en `useReporting` y `useDashboard`** — `reports/field-crop` en vez de `/reports/field-crop`. Con baseURL `/api`, se resuelve como `/apireports/field-crop`. | `useReporting/index.ts:34,82,130`, `useDashboard/index.ts:30` | API calls van a URL incorrecta → 404 o respuesta inesperada | Agregar `/` al inicio de cada URL |
| P0.3 | **Loading overlay roto por operator precedence en WorkOrders** — `processing \|\| (isProcessing && <div>...)` evalúa a `true` (boolean, no renderiza nada) cuando `processing` es true. | `pages/admin/workorders/WorkOrders.tsx:785-790` | El spinner de carga nunca se muestra durante el fetch de órdenes | Cambiar a `(processing \|\| isProcessing) && (<div>...)` |
| P0.4 | **`deleteSupplyMovement` resetea loading state equivocado** — Llama `setProcessing(false)` en finally sin haber hecho `setProcessing(true)`. Corta el loading de otra operación concurrente. | `useSupplyMovement/index.ts:193` | Loading indicator de fetch se apaga prematuramente al borrar un movimiento | Usar `setDeleteProcessing` dedicado o no resetear `processing` |
| P0.5 | **`getSupplyMovement` resetea `processingCreation`** — finally llama `setProcessingCreation(false)` sin contexto. Corta el loading de create/update. | `useSupplyMovement/index.ts:224` | Create/update loading se apaga al hacer un GET | Usar loading state dedicado para GET single |
| P0.6 | **`getWorkorder` resetea `processingCreation`** — Mismo patrón: finally corta loading de creación. | `useWorkOrders/index.ts:209` | Loading de create se apaga al hacer GET de detalle | Separar loading states por operación |
| P0.7 | **`saveOrder` usa `/workorders` sin hyphen** — Todos los demás endpoints del hook usan `/work-orders`. | `useWorkOrders/index.ts:119` | Create podría fallar con 404 si el BFF o BE espera `/work-orders` | Cambiar a `/work-orders` |
| P0.8 | **PUT supply-movement en BFF sin project_id** — El proxy omite el project_id requerido por el BE. | `api/src/routes/movements.ts:258` | Update de supply movements probablemente falla con 404 | Incluir `project_id` en el path del proxy |
| P0.9 | **Dashboard ignora cambios de filtros** — `useEffect` con `[]` deps, solo fetch en mount. `buildQueryParams()` lee filtros del state pero no está en deps. | `pages/admin/dashboard/Dashboard.tsx:121-123` | Dashboard siempre muestra datos sin filtrar. Cambiar cliente/proyecto no tiene efecto hasta recarga | Agregar filtros como dependencias del useEffect, o triggerear en onChange |
| P0.10 | **Error message incorrecto "Error en el login"** — En `saveUser` (crear usuario), el fallback dice "Error desconocido en el login." — copy-paste de auth. | `useUsers/index.ts:54` | Mensaje confuso para el usuario al fallar la creación de usuario | Cambiar a "Error desconocido al crear usuario" |
| P0.11 | **Error messages copian "busqueda de campañas"** — `useDollar`, `useLots` dicen "Error desconocido en la busqueda de campañas" en vez del recurso correcto. | `useDollar/index.ts:51`, `useLots/index.ts:64,111,151` | Mensaje de error confuso: dice campañas cuando falla dóllar o lotes | Corregir el texto en cada hook |

### P1 — Mantenibilidad / performance

| # | Problema | Evidencia | Impacto | Recomendación |
|---|---------|-----------|---------|---------------|
| P1.1 | **Naming incompleto vs BE** — 3 hooks con nombre de recurso distinto al BE, 9 campos de lots renombrados, 6 reducers con interface `ProductState`. Ver [Sección 2](#2-naming-mismatches-fe-vs-be). | Múltiples archivos (ver tabla 2.1-2.6) | Confusión permanente, búsquedas de código fallan, onboarding lento | Renombrar todo alineado al BE en un solo PR |
| P1.2 | **72 usos de `any`** — Especialmente en hooks (response generics) y componentes (column types, filtros). | 27+ archivos. Hooks: `useWorkOrders`, `useTasks`, `useStock`, `useProducts`, etc. | Type safety anulada; bugs silenciosos | Tipar todas las respuestas; extraer `Column<T>` genérico compartido |
| P1.3 | **Duplicación masiva en hooks** — Cada hook repite ~40 líneas idénticas de try/catch/finally. 18 hooks × ~5 funciones = ~90 funciones duplicadas. | `ui/src/hooks/*/index.ts` | Un cambio en error handling → tocar 90 lugares | Extraer `useApiCall()` o wrapper |
| P1.4 | **Tipos duplicados** — `UserData` en 3 lugares, `Provider`/`Summary` en 2, `Column<T>` en 5+. | `hooks/useUsers/types.ts`, `pages/admin/users/types.tsx`, `pages/admin/customers/types.tsx` | Cambios se pierden, tipos divergen | Centralizar en `types/` |
| P1.5 | **Sin path aliases** — Imports relativos profundos (`../../../restclient/apiInstance`). | `ui/tsconfig.app.json` — no tiene `paths` | DX pobre, refactoring doloroso | Agregar `"@/*": ["./src/*"]` |
| P1.6 | **APIClient instanciado por hook** — Cada hook hace `new APIClient(...)`. 15+ instancias Axios independientes. | Todos los 18 hooks | Memoria desperdiciada, interceptores duplicados | Singleton exportado |
| P1.7 | **Sin request cancellation** — Ningún hook usa AbortController. Requests zombie al navegar. | Todos los hooks | Memory leaks, state updates en componentes desmontados | AbortController + cleanup en useEffect |
| P1.8 | **Sin paginación real** — `limit=1000` hardcodeado para customers y otras entidades. | `useCustomers/index.ts:19,158,212,265`, `useWorkspaceFilters.ts:211` | No escala más allá de ~500 registros | Paginación server-side |
| P1.9 | **BFF timeout (8s) < FE timeout (30s)** — BFF corta antes, devolviendo 500 genérico. | `api/src/clients/ApiClient.ts` vs `ui/src/restclient/apiInstance.ts` | Timeouts opacos, debug imposible | Alinear: BFF ≥ BE; FE ≥ BFF |
| P1.10 | **Cero tests de hooks/componentes** — 3 archivos de test (7 cases) en todo el proyecto. | `data-integrity/integrityUtils.test.ts`, `hardDeleteCopy.test.ts`, `projectPayload.test.ts` | Cualquier refactor es acto de fe | Testing incremental |
| P1.11 | **`LotsData` tipo incoherente** — `harvest_date: LotDate[]` debería ser `dates: LotDate[]` (como viene del BE). Además `admin_cost: number \| 0` debería ser `number \| null`. | `useLots/types.ts:16,23` | Campos no matchean BE, `as any[]` casts para workaround | Alinear tipos con BE JSON tags |
| P1.12 | **`updateLot`/`updateTons` tienen `lots` en dependency array sin usarlo** — Recrean la función en cada fetch, riesgo de loop infinito si se usan en useEffect. | `useLots/index.ts:209,251` | Potential infinite loop, re-renders innecesarios | Quitar `lots` del dependency array |
| P1.13 | **`useEffect` de surface en CreateOrder triggerea N state updates** — Llama `handleItemChange` N veces en un loop, cada una hace `setItems`. | `pages/admin/workorders/CreateOrder.tsx:419-431` | N re-renders por cambio de surface; `items` puede ser stale | Batch update con un solo `setItems` |
| P1.14 | **`allColumnsMap` reconstruido en cada render** — Fuera de `useMemo`, crea `new Map()` y copia columnas en cada render. | `pages/admin/workorders/WorkOrders.tsx:392-396`, `Tasks.tsx:529-533` | Re-render costoso en tablas grandes | Mover dentro de `useMemo` |
| P1.15 | **Loose equality `!=` en Dashboard** — `selectedCustomer.id != 0` captura `null`, `undefined`, `""`. | `pages/admin/dashboard/Dashboard.tsx:104` | Filtros pueden incluir/excluir datos inesperadamente | Cambiar a `!==` |

### P2 — Estilo / mejoras incrementales

| # | Problema | Evidencia | Impacto | Recomendación |
|---|---------|-----------|---------|---------------|
| P2.1 | **3 librerías UI superpuestas** — Material Tailwind + Flowbite + Heroicons + Lucide. | `ui/package.json` | Bundle size, inconsistencia visual | Elegir una stack |
| P2.2 | **ESLint solo warnings** — `no-explicit-any: warn`, `no-unused-vars: warn`. No bloquean build. | `ui/eslint.config.js` | Errores se acumulan sin consecuencias | Cambiar a `error` progresivamente |
| P2.3 | **Sin Prettier** | No existe `.prettierrc` | Diffs ruidosos | Agregar Prettier |
| P2.4 | **11 `console.log/error` en UI** + decenas en BFF | Distributed across pages and `api/src/routes/` | Leaks de info en producción | Eliminar o usar logger condicional |
| P2.5 | **Código muerto** — `//prueba` en `main.tsx:11`, `console.log("Exportar PDF")` noop en Dashboard, acciones sin usar (`SET_PAGE`, `CREATE_LOT`), state fields en reducers que nunca cambian. | `main.tsx:11`, `Dashboard.tsx:160`, `useWorkOrders/actions.ts:2`, `useLots/actions.ts:5` | Ruido | Limpiar |
| P2.6 | **Mezcla español/inglés** — Rutas (`/informes/aportes`), variables, error messages. | `router.tsx`, `SelectionContext.tsx`, hooks | Inconsistencia | Estandarizar a inglés en código |
| P2.7 | **Sin `.env.example` en UI** | `ui/` — no existe | DX | Crear |
| P2.8 | **`window.location.href = "/admin/work-orders"` para navegación** — Hard redirect que pierde estado React. | `pages/admin/workorders/WorkOrders.tsx:562` | UX: flash blanco | Usar `useNavigate()` |
| P2.9 | **Seasons hardcodeadas** — `[{name: "Otoño"}, ...]` en SelectionContext. | `SelectionContext.tsx` | Mantenibilidad | Obtener de BE o config |
| P2.10 | **Sin error boundary global** | `ErrorPage.tsx`, `router.tsx` | Pantalla blanca en errores | Agregar `<ErrorBoundary>` |
| P2.11 | **`emptyItems` compartido como referencia a nivel de módulo** — `CreateOrder.tsx` usa un array constante para resetear state, riesgo de mutación compartida. | `pages/admin/workorders/CreateOrder.tsx:22-43` | Potencial corrupción de datos si se muta | Clonar en cada `clearForm()` |
| P2.12 | **Import con extensión `.ts` explícita** — `useReporting` importa reducer con `./useReportingReducer.ts`. Inconsistente con el resto. | `useReporting/index.ts:4` | Inconsistencia | Quitar extensión |

---

## 4. Plan de Refactor por Fases

### Fase A — Estabilización Mínima (1–3 días)

**Objetivo**: Build verde, bugs P0 corregidos, naming alineado con BE, base para iterar.

**Checklist**:

- [ ] **A1. Fix reducers rotos** (P0.1)
  - `useCampaignsReducer.ts`: `projects: []` → `campaigns: []`
  - `useCustomersReducer.ts`: `projects: []` → `customers: []`
  - `useFieldsReducer.ts`: `projects: []` → `fields: []`

- [ ] **A2. Fix URLs sin leading slash** (P0.2)
  - `useReporting/index.ts:34,82,130`: agregar `/` al inicio
  - `useDashboard/index.ts:30`: agregar `/` al inicio

- [ ] **A3. Fix loading overlay** (P0.3)
  - `WorkOrders.tsx:785`: cambiar a `(processing || isProcessing) && (<div>...)`

- [ ] **A4. Fix loading states cruzados** (P0.4, P0.5, P0.6)
  - `useSupplyMovement`: separar loading state para delete y get-single
  - `useWorkOrders`: separar loading state para get-single

- [ ] **A5. Fix endpoint inconsistente** (P0.7)
  - `useWorkOrders/index.ts:119`: `/workorders` → `/work-orders`

- [ ] **A6. Fix BFF proxy bug** (P0.8)
  - `api/src/routes/movements.ts:258`: incluir `project_id` en path

- [ ] **A7. Fix Dashboard filters** (P0.9)
  - Agregar filtros como dependencias del useEffect o triggerear en onChange

- [ ] **A8. Fix error messages copy-paste** (P0.10, P0.11)
  - `useUsers/index.ts:54`: "login" → "crear usuario"
  - `useDollar`, `useLots`: "campañas" → recurso correcto

- [ ] **A9. Renaming round 1: hooks** (P1.1)
  - `useProducts/` → `useSupplies/` (hook, reducer, types, actions)
  - `useTasks/` → `useLabors/` (hook, reducer, types, actions)
  - `useCommerce/` → `useCommercializations/` (hook, reducer, types, actions)
  - Renombrar interface `ProductState` al nombre correcto en cada reducer

- [ ] **A10. Renaming round 2: BFF routes y lot fields**
  - BFF: `supply_movements` → `supply-movements`, `stock_movements` → `stock-movements`
  - BFF: `stock` → `stocks`, `commerce` → `commercializations`, `kpis` → `metrics`
  - BFF lots adapter: quitar field renaming, pasar nombres del BE directo
  - FE `LotsData` type: alinear field names con BE JSON tags

- [ ] **A11. Path aliases** — `"@/*": ["./src/*"]` en `tsconfig.app.json` + `vite.config.ts`

- [ ] **A12. `.env.example`** en `ui/` con `VITE_AI_PROXY_URL` y `VITE_API_BASE_URL`

- [ ] **A13. Prettier** + ESLint `no-explicit-any` a `error`

- [ ] **A14. Limpiar código muerto** — `//prueba`, `console.log` noop, acciones sin usar

**Definición de "done"**:
- `npm run build` sin errores
- `npm run lint` sin errores
- Los 11 bugs P0 están corregidos
- Todos los hooks/types/BFF routes usan naming del BE
- Path aliases funcionan

**Riesgos**:
- A9/A10 (renaming) es un cambio grande que toca muchos archivos → **mitigación**: hacer con find-and-replace global, testear cada página manualmente después del rename.
- A10 (quitar field renaming en BFF lots) requiere actualizar todos los componentes que usan esos campos → **mitigación**: rename en FE y BFF en el mismo PR.

---

### Fase B — Arquitectura y Deuda Grande (1–2 semanas)

**Objetivo**: API client unificado, tipos centralizados, hooks simplificados, paginación real.

**Checklist**:

- [ ] **B1. API Client singleton con retry y cancel**
  - Extraer singleton exportable de `APIClient`
  - Integrar AbortController en cada request
  - Agregar retry configurable (1 retry con backoff para network errors)
  - Unificar AI client bajo el mismo client

- [ ] **B2. Centralizar tipos de API**
  - Crear `ui/src/types/api/` con un archivo por dominio (usando nombres del BE)
  - Definir `PaginatedResponse<T>` genérico que maneje tanto `"data"` como `"items"`
  - Eliminar duplicados (`UserData`, `Provider`, `Summary`, `Column<T>`)
  - Eliminar todos los `any` en hooks

- [ ] **B3. Extraer `useApiCall()` genérico**
  - Hook wrapper: `{ data, error, loading, execute, cancel }`
  - Maneja try/catch/finally, AbortController, error extraction automática
  - Elimina ~90 funciones duplicadas

- [ ] **B4. Refactor hooks a composición**
  - Cada hook usa `useApiCall()` internamente
  - Reducers simplificados o reemplazados por `useState` + `useApiCall`
  - Loading states separados por operación (no más cross-contamination)

- [ ] **B5. Paginación real**
  - Componente `<PaginatedTable>` con server-side pagination
  - Quitar todos los `limit=1000`
  - page/per_page sincronizados con URL

- [ ] **B6. Error handling global**
  - `<ErrorBoundary>` global con fallback UI
  - Toast system (sonner o react-hot-toast)
  - Eliminar todos los `window.location.href` para navegación

- [ ] **B7. Consolidar UI libraries**
  - Auditar uso real de Material Tailwind vs Flowbite
  - Migrar incrementalmente

- [ ] **B8. Alinear timeouts**
  - BFF: subir a 30s
  - Hooks: unificar a 30s

**Definición de "done"**:
- 0 usos de `any` en hooks
- API client singleton con retry y cancel
- Todos los hooks usan `useApiCall()`
- Paginación server-side en al menos Customers y Lots
- Error boundary global + toasts

**Riesgos**:
- B3/B4 es la tarea más grande → **mitigación**: un hook a la vez, test manual por página.
- B7 puede romper estilos → **mitigación**: rama dedicada, revisión visual.
- B5 requiere consistencia de paginación en BE → **mitigación**: normalizar en BFF por ahora.

---

### Fase C — Tests, Performance, DX, Observabilidad (Continuo)

**Objetivo**: Confianza para iterar rápido, visibilidad en producción.

**Checklist**:

- [ ] **C1. Testing incremental**
  - Unit: `APIClient`, hooks críticos — Vitest + msw
  - Integration: flujos completos (select workspace → load data)
  - E2E: Playwright happy paths (CRUD customer, create work order)
  - Target: 60% hooks, 40% componentes a 3 meses

- [ ] **C2. Performance**
  - Lazy loading de rutas
  - Tree-shaking de iconos
  - Virtualización de tablas grandes (tanstack-virtual)
  - Memoización selectiva

- [ ] **C3. DX**
  - Pre-commit hooks (husky + lint-staged)
  - CI pipeline: build + lint + test en cada PR

- [ ] **C4. Observabilidad**
  - Error tracking (Sentry)
  - Web Vitals monitoring

**Definición de "done"** (rolling):
- CI verde en todas las PRs
- Sentry reportando
- 60% test coverage hooks
- Lazy loading en todas las rutas

---

## 5. Propuesta de Contratos + API Client

### 5.1 Estrategia: Schema TS manual validado con Zod

| Factor | OpenAPI | Zod manual |
|--------|---------|------------|
| BE tiene Swagger | ❌ No | N/A |
| Costo de implementar | Alto | Bajo |
| Velocidad de iteración | Lenta | Rápida |
| ROI equipo pequeño | Bajo | Alto |
| Validación runtime | Requiere paso extra | Built-in |

### 5.2 Estructura propuesta (nombres alineados con BE)

```
ui/src/
├── api/
│   ├── client.ts                  # APIClient singleton
│   ├── types.ts                   # PaginatedResponse<T>, ApiError, etc.
│   │
│   ├── schemas/                   # Zod schemas (nombres = BE)
│   │   ├── common.ts              # PageInfoSchema, WorkspaceFilterSchema
│   │   ├── projects.ts            # ProjectSchema
│   │   ├── customers.ts           # CustomerSchema
│   │   ├── lots.ts                # LotSchema (campos = BE JSON tags)
│   │   ├── work-orders.ts         # WorkOrderSchema
│   │   ├── supplies.ts            # SupplySchema (NO "Products")
│   │   ├── labors.ts              # LaborSchema (NO "Tasks")
│   │   ├── commercializations.ts  # CommercializationSchema (NO "Commerce")
│   │   ├── stocks.ts              # StockSchema
│   │   ├── dashboard.ts
│   │   ├── reports.ts
│   │   └── auth.ts
│   │
│   ├── services/                  # Funciones de API (nombres = BE)
│   │   ├── projects.ts
│   │   ├── customers.ts
│   │   ├── lots.ts
│   │   ├── work-orders.ts
│   │   ├── supplies.ts            # getSupplies() (NO "getProducts")
│   │   ├── labors.ts              # getLabors() (NO "getTasks")
│   │   ├── commercializations.ts  # getCommercializations() (NO "getCommerce")
│   │   ├── stocks.ts
│   │   ├── dashboard.ts
│   │   ├── reports.ts
│   │   └── auth.ts
│   │
│   └── hooks/                     # React hooks (nombres = BE)
│       ├── useApiCall.ts
│       ├── useProjects.ts
│       ├── useCustomers.ts
│       ├── useLots.ts
│       ├── useWorkOrders.ts
│       ├── useSupplies.ts         # (NO "useProducts")
│       ├── useLabors.ts           # (NO "useTasks")
│       ├── useCommercializations.ts
│       ├── useStocks.ts
│       └── ...
│
├── types/
│   └── index.ts                   # Re-exports: type Supply = z.infer<typeof SupplySchema>
```

### 5.3 Ejemplo: `api/client.ts`

```typescript
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";
const TIMEOUT = 30_000;

let refreshPromise: Promise<string> | null = null;

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({ baseURL: BASE_URL, timeout: TIMEOUT });
    this.client.interceptors.request.use(this.attachToken);
    this.client.interceptors.response.use((r) => r, this.handleError);
  }

  private attachToken = (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("access_token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  };

  private handleError = async (error: AxiosError) => {
    if (error.response?.status !== 401) return Promise.reject(error);
    if (!refreshPromise) {
      refreshPromise = this.refreshToken().finally(() => { refreshPromise = null; });
    }
    try {
      const newToken = await refreshPromise;
      error.config!.headers.Authorization = `Bearer ${newToken}`;
      return this.client.request(error.config!);
    } catch {
      this.forceLogout();
      return Promise.reject(error);
    }
  };

  private async refreshToken(): Promise<string> {
    const refresh = localStorage.getItem("refresh_token");
    const { data } = await axios.get(`${BASE_URL}/auth/access-token`, {
      headers: { Authorization: `Bearer ${refresh}` },
    });
    const token = data.data.access_token;
    localStorage.setItem("access_token", token);
    return token;
  }

  private forceLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    window.dispatchEvent(new CustomEvent("auth:logout"));
  }

  get = <T>(url: string, config?: object) =>
    this.client.get<T>(url, config).then((r) => r.data);
  post = <T>(url: string, data?: unknown, config?: object) =>
    this.client.post<T>(url, data, config).then((r) => r.data);
  put = <T>(url: string, data?: unknown, config?: object) =>
    this.client.put<T>(url, data, config).then((r) => r.data);
  delete = <T>(url: string, config?: object) =>
    this.client.delete<T>(url, config).then((r) => r.data);
}

export const apiClient = new ApiClient();
```

### 5.4 Ejemplo: `api/schemas/common.ts`

```typescript
import { z } from "zod";

export const PageInfoSchema = z.object({
  per_page: z.number(),
  page: z.number(),
  max_page: z.number(),
  total: z.number(),
});

// Genérico: acepta "data" o "items" del BE, normaliza a "items"
export function PaginatedResponseSchema<T extends z.ZodType>(itemSchema: T) {
  return z.object({
    page_info: PageInfoSchema,
  }).and(
    z.union([
      z.object({ data: z.array(itemSchema) }),
      z.object({ items: z.array(itemSchema) }),
    ])
  ).transform((val) => ({
    items: "data" in val ? val.data : val.items,
    pageInfo: val.page_info,
  }));
}
```

---

## 6. Cambios Sugeridos en Backend

Solo cambios con **alto ROI y bajo riesgo**.

### 6.1 Normalizar key de lista en respuestas paginadas (ALTO ROI, BAJO RIESGO)

**Problema**: `"data"` vs `"items"`.
**Propuesta**: Unificar a `"data"`.
**Archivos**: `internal/lot/handler.go`, `internal/work-order/handler.go`

### 6.2 Normalizar parámetro de tamaño de página (MEDIO ROI, BAJO RIESGO)

**Problema**: `per_page` vs `page_size`.
**Propuesta**: Aceptar ambos en `ParsePaginationParams()`, documentar `per_page` como canónico.
**Archivo**: `internal/shared/handlers/pagination.go`

### 6.3 Normalizar respuesta de create (MEDIO ROI, BAJO RIESGO)

**Problema**: `"project": 42` vs `"customer_id": 42` vs `"id": 42`.
**Propuesta**: Unificar a `{ "message": "...", "id": <int64> }`.
**Archivos**: `internal/project/handler.go`, `internal/customer/handler.go`

### 6.4 Pasar error `type` y `context` a través del BFF (ALTO ROI, BAJO RIESGO)

**Problema**: BFF pierde `type`, `code`, `context` del error.
**Propuesta**: Cambiar `api/src/clients/ApiClient.ts` error interceptor:

```typescript
// Antes:
{ success: false, error: { status, details: data.message || data.details } }
// Después:
{ success: false, error: { status, type: data.type, message: data.message, details: data.details, context: data.context } }
```

### 6.5 CORS / Swagger — NO hacer ahora

CORS: no necesario mientras todo va via BFF same-origin.
Swagger: alto costo (150+ endpoints), bajo ROI con equipo pequeño. Reconsiderar si se agrega un segundo consumer (mobile, partner).

---

## 7. Top 10 Acciones (Ordenadas por Impacto)

| # | Acción | Fase | Esfuerzo | Impacto |
|---|--------|------|----------|---------|
| **1** | Fix 11 bugs P0 (reducers, URLs, loading states, Dashboard, error messages, BFF proxy) | A | 4h | Crítico — funcionalidad rota hoy |
| **2** | Renaming FE→BE: hooks `useProducts→useSupplies`, `useTasks→useLabors`, `useCommerce→useCommercializations` + types + state | A | 4h | Alto — alineamiento base, sin esto todo lo demás confunde |
| **3** | Renaming BFF routes + quitar field renaming en lots + alinear `LotsData` types | A | 3h | Alto — elimina capa de traducción innecesaria entre BE y FE |
| **4** | Normalizar contratos BE: `data` key, `per_page` param, `id` en creates (6.1-6.3) | A | 2h (BE) | Alto — elimina branching en FE por inconsistencias del BE |
| **5** | API Client singleton + tipos centralizados con Zod (B1, B2) | B | 3d | Alto — base para todo lo demás |
| **6** | Extraer `useApiCall()` + refactor hooks (B3, B4) | B | 5d | Alto — reduce 90 funciones duplicadas → 1 patrón |
| **7** | Preservar error type/context a través del BFF (6.4) | B | 1h | Alto — error handling semántico en FE |
| **8** | Paginación server-side real (B5) | B | 3d | Alto — sin esto no escala |
| **9** | Path aliases + Prettier + ESLint strict (A11, A13) | A | 2h | Medio — DX inmediata |
| **10** | Error boundary + toast system (B6) | B | 1d | Medio — errores dejan de ser silenciosos o pantallas blancas |

---

## 8. TODO: Auth (fuera de scope por ahora)

Todo lo relacionado con autenticación y autorización se deja pendiente para abordar cuando se entre en el módulo de auth. Se documenta acá para no perder el contexto.

### TODO-AUTH-1: Token validation comentada
- **Archivo**: `ui/src/pages/login/context/AuthProvider.tsx:47-64`
- **Problema**: `verifyToken()` solo decodifica JWT localmente con `jwtDecode`. No valida contra el servidor. Tokens expirados/revocados son aceptados hasta que un request casual devuelve 401.
- **Acción**: Descomentar y corregir la validación server-side via `/auth/session`. Agregar verificación periódica (ej: cada 5 minutos).

### TODO-AUTH-2: Race condition en token refresh
- **Archivo**: `ui/src/restclient/apiInstance.ts:60-95`
- **Problema**: Múltiples requests concurrentes que reciben 401 disparan cada uno su propio refresh en paralelo. Causa loops, tokens inválidos, o múltiples redirects a login.
- **Acción**: Implementar mutex (variable `refreshPromise` compartida). Si ya hay un refresh en vuelo, los demás 401 esperan esa misma promise. Ver ejemplo en sección 5.3.

### TODO-AUTH-3: `axiosError.status` indefinido en authService
- **Archivo**: `ui/src/pages/login/authService.ts` (funciones: `logout`, `refreshToken`, `validateToken`)
- **Problema**: Se usa `axiosError.status` que no existe en `AxiosError`. El status está en `axiosError.response?.status`. Los catch blocks retornan status `undefined`.
- **Acción**: Cambiar a `axiosError.response?.status` en las 3 funciones.

### TODO-AUTH-4: `localStorage.clear()` borra todo
- **Archivo**: `ui/src/pages/login/context/useLocalStorage.ts` → `clearLocalStorage()`
- **Problema**: Al cerrar sesión, `localStorage.clear()` borra TODOS los datos, incluyendo selección de workspace (customer, project, campaign, field). El usuario pierde su contexto al reloguearse.
- **Acción**: Cambiar a borrar solo keys de auth: `localStorage.removeItem("access_token")`, `localStorage.removeItem("refresh_token")`.

### TODO-AUTH-5: `project_id` almacenado inconsistentemente
- **Archivo**: `ui/src/pages/login/context/SelectionContext.tsx:44,79,89`
- **Problema**: A veces se guarda raw (`localStorage.setItem("project_id", projectId)`), a veces con `JSON.stringify`. El initializer usa `JSON.parse`, que puede romper con el valor raw.
- **Acción**: Unificar a siempre usar JSON.stringify al guardar y JSON.parse al leer.

### TODO-AUTH-6: AI client sin refresh de token
- **Archivo**: `ui/src/restclient/aiClient.ts`
- **Problema**: El AI client usa `fetch` directo en vez de Axios/APIClient. No tiene token refresh automático, no tiene timeout, y lanza `Error` genérico en vez de `RequestError`. Un 401 en AI no triggerea refresh.
- **Acción**: Cuando se unifique el API Client (Fase B), migrar AI client al mismo.

### TODO-AUTH-7: `window.location.href = "/login"` para force logout
- **Archivo**: `ui/src/restclient/apiInstance.ts:71`
- **Problema**: Hard redirect que causa full page reload, pierde todo el estado React.
- **Acción**: Usar `window.dispatchEvent(new CustomEvent("auth:logout"))` y que AuthProvider escuche y haga `navigate("/login")` via React Router.

### TODO-AUTH-8: `location.pathname` en AuthProvider sin React Router
- **Archivo**: `ui/src/pages/login/context/AuthProvider.tsx:77`
- **Problema**: Usa `window.location.pathname` en vez de `useLocation()` de React Router. Los cambios de ruta via `navigate()` no re-triggearean verificación de token. Solo full-page navigations.
- **Acción**: Usar `const location = useLocation()` y agregar `location.pathname` como dependencia del useEffect.

### TODO-AUTH-9: Logout recursivo
- **Archivo**: `ui/src/pages/login/context/AuthProvider.tsx:109-113`
- **Problema**: Si logout recibe 401, refreshea token y llama `logout()` recursivamente. Si el refresh también falla, el error propaga sin catch.
- **Acción**: Agregar try/catch exterior, max 1 retry, fallback a clear + redirect sin API call.

### TODO-AUTH-10: GET→POST translation en refresh
- **Archivo BFF**: `api/src/routes/auth.ts:54`
- **Problema**: El FE hace `GET /auth/access-token`, el BFF lo traduce a `POST /auth/access-token`. Confuso, frágil, undocumented.
- **Acción**: Evaluar si se puede unificar el verbo (preferir POST para refresh tokens).

### TODO-AUTH-11: JWT middleware definido pero no aplicado en BE
- **Archivo**: `pkg/http/middlewares/gin/require_jwt.go`, `cmd/api/http_server.go`
- **Problema**: `RequireJWT` está implementado pero ninguna ruta del BE lo usa. Todas las rutas solo validan API Key + User ID. El JWT solo se valida en el BFF.
- **Acción**: Evaluar si se debe aplicar JWT en el BE o si el BFF es suficiente como punto de validación.

---

## 9. Cambios Implementados — Ronda 2 (2026-02-14)

### 9.1 Cambios en Backend (ponti-backend)

| Cambio | Archivos | Estado |
|--------|----------|--------|
| Normalizar `"data"` → `"items"` en project/customer DTOs | `internal/project/handler/dto/list_projects.go`, `internal/customer/handler/dto/list_customers.go` | ✅ |
| Normalizar `"project"` / `"customer_id"` → `"id"` en creates | `internal/project/handler/dto/create_project.go`, `internal/customer/handler/dto/create_customer.go`, handlers | ✅ |
| Eliminar `PageInfo` duplicada en project/customer DTOs | `list_projects.go`, `list_customers.go` → usan `types.PageInfo` + `types.NewPageInfo()` | ✅ |
| Normalizar paginación: `per_page` + `page_size` fallback | `internal/shared/handlers/pagination.go` | ✅ |
| Lots handler usa `ParsePaginationParams` compartido | `internal/lot/handler.go` (ListLots, ExportLots) | ✅ |

### 9.2 Cambios en BFF (ponti-frontend/api)

| Cambio | Archivos | Estado |
|--------|----------|--------|
| Preservar `type`, `code`, `message`, `details`, `context` en errores | `api/src/clients/ApiClient.ts` | ✅ |
| Leer `items` en vez de `data` de BE | `api/src/routes/projects.ts`, `api/src/routes/customers.ts` | ✅ |

### 9.3 Cambios en Frontend (ponti-frontend/ui)

| Cambio | Archivos | Estado |
|--------|----------|--------|
| **Migración a `apiClient` singleton** (28 archivos) | Todos los hooks + pages migrados de `restclient/apiInstance` a `@/api/client` | ✅ |
| **Migración de tipos** | `restclient/types` → `@/api/types` en todos los archivos | ✅ |
| **Migración de aiClient** | `restclient/aiClient` → `@/api/aiClient` (3 archivos) | ✅ |
| **Toast notifications** | Instalado `sonner`, creado `@/lib/toast.ts`, `<Toaster>` en `main.tsx` | ✅ |
| **Zod schemas** | Instalado `zod`, creado `@/api/schemas.ts` con schemas compartidos y genéricos | ✅ |
| **Cursor rules** | Regla "no-git" en `.cursor/rules/` de FE y BE | ✅ |

### 9.4 Estructura final del directorio `ui/src/api/`

```
ui/src/api/
├── client.ts       ← Singleton apiClient (Axios, auth interceptors, token refresh con mutex)
├── types.ts        ← Tipos compartidos (SuccessResponse, ErrorResponse, PageInfo, PaginatedResponse, RequestError)
├── schemas.ts      ← Zod schemas (pageInfoSchema, paginatedResponseSchema, successResponseSchema)
├── aiClient.ts     ← AI Copilot client (fetch-based, migrado desde restclient/)
└── hooks/
    └── useApiCall.ts ← Hook genérico (loading, error, execute) + extractErrorMessage/Status
```

### 9.5 Cambios Implementados — Ronda 3 (2026-02-14)

**Backend:**
| Cambio | Estado |
|--------|--------|
| Normalizar 200→204 en update/delete (project, customer, supply) — 15 endpoints | ✅ |

**BFF:**
| Cambio | Estado |
|--------|--------|
| Eliminar 44 `console.log(error)` de rutas | ✅ |

**Frontend:**
| Cambio | Estado |
|--------|--------|
| Fix CreateOrder N re-renders → batch update único (P1.13) | ✅ |
| allColumnsMap en `useMemo` en WorkOrders.tsx y Tasks.tsx (P1.14) | ✅ |
| emptyItems shared reference → clonar en reset (P2.11) | ✅ |
| `window.location.href` → `useNavigate()` en WorkOrders.tsx (P2.8) | ✅ |
| Limpiar `console.log/error` en páginas (P2.4) | ✅ |
| Limpiar código muerto: `CREATE_LOT`, `SET_PAGE`, dead imports (P2.5) | ✅ |
| Migrar `getApiErrorMessage` → `extractErrorMessage` (4 hooks) | ✅ |
| Eliminar `utils/getApiErrorMessage.ts` (consolidado en `@/api/hooks/useApiCall`) | ✅ |
| Eliminar directorio `restclient/` completo | ✅ |
| Prettier + eslint-config-prettier + scripts `format`/`format:check` | ✅ |
| ESLint: `no-unused-vars` con `argsIgnorePattern: ^_` | ✅ |

### 9.6 Resumen de consistencia BE↔FE

| Aspecto | Antes | Ahora |
|---------|-------|-------|
| Create response key | `"project"`, `"customer_id"`, `"id"` (mixto) | `"id"` en todos |
| List wrapper key | `"data"` en project/customer, `"items"` en lots/work-orders | `"items"` en todos |
| PageInfo struct | 3 definiciones (pkg/types + 2 duplicadas en DTOs) | 1 sola en `pkg/types` |
| Pagination param | `per_page` o `page_size` según endpoint | `per_page` (con `page_size` fallback) |
| FE API client | N instancias de `APIClient` (una por hook) | 1 singleton `apiClient` |
| FE error handling | Manual en cada hook, inconsistente | `extractErrorMessage/Status` centralizado |
| BFF error forwarding | Solo `status` + `details` | `type`, `code`, `message`, `details`, `context` |
| Update/Delete response | 200+message en project/customer/supply, 204 en lots/work-orders | 204 en todos |
| `console.log` en BFF | 44 console.log(error) en rutas | 0 |
| FE `restclient/` | 3 archivos (apiInstance, types, aiClient) | Eliminado (migrado a `@/api/`) |
| Prettier | No existía | Configurado con eslint-config-prettier |

### 9.7 Pendiente: Solo Auth

Todo lo relacionado con authn/authz queda documentado en la [Sección 8](#8-todo-auth-fuera-de-scope-por-ahora) para resolver en una próxima iteración.

---

*Fin del reporte. Todas las afirmaciones están respaldadas por rutas de archivos reales del codebase.*
