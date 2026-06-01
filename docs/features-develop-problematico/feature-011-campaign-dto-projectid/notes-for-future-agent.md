# notes-for-future-agent.md — feature-011 · campaign-dto-projectid

## Resumen corto

FULL-STACK. El bug es de **contrato de serialización**: el FE espera el DTO de campaña con
`project_id` en minúscula para filtrar campañas por proyecto (`c.project_id === selectedProject.id`).
Si el BE serializa distinto, el dropdown/lista de campañas queda **vacío**. En el FE, el shape ya
está correcto; lo que mi flist trae en realidad es un **refactor de `useCampaigns` a `useEntityCrud`**
+ endpoints CRUD/archive en el BFF. El fix "puro" de serialización vive sobre todo en el BE.

## Qué está en FE y qué en BE

- **FE (este paquete)**: `useCampaigns/index.ts` reescrito sobre `useEntityCrud`; `actions.ts` y
  `useCampaignsReducer.ts` eliminados; `api/src/routes/campaigns.ts` con query condicional + CRUD/archive.
  El DTO (`useCampaigns/types.ts`) ya tiene `project_id` y NO cambió (fuera de flist).
- **BE (otro paquete feature-011)**: tags JSON del struct de campaña (`id`/`name`/`project_id` minúscula)
  + endpoints campaigns/archive. Es la causa raíz del bug.

## Archivos esenciales

- `ui/src/hooks/useCampaigns/index.ts` (M) — hook nuevo.
- `api/src/routes/campaigns.ts` (M) — router BFF.

## Archivos peligrosos / mezclados

- `api/src/routes/campaigns.ts` — **compartido**: hunk del bugfix (query condicional) + endpoints
  archive/CRUD que pertenecen a CRUDAR/archive (009/018). Partir con `git restore -p` si querés el bugfix puro.
- Borrados `actions.ts` / `useCampaignsReducer.ts` — solo válidos si adoptás el refactor `useEntityCrud`.

## Prerequisitos NO en mi flist (¡clave!)

- `ui/src/hooks/useEntityCrud/index.ts` (A en el rango) — sin él, el hook NO compila. Es infra de entity-crud.
- `api/src/utils/forwardQuery.ts` (A en el rango) — usado por GET `/campaigns/archived`.

## Decisiones ya tomadas

- DECISIÓN recomendada en spec.md: **arreglar/coordinar antes**, idealmente **partir** (bugfix de contrato
  separado del refactor y del CRUD/archive). Orden cross-repo: **BE-first**.
- No tocar `types.ts` (sin cambios). No arrastrar tests de entidades generales.

## Dudas abiertas

- ¿`develop` ya contiene `useEntityCrud/index.ts` y `forwardQuery.ts` (traídos por otra feature)?
- ¿El router `/campaigns` está registrado en `api/src/routes/index.ts` en `develop`?
- ¿El equipo prefiere "todo junto" o partir? La feature dice `merge=coordinado (shape change)`.

## Comandos a mirar primero

```sh
cat /tmp/flists/fe-011.txt
git -C <web> diff fefbe695..3ffcf60 -- api/src/routes/campaigns.ts ui/src/hooks/useCampaigns/index.ts
git -C <web> show 3ffcf60:ui/src/hooks/useCampaigns/types.ts        # ya tiene project_id, no cambia
git -C <web> show 3ffcf60:ui/src/hooks/useEntityCrud/index.ts | head -60   # prerequisito
git -C <web> grep -n "c.project_id === selectedProject.id" 3ffcf60 -- ui/src/pages/admin/master-data/campaigns/CampaignsList.tsx
git -C <web> log --oneline fefbe695..3ffcf60 -- ui/src/hooks/useCampaigns/ api/src/routes/campaigns.ts
```

## Errores a evitar

- Borrar `actions.ts`/`useCampaignsReducer.ts` sin traer `useEntityCrud` → build roto.
- Traer `campaigns.ts` entero "para el bugfix" sin notar que arrastra archive/CRUD de otras features.
- Confiar en que mergear solo el FE arregla el bug (NO: depende del BE).
- Usar `develop-problematico` (tip restore/vacío) en vez de `develop-problematico~1` (`3ffcf60`).

## Camino más seguro

1. Mergear BE feature-011 (serialización) primero.
2. Confirmar prerequisitos intra-repo en `develop`.
3. Extraer FE (hook + router) con los 2 borrados; typecheck + build.
4. Smoke test del dropdown con un proyecto que tenga campañas.

## PR del otro repo: orden

- **Antes**: BE feature-011 (serialización DTO). Destraba el síntoma.
- **Después**: features consumidoras del hook nuevo (014 master-data-pages / 018) si dependen de la API CRUD/archive.
