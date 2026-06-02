# extraction-plan.md — feature-007 actor-system (FE)

## Contexto
- **Repo**: `/home/pablocristo/Proyectos/pablo/ponti/web` (monorepo yarn: `ui/` React + `api/` BFF Node).
- **Rama base**: `develop` (tip `8c25e88`).
- **SOURCE** de extracción: `develop-problematico~1` (SHA **`3ffcf60`**). NUNCA usar `develop-problematico` (su tip es un restore/vacío).
- **Rango fuente-de-verdad del diff**: `fefbe695..3ffcf60`.
- **Rama sugerida**: `pr/feature-007-actor-system-fe`.
- **Tipo**: FULL-STACK. **Orden global: BE-first** (mergear `feature-007 BE` antes que este PR FE).

## Pre-requisitos de orden (CRÍTICO)
Este módulo NO compila ni funciona sin sus dependencias. Mergear primero, en este orden:
1. **feature-007 BE** — endpoints `/api/v1/actors` + migraciones 223/226/231/234. (BE-first.)
2. **feature-006 (FE design system)** — `crud/*`, `feedback/*`, `filters/AppFilterBar`, `useEntityCrud`, `lib/properName`, `lib/fuzzySearch`, `lib/entityNameMatcher`, `Modal/copy`, `ArchivedListPage`, y el wiring de rutas en `ui/src/router.tsx`.
3. **feature-014 (FE master-data)** — `pages/admin/entities.ts`, `fileTransfer.ts`, `useInvestors`, `useManagers`, helpers de managers/investors, Archived*, y el montaje BFF en `api/src/routes/index.ts`.
4. **feature-007 FE** — este PR.

Si esos PRs aún no están, este PR quedará rojo en `tsc`/`vitest`. Verificar con la sección "qué validar antes del PR".

## PR title
`feat(fe): sistema de Actores (master-data/actors + useActors + BFF actors) — port #007 sobre develop`

