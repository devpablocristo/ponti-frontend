# risks.md — feature-010 projects (FE / repo web)

## Funcionales

| riesgo | impacto | mitigación |
|---|---|---|
| Dropdowns vacíos si el BE no respeta el scope (cliente+campaña / proyecto) | el usuario no puede asignar responsables/campos/lotes | validar con datos reales que `filterProjectEditorOptions`/`filterScopedFieldOptions` reciben referencias correctas del BE; BE-first |
| Creación accidental de proyecto si `selectionOnlyRelations` no llega activo en `/admin/projects/new` | se crea entidad de catálogo desde flujo operativo (viola SPEC) | confirmar que el wiring (router/CustomersList) pasa `selectionOnlyRelations` y que `createNewProject=false`; cubierto por `ProjectEditor.test.tsx` (guardar usa PUT no POST) |
| Fuzzy revela opciones fuera de contexto | fuga de scope | el SPEC exige fuzzy DESPUÉS del filtro de contexto; test `projectEditorScope.test.ts` lo cubre — mantener ese orden |

## Técnicos

| riesgo | impacto | mitigación |
|---|---|---|
| `ProjectEditor.tsx` no compila sin `master-data/customers/*`, `SmartEntityInput`, `fuzzySearch`, `entityNameMatcher`, `filterActive` | build de `ui/` roto | mergear 007/009/014 antes o junto; `yarn --cwd ui tsc --noEmit` |
| `Project` type en develop sin `actor_id?`/`archived_at?` | errores de tipo en `projectEditorScope.ts` | traer la actualización de `useDatabase/projects/types.ts` vía 007/009 |
| `api/src/routes/projects.ts` importa `forwardQuery` ausente | build de `api/` roto | incluir `api/src/utils/forwardQuery.ts` (whole-file) o coordinar 009/013 |

## Integración

| riesgo | impacto | mitigación |
|---|---|---|
| Cambio de verbo archive/restore (PUT->POST) desincronizado con consumidores | botones de archivar/restaurar 404/405 | grep de llamadas FE a `projects/:id/archive|restore`; alinear con 009 (archive surface) |
| Bypass de cache `?fresh=1`/`no_cache` no soportado aguas abajo | cache stale persistente | el cambio es BFF-local (memoria); verificar que el front pide `fresh=1` al recargar tras guardar (lo hace `freshProjectDetailUrl`) |
| `DELETE /:id/hard` ahora pega a `/projects/:id/hard` en BE | hard-delete falla si el BE no expone esa ruta | confirmar endpoint `/projects/:id/hard` en BE feature-009/010 |

## Cross-repo

| riesgo | impacto | mitigación |
|---|---|---|
| Mergear solo FE sin BE | scope/creator y archive-bridge ausentes -> dropdowns mal scopeados, archive/restore inconsistentes | BE-first estricto; no mergear FE 010 antes que BE 010+009 |
| Mergear solo BE sin FE | el editor operativo no existe en UI; sin regresión de datos pero feature incompleta | aceptable temporalmente; BE puede ir solo, el FE depende del BE |

## Datos / migración

- FE no toca DB ni migraciones. Riesgo de datos = 0 en este repo.
- Las migraciones de archive/scope viven en el BE; cualquier inconsistencia de `archived_at`
  se origina allí, no aquí.

## Archivos compartidos

| archivo | riesgo | mitigación |
|---|---|---|
| `api/src/routes/projects.ts` | al hacer partial-hunks, arrastrar por error hunks de lot-metrics/tentative-prices (#117/#121/#124 ya porteados) -> doble aplicación / conflicto | usar `git restore -p` y rechazar esos hunks; `git diff develop -- api/src/routes/projects.ts` para revisar el resultado |
| `ui/src/router.tsx` (NO en flist 010) | si alguien lo trae desde 010 mezcla wiring de 014 | no tocar router desde 010 |

## Extracción parcial

| señal | qué significa | acción |
|---|---|---|
| `Cannot find module '../master-data/customers/...'` | faltan deps 014 | traer 014 |
| `Property 'actor_id'/'archived_at' does not exist on type 'Project'` | falta update de tipos (007/009) | traer types |
| `Cannot find module '../utils/forwardQuery'` | falta el util en `api/` | traer `forwardQuery.ts` |
| tests de scope rojos por `fuzzySearchOptions` undefined | falta `lib/fuzzySearch` (014) | traer 014 |

## Riesgo de mergear "solo este repo" vs "solo el otro"

- **Solo FE (este):** ALTO si BE no está; el editor depende de scope/archive del BE.
- **Solo BE (otro):** BAJO; el BE puede ir primero sin romper nada en FE (el FE simplemente
  aún no consume las nuevas garantías). Es justamente el orden recomendado (BE-first).
