# extraction-plan.md — feature-010 projects (FE / repo web)

## Coordenadas

- **repo:** `web` (monorepo `ui/` + `api/`, yarn). Path `/home/pablocristo/Proyectos/pablo/ponti/web`.
- **rama base:** `develop` (tip `8c25e88`).
- **SOURCE:** `develop-problematico~1` (SHA `3ffcf60`). NUNCA `develop-problematico` (tip = restore vacío).
- **rango de verdad:** `fefbe695..3ffcf60`.
- **rama sugerida:** `pr/feature-010-projects-fe`.

## PR title + description

**Title:** `feat(fe): Editor de Proyectos operativo (/admin/projects/new) + cache/verbos BFF projects`

**Description:**
```
Porta feature-010 (projects) desde develop-problematico~1 (3ffcf60).

FE (ui/):
- Nuevo módulo src/pages/admin/projects/: ProjectEditor.tsx (selection-only,
  cliente->proyecto->campaña, sin creación de catálogo) + projectEditorScope.ts
  (scope/filtrado de dropdowns por contexto, sin fallback global) + tests.
- Guardar en /admin/projects/new usa PUT /projects/:id; nunca POST /projects.

BFF (api/):
- projects.ts: bypass de cache por ?fresh=1 / ?no_cache / Cache-Control/Pragma no-cache;
  reenvío de query a /projects/archived y /customers/archived (buildForwardQuery);
  archive/restore expuestos como POST (antes PUT); fix DELETE /:id/hard -> /projects/:id/hard;
  cache.set/flushAll síncronos (sin setImmediate).

Depende de: feature-007 (actor-system), feature-009 (crudar-archive-surface),
feature-014 (fe-master-data-pages) y del paquete BE feature-010 (BE-first).
```

## Orden / dependencias previas (CRÍTICO)

`ProjectEditor.tsx` NO compila en aislamiento. Antes de mergear este PR deben estar en `develop`:
1. **BE feature-010 + 009** (cross-repo, BE-first) — endpoints archive/restore (POST), scope/creator.
2. **FE feature-007 (actor-system)** — `actor_id`/roles en tipos y opciones.
3. **FE feature-009 (crudar-archive-surface FE)** — `archived_at`, `lib/lifecycle/filterActive.ts`, `api/src/utils/forwardQuery.ts` (si lo trae 009).
4. **FE feature-014 (fe-master-data-pages)** — `master-data/customers/*` (types, helpers, customerEditorValidation, EditableList), `SmartEntityInput`, `lib/fuzzySearch`, `lib/entityNameMatcher`.
5. **ESTE PR (010 FE)** al final.

Si 014/007/009 aún no están en develop, este PR debe esperar o ir EN EL MISMO PR junto a ellos.

## Archivos enteros vs parciales

**Whole-file (5, módulo nuevo):**
- `ui/src/pages/admin/projects/ProjectEditor.tsx`
- `ui/src/pages/admin/projects/projectEditorScope.ts`
- `ui/src/pages/admin/projects/ProjectEditor.test.tsx`
- `ui/src/pages/admin/projects/projectEditorScope.test.ts`
- `ui/src/pages/admin/projects/SPEC.md`