## PR description (sugerida)
> Porta la feature **actor-system** (feature-007 FE) desde `develop-problematico~1` (3ffcf60).
> Agrega:
> - BFF `api/src/routes/actors.ts` (proxy a `/actors` del manager API; normaliza lista, hidrata create/update, flushAll cache).
> - Hook `ui/src/hooks/useActors` (dominio Actor + servicio CRUD sobre `useEntityCrud`, merge, duplicate-candidates, roles, aliases).
> - Componente `ui/src/components/SmartEntityInput` (autocompletar fuzzy con dropdown en portal).
> - Módulo `ui/src/pages/admin/master-data/actors/*` (ActorsList, ActorFormDrawer, ArchivedActors/ByRole, DuplicateActors, helpers, SPEC.md, tests).
>
> **Depende de**: feature-007 BE (mergeado), feature-006 (design system), feature-014 (master-data + montaje de la ruta `/actors`). El wiring en `ui/src/router.tsx` y `api/src/routes/index.ts` lo aportan 006/014; si faltan, agregar los hunks de actors (ver más abajo).
>
> 🤖 Generated with [Claude Code](https://claude.com/claude-code)

## Archivos enteros (whole-file) — los 17 del flist
Todos status A, ausentes en develop → `git checkout 3ffcf60 -- <path>` directo. Lista completa en `file-list.md` (sección "Propios").

## Archivos parciales (partial-hunks) — coordinados, NO en el flist
- `ui/src/router.tsx` (owner fe-006): imports `ActorsList/ArchivedActors/DuplicateActors` + 8 rutas `master-data/actors*`. En 3ffcf60: líneas ~81-83 y ~197-226.
- `api/src/routes/index.ts` (owner fe-014): `import actors from "./actors"` + `router.use("/actors", actors)`. En 3ffcf60: líneas ~32 y ~155.

Preferencia: que 006/014 traigan estos hunks. Si este PR debe ser autosuficiente, portar SOLO esos hunks con `git restore -p`.

## Migraciones / tests a incluir
- Migraciones: **ninguna en FE** (viven en BE-007).
- Tests FE incluidos (whole-file): `SmartEntityInput.test.tsx`, `ActorFormDrawer.test.tsx`, `ArchivedActorsByRole.test.tsx`, `actorContextFilters.test.ts`, `actorCrudarRouting.test.ts`.

## Coordinación con el otro repo
- **BE-first**: el PR BE de feature-007 (`/api/v1/actors` + migr 223/226/231/234) debe estar mergeado y desplegado en el entorno donde se prueba el FE. Sin BE, el BFF devuelve errores y el FE no carga datos.
- Contrato compartido: shape de `Actor`/payloads/`page_info.total`/`duplicate-candidates`/`merge`. Si el BE cambió nombres de campos, ajustar `useActors` (no se observan divergencias en 3ffcf60, pero validar contra el OpenAPI del BE — feature-024).

## Comandos git SUGERIDOS (para un humano — NO ejecutar desde el agente)
```bash
# 0) situarse y crear rama
git checkout develop
git pull
git checkout -b pr/feature-007-actor-system-fe

# 1) traer los 17 archivos propios enteros desde el SOURCE
git checkout 3ffcf60 -- \
  api/src/routes/actors.ts \
  ui/src/components/SmartEntityInput/SmartEntityInput.tsx \
  ui/src/components/SmartEntityInput/SmartEntityInput.test.tsx \
  ui/src/hooks/useActors/index.ts \
  ui/src/pages/admin/master-data/actors/ActorFormDrawer.tsx \
  ui/src/pages/admin/master-data/actors/ActorFormDrawer.test.tsx \
  ui/src/pages/admin/master-data/actors/ActorsList.tsx \
  ui/src/pages/admin/master-data/actors/ArchivedActors.tsx \
  ui/src/pages/admin/master-data/actors/ArchivedActorsByRole.tsx \
  ui/src/pages/admin/master-data/actors/ArchivedActorsByRole.test.tsx \
  ui/src/pages/admin/master-data/actors/DuplicateActors.tsx \
  ui/src/pages/admin/master-data/actors/SPEC.md \
  ui/src/pages/admin/master-data/actors/actorContextFilters.ts \
  ui/src/pages/admin/master-data/actors/actorContextFilters.test.ts \
  ui/src/pages/admin/master-data/actors/actorCrudarRouting.ts \
  ui/src/pages/admin/master-data/actors/actorCrudarRouting.test.ts \
  ui/src/pages/admin/master-data/actors/constants.ts

# 2) SOLO si 006/014 aún no aportaron el wiring: portar hunks de actors
git restore -p --source=3ffcf60 -- ui/src/router.tsx
git restore -p --source=3ffcf60 -- api/src/routes/index.ts
#   (en el prompt -p, aceptar SOLO los hunks de import/router.use de actors)

# 3) inspección previa
git diff --check                 # whitespace / conflict markers
git status

# 4) validación local (ver validation.md)
yarn install
yarn workspace ui test
yarn workspace ui build
# BFF: tsc del workspace api
```

## Qué NO traer
- Ningún archivo de fe-006 / fe-014 (vienen en sus PRs).
- `ui/src/router.tsx` y `api/src/routes/index.ts` ENTEROS (solo hunks de actors, y solo si hace falta).
- Nada ya marcado DONE (table-select-filters, reports-dark-mode, lot-metrics, tentative-prices, dependency-bumps) — no toca este módulo.

## Qué podría romperse
- `tsc -b` rojo por imports a módulos de fe-006/fe-014 ausentes → faltó mergear esos features.
- Conflicto de merge en `router.tsx` / `routes/index.ts` si 006/014 y este PR los tocan a la vez.
- Runtime: `/actors` 404 si BE-007 no está → revisar BFF `configService.baseManagerApi` y headers `X-API-KEY`/`X-User-Id`.

## Cómo detectar extracción incompleta
- `yarn workspace ui build` lista los imports no resueltos (módulos faltantes → dependencia no portada).
- Navegar `/admin/master-data/actors` y subrutas; si 404 → falta el hunk de `router.tsx`.
- Llamadas a `/actors*` con 404 en network → falta `router.use("/actors")` en `routes/index.ts` o el BE.

## Qué validar antes del PR
- `git cat-file -e develop:<dep>` para cada dependencia de `file-list.md` → todas presentes.
- vitest verde para los 5 tests.
- build de ui y tsc de api sin errores.

## Qué hacer después de mergear
- Smoke en entorno con BE-007: crear/editar/archivar/restore/hard-delete/merge un actor; verificar unicidad de nombre (debe bloquear con mensaje), display proper-name, perfil condicional persona/organización.
- Confirmar `duplicate-candidates` y merge end-to-end.
- Coordinar con feature-008 (identity-tenant-context) que `X-User-Id`/tenant llegan correctos al BFF.
