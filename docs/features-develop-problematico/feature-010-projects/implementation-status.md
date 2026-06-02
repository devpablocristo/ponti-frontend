# implementation-status.md — feature-010 projects (FE / repo web)

## Estado general

- **Estado:** COMPLETA en el SOURCE (`3ffcf60`), pero **NO portable en aislamiento** (deps faltantes en develop).
- **% completitud (en SOURCE):** ~95% (módulo maduro, con SPEC SDD y dos suites de tests).
- **% portabilidad directa a develop hoy:** ~20% (solo `SPEC.md` y, parcialmente, los hunks BFF; el resto no compila sin 014/007/009).

## Estado en ESTE repo (web)

### FE (`ui/`)
- `ProjectEditor.tsx`: implementado, 2083 líneas, con props completas (`selectionOnlyRelations`,
  `createNewProject`, `contextProject`, `projectNameScope`, `initialCustomer`, `initialCampaign`,
  `initialProjectId`, `onSaved`, `onClose`). Lógica de guardado distingue `PUT /projects/:id`
  (selection-only / editar) vs `POST /projects` (createNewProject; NO en `/admin/projects/new`).
  Usa `freshProjectDetailUrl(id) => /projects/${id}?fresh=1` para bypass de cache del BFF.
- `projectEditorScope.ts`: módulo puro, completo y testeado. Funciones: `buildProjectEditorScope`,
  `filterProjectEditorOptions` (filtra por scope + rol), `collectTenantReferences`,
  `filterScopedFieldOptions`, `filterScopedLotOptions`, `collectScopedCropOptions`.
- Tests: `projectEditorScope.test.ts` (scope concreto cliente+campaña, filtrado por rol,
  acotación de campos/lotes/cultivos, fuzzy dentro/fuera de contexto) y `ProjectEditor.test.tsx`
  (no muestra Administrar; dropdown clientes/proyectos acotados; guardar usa PUT no POST).
- `SPEC.md`: completo (SDD).
- **NO en develop:** los 5 archivos del módulo NO existen en `develop` (verificado).

### BFF (`api/`)
- `api/src/routes/projects.ts` ya existe en develop; el diff `fefbe695..3ffcf60` añade los hunks
  de cache/verbo/forwardQuery/`/hard`. Implementación correcta.
- **Bloqueante:** importa `buildForwardQuery` de `api/src/utils/forwardQuery.ts`, que **NO existe
  en develop** y **NO está en el flist 010**.

## Estado en el OTRO repo (core/platform / BE)

- Desconocido desde aquí (no inspeccionado). Según la nota: BE expone project-archive-entidades-bridge
  + scope/creator. El BFF asume que archive/restore se reciben por POST y que existen
  `/projects/archived`, `/customers/archived`, `/projects/:id/hard`.
- Debe confirmarse con el paquete BE feature-010 (BE-first).

## Tests

| suite | tipo | estado en SOURCE | corre en develop hoy? |
|---|---|---|---|
| `projectEditorScope.test.ts` | unit (vitest) | presente | NO (faltan `lib/fuzzySearch`, `entityNameMatcher`) |
| `ProjectEditor.test.tsx` | UI (vitest + testing-library) | presente | NO (el componente no compila sin deps 014/007/009) |

## Pendientes / clasificación

### BLOQUEANTE para mergear
- Traer/asegurar `api/src/utils/forwardQuery.ts` (sin él `api/` no compila).
- Tener en develop las deps de 014/007/009 antes (o junto) — `ProjectEditor.tsx` no compila aislado.
- Confirmar BE-first: paquete BE feature-010 + archive/restore POST desplegado.
- `git restore -p` de `projects.ts` SIN arrastrar hunks ya porteados (lot-metrics/tentative-prices #117/#121/#124).

### Mejora futura
- Considerar deduplicar la relación `CustomerEditor` <-> `ProjectEditor` (hoy `CustomerEditor`
  es un wrapper `mode="customerOnly"` sobre `ProjectEditor`).

### Deuda aceptable
- `apiClient.get<any>` y `any` en varias rutas BFF (preexistente, no introducido por 010).

### Duda humana
- ¿`forwardQuery.ts` lo trae 009 o 013? Decidir dónde se porta para no duplicar.
- ¿Mergear 010 FE y 014 FE en un único PR? (acoplamiento mutuo; ver dependencies.md).

## Bugs detectados

- Ninguno funcional en el código de 010. El único "bug de extracción" es la dependencia
  colgante `forwardQuery` no incluida en el flist.
