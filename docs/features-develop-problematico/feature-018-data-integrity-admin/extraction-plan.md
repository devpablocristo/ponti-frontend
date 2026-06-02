# extraction-plan.md — feature-018 (FE)

## Datos base

| Campo | Valor |
|---|---|
| repo | `/home/pablocristo/Proyectos/pablo/ponti/web` |
| rama base | `develop` (tip `8c25e88`) |
| SOURCE | `develop-problematico~1` = SHA `3ffcf60` (NUNCA usar `develop-problematico` tip: es restore/vacío) |
| rango diff | `fefbe695..3ffcf60` |
| rama sugerida | `pr/feature-018-data-integrity-admin-fe` |

> RECORDATORIO: esta flist es el refactor de `useDatabase/projects`, no la UI de
> data-integrity (ver spec.md). Si el orquestador re-clasifica a fe-010, renombrar la
> rama a `pr/feature-010-projects-hook-refactor-fe`.

## PR title

`refactor(fe): split useDatabase/projects en queries+mutations y centralizar formatError`

## PR description (borrador)

```
Porta desde develop-problematico~1 (3ffcf60) el refactor del hook useProjects:

- index.ts pasa de monolítico (~441 líneas) a compositor (~62) que combina
  createProjectQueries (queries.ts) y createProjectMutations (mutations.ts).
- API público del hook intacto (mismos campos y acciones).
- Manejo de errores centralizado en formatError/translateBackendError (@/lib/format).
- projectReducer: exporta ProjectAction y blinda SET_PROJECTS/DROPDOWN contra no-arrays.
- types.ts: agrega actor_id?/archived_at? a investors, admin_cost_investors, Data,
  Field, Field.investors y Plot.
- index.test.ts (vitest): cubre save/update/archive/restore + traducciones de error.

Depende de: fe-006 (@/lib/format). NO incluye la UI de data-integrity (fe-014) ni
el BE de data-integrity (be-018).
```

## Pasos ordenados

1. **Prerrequisito:** asegurar que **fe-006** (`ui/src/lib/format/*`) ya esté en
   `develop`. Verificar: `git -C <repo> cat-file -e develop:ui/src/lib/format/index.ts`.
   Si no está, NO continuar (el build falla).
2. Crear rama desde develop.
3. Traer enteros los 3 archivos nuevos + el index reescrito.
4. Para `projectReducer.ts` y `types.ts`: si develop NO los cambió respecto del rango,
   traer enteros; si SÍ, usar `git restore -p` para tomar solo los hunks de esta feature.
5. Verificar build + tests.
6. Abrir PR.

## Archivos enteros vs parciales

- **Enteros (whole-file):** `index.ts`, `queries.ts`, `mutations.ts`, `index.test.ts`.
- **Parciales posibles (partial-hunks):** `projectReducer.ts` (export + 2 guards),
  `types.ts` (campos opcionales). Usar `-p` solo si develop ya divergió.

## Migraciones / tests a incluir

- Migraciones: ninguna (FE).
- Tests: `ui/src/hooks/useDatabase/projects/index.test.ts` (incluido en el set).

## Dependencias previas

- **fe-006** (`@/lib/format`) — HARD, debe ir antes.
- `actions.ts` ya está en develop (no requiere acción).

## Coordinación con el otro repo

- La feature-018 es FULL-STACK pero **esta flist FE no tiene relación de
  compilación** con `be-018` (`internal/data-integrity/*`). Pueden ir en cualquier
  orden entre sí.
- Si lo que se quiere es la **feature data-integrity completa** end-to-end:
  orden recomendado **BE-first** (`be-018`) → **FE UI** (`fe-014`, la página) →
  smoke en BFF (`api/src/routes/data-integrity.ts` ya en develop).
- Este paquete (refactor de projects) es independiente; coordinar más bien con
  **fe-010** (projects) para no duplicar/colisionar.

## Comandos git SUGERIDOS (para un humano; NO ejecutar desde el agente)

```bash
REPO=/home/pablocristo/Proyectos/pablo/ponti/web
cd "$REPO"

# 0) Confirmar prerequisito fe-006
git cat-file -e develop:ui/src/lib/format/index.ts && echo "fe-006 OK" || echo "FALTA fe-006"

# 1) Rama
git checkout develop
git checkout -b pr/feature-018-data-integrity-admin-fe

# 2) Archivos enteros (nuevos + index reescrito)
git checkout develop-problematico~1 -- \
  ui/src/hooks/useDatabase/projects/index.ts \
  ui/src/hooks/useDatabase/projects/queries.ts \
  ui/src/hooks/useDatabase/projects/mutations.ts \
  ui/src/hooks/useDatabase/projects/index.test.ts

# 3a) Si develop NO cambió reducer/types respecto del rango -> enteros:
git checkout develop-problematico~1 -- \
  ui/src/hooks/useDatabase/projects/projectReducer.ts \
  ui/src/hooks/useDatabase/projects/types.ts

# 3b) Si SÍ cambió -> selección de hunks:
git restore -p --source=develop-problematico~1 -- \
  ui/src/hooks/useDatabase/projects/projectReducer.ts \
  ui/src/hooks/useDatabase/projects/types.ts

# 4) Sanidad de diff
git diff --check
```

## Qué NO traer

- Página data-integrity (`pages/admin/master-data/data-integrity/*`) → fe-014.
- `api/src/routes/data-integrity.ts` → ya en develop.
- `ui/src/lib/format/*` → fe-006.
- tentative-prices → DONE (#121/#124).

## Qué podría romperse

- Build/tsc si falta `@/lib/format` (fe-006).
- Consumidores de `useProjects` si el API público cambió — NO debería (intacto), pero
  verificar `useWorkspaceFilters.ts`, `pages/admin/customers/*`,
  `pages/admin/database/customers/*`, `pages/admin/master-data/actors/*`,
  `pages/admin/master-data/commerce/CommerceForm.tsx`.
- `types.ts`: si develop tiene una versión distinta de `Project`/`Field`, posible
  conflicto al hacer merge.

## Cómo detectar extracción incompleta

- `grep -rn "@/lib/format" ui/src/hooks/useDatabase/projects/` debe resolver.
- `grep -rn "createProjectQueries\|createProjectMutations" ui/src/hooks/useDatabase/projects/index.ts`
  debe existir; si `index.ts` sigue teniendo `extractErrorMessage` → quedó el viejo.
- `git grep "ProjectAction" ui/src/hooks/useDatabase/projects/projectReducer.ts` debe
  mostrar `export type ProjectAction` (si no, no se trajo el cambio del reducer).

## Qué validar antes del PR

- `yarn install` limpio; `yarn test ui/src/hooks/useDatabase/projects/index.test.ts`.
- `yarn build` (tsc) sin errores.
- Diff final solo toca los 6 paths esperados.

## Qué hacer después de mergear

- Smoke manual de cualquier pantalla que use proyectos (crear/editar/archivar/restaurar)
  para confirmar mensajes de error en español.
- Si se re-clasificó a fe-010, actualizar el tracking del orquestador.
