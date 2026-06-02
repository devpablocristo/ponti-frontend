# spec.md — feature-017 · FE dollar / commercialization forms

| campo | valor |
|---|---|
| id | feature-017 |
| slug | fe-dollar-commerce-forms |
| nombre | FE dollar / commercialization forms |
| tipo | feature |
| repo | Frontend monorepo `web/` (ui/ React + api/ BFF NodeJS, yarn) |
| existe-en-FE | SÍ (solo en `ui/`) |
| existe-en-BE | NO (Solo-FE; en core/platform no hay carpeta) |
| merge | FE independiente |
| SOURCE de extracción | `develop-problematico~1` (SHA `3ffcf60`) |
| rama destino | `develop` (tip `8c25e88`) |
| rango fuente-de-verdad | `fefbe695..3ffcf60` |

## Resumen

El alcance REAL de esta feature, según tu flist autoritativo (`/tmp/flists/fe-017.txt`),
son SOLO 2 archivos del hook `useCommercializations`:

- `ui/src/hooks/useCommercializations/actions.ts` (M)
- `ui/src/hooks/useCommercializations/index.ts` (M)

La nota de la feature menciona `pages/admin/dollar + commercialization`, pero esas
páginas (`CommerceForm.tsx`, `DollarForm.tsx`) NO están en tu flist: pertenecen a
**feature-014 (fe-master-data-pages)** — verificado: solo aparecen en
`/tmp/flists/fe-014.txt`. Por lo tanto feature-017 se reduce al refactor del hook que
esas páginas consumen.

## Objetivo

Modernizar el manejo de errores y los mensajes de copy del hook
`useCommercializations` para alinearlo al design-system (feature-006):

1. Reemplazar `extractErrorMessage(error, fallback)` por `formatError(error, { fallback })`
   de `@/lib/format` (helper centralizado de presentación de errores en español).
2. Unificar el copy de éxito/error a frases en español consistentes con el resto del
   admin ("No se pudieron cargar/guardar los valores de comercialización.",
   "Se guardaron los valores de comercialización.").
3. Documentar (comentario) y mantener el mapeo de **HTTP 404 → lista vacía sin toast**
   (un proyecto puede no tener comercializaciones todavía).
4. Eliminar la rama especial de **409 → "Ya existe un valor con el mismo nombre."**
   (ahora ese mapeo queda delegado a `formatError`/`translateBackendError`).
5. Eliminar el símbolo `SET_CROPS` de `actions.ts` del módulo (quedó muerto; el
   `SET_CROPS` vivo es el de `useLots`, no el de comercializaciones).

## Problema que resuelve

- Copy inconsistente y con errores de tildes ("Ocurrio un error en la busqueda…").
- Doble fuente de verdad para presentar errores (`extractErrorMessage` ad-hoc vs.
  `formatError` centralizado). El 409 hardcodeado en inglés→español duplicaba lo que
  ahora hace `translateBackendError` dentro de `formatError`.
- `SET_CROPS` muerto en el reducer de comercializaciones.

## Alcance EN ESTE repo (web/ui)

- `ui/src/hooks/useCommercializations/actions.ts`: borra `SET_CROPS`.
- `ui/src/hooks/useCommercializations/index.ts`: cambia import (`extractErrorMessage`→
  `formatError`), reescribe 4 mensajes de copy, agrega comentario del 404, borra la
  rama 409.

NO toca: `commercializationsReducer.ts` ni `types.ts` del módulo (sin cambios en el
rango — verificado con `git diff --stat`).

## Alcance EN EL OTRO repo (core/platform)

NINGUNO. Es Solo-FE. El hook llama por axios (`apiClient`) directo al backend Go:
- `GET  /projects/:id/commercializations`
- `POST /projects/:id/commercializations`
No pasa por el BFF (`api/src`) — confirmado: no hay archivos `commerc*` bajo `api/src`.
En el cross-repo-map del BE figurar como **"sin cambios BE"**.

## Fuera de alcance (NO extraer en esta feature)

