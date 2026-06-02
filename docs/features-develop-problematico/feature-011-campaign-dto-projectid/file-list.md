# file-list.md — feature-011 · campaign-dto-projectid

Fuente autoritativa: `/tmp/flists/fe-011.txt`. Rango: `fefbe695..3ffcf60`. SOURCE: `develop-problematico~1` (`3ffcf60`).

Status: A=created · M=modified · D=deleted · R=renamed · C=copied.

## Propios (de la feature)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|------|--------|------|-------------------|------------|--------|--------|-----------|
| `ui/src/hooks/useCampaigns/index.ts` | M | hook React (TS) | Hook de campañas; reescrito sobre `useEntityCrud`; expone `getCampaigns` + CRUD/archive | partial-hunks | Mezcla bugfix de contrato (shape `project_id`) con refactor a `useEntityCrud` + métodos archive (009/018). El fix "puro" no requiere todo el refactor | alto | media |
| `ui/src/hooks/useCampaigns/actions.ts` | D | TS (Symbols) | Acciones del reducer viejo; eliminado por el refactor | manual-port | El borrado solo es válido si se adopta `useEntityCrud`. Si NO se trae el refactor, NO borrar | medio | alta |
| `ui/src/hooks/useCampaigns/useCampaignsReducer.ts` | D | TS (reducer) | Reducer viejo; eliminado por el refactor | manual-port | Idem actions.ts: el borrado es consecuencia del refactor, no del bugfix | medio | alta |

## Compartidos (partial-hunks)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|------|--------|------|-------------------|------------|--------|--------|-----------|
| `api/src/routes/campaigns.ts` | M | router BFF (Express) | GET `/campaigns` (query condicional = el fix), + `/archived`, POST/PUT/archive/restore/hard | partial-hunks | El hunk del query condicional pertenece a esta feature; los endpoints archive/restore/hard pertenecen a CRUDAR/archive (009/018). `/archived` importa `buildForwardQuery` (no en flist) | alto | media |

> Nota: `api/src/routes/campaigns.ts` también es candidato a verse en el patrón de routers del repo
> (`api/src/routes/index.ts` registra routers). El registro NO está en mi flist; verificar que el router ya esté montado en `develop`.

## Requeridos por dependencia (NO en mi flist — prerequisitos)

| path | status (en rango) | tipo | rol | extracción | motivo | riesgo | confianza |
|------|-------------------|------|-----|------------|--------|--------|-----------|
| `ui/src/hooks/useEntityCrud/index.ts` | A | hook factory genérico (TS) | Backbone del nuevo `useCampaigns` | do-not-extract-yet (acá) | Infra de entity-crud; sin él el hook no compila. Debe venir de su feature (entity-crud / archive surface) | alto | alta |
| `api/src/utils/forwardQuery.ts` | A | util BFF (TS) | `buildForwardQuery` usado por GET `/campaigns/archived` | do-not-extract-yet (acá) | Pertenece a la superficie de archivado (009/018) | medio | alta |

## Dudosos

| path | nota |
|------|------|
| (ninguno con cambios propios en mi flist) | `ui/src/hooks/useCampaigns/types.ts` NO está en mi flist y es idéntico en ambos refs (ya tiene `project_id`). NO tocar. |

## NO traer todavía (en este paquete)

- `ui/src/hooks/useEntityCrud/index.ts` — prerequisito de otra feature.
- `api/src/utils/forwardQuery.ts` — prerequisito de otra feature (archive).
- Endpoints archive/restore/hard de `campaigns.ts` si se separa el bugfix puro del CRUD/archive.
- Consumidores fuera de flist (`CampaignsList.tsx`, `ArchivedCampaigns.tsx`, `CampaignFormDrawer.tsx`, `useWorkspaceFilters.ts`) — feature-014/018.

## Resumen de extracción

- 1 modificado puramente acoplado al refactor en FE (`useCampaigns/index.ts`).
- 2 borrados que solo tienen sentido si se adopta el refactor (`actions.ts`, `useCampaignsReducer.ts`).
- 1 router BFF compartido con archive/CRUD (`campaigns.ts`).
- 2 prerequisitos externos no presentes en el flist.
