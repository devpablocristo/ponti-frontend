# spec.md — feature-011 · campaign-dto-projectid

- **id**: feature-011
- **nombre**: Campaign DTO project_id serialization
- **tipo**: bugfix (con refactor acoplado en el FE)
- **repo (este paquete)**: Frontend monorepo `ui/` (React) + `api/` (BFF NodeJS, yarn) — `/home/pablocristo/Proyectos/pablo/ponti/web`
- **existe-en-FE**: SI (este paquete)
- **existe-en-BE**: SI — FULL-STACK. El paquete BE feature-011 cubre la serialización del DTO en Go (`project_id`/`id`/`name` en minúscula).
- **SOURCE de extracción**: `develop-problematico~1` = SHA `3ffcf60`. NUNCA usar `develop-problematico` (tip = restore/vacío).
- **rango fuente-de-verdad (diff)**: `fefbe695..3ffcf60`
- **rama destino**: `develop` (tip `8c25e88`)

## Resumen

La feature nace como bugfix de contrato cross-repo: el BFF/UI espera el DTO de campaña con
claves en **minúscula** (`id`, `name`, `project_id`). Si el BE serializa con otra forma
(p.ej. `ProjectID`/`ProjectId` o un wrapper distinto), el filtrado de campañas por proyecto
en el FE deja de matchear y **el dropdown/lista de campañas queda vacío**.

En el FE, sin embargo, lo que realmente cambió dentro de **mi flist** NO es el tipo del DTO
(que ya estaba correcto en minúscula en ambos refs), sino un **refactor del hook `useCampaigns`**
hacia el factory genérico `useEntityCrud`, más el agregado de endpoints CRUD/archivado en el
BFF (`api/src/routes/campaigns.ts`). El "fix de serialización" en el FE se reduce a **mantener
el shape `project_id` minúscula** que consume `CampaignsList.tsx` para filtrar por proyecto.

## Objetivo

- Garantizar que el FE consuma el DTO de campaña con `project_id` (minúscula) para poder filtrar
  campañas por proyecto seleccionado.
- (Acoplado) Migrar `useCampaigns` al patrón `useEntityCrud` y exponer operaciones CRUD + archive/restore/hard-delete.

## Problema

- **Contrato**: desync de mayúsculas/minúsculas entre la serialización JSON del BE y lo que el FE
  espera. El FE filtra con `c.project_id === selectedProject.id`
  (`ui/src/pages/admin/master-data/campaigns/CampaignsList.tsx:71`). Si `project_id` llega como
  `ProjectId`/`project_ID`/`undefined`, el `.filter()` descarta todo y la lista queda vacía.
- **Acople de refactor**: el hook dejó de usar reducer/actions propios y pasó a `useEntityCrud`.
  Eso arrastra una dependencia que NO está en mi flist (`ui/src/hooks/useEntityCrud/index.ts`) y
  un util del BFF (`api/src/utils/forwardQuery.ts`) usado por el endpoint `/archived`.

## Alcance en este repo (FE)

Archivos de mi flist (`/tmp/flists/fe-011.txt`):
- `api/src/routes/campaigns.ts` (M) — BFF: GET `/campaigns` (query condicional), GET `/campaigns/archived`,
  POST `/campaigns`, PUT `/campaigns/:id`, POST `/campaigns/:id/archive`, POST `/campaigns/:id/restore`,
  DELETE `/campaigns/:id/hard`. Importa `buildForwardQuery`.
- `ui/src/hooks/useCampaigns/index.ts` (M) — reescrito sobre `useEntityCrud`. Exporta `getCampaigns`,
  `getArchivedCampaigns`, `createCampaign`, `updateCampaign`, `archiveCampaign`, `restoreCampaign`,
  `hardDeleteCampaign`, además de `campaigns`, `archivedCampaigns`, `total`, `processing`, `error`.
- `ui/src/hooks/useCampaigns/actions.ts` (D) — eliminado (Symbols del reducer viejo).
- `ui/src/hooks/useCampaigns/useCampaignsReducer.ts` (D) — eliminado (reducer viejo).

## Alcance en el otro repo (BE)

- Serialización del DTO de campaña en Go con tags JSON `id`, `name`, `project_id` (minúscula).
- Endpoints REST que el BFF reenvía: `GET /campaigns`, `GET /campaigns/archived`, `POST /campaigns`,
  `PUT /campaigns/:id`, `POST /campaigns/:id/archive`, `POST /campaigns/:id/restore`,
  `DELETE /campaigns/:id/hard`. El archive/restore/hard pertenece a CRUDAR/archive (009/018) — ver dependencies.
