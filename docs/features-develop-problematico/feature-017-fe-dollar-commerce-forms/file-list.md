# file-list.md — feature-017 · FE dollar / commercialization forms

Flist autoritativo: `/tmp/flists/fe-017.txt` (2 entradas). Status: `M` = modified.

## Propios (extraer)

| path | status | tipo | rol en la feature | extracción | motivo | riesgo | confianza |
|---|---|---|---|---|---|---|---|
| `ui/src/hooks/useCommercializations/index.ts` | M | hook React (lógica + fetch) | corazón de la feature: GET/POST comercializaciones, mapeo de errores con `formatError`, copy nuevo, 404→[], borra rama 409 | **whole-file** | el archivo entero del módulo cambia solo por esta feature; no es compartido con otras | medio (importa `@/lib/format` de 006: build rompe si 006 no está) | alta |
| `ui/src/hooks/useCommercializations/actions.ts` | M | constantes (Symbols del reducer) | borra `SET_CROPS` muerto; deja `SET_RESULT` y `SET_COMMERCIALIZATIONS` | **whole-file** | archivo de 2 líneas tras el cambio, exclusivo del módulo | bajo | alta |

## Compartidos (partial-hunks)

Ninguno. Ningún archivo de este flist es un router/registry/bootstrap/lockfile ni sirve
a varias intenciones. Los dos archivos son del módulo `useCommercializations` y su diff
es 100% de feature-017.

## Requeridos por dependencia (NO en tu flist; extraer en SU feature)

| path | feature dueña | por qué lo necesita 017 | acción |
|---|---|---|---|
| `ui/src/lib/format/formatError.ts` | **006** (fe-design-system) | `index.ts` importa `formatError` | debe estar en `develop` ANTES de mergear 017 |
| `ui/src/lib/format/index.ts` (barrel) | **006** | resuelve `@/lib/format` | idem |
| `ui/src/lib/translateBackendError.ts` | ya en develop / 006 | dep transitiva de `formatError` (traduce 409 "already exists") | verificar presencia |

## Dudosos

| path | nota |
|---|---|
| `ui/src/api/hooks/useApiCall.ts` | NO está en el flist y NO cambia. Sigue exportando `extractErrorStatus` (que el hook usa) y `extractErrorMessage` (que el hook deja de usar). No extraer. |

## NO traer todavía (de otras features, aunque la nota de 017 los mencione)

| path | status | feature dueña | motivo |
|---|---|---|---|
| `ui/src/pages/admin/master-data/commerce/CommerceForm.tsx` | A (creado, +322) | **014** (fe-master-data-pages) | página consumidora del hook; pertenece a 014 (verificado en `/tmp/flists/fe-014.txt`) |
| `ui/src/pages/admin/master-data/dollar/DollarForm.tsx` | A (creado, +255) | **014** | idem |

## YA PORTEADO (DONE) que toca el contexto

- Ninguno de los 2 archivos propios está en `fe-DONE.txt`. La feature-017 NO está porteada.
- `lot-metrics`/`tentative-prices` (DONE) viven en `useLots`/precios, no en este módulo;
  el único cruce es el `SET_CROPS` de `useLots` (que sigue vivo y NO se toca acá).
