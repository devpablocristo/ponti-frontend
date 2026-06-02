# risks.md — feature-017 · FE dollar / commercialization forms

## Funcionales

| riesgo | severidad | mitigación |
|---|---|---|
| Cambia el copy mostrado al usuario (mensajes de éxito/error) | bajo | esperado; validar con QA que el texto nuevo es correcto en `CommerceForm` |
| Se eliminó el mensaje específico de 409 ("Ya existe un valor con el mismo nombre.") | medio | confirmar que `translateBackendError` (006/develop) cubre el patrón "already exists"; si no, el usuario verá el `fallback` genérico |
| El 404→[] sin toast podría ocultar un 404 "real" (endpoint roto vs proyecto sin datos) | bajo | comportamiento intencional y documentado en comentario; el backend devuelve 404 para "proyecto sin comercializaciones" |

## Técnicos

| riesgo | severidad | mitigación |
|---|---|---|
| `Cannot find module '@/lib/format'` al compilar (006 no mergeada) | **alto** | mergear feature-006 ANTES; pre-check `git ls-tree develop ui/src/lib/format` |
| `extractErrorMessage` queda sin uso en el hook (pero sigue exportado en `useApiCall`) | nulo | no se toca `useApiCall.ts`; otros consumidores siguen funcionando |

## Integración

| riesgo | severidad | mitigación |
|---|---|---|
| `CommerceForm.tsx` (feature-014) depende del shape del return del hook | bajo | el shape NO cambió (`{ processing, error, getCommercializations, saveCommercializations, result, commercializations }`); verificado en el consumidor |

## Cross-repo

NINGUNO. Solo-FE. No hay PR de BE que coordinar. Riesgo cross-repo = 0.

## Datos / migración

Ninguno. Sin DB, sin migraciones, sin cambios de schema.

## Archivos compartidos

NINGÚN archivo compartido (no toca router.tsx, main.tsx, api/src/routes/index.ts,
package.json, lockfiles). Riesgo de conflicto de merge en archivos compartidos = 0.

## Extracción parcial

| riesgo | mitigación |
|---|---|
| Traer `index.ts` sin notar que arrastra el import de `@/lib/format` | el pre-check de 006 lo cubre; si 006 falta, el build avisa de inmediato |
| Dejar `SET_CROPS` sin borrar (extracción incompleta de `actions.ts`) | `git grep -n "SET_CROPS" ui/src/hooks/useCommercializations` debe dar 0 |
| Traer por error las páginas de 014 o `lib/format` de 006 | seguir el flist; solo 2 paths |

## Riesgo de mergear SOLO este repo / SOLO el otro

- **Solo este repo (web)**: es lo correcto — es Solo-FE. Único cuidado: que 006 ya esté en
  develop. No hay nada del otro repo que falte.
- **Solo el otro repo (BE)**: N/A — no hay cambios de BE en esta feature.
