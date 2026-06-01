# dependencies.md — feature-011 · campaign-dto-projectid

## Depende-de

### Cross-repo (fuerte)
- **BE feature-011** (mismo slug): serialización del DTO de campaña en Go con tags JSON
  `id` / `name` / `project_id` en minúscula. Es la **causa raíz** del bug. Sin esto, el FE
  (que ya tiene el shape correcto) recibe claves que no matchean y el filtrado por proyecto
  devuelve lista vacía. **Orden: BE-first.**

### Intra-repo (fuertes — prerequisitos NO en mi flist)
- `ui/src/hooks/useEntityCrud/index.ts` (status A en el rango) — factory genérico CRUD/archive.
  El nuevo `useCampaigns` lo importa. Pertenece a la feature de entity-crud (relacionada con 009/018).
  Sin él, `ui/src/hooks/useCampaigns/index.ts` NO compila.
- `api/src/utils/forwardQuery.ts` (status A en el rango) — `buildForwardQuery(req)`, usado por
  `GET /campaigns/archived`. Pertenece a la superficie de archivado (009/018).

### Intra-repo (débiles)
- `ui/src/hooks/useCampaigns/types.ts` — provee `Data`/`Payload`. NO en mi flist, sin cambios en el rango.
- `api/src/routes/index.ts` — registra el router de campaigns (montaje del path). Verificar que el
  registro exista en `develop` (no en mi flist).
- `@/api/client`, `@/api/types`, `../../lib/format/formatError` — utilidades preexistentes.

## Bloquea-a

- **Consumidores de `useCampaigns`** (todos fuera de mi flist, pertenecen a 014/018):
  - `ui/src/hooks/useWorkspaceFilters.ts` (usa `getCampaigns`, lista de opciones de campaña)
  - `ui/src/pages/admin/master-data/campaigns/CampaignsList.tsx` (filtra por `c.project_id === selectedProject.id`)
  - `ui/src/pages/admin/master-data/campaigns/ArchivedCampaigns.tsx` (usa `getArchivedCampaigns`, etc.)
  - `ui/src/pages/admin/master-data/campaigns/CampaignFormDrawer.tsx` (usa `createCampaign`/`updateCampaign`)
  Estas páginas asumen la **nueva** API del hook (métodos CRUD/archive). Si se extrae solo el bugfix
  sin el refactor, esos consumidores (si llegaran a develop) romperían.

## Fuertes / débiles / inciertas

- **Fuertes**: BE feature-011 (cross), `useEntityCrud/index.ts`, `forwardQuery.ts`.
- **Débiles**: `types.ts`, registro de router, utilidades de api client.
- **Inciertas**: si `develop` ya contiene `useEntityCrud` y `forwardQuery` (otras features pudieron
  haberlos traído). Verificar con los comandos de validation.md antes de extraer.

## Archivos / tipos / config / migraciones / APIs compartidos

- **Archivos compartidos**: `api/src/routes/campaigns.ts` (bugfix + CRUD/archive de 009/018);
  potencialmente `api/src/routes/index.ts` (registro de routers, NO en flist).
- **Tipos**: `Data`/`Payload` de `useCampaigns/types.ts`; `CrudService<T,...>` de `useEntityCrud`.
- **Config**: ninguna (sin cambios de package.json / yarn.lock esperados).
- **Migraciones**: ninguna en este repo.
- **APIs**: contrato REST de campaigns (lista/archived/CRUD/archive) compartido con BE.

## Recomendación de orden

1. **BE feature-011** (serialización `project_id`) — destraba el síntoma del dropdown vacío.
2. Prerequisitos intra-repo (`useEntityCrud`, `forwardQuery`) ya en `develop`.
3. FE feature-011 (este paquete): hook + router.
4. Features consumidoras (014 master-data-pages / 018) que dependen de la nueva API del hook.
