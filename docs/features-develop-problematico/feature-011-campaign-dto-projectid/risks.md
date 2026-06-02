# risks.md — feature-011 · campaign-dto-projectid

## Riesgos funcionales

- **Dropdown/lista de campañas vacío (síntoma central)**: el FE filtra con
  `c.project_id === selectedProject.id` (`CampaignsList.tsx:71`). Si el BE serializa `project_id` con otra
  capitalización/nombre, el `.filter()` descarta todo. **Mitigación**: mergear/coordinar BE feature-011
  (tags JSON minúscula) antes o junto al FE; smoke test del dropdown con un proyecto que tenga campañas.
- **Regresión de la API del hook**: consumidores que usaban `getCampaigns` deben seguir funcionando.
  `getCampaigns` se mantiene; el resto es aditivo. **Mitigación**: grep de consumidores + typecheck.

## Riesgos técnicos

- **Build roto por prerequisito ausente**: `useCampaigns/index.ts` importa `useEntityCrud`. Si
  `ui/src/hooks/useEntityCrud/index.ts` no está en `develop`, falla la compilación.
  **Mitigación**: traer/confirmar prerequisito antes; `tsc --noEmit`.
- **BFF `/archived` 500**: depende de `buildForwardQuery` (`api/src/utils/forwardQuery.ts`).
  **Mitigación**: confirmar el util en `develop`; si no, separar el endpoint `/archived`.
- **Router no montado**: si `api/src/routes/index.ts` (fuera de flist) no registra `/campaigns`, los endpoints
  no responden. **Mitigación**: verificar el registro en `develop`.

## Riesgos de integración

- **Cross-repo**: el contrato `project_id` vive en dos repos. Desync = bug visible. Orden BE-first reduce ventana.
- **Caché del BFF**: `campaigns.ts` usa `cache` y hace `cache.flushAll()` en mutaciones. Si el shape cambia
  con la versión cacheada, podría servirse data vieja brevemente. Riesgo bajo (flush en cada mutación).

## Riesgos cross-repo

- **Mergear solo este repo (FE)**: seguro a nivel build (con prerequisitos), pero NO arregla el bug; el
  dropdown sigue vacío hasta que el BE serialice bien. Bajo riesgo de romper, alto riesgo de "no resuelve".
- **Mergear solo el otro repo (BE)**: seguro y suficiente para destrabar el síntoma, dado que el FE ya tiene
  el shape `project_id` minúscula. Recomendado primero.

## Riesgos de datos / migración

- Ninguna migración en este repo. Sin riesgo de datos del lado FE/BFF.

## Riesgos de archivos compartidos

- `api/src/routes/campaigns.ts`: mezcla el hunk del bugfix (query condicional) con endpoints CRUD/archive
  (009/018). Traerlo entero arrastra superficie de otras features. **Mitigación**: `git restore -p` para
  partir el archivo si se quiere el bugfix puro.
- Posible toque indirecto a `api/src/routes/index.ts` (registro de routers) — verificar.

## Riesgos de extracción parcial

- Borrar `actions.ts`/`useCampaignsReducer.ts` SIN traer `useEntityCrud` deja el hook sin backend de estado →
  build roto. **Mitigación**: los tres movimientos (hook + 2 borrados) van juntos, con el prerequisito presente.
- Traer el hook nuevo SIN actualizar consumidores que dependan de la nueva API → no aplica (la API es
  retrocompatible en `getCampaigns`), pero los métodos archive solo existen si se trae todo.

## Riesgo resumido por escenario de merge

| Escenario | Rompe build | Arregla bug | Recomendación |
|-----------|-------------|-------------|---------------|
| Solo BE feature-011 | No | Sí | **Hacer primero** |
| Solo FE feature-011 (con prereqs) | No | No (depende de BE) | Mergear después del BE |
| FE sin prereqs | **Sí** | No | Evitar |
| Ambos coordinados | No | Sí | Ideal |