- Ver paquete BE feature-011 para el detalle de structs/tags.

## Fuera de alcance

- `ui/src/hooks/useCampaigns/types.ts` — NO está en mi flist y es **idéntico** en `fefbe695` y `3ffcf60`
  (ya define `project_id: number`). No se toca.
- El factory `useEntityCrud/index.ts` (infra de CRUD genérico) — es de otra feature (entity-crud /
  archive surface). Es **prerequisito**, no se extrae acá.
- `api/src/utils/forwardQuery.ts` — pertenece a la superficie de archivado (009/018). Prerequisito.
- Páginas consumidoras (`CampaignsList.tsx`, `ArchivedCampaigns.tsx`, `CampaignFormDrawer.tsx`) —
  son de feature-014 (master-data-pages) / 018; no están en mi flist.

## Comportamiento esperado

- `GET /campaigns` (BFF): si `customer_id>0` o `project_name` presentes, los reenvía; si no, llama `campaigns` sin query.
- DTO de campaña en FE: `{ id: number; name: string; project_id: number }`.
- `CampaignsList` filtra campañas del proyecto activo por `c.project_id === selectedProject.id`.
- `useWorkspaceFilters` carga campañas vía `getCampaigns(...)` y las ofrece como opciones del filtro.

## Estado en dp~1 (3ffcf60)

- FE: hook migrado a `useEntityCrud`, `actions.ts`/`useCampaignsReducer.ts` eliminados. Compila SOLO si
  existe `ui/src/hooks/useEntityCrud/index.ts` (prerequisito presente en el mismo rango pero fuera de mi flist).
- BFF: endpoints CRUD + archived presentes; `/archived` requiere `api/src/utils/forwardQuery.ts` (prerequisito).
- DTO `project_id` minúscula: ya correcto (sin cambio en el rango).

## Criterios de aceptación

1. El dropdown/lista de campañas se llena cuando el BE devuelve `project_id` correcto.
2. `useCampaigns` compila y expone al menos `campaigns`, `total`, `processing`, `error`, `getCampaigns`.
3. Los consumidores que usan `getCampaigns` (`useWorkspaceFilters`) siguen funcionando.
4. No quedan imports colgantes a `./actions` ni `./useCampaignsReducer`.
5. BFF `/campaigns` no reenvía query vacía (`customer_id=0&project_name=`).

## Endpoints / Modelos / UI / DB / Tests afectados

- **Endpoints (BFF)**: `GET /campaigns`, `GET /campaigns/archived`, `POST /campaigns`, `PUT /campaigns/:id`,
  `POST /campaigns/:id/archive`, `POST /campaigns/:id/restore`, `DELETE /campaigns/:id/hard`.
- **Modelos/DTO**: `ui/src/hooks/useCampaigns/types.ts` → `Data = { id, name, project_id }` (sin cambio).
- **UI/Hooks**: `useCampaigns` (hook). Consumidores fuera de flist: `useWorkspaceFilters`, `CampaignsList`,
  `ArchivedCampaigns`, `CampaignFormDrawer`.
- **DB**: ninguna migración en este repo.
- **Tests**: ninguno propio en mi flist. Indirectos: `GeneralEntities.test.tsx`, `generalEntityRows.test.ts`
  (no en flist, no extraer aquí).

## Dependencias

- **Intra-repo (fuertes, prerequisito)**: `ui/src/hooks/useEntityCrud/index.ts`,
  `api/src/utils/forwardQuery.ts`. Ninguno está en mi flist → deben venir de sus features.
- **Cross-repo**: BE feature-011 (serialización DTO minúscula) + endpoints campaigns/archive.

## Riesgos

- **Funcional**: si el BE serializa `project_id` mal, lista vacía (síntoma exacto del bug).
- **Técnico**: extraer mi flist sin `useEntityCrud` ni `forwardQuery` rompe el build del FE/BFF.
- **Acople**: el "bugfix de serialización" viene mezclado con un refactor CRUD + archive (varias features).

## DECISIÓN recomendada

**Arreglar antes de extraer / coordinar** — NO extraer mi flist tal cual de forma aislada.
1. El verdadero fix de contrato `project_id` es cross-repo y vive sobre todo en el BE; el FE ya tiene el shape correcto.
2. Mi flist mezcla refactor (`useEntityCrud`) + CRUD/archive (009/018) con el bugfix. Traer estos 4 archivos
   exige incluir prerequisitos fuera del flist. Recomendación: **partir** — extraer el contrato `project_id`
   coordinado con BE primero; el refactor a `useEntityCrud` y los endpoints archive van con sus features
   (entity-crud / archive surface) y no como parte de un "bugfix de serialización".
