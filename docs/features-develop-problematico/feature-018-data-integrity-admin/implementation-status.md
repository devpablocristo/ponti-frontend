# implementation-status.md — feature-018 (FE)

## Estado general

| dimensión | valor |
|---|---|
| estado del código (en SOURCE 3ffcf60) | **completa** (el refactor de projects está cerrado y testeado) |
| % completitud (del refactor que describe la flist) | ~95% |
| estado en este repo (develop) | **no porteado** |
| estado en el otro repo (be-018) | desconocido para esta tarea; es feature aparte (data-integrity BE) |
| tests | sí: `index.test.ts` (vitest), cubre save/update/archive/restore + 2 traducciones de error |

## Estado por archivo (vs develop tip 8c25e88)

| archivo | en develop | observación |
|---|---|---|
| `index.ts` | existe, **difiere** | develop tiene la versión monolítica vieja |
| `index.test.ts` | **ausente** | net-new |
| `mutations.ts` | **ausente** | net-new |
| `queries.ts` | **ausente** | net-new |
| `projectReducer.ts` | existe, **difiere** | falta export de `ProjectAction` + guards de array |
| `types.ts` | existe, **difiere** | faltan `actor_id?`/`archived_at?` |

## Pendientes / observaciones

- El refactor en sí está completo y compilable **siempre que `@/lib/format` exista**.
- `git diff --check` reporta warnings de *trailing whitespace* en `projectReducer.ts`
  (líneas 20/55/61) y `types.ts` (varias). Son cambios cosméticos del diff; no son
  conflict markers. Conviene limpiarlos antes del PR (lefthook/prettier deberían).

## Bugs / riesgos detectados

- Ninguno funcional en el refactor.
- Acoplamiento a strings del BE para traducción (deuda aceptable, ya existente).

## Clasificación de pendientes

### BLOQUEANTE para mergear
- **fe-006 debe estar antes** (`@/lib/format`); sin esto no compila. (HARD)
- Confirmar que el **API público de `useProjects` no rompe** a sus consumidores
  (debería estar intacto, pero validar build).

### Mejora futura
- Reducir el acoplamiento a strings literales del BE moviendo el mapeo a un
  catálogo central de errores.

### Deuda aceptable
- Trailing whitespace (lo arregla prettier/lefthook).
- `actor_id?`/`archived_at?` opcionales: aditivos, bajo riesgo.

### Duda humana (requiere decisión del orquestador)
- **¿Esta flist pertenece a feature-018 o a feature-010?** El contenido es refactor
  de projects, no data-integrity. La UI de data-integrity está en fe-014 y el BE en
  be-018. Decidir si se re-clasifica antes de portear.
