# validation.md — feature-007 actor-system (FE)

## Pre-condición de orden
Antes de validar este PR, confirmar que ya están en `develop`:
- [ ] feature-007 BE (endpoints `/api/v1/actors` + migr 223/226/231/234) — desplegado en el entorno de prueba.
- [ ] feature-006 FE (design system + wiring de `router.tsx`).
- [ ] feature-014 FE (master-data + montaje `/actors` en `routes/index.ts`).

## Checklist pre-PR (estático)
- [ ] `git diff --check` sin marcadores de conflicto ni whitespace roto.
- [ ] El PR contiene EXACTAMENTE los 17 paths del flist + (opcional) hunks de `router.tsx`/`routes/index.ts`. Nada de fe-006/fe-014.
- [ ] Cada dependencia de `dependencies.md` existe en develop:
  ```bash
  for p in \
    ui/src/lib/properName.ts ui/src/lib/fuzzySearch.ts ui/src/lib/entityNameMatcher.ts \
    ui/src/hooks/useEntityCrud/index.ts ui/src/pages/admin/entities.ts \
    ui/src/components/crud/EntityFormDrawer.tsx ui/src/components/filters/AppFilterBar.tsx \
    ui/src/components/ArchivedListPage/ArchivedListPage.tsx ui/src/components/Modal/copy.ts \
    ui/src/hooks/useInvestors/index.ts ui/src/hooks/useManagers/index.ts \
    ui/src/pages/admin/fileTransfer.ts ui/src/hooks/useDatabase/projects/types.ts; do
    git cat-file -e develop:$p 2>/dev/null && echo "OK  $p" || echo "MISS $p"
  done
  ```
- [ ] El wiring de actors está presente: `grep -n actors ui/src/router.tsx` y `grep -n actors api/src/routes/index.ts`.

## Build / tests sugeridos
```bash
yarn install
# FE
yarn workspace ui test            # vitest run: 5 suites del módulo + SmartEntityInput
yarn workspace ui build           # tsc -b && vite build  -> debe pasar sin imports faltantes
# BFF
yarn workspace api build          # o el script de tsc del workspace api
```
Suites FE esperadas verdes:
- `ui/src/components/SmartEntityInput/SmartEntityInput.test.tsx`
- `ui/src/pages/admin/master-data/actors/ActorFormDrawer.test.tsx`
- `ui/src/pages/admin/master-data/actors/ArchivedActorsByRole.test.tsx`
- `ui/src/pages/admin/master-data/actors/actorContextFilters.test.ts`
- `ui/src/pages/admin/master-data/actors/actorCrudarRouting.test.ts`

## Validación manual (UI) — requiere BE-007 vivo
- [ ] `/admin/master-data/actors` lista actores (paginado, total correcto).
- [ ] Rutas con preset cargan filtradas por rol: `/clientes`, `/inversores`, `/responsables`, `/proveedores`, `/contratistas`.
- [ ] Crear actor: `Nombre` primero, `Tipo` segundo; los 4 inputs principales con mismo ancho; roles; perfil condicional (Persona vs Empresa/Sociedad); Identificadores/Aliases/Notas al final.
- [ ] Display: cargar un actor con `display_name` canónico/minúscula (`agro lajitas`) → se muestra `Agro Lajitas` en subtítulo e input.
- [ ] Sugerencias: al tipear, muestra coincidencias fuzzy limitadas a los roles seleccionados; sin roles, NO lista todos.
- [ ] Duplicados: intentar guardar un nombre normalizado ya existente (incluso de otro rol/tipo) → bloqueado con mensaje que menciona el nombre existente.
- [ ] Editar un actor conservando su propio nombre → permitido.
- [ ] Perfil: persona → guarda `person_profile`, `organization_profile=null`; organización → al revés; otro/sin definir → ambos null.
- [ ] Identificadores: vacíos no se envían; primero válido marcado principal si ninguno lo es; país vacío → `AR`.
- [ ] Aliases: vacíos no se envían; source `ui_create` al crear, `ui_edit` al editar.
- [ ] `/admin/master-data/actors/archived` lista archivados; restore y hard-delete funcionan.
- [ ] `/admin/master-data/actors/duplicates` lista candidatos y permite merge (impacto/confirmación).

## Qué revisar en API / BFF
- [ ] Network: cada verbo pega a `/actors*` correcto (list/archived/duplicate-candidates/:id/archive/restore/hard/roles/aliases/merge).
- [ ] Respuesta de lista normalizada a `{success, data:{data, total}}`.
- [ ] Headers `X-API-KEY` y `X-User-Id` presentes; 401 sin sesión.
- [ ] Tras create/update, el BFF re-hidrata con GET `/actors/:id` y la UI muestra datos frescos (cache flushAll).

## Qué revisar en DB / env
- [ ] (BE) migr 223/226/231/234 aplicadas; índice único parcial sobre actores activos presente.
- [ ] `configService.baseManagerApi` apunta al BE correcto; `apiKey` seteada.

## Qué validar en el otro repo (BE-007)
- [ ] `go test ./...` del/los paquetes de actors verdes.
- [ ] Endpoint de unicidad devuelve conflicto de dominio (no 500) al repetir nombre.
- [ ] `duplicate-candidates` y `merge` implementados y consistentes con el shape que consume el FE.

## Señales de incompletitud / incompatibilidad
- Build rojo por imports no resueltos → falta fe-006/fe-014.
- 404 al navegar `/admin/master-data/actors` → falta hunk en `router.tsx`.
- 404 en network a `/actors` → falta `router.use("/actors")` en `routes/index.ts` o el BE.
- Campos `undefined` en la tabla (roles/identifiers) → divergencia de shape con BE.
- Duplicados creados sin bloqueo → BE no aplica el índice único / FE no propaga el error de dominio.
