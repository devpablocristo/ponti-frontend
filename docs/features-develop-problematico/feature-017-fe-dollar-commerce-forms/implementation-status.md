# implementation-status.md — feature-017 · FE dollar / commercialization forms

## Estado global

| dimensión | valor |
|---|---|
| estado | **COMPLETA** en el SOURCE (`3ffcf60`) |
| % completitud (en SOURCE) | 100% para los 2 archivos del flist |
| este repo (web/ui) | implementado y coherente en `3ffcf60`; aún NO en `develop` |
| el otro repo (core/platform) | N/A (Solo-FE) |
| tests | sin tests propios |

## Estado en este repo

- `actions.ts`: borrado `SET_CROPS`; quedan `SET_RESULT` y `SET_COMMERCIALIZATIONS`. ✔
- `index.ts`: import migrado a `formatError`; copy nuevo; 404→[] con comentario; rama 409
  eliminada. ✔
- `develop` actual: versión vieja (con `extractErrorMessage` + rama 409). Falta portear.
- `develop` actual: **NO** tiene `ui/src/lib/format` → el build del archivo migrado fallaría
  hoy. La completitud funcional del archivo es 100%, pero su **mergeabilidad** depende de 006.

## Estado en el otro repo

No aplica. El backend Go ya expone los endpoints consumidos; nada que portear.

## Tests

- Propios: 0 en el flist.
- Relacionados (NO de esta feature): `ui/src/lib/format/formatError.test.ts` (242 líneas,
  feature-006) cubre la lógica de `formatError` que este hook ahora usa.
- Sugerido a futuro: un test del hook que verifique 404→[] sin error y éxito→result.

## Pendientes

| item | clasificación |
|---|---|
| Mergear **006** en develop antes que 017 (provee `@/lib/format`) | **BLOQUEANTE-para-mergear** |
| `yarn build`/`tsc` verde tras traer los 2 archivos | **BLOQUEANTE-para-mergear** |
| Confirmar que `translateBackendError` cubre el patrón 409 "already exists" | duda-humana (copy, no ruptura) |
| Añadir test unitario del hook (404→[], éxito→result) | mejora-futura |
| QA del copy nuevo en `CommerceForm` (llega con 014) | duda-humana |

## Bugs / observaciones

- Ninguno detectado en el diff. El cambio es un refactor de presentación de errores +
  limpieza de un símbolo muerto.
- Deuda aceptable: el hook seguirá llamando endpoints del backend Go directamente por axios
  (no por el BFF). Es el patrón existente; no es regresión de esta feature.