- `ui/src/pages/admin/master-data/commerce/CommerceForm.tsx` (creado, 322 líneas) → **feature-014**.
- `ui/src/pages/admin/master-data/dollar/DollarForm.tsx` (creado, 255 líneas) → **feature-014**.
- `ui/src/lib/format/*` (formatError, formatEmpty, formatLoading, formatValidation) → **feature-006**.
- `ui/src/api/hooks/useApiCall.ts` (define `extractErrorMessage`/`extractErrorStatus`) → no cambia.

## Comportamiento esperado

- `getCommercializations(id)`: GET; si 404 → `commercializations = []` y NO setea error
  (sin toast). Otros errores → `setError(formatError(...))`.
- `saveCommercializations(data, id)`: POST; éxito → `result = "Se guardaron los valores de
  comercialización."`; error → `setError(formatError(...))` (el 409 ya lo traduce
  `translateBackendError` dentro de `formatError`).
- El consumidor `CommerceForm.tsx` (feature-014) lee `{ error, result, processing,
  commercializations, getCommercializations, saveCommercializations }` y muestra `error`/
  `result` vía `notify.error`/`setSuccessMessage`. El contrato del hook (shape del return)
  NO cambia.

## Estado en dp~1 (`3ffcf60`)

COMPLETO y coherente en el SOURCE. `develop` ya tiene los 2 archivos en su versión vieja
(con `extractErrorMessage` y el 409). Verificado: `git diff develop..3ffcf60` sobre los 2
paths produce exactamente el diff esperado.

## Criterios de aceptación

1. `actions.ts` queda con solo `SET_RESULT` y `SET_COMMERCIALIZATIONS`.
2. `index.ts` importa `formatError` de `@/lib/format` y ya NO importa `extractErrorMessage`.
3. Los 4 mensajes de copy quedan en la redacción nueva (ver diff).
4. Se preserva el mapeo 404→[] y se elimina la rama 409.
5. `yarn build` / `tsc` pasa: requiere que `@/lib/format` exista en `develop`
   (**depende de feature-006**).
6. `CommerceForm.tsx` (cuando exista en develop vía 014) sigue compilando contra el hook.

## Endpoints / modelos / UI / DB / tests afectados

- **Endpoints** (consumidos por axios, no definidos aquí): `GET`/`POST /projects/:id/commercializations`.
- **Tipos**: `CommercializationData`, `CommercializationInfoData` (en `./types`, sin cambios).
- **Símbolos/acciones**: `SET_RESULT`, `SET_COMMERCIALIZATIONS` (queda), `SET_CROPS` (se borra).
- **Hook/store**: `useCommercializations` (+ `commercializationsReducer`, sin cambios).
- **UI**: ninguna pieza de UI propia (las páginas son de 014).
- **DB / migraciones**: ninguna.
- **Tests**: NINGÚN test propio en el flist. (Existe `ui/src/lib/format/formatError.test.ts`
  pero pertenece a feature-006).

## Dependencias

- **Intra-repo (FUERTE / BLOQUEANTE)**: `@/lib/format` → **feature-006 (fe-design-system)**.
  `develop` aún NO tiene `ui/src/lib/format` (verificado: `git ls-tree develop ui/src/lib/format`
  vacío). Sin 006, `index.ts` no compila.
- **Intra-repo (DÉBIL)**: feature-014 consume el hook. 014 puede mergear antes o después;
  el shape del return no cambió, así que no hay ruptura de contrato.
- **Cross-repo**: ninguna (Solo-FE).

## Riesgos

- **Funcional**: cambia el copy mostrado al usuario (esperado). El 409 ya no tiene mensaje
  específico hardcodeado; depende de que `translateBackendError` (dep de 006) cubra el patrón
  "already exists".
- **Técnico (alto)**: romper el build si se mergea antes que 006.

## DECISIÓN recomendada

**Extraer tal cual, PERO después de feature-006.** Es un diff chico (2 archivos, ~30 líneas),
limpio, sin tests propios y sin tocar archivos compartidos. El único bloqueo real es la
dependencia dura sobre `@/lib/format` (006). No requiere partir en subfeatures ni postergar
más allá de respetar ese orden.
