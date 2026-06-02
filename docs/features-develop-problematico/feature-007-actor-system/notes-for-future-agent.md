# notes-for-future-agent.md — feature-007 actor-system (FE)

## Resumen corto
Feature FULL-STACK grande. En este repo (web monorepo) son **17 archivos nuevos** (status A) que implementan el sistema de "Actores" como entidad maestra unificada (cliente/inversor/responsable/arrendatario/proveedor/contratista/facturador). El código está completo en `develop-problematico~1` (`3ffcf60`) pero **no compila ni funciona sin fe-006, fe-014 (intra-repo) y feature-007 BE (cross-repo)**. NO es extraíble en aislamiento.

## Qué está en FE vs BE
- **FE (este paquete)**: BFF proxy `api/src/routes/actors.ts`; hook `ui/src/hooks/useActors`; componente `ui/src/components/SmartEntityInput`; módulo `ui/src/pages/admin/master-data/actors/*` (ActorsList, ActorFormDrawer, ArchivedActors/ByRole, DuplicateActors, helpers, SPEC.md, tests).
- **BE (feature-007 BE, otro flist `be-007.txt`)**: `/api/v1/actors` + migraciones 223/226/231/234, índice único parcial por tenant para unicidad de nombre normalizado, merge y duplicate-candidates. **Debe mergear ANTES (BE-first).**

## Archivos esenciales
- `useActors/index.ts` — fuente de los tipos del dominio y el servicio CRUD. Empezar acá para entender el contrato.
- `api/src/routes/actors.ts` — todos los endpoints proxy; ver normalización de lista y hidratación post-create/update.
- `ActorFormDrawer.tsx` + `master-data/actors/SPEC.md` — reglas funcionales (display, unicidad, perfil condicional, identifiers, aliases). El SPEC.md es la fuente de verdad funcional; leelo entero.

## Archivos peligrosos / mezclados
- **`ui/src/router.tsx` (owner fe-006)** y **`api/src/routes/index.ts` (owner fe-014)**: contienen el wiring de actors pero NO están en este flist. Son COMPARTIDOS. Riesgo de conflicto de merge. Tratar como partial-hunks coordinados; nunca traerlos enteros.
- `actorCrudarRouting.ts` — acopla el módulo a tipos de customer/manager/investor (feature-014). Es solo mapeo para archivado/bulk, no sync de negocio. Dejarlo en fe-007.
- `actorContextFilters.ts` — importa helpers de `managers/` e `investors/` (feature-014).

## Decisiones ya tomadas
- `SmartEntityInput` es **propio de fe-007** (no aparece en fe-006 ni fe-014) → se trae con este PR aunque viva en `components/`.
- Extraer los 17 archivos como `whole-file` (todos status A, ausentes en develop).
- Orden de merge: **BE-007 → FE-006 → FE-014 → FE-007**.
- NO partir en subfeatures (módulo cohesivo).

## Dudas abiertas
- ¿Quién aporta `ui/src/hooks/useDatabase/projects[/types]`? Owner incierto. Verificar.
- ¿Los hunks de wiring vienen en 006/014 o se portan aquí? Coordinación pendiente.
- ¿El shape `Actor`/payloads del BE-007 coincide 1:1 con los tipos del hook? Validar contra OpenAPI (fe-024).
- ¿`canonicalizeName` (fe-006/FE) y la normalización del BE (fe-004) producen la misma clave? Afecta la unicidad.

## Qué comandos mirar primero
```bash
cat /tmp/flists/fe-007.txt
git -C <repo> show 3ffcf60:ui/src/pages/admin/master-data/actors/SPEC.md
git -C <repo> show 3ffcf60:ui/src/hooks/useActors/index.ts
git -C <repo> show 3ffcf60:api/src/routes/actors.ts
git -C <repo> show 3ffcf60:ui/src/router.tsx | grep -n actor
git -C <repo> show 3ffcf60:api/src/routes/index.ts | grep -n actor
# existencia de deps en develop:
git -C <repo> cat-file -e 8c25e88:ui/src/pages/admin/entities.ts
```

## Errores a evitar
- NO mergear FE sin BE-007 (runtime roto, duplicados sin bloqueo).
- NO mergear fe-007 antes de fe-006/fe-014 (no compila).
- NO traer `router.tsx`/`routes/index.ts` enteros desde 3ffcf60 (pisás trabajo de 006/014).
- NO copiar dependencias de fe-006/014 dentro de este PR para "arreglar" imports.
- NO ejecutar git mutante; los comandos en los docs son sugerencias para un humano.

## Camino más seguro
1. Confirmar BE-007 mergeado y desplegado.
2. Confirmar fe-006 y fe-014 en develop (incluido wiring de actors).
3. `git checkout develop && git checkout -b pr/feature-007-actor-system-fe`.
4. `git checkout 3ffcf60 -- <17 paths>`.
5. Si falta el wiring: `git restore -p --source=3ffcf60 -- ui/src/router.tsx api/src/routes/index.ts` (solo hunks de actors).
6. `yarn workspace ui test && yarn workspace ui build` verdes → PR.

## PR del otro repo: antes/después
- **ANTES**: PR de **feature-007 BE** (endpoints + migr 223/226/231/234). BE-first, obligatorio.
- **DESPUÉS (verificación cruzada)**: confirmar feature-008 (identity-tenant-context) para `X-User-Id`/tenant en el BFF, y feature-024 (openapi-and-docs) para validar el contrato.
- **DONE — no extraer** (ya porteado, no toca este módulo): table-select-filters #104, reports-dark-mode #105, lot-metrics/total_tons #117/#121/#124, tentative-prices #121/#124, dependency-bumps #124.
