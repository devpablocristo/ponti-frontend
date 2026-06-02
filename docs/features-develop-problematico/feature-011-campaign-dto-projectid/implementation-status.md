# implementation-status.md — feature-011 · campaign-dto-projectid

## Estado global

- **Estado**: parcial / acoplada (el bugfix de contrato está mezclado con un refactor + CRUD/archive).
- **% completitud (en dp~1, 3ffcf60)**: ~90% del código presente; el riesgo no es de implementación sino
  de **extracción aislada** (faltan prerequisitos fuera del flist).

## Estado en ESTE repo (FE)

- `ui/src/hooks/useCampaigns/index.ts`: **completo** en dp~1. Reescrito sobre `useEntityCrud`. Expone
  `campaigns`, `archivedCampaigns`, `total`, `processing`, `error`, `getCampaigns`, `getArchivedCampaigns`,
  `createCampaign`, `updateCampaign`, `archiveCampaign`, `restoreCampaign`, `hardDeleteCampaign`.
  Compila solo si existe `ui/src/hooks/useEntityCrud/index.ts`.
- `ui/src/hooks/useCampaigns/actions.ts`: **eliminado**. Correcto bajo el refactor.
- `ui/src/hooks/useCampaigns/useCampaignsReducer.ts`: **eliminado**. Correcto bajo el refactor.
- `api/src/routes/campaigns.ts`: **completo** en dp~1. GET `/campaigns` con query condicional (fix real
  visible aquí: no reenvía `customer_id=0&project_name=`), GET `/archived`, POST/PUT/archive/restore/hard.
  `/archived` depende de `buildForwardQuery` (`api/src/utils/forwardQuery.ts`, fuera de flist).
- DTO `project_id` (minúscula) en `types.ts`: **ya correcto**, sin cambios en el rango.

## Estado en el OTRO repo (BE)

- Desconocido desde este paquete. El bug "serialización" se resuelve allí (tags JSON minúscula + endpoints
  campaigns/archive). Ver paquete BE feature-011. Confianza: media (no inspeccionado aquí).

## Tests

- En este repo: ningún test propio en mi flist.
- Indirectos (fuera de flist, NO extraer aquí): `ui/src/pages/admin/master-data/entities/GeneralEntities.test.tsx`,
  `generalEntityRows.test.ts`. Cubren entidades generales, no específicamente el shape de campaña.
- Cobertura del bug puntual (`project_id` minúscula → dropdown lleno): **no hay test FE dedicado**.

## Pendientes

- Confirmar que `useEntityCrud/index.ts` y `forwardQuery.ts` estén en `develop` antes de extraer.
- Confirmar registro del router en `api/src/routes/index.ts`.
- Coordinar con BE feature-011.

## Clasificación de pendientes

### BLOQUEANTE para mergear
- Prerequisito `ui/src/hooks/useEntityCrud/index.ts` presente (si no, no compila).
- Prerequisito `api/src/utils/forwardQuery.ts` presente (si no, `/archived` rompe).
- Coordinación BE: sin serialización correcta el síntoma persiste (dropdown vacío).

### Mejora futura
- Test FE que valide el filtrado `c.project_id === selectedProject.id` con un payload de campaña.
- Separar el bugfix de contrato del refactor `useEntityCrud` en PRs distintos.

### Deuda aceptable
- `campaigns.ts` mezcla bugfix + CRUD/archive en un solo archivo (router compartido).

### Duda humana
- ¿`develop` ya tiene los prerequisitos (otra feature pudo traerlos)? Verificar.
- ¿El equipo quiere extraer "todo junto" o partir? La nota de la feature dice "merge=coordinado (shape change)".
