# dependencies.md — feature-018 (FE)

## Depende de

| dependencia | tipo | fuerza | por qué |
|---|---|---|---|
| **fe-006** (`ui/src/lib/format/*` → `formatError`, `translateBackendError`) | intra-repo | **FUERTE** | `queries.ts` y `mutations.ts` hacen `import { formatError } from "@/lib/format"`. Sin esto no compila (tsc) ni pasan los tests (que verifican traducciones). |
| `ui/src/hooks/useDatabase/projects/actions.ts` | intra-repo | fuerte pero ya satisfecha | Symbols (`SET_PROJECTS`, `START_PROCESSING`, etc.) usados por queries/mutations/reducer. **Ya está en develop**, sin cambios. |
| `@/api/client` (`apiClient`), `@/api/types` (`SuccessResponse`) | intra-repo | fuerte pero ya satisfecha | Cliente HTTP base. Presentes en develop. |

## Bloquea a

| afectado | tipo | fuerza | nota |
|---|---|---|---|
| consumidores de `useProjects` | intra-repo | débil | API público intacto; no deberían requerir cambios. Lista: `useWorkspaceFilters.ts`, `pages/admin/customers/Customers.tsx`, `pages/admin/customers/ExpandedRow.tsx`, `pages/admin/database/customers/Customers.tsx`, `pages/admin/database/customers/projectPayload.ts`, `pages/admin/database/projects/ArchivedProjects.tsx`, `pages/admin/master-data/actors/ActorsList.tsx`, `pages/admin/master-data/actors/actorContextFilters.ts(.test.ts)`, `pages/admin/master-data/commerce/CommerceForm.tsx`. |
| feature-010 (projects) | intra-repo | incierta | Es la feature "dueña" natural de este código. Puede haber solapamiento de hunks en `types.ts`/`projectReducer.ts`. |

## Cross-repo

| relación | fuerza | detalle |
|---|---|---|
| **be-018** (`internal/data-integrity/*`) | **NINGUNA de compilación** | Es el cross-repo nominal de la feature-018, pero esta flist FE (refactor de projects) no consume el endpoint de data-integrity. La UI que sí lo consume está en fe-014. |
| BE de projects (feature-010 / crudar lifecycle, be-002/be-010) | débil/runtime | Emite los strings `"project already exists"` y `"project not found or outdated"` que `formatError` traduce. Si el BE cambia esos strings, las traducciones del FE quedan obsoletas (no rompe build, sí UX). |

## Archivos / tipos / config / migraciones / APIs compartidos

- **Tipos compartidos:** `Project`, `Field`, `Plot`, `Data` (en `types.ts`) — también
  tocados por features de actores/tenancy (`actor_id`, `archived_at`).
- **APIs consumidas:** `/projects*` (definidas en BE, no en esta flist).
- **Config:** ninguna.
- **Migraciones:** ninguna.
- **Archivos globales del repo:** ninguno en esta flist (no toca router/main/routes/index/lockfiles).

## Recomendación de orden

1. **fe-006** (formatError) — obligatorio antes.
2. Este paquete (refactor de projects). Coordinar con **fe-010** para evitar conflicto
   en `types.ts`/`projectReducer.ts`; si fe-010 va primero, este puede reducirse a hunks.
3. Independiente de **be-018** y **fe-014** (la data-integrity real).
