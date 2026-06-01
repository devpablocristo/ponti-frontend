# validation.md — feature-011 · campaign-dto-projectid

## Checklist pre-PR (intra-repo)

- [ ] Prerequisito presente: `ls ui/src/hooks/useEntityCrud/index.ts`
- [ ] Prerequisito presente: `ls api/src/utils/forwardQuery.ts`
- [ ] Router montado: `grep -rn "campaigns" api/src/routes/index.ts`
- [ ] Sin imports colgantes: `grep -rn "useCampaignsReducer\|\\./actions" ui/src/hooks/useCampaigns` → 0 resultados
- [ ] Hook usa el factory: `grep -n "useEntityCrud" ui/src/hooks/useCampaigns/index.ts`
- [ ] DTO con shape correcto: `grep -n "project_id" ui/src/hooks/useCampaigns/types.ts`
- [ ] BFF GET `/campaigns` NO reenvía query vacía (revisar el hunk del `URLSearchParams` condicional)
- [ ] `git diff --check` (sin conflict markers / whitespace)
- [ ] yarn.lock / package.json sin cambios inesperados

## Tests sugeridos

### FE
```sh
# desde la raíz del monorepo
yarn workspace ui test         # o el script de test del repo
yarn workspace ui build        # typecheck + build de producción
# typecheck aislado si aplica:
yarn workspace ui tsc --noEmit
```
- No hay test propio del shape de campaña. Sugerido (mejora futura): test que monte `CampaignsList` con
  un payload `{ id, name, project_id }` y verifique que el filtro por `selectedProject.id` deja la campaña.

### BFF (api/)
```sh
yarn workspace api build       # typecheck
# arranque local y smoke:
# GET /campaigns                 -> 200, sin query "customer_id=0&project_name="
# GET /campaigns/archived        -> 200 (requiere forwardQuery)
# POST /campaigns                -> 201
# PUT /campaigns/:id             -> 200
# POST /campaigns/:id/archive    -> 200
# POST /campaigns/:id/restore    -> 200
# DELETE /campaigns/:id/hard     -> 200
```

### BE (otro repo)
```sh
# en el repo BE: ejecutar los tests del paquete de campaigns/DTO
go test ./...   # acotar al paquete de campaigns/serialización
```

## Validación manual (UI)

1. Loguear, ir a master-data → campañas.
2. Seleccionar un proyecto que tenga campañas asociadas.
3. Verificar que la lista/dropdown de campañas se llena (no vacío).
4. Inspeccionar la respuesta de red de `GET /campaigns`: cada item debe tener `id`, `name`, `project_id`
   (minúscula). Si llega `ProjectId`/otro → desync con BE.
5. (Si se trajo CRUD/archive) crear, editar, archivar, restaurar y hard-delete una campaña.

## Casos borde

- Proyecto sin campañas → lista vacía legítima (no confundir con el bug de serialización).
- `customer_id` ausente / 0 → el BFF NO debe mandar `customer_id=0`.
- `project_name` vacío → el BFF NO debe mandar `project_name=`.
- Campaña con `project_id` null/0 desde BE → revisar cómo se comporta el filtro.

## Qué revisar en UI / API / DB / env

- **UI**: dropdown de campañas, filtros de workspace (`useWorkspaceFilters`).
- **API/BFF**: query condicional en `/campaigns`, dependencia `forwardQuery` en `/archived`, `cache.flushAll()` en mutaciones.
- **DB**: nada en este repo.
- **env**: `X-API-KEY` / `baseManagerApi` ya existentes (sin cambios de config).

## Qué validar en el otro repo (BE)

- Tags JSON del struct de campaña: `id`, `name`, `project_id` (minúscula).
- Endpoints campaigns + archive/restore/hard responden el shape esperado.

## Señales de incompletitud / incompatibilidad

- Build FE falla con "Cannot find module './useEntityCrud'" → prerequisito ausente.
- BFF 500 en `/campaigns/archived` → `forwardQuery` ausente.
- Dropdown vacío con proyecto que sí tiene campañas → desync de serialización con BE.
- 404 en endpoints de campaigns → router no registrado en `api/src/routes/index.ts`.
