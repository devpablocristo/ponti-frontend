# extraction-plan.md — feature-011 · campaign-dto-projectid

- **repo**: Frontend monorepo `/home/pablocristo/Proyectos/pablo/ponti/web` (`ui/` + `api/`, yarn)
- **rama base**: `develop` (tip `8c25e88`)
- **SOURCE**: `develop-problematico~1` = SHA `3ffcf60` (NUNCA `develop-problematico`, su tip es restore/vacío)
- **rango de verdad**: `fefbe695..3ffcf60`
- **rama sugerida**: `pr/feature-011-campaign-dto-projectid-fe`

## PR title

`fix(fe): campaign DTO project_id (minúscula) + refactor useCampaigns a useEntityCrud`

## PR description (borrador)

> FULL-STACK feature-011. Asegura que el FE consuma el DTO de campaña con `project_id` en minúscula
> (necesario para filtrar campañas por proyecto en `CampaignsList`). Acopla la migración de `useCampaigns`
> al factory `useEntityCrud` y agrega endpoints CRUD/archive en el BFF.
>
> Requiere que el BE (paquete feature-011) serialice `id`/`name`/`project_id` en minúscula ANTES o en
> coordinación, o el dropdown de campañas queda vacío. Prerequisitos intra-repo: `useEntityCrud` y `forwardQuery`.

## Decisión de partición (IMPORTANTE)

Mi flist mezcla 3 intenciones. Recomiendo **partir**:

- **Sub-A (bugfix puro de contrato)**: garantizar shape `project_id` en FE. En la práctica el FE ya está
  correcto (`types.ts` sin cambios) → el fix real es cross-repo (BE). En el FE basta verificar y, si hiciera
  falta, el hunk de query condicional en `api/src/routes/campaigns.ts` (no reenviar `customer_id=0&project_name=`).
- **Sub-B (refactor)**: `useCampaigns` → `useEntityCrud` + borrado de `actions.ts`/`useCampaignsReducer.ts`.
  Va junto con la feature de entity-crud (depende de `useEntityCrud/index.ts`).
- **Sub-C (CRUD/archive)**: endpoints `/archived`, POST/PUT/archive/restore/hard en `campaigns.ts` + métodos
  del hook. Va con CRUDAR/archive surface (009/018), depende de `forwardQuery.ts`.

Si el equipo prefiere extraer **tal cual** (todo junto), entonces es **obligatorio** incluir primero los
prerequisitos `ui/src/hooks/useEntityCrud/index.ts` y `api/src/utils/forwardQuery.ts`.

## Pasos ordenados (camino "todo junto", coordinado)

1. Confirmar/mergear primero el BE feature-011 (serialización `project_id` minúscula) o coordinar mismo PR train.
2. Asegurar prerequisitos intra-repo en `develop`:
   - `ui/src/hooks/useEntityCrud/index.ts` (entity-crud)
   - `api/src/utils/forwardQuery.ts` (archive surface)
   Si no están en `develop`, traerlos con sus features antes de este PR.
3. Crear rama desde `develop`.
4. Traer enteros los 2 borrados + el hook + el router (ver comandos), validando que los prerequisitos existan.
5. Verificar registro del router en `api/src/routes/index.ts` (no en flist): el path `/campaigns` debe estar montado.
6. `yarn install` no debería cambiar lockfiles (sin deps nuevas). Verificar.
7. Build + typecheck + tests (ver validation.md).

## Archivos enteros vs parciales

- **Enteros** (si se adopta refactor completo): `ui/src/hooks/useCampaigns/index.ts`, borrado de
  `ui/src/hooks/useCampaigns/actions.ts` y `ui/src/hooks/useCampaigns/useCampaignsReducer.ts`.
- **Parcial** (si se separa el bugfix): `api/src/routes/campaigns.ts` — traer SOLO el hunk del query
  condicional del GET `/campaigns`; dejar archive/CRUD para Sub-C.

## Migraciones / tests a incluir

- Migraciones: ninguna en este repo.
- Tests propios: ninguno en mi flist. NO arrastrar `GeneralEntities.test.tsx` ni `generalEntityRows.test.ts`.

## Dependencias previas

- BE feature-011 (cross-repo): serialización DTO.
- `useEntityCrud/index.ts` (intra-repo, prerequisito fuerte del hook).
- `forwardQuery.ts` (intra-repo, prerequisito del endpoint `/archived`).

## Coordinación con el otro repo

- **Orden recomendado: BE-first**. El bug se origina en la serialización del BE. Mergear el FE solo
  (con shape correcto) no rompe nada nuevo, pero el dropdown sigue vacío hasta que el BE serialice bien.
  Mergear el BE solo es seguro y es lo que destraba el síntoma.

## Comandos git SUGERIDOS (para un humano — NO ejecutados aquí)

```sh
# situarse y crear rama
git checkout develop
git checkout -b pr/feature-011-campaign-dto-projectid-fe

# (camino todo-junto) traer prerequisitos si faltan en develop
git checkout develop-problematico~1 -- ui/src/hooks/useEntityCrud/index.ts
git checkout develop-problematico~1 -- api/src/utils/forwardQuery.ts

# traer el hook y aplicar los borrados
git checkout develop-problematico~1 -- ui/src/hooks/useCampaigns/index.ts
git rm ui/src/hooks/useCampaigns/actions.ts ui/src/hooks/useCampaigns/useCampaignsReducer.ts

# router BFF: entero (todo-junto) ...
git checkout develop-problematico~1 -- api/src/routes/campaigns.ts
# ... o parcial (solo el hunk del query condicional) si se separa el bugfix:
git restore -p --source=develop-problematico~1 -- api/src/routes/campaigns.ts

# revisar whitespace/conflict markers
git diff --check
```

## Qué NO traer

- `ui/src/hooks/useCampaigns/types.ts` (sin cambios, fuera de flist).
- Tests de entidades generales (fuera de flist).
- Cambios de `develop-problematico` tip (restore/vacío).

## Qué podría romperse

- Build del FE si `useEntityCrud/index.ts` no está en `develop`.
- BFF `/campaigns/archived` 500 si `forwardQuery.ts` no está.
- Consumidores que esperaban la API vieja del hook (`getCampaigns` se mantiene; el resto es aditivo).

## Cómo detectar extracción incompleta

- `grep -rn "useCampaignsReducer\|./actions" ui/src/hooks/useCampaigns` → debe dar 0.
- `grep -rn "useEntityCrud" ui/src/hooks/useCampaigns/index.ts` → debe existir el import y el archivo destino.
- `grep -rn "buildForwardQuery" api/src/routes/campaigns.ts` → exige `api/src/utils/forwardQuery.ts`.
- `tsc --noEmit` / `yarn build` sin errores de módulo no encontrado.

## Qué validar antes del PR

- Typecheck + build de `ui/` y `api/`.
- BFF arranca y responde `GET /campaigns` sin reenviar query vacía.
- DTO `project_id` minúscula presente end-to-end (con BE feature-011 aplicado).

## Qué hacer después de mergear

- Verificar en UI que el dropdown de campañas se llena al elegir proyecto.
- Confirmar con el equipo BE que el contrato `project_id` quedó alineado.
