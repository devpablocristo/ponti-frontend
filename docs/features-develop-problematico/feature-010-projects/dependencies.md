# dependencies.md — feature-010 projects (FE / repo web)

## Resumen de orden recomendado

```
BE feature-010 (+009)   ->   FE 007  ->  FE 009  ->  FE 014  ->  FE 010 (este)
   (cross-repo, BE-first)        (intra-repo, fuertes)
```

## Depende de

### Fuertes (bloquean compilación / merge)

| dependencia | feature | qué aporta | evidencia (import real) |
|---|---|---|---|
| `master-data/customers/types.ts` | 014 | `ActorOption`, `EntityOption`, `SelectionValue`, `ActorPayload`, `CampaignPayload`, `FieldPayload`, `FormOptionsPayload`, `LotListPayload`, `ProjectDetailResponse`, `ProjectListResponse`, `ApiResponse` | `ProjectEditor.tsx:39` import type {...} from "../master-data/customers/types" |
| `master-data/customers/helpers.ts` | 014 | `createEmptyProject`, `normalizeProject`, `extractEntityOptions`, `NEW_VALUE`, `SEASON_OPTIONS`, regex `COST_INPUT_REGEX`/`HECTARES_INPUT_REGEX`, `parseBoundedPercentage`, etc. | `ProjectEditor.tsx:53` |
| `master-data/customers/customerEditorValidation.ts` | 014 | `buildProjectPayloadForSave`, `validateProjectForSave`, `validateProjectSelectionsForSave`, `validateUniqueProjectName`, `ProjectNameOption`, etc. | `ProjectEditor.tsx:26` |
| `master-data/customers/_components/EditableList.tsx` | 014 | `AddButton`, `EditableList`, `RemoveButton` | `ProjectEditor.tsx:21` |
| `components/SmartEntityInput/SmartEntityInput.tsx` | 014 | selector relacional con fuzzy/selection-only | `ProjectEditor.tsx:12` |
| `lib/fuzzySearch.ts` | 014 | `fuzzySearchOptions` | `projectEditorScope.test.ts` (import directo) |
| `lib/entityNameMatcher.ts` | 014 | `normalizeEntityName` | `projectEditorScope.ts` (import) |
| `lib/lifecycle/filterActive.ts` | 009 | `filterActive` (filtra archivados) | `ProjectEditor.tsx:8` |
| `hooks/useDatabase/projects/types.ts` (Project) | 007/009 | campos `actor_id?` y `archived_at?` en `investors`/`admin_cost_investors`/`Data`/`Field`/`Plot` | scope usa `reference.actor_id`, `project.fields[].investors`, `archived_at` |
| `api/src/utils/forwardQuery.ts` | 009 o 013 | `buildForwardQuery(req)` | `api/src/routes/projects.ts` import — **AUSENTE en develop, NO en flist 010** |

### Débiles (afectan comportamiento, no compilación)

| dependencia | feature | nota |
|---|---|---|
| BE project-archive-entidades-bridge + scope/creator | BE 010 | sin él, el filtrado por contexto no tiene respaldo real; dropdowns podrían venir mal scopeados |
| BE archive/restore (POST) | BE 009/010 | el BFF ahora expone POST; el backend siempre recibió POST |
| `useSelection` (login context) | 008 (identity-tenant-context) | `ProjectEditor.tsx:20` usa `useSelection` |

### Inciertas

| dependencia | duda | cómo verificar |
|---|---|---|
| `forwardQuery.ts` dueño exacto | ¿lo trae 009 o 013? | `git log --oneline develop-problematico~1 -- api/src/utils/forwardQuery.ts` y cruzar con flists de 009/013 |
| ruta `/admin/projects/new` | en SOURCE apunta a `CustomersList projectsOnly`, no a `ProjectEditor` directo | `git show 3ffcf60:ui/src/router.tsx | grep projects` (ya verificado) — el wiring lo trae 014 |
| `Project` type dueño | el diff de `types.ts` tiene actor_id+archived_at; ¿007 o 009? | revisar flists de 007 y 009 |

## Bloquea a

| feature bloqueada | por qué |
|---|---|
| 011 (campaign-dto-projectid) | el editor maneja campaña/proyecto; cambios de DTO projectId pueden tocar el payload que `buildProjectPayloadForSave` arma |
| 018 (data-integrity-admin) FE/BE | comparte superficie de proyectos/admin |
| consumidores de `ProjectEditor` | `CustomerEditor.tsx`, `CustomersList.tsx`, `FieldsList.tsx`, `entities/GeneralEntities.tsx` (todos en 014) importan `ProjectEditor` — 014 no compila sin 010 y viceversa => 010 y 014 están MUTUAMENTE acoplados |

## Archivos / tipos / config / APIs compartidos

- **Compartido (partial-hunks):** `api/src/routes/projects.ts` (existe en develop; varias intenciones conviven: cache, archive, lot-metrics ya porteado). Tratar con `git restore -p`.
- **Tipos compartidos:** `Project` (`ui/src/hooks/useDatabase/projects/types.ts`) y todo `master-data/customers/types`.
- **APIs compartidas (BFF->BE):** `/projects*`, `/customers/archived`. Verbos archive/restore cambian a POST.
- **No compartido por 010 pero relacionado:** `ui/src/router.tsx`, `api/src/routes/index.ts` (registries/bootstrap) — NO en flist 010.

## Acoplamiento mutuo 010 <-> 014 (NOTA IMPORTANTE)

`ProjectEditor.tsx` vive en `projects/` (010) pero importa masivamente de `master-data/customers/` (014),
y a la vez 014 importa `ProjectEditor` desde `projects/`. No se pueden mergear por separado sin romper el
build. Recomendación: **mergear 010 FE y 014 FE juntos (o 014 inmediatamente antes en el mismo train)**.

## Recomendación de orden final

1. BE feature-010 (+009) — cross-repo, primero.
2. FE 007 (actor-system) y FE 009 (archive surface, incluye `filterActive` y posiblemente `forwardQuery`).
3. FE 014 (master-data) + FE 010 (projects) juntos.
4. Validar build/test completos antes de cualquier PR de 011/018.