**Partial-hunks (1):**
- `api/src/routes/projects.ts` — solo los hunks de cache/verbo/forwardQuery/`/hard` (ver file-list.md).
  CUIDADO: NO pisar hunks de lot-metrics/tentative-prices ya porteados (#117/#121/#124).

**Requerido aunque NO esté en el flist:**
- `api/src/utils/forwardQuery.ts` — whole-file. Sin él `api/` no compila. Si 009/013 ya lo trajeron, omitir.

## Migraciones / tests a incluir

- Migraciones: ninguna en FE. (Las de archive/scope viven en el repo BE.)
- Tests: `ProjectEditor.test.tsx`, `projectEditorScope.test.ts` (ambos whole-file).

## Coordinación con el otro repo (cross-repo)

- **Orden:** BE-first. El PR del repo BE (feature-010 + 009) debe mergear ANTES.
- Verificar que el BE devuelve `archived_at`/`actor_id` y respeta archive/restore vía POST.
- El bypass de cache (`?fresh=1`) asume que el BE no cachea o respeta el refresh.

## Comandos git SUGERIDOS (para un humano; este agente NO los ejecuta)

```bash
# 0) partir de develop
git -C /home/pablocristo/Proyectos/pablo/ponti/web fetch
git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop
git -C /home/pablocristo/Proyectos/pablo/ponti/web pull
git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout -b pr/feature-010-projects-fe

# 1) traer módulo FE nuevo (whole-file)
git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop-problematico~1 -- \
  ui/src/pages/admin/projects/ProjectEditor.tsx \
  ui/src/pages/admin/projects/projectEditorScope.ts \
  ui/src/pages/admin/projects/ProjectEditor.test.tsx \
  ui/src/pages/admin/projects/projectEditorScope.test.ts \
  ui/src/pages/admin/projects/SPEC.md

# 2) traer util BFF requerido si 009/013 no lo trajo (whole-file)
git -C /home/pablocristo/Proyectos/pablo/ponti/web checkout develop-problematico~1 -- \
  api/src/utils/forwardQuery.ts   # solo si NO existe ya en develop

# 3) BFF projects.ts -> partial-hunks (interactivo, elegir SOLO hunks de 010)
git -C /home/pablocristo/Proyectos/pablo/ponti/web restore -p \
  --source=develop-problematico~1 -- api/src/routes/projects.ts
#   aceptar: forwardQuery import, shouldBypassProjectCache/isTruthyQueryValue,
#            bypass en GET /:id, query en /archived y /customers/archived,
#            POST archive/restore, fix /:id/hard, set/flushAll síncronos.
#   RECHAZAR: cualquier hunk de lot-metrics/total_tons/tentative-prices (ya porteado).

# 4) sanity de whitespace
git -C /home/pablocristo/Proyectos/pablo/ponti/web diff --check
```

## Qué NO traer

- `ui/src/router.tsx` (no en flist; lo cablea 014/wiring).
- Hunks de lot-metrics/tentative-prices en `projects.ts` (DONE).
- Cambios de dominio BE (json-tags) -> feature-027.

## Qué podría romperse

- `ui/` no compila si faltan `master-data/customers/*`, `SmartEntityInput`, `fuzzySearch`,
  `entityNameMatcher`, `filterActive` (014/007/009).
- `projectEditorScope.ts` referencia `Project.investors[].actor_id` y `archived_at`; si el
  `Project` type en develop no los tiene -> error de tipos.
- `api/` no compila si falta `api/src/utils/forwardQuery.ts`.
- El editor real no se alcanza desde la ruta si `router.tsx`/`CustomersList projectsOnly` no
  están porteados (la ruta `/admin/projects/new` los usa).

## Cómo detectar extracción incompleta

- `yarn --cwd ui tsc --noEmit` con errores "Cannot find module '../master-data/customers/...'"
  o "Property 'actor_id' does not exist on type" -> faltan deps de 014/007/009.
- `yarn --cwd api build` con "Cannot find module '../utils/forwardQuery'" -> falta el util.
- `git grep -n "forwardQuery\|SmartEntityInput\|customerEditorValidation" -- ui api` para
  confirmar que todos los imports resuelven.

## Qué validar antes del PR

- `yarn --cwd ui test` (vitest) y `yarn --cwd ui build` verdes.
- `yarn --cwd api build` verde.
- Smoke manual de `/admin/projects/new` (ver validation.md).

## Qué hacer después de mergear

- Confirmar con el equipo BE que archive/restore vía POST está desplegado.
- Verificar que el bypass `?fresh=1` no genera carga excesiva (cache deshabilitado por request).
- Revisar que no quedó dependencia colgante de `forwardQuery` en otras rutas.
