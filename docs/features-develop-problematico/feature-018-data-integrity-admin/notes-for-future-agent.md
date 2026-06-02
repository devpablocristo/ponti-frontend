# notes-for-future-agent.md — feature-018 (FE)

## Resumen corto

La flist `fe-018.txt` NO es la data-integrity admin. Son 6 archivos del **refactor del
hook `useDatabase/projects`**: split de `index.ts` en `queries.ts` + `mutations.ts`,
export de `ProjectAction`, guards de array en el reducer, y campos
`actor_id?`/`archived_at?` en `types.ts`. Todo bajo
`ui/src/hooks/useDatabase/projects/`. Está completo y testeado en SOURCE `3ffcf60`,
pero **no porteado** a `develop`.

## Qué está en FE y qué en BE

- **FE (esta flist):** refactor de `useProjects`. NO toca `api/`.
- **FE data-integrity real:** `pages/admin/master-data/data-integrity/Integrity.tsx`
  + `integrityUtils.ts(.test.ts)` → están en **`fe-014.txt`**, no acá.
- **BFF:** `api/src/routes/data-integrity.ts` (`GET /data-integrity/costs-check`) →
  **ya está en `develop`**.
- **BE:** `internal/data-integrity/*` → **`be-018.txt`** (cross-repo nominal de la feature).

## Archivos esenciales

- `index.ts` (compositor nuevo), `queries.ts`, `mutations.ts` (factories),
  `index.test.ts` (contrato).

## Archivos peligrosos / mezclados

- `types.ts` y `projectReducer.ts`: también evolucionan en fe-010 (projects) y en
  features de actores/tenancy (`actor_id`, `archived_at`). Tratar como **partial-hunks**
  si develop ya divergió. Riesgo de pisar cambios ajenos.

## Decisiones ya tomadas

- Documentar el contenido REAL de la flist (refactor de projects) y dejar constancia
  del desajuste de nombre, en lugar de inventar docs sobre la página data-integrity.
- Marcar `fe-006` (`@/lib/format`) como prerrequisito DURO.

## Dudas abiertas (para humano/orquestador)

- ¿Estos 6 archivos deben moverse a **fe-010** (projects)? El nombre feature-018 sugiere
  data-integrity, pero el contenido es projects.
- ¿La data-integrity FE se cubre exclusivamente en fe-014? (todo apunta a que sí).

## Comandos para mirar primero

```bash
REPO=/home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-018.txt                    # ver que son solo projects/
git -C "$REPO" cat-file -e develop:ui/src/lib/format/index.ts   # prereq fe-006
git -C "$REPO" diff fefbe695..3ffcf60 -- ui/src/hooks/useDatabase/projects/index.ts
git -C "$REPO" show 3ffcf60:ui/src/hooks/useDatabase/projects/queries.ts | head -40
grep -l "data-integrity\|useDatabase/projects" /tmp/flists/*.txt   # ver cruces (fe-014, be-018)
```

## Errores a evitar

- NO usar `develop-problematico` tip (es restore/vacío). Usar `develop-problematico~1`
  (`3ffcf60`).
- NO portear sin fe-006 → build roto por `@/lib/format`.
- NO traer la página de data-integrity acá (es fe-014).
- NO traer enteros `types.ts`/`projectReducer.ts` si develop ya los cambió → usar `-p`.
- NO asumir que mergear este paquete habilita la pantalla de data-integrity.

## Camino más seguro

1. fe-006 primero. 2. Rama desde develop. 3. Enteros: index/queries/mutations/test.
4. reducer/types: enteros si no divergieron, si no hunks. 5. `yarn test` + `yarn build`.
6. Confirmar re-clasificación con el orquestador antes del PR.

## Qué PR del otro repo va antes/después

- Independiente de be-018. Si el objetivo es data-integrity end-to-end:
  **be-018 (BE) → fe-014 (UI)**, con el BFF ya en develop. Este paquete (projects
  refactor) va cuando convenga, coordinado con fe-010.
