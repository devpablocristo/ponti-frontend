# validation.md — feature-018 (FE)

## Checklist pre-PR

- [ ] **Prerrequisito fe-006:** `git -C <repo> cat-file -e develop:ui/src/lib/format/index.ts`
      resuelve. (Sin esto, todo lo demás falla.)
- [ ] El diff final toca SOLO los 6 paths de `fe-018.txt`.
- [ ] `index.ts` nuevo NO contiene `extractErrorMessage`/`extractErrorStatus`
      (eso indicaría que quedó el archivo viejo). Debe importar
      `createProjectQueries`/`createProjectMutations`.
- [ ] `projectReducer.ts` exporta `ProjectAction` y tiene los guards
      `Array.isArray(action.payload) ? action.payload : []`.
- [ ] `types.ts` incluye `actor_id?`/`archived_at?` en investors/Data/Field/Plot.
- [ ] `git diff --check` sin conflict markers reales (los warnings de trailing
      whitespace los normaliza prettier/lefthook).

## Tests sugeridos (FE)

```bash
REPO=/home/pablocristo/Proyectos/pablo/ponti/web
cd "$REPO"

# Test del hook (incluido en el set)
yarn test ui/src/hooks/useDatabase/projects/index.test.ts

# Suite completa del área (por si hay tests que tocan projects)
yarn test ui/src/hooks/useDatabase/projects

# Type-check / build
yarn build      # o: yarn tsc --noEmit
```

Casos cubiertos por `index.test.ts`:
- `saveProject` éxito → `"Se ha creado un nuevo proyecto con éxito!"`.
- `saveProject` 409 `"project already exists"` → `"Ya existe un proyecto con ese nombre."`.
- `updateProject` éxito → `"Proyecto editado con exito"`; PUT a `/projects/42`.
- `updateProject` 409 `"project not found or outdated"` → mensaje de optimistic-locking.
- `deleteProject` → POST a `/projects/99/archive`.
- `restoreProject` → POST a `/projects/99/restore`; y error que se propaga (rejects).

## Validación manual (UI)

- Crear un proyecto (mensaje de éxito en español).
- Editar un proyecto y forzar un 409 (registro modificado) → mensaje de optimistic-lock.
- Archivar y restaurar un proyecto → mensajes correctos.
- Verificar dropdown de proyectos por cliente (`/projects/customers/:id`).

## Casos borde

- BE devuelve payload no-array en `data` → el reducer debe dejar `projects: []`
  (guard nuevo), no crashear.
- `getProjects("")` sin querystring → URL `/projects` (sin `?`).

## Qué revisar en UI / API / DB / env

- **UI:** consumidores de `useProjects` siguen renderizando (lista en dependencies.md).
- **API/BFF:** sin cambios en esta flist; `api/src/routes/data-integrity.ts` ya en develop.
- **DB:** sin migraciones.
- **env:** sin nuevas variables.

## Qué validar en el OTRO repo

- Si se quiere data-integrity end-to-end: `be-018` (`go test ./internal/data-integrity/...`)
  y la UI en **fe-014** (no acá). Confirmar que el BFF `/data-integrity/costs-check`
  responde con `{ checks: [...] }`.
- Para este refactor: confirmar que el BE de projects (feature-010) sigue emitiendo
  los strings que `formatError` traduce.

## Señales de incompletitud / incompatibilidad

- Build falla por `Cannot find module '@/lib/format'` → falta fe-006.
- Test falla por mensaje de error distinto → cambió `translateBackendError` o el BE.
- `index.ts` aún monolítico tras la extracción → no se trajo el archivo reescrito.
- Pantallas de proyectos rompen → el API público del hook cambió (no debería).
