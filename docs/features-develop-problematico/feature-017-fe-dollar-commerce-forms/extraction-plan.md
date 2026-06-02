# extraction-plan.md — feature-017 · FE dollar / commercialization forms

## Coordenadas

| campo | valor |
|---|---|
| repo | `web/` (monorepo ui/ + api/) — trabajo solo en `ui/` |
| rama base | `develop` (tip `8c25e88`) |
| SOURCE | `develop-problematico~1` (SHA `3ffcf60`) — **NUNCA** usar `develop-problematico` (tip = restore vacío) |
| rama sugerida | `pr/feature-017-fe-dollar-commerce-forms-fe` |
| tipo de merge | FE independiente |
| dependencia previa OBLIGATORIA | **feature-006 (fe-design-system)** mergeada en `develop` (provee `@/lib/format`) |

## PR title

`feat(fe): formatError centralizado y copy en useCommercializations (feature-017)`

## PR description (borrador)

> Alinea el hook `useCommercializations` al design-system (feature-006):
> - Reemplaza `extractErrorMessage` por `formatError` de `@/lib/format`.
> - Unifica copy de éxito/error en español ("No se pudieron cargar/guardar…",
>   "Se guardaron los valores de comercialización.").
> - Mantiene el mapeo 404 → lista vacía sin toast (proyecto sin comercializaciones).
> - Elimina la rama 409 hardcodeada (ahora la cubre `translateBackendError` vía `formatError`).
> - Borra el símbolo muerto `SET_CROPS` de `actions.ts`.
>
> Solo-FE: sin cambios en BE. Páginas `CommerceForm`/`DollarForm` van en feature-014.
> **Requiere feature-006 mergeada** (provee `@/lib/format`).

## Pasos ordenados

1. Confirmar que **006 ya está en develop**: `git -C web ls-tree develop ui/src/lib/format`
   debe listar `formatError.ts` e `index.ts`. Si está vacío, **detener**: portear 006 primero.
2. Crear la rama desde develop.
3. Traer los 2 archivos enteros desde el SOURCE (`git checkout 3ffcf60 -- <paths>`).
4. `yarn install` (no cambia lockfile; solo asegura node_modules).
5. Type-check + build (ver validation.md).
6. Commit + PR contra develop.

## Archivos enteros vs parciales

- **Enteros (whole-file)**: ambos. `index.ts` y `actions.ts` son exclusivos del módulo
  y su diff completo es feature-017. No hay hunks que separar.
- **Parciales (partial-hunks)**: ninguno.

## Migraciones / tests a incluir

- Migraciones: ninguna (Solo-FE, sin DB).
- Tests: ninguno propio en el flist. NO arrastrar `ui/src/lib/format/formatError.test.ts`
  (es de 006).

## Dependencias previas

- **006 (fe-design-system)** → `@/lib/format`. BLOQUEANTE para el build.
- 014 (fe-master-data-pages) → consume el hook; puede ir antes o después (contrato estable).

## Coordinación con el otro repo

**No aplica.** Solo-FE. No hay PR de BE asociado. Orden: indiferente respecto a BE.
El backend Go ya expone `/projects/:id/commercializations` (consumido tal cual; sin cambios).

## Comandos git SUGERIDOS (para un humano; NO ejecutar acá)

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web

# 0) Pre-check de la dependencia 006 (debe listar formatError.ts e index.ts)
git ls-tree develop ui/src/lib/format

# 1) Rama desde develop
git checkout develop
git pull
git checkout -b pr/feature-017-fe-dollar-commerce-forms-fe

# 2) Traer los 2 archivos enteros desde el SOURCE
git checkout develop-problematico~1 -- \
  ui/src/hooks/useCommercializations/actions.ts \
  ui/src/hooks/useCommercializations/index.ts

# 3) Sanity del diff aplicado (no debe haber conflictos de whitespace)
git diff --check
git diff --staged --stat

# 4) Verificar que el diff es exactamente el esperado
git diff develop-problematico~1 -- \
  ui/src/hooks/useCommercializations/actions.ts \
  ui/src/hooks/useCommercializations/index.ts
# (debe salir vacío: lo traído == el SOURCE)
```

`git restore -p` NO es necesario: no hay archivos "mixtos" en este flist.

## Qué NO traer

- `CommerceForm.tsx`, `DollarForm.tsx` (→ 014).
- Cualquier cosa bajo `ui/src/lib/format/` (→ 006).
- `useApiCall.ts` (no cambia).

## Qué podría romperse

- **Build TS**: `Cannot find module '@/lib/format'` si 006 no está en develop.
- **Runtime (copy)**: cambian los textos de toasts/mensajes; QA debe validar el copy nuevo.
- **409**: si `translateBackendError` (006/develop) no cubre el patrón "already exists",
  el mensaje de duplicado será el `fallback` genérico en vez del específico. No rompe; degrada copy.

## Cómo detectar extracción incompleta

- `git grep -n "extractErrorMessage" ui/src/hooks/useCommercializations` → debe dar 0 resultados.
- `git grep -n "SET_CROPS" ui/src/hooks/useCommercializations` → debe dar 0 resultados (el de useLots NO cuenta).
- `git grep -n "formatError" ui/src/hooks/useCommercializations/index.ts` → debe aparecer 2 veces.
- `git grep -n "Ocurrio un error" ui/src/hooks/useCommercializations` → debe dar 0 (copy viejo eliminado).

## Qué validar antes del PR

- `yarn build` o `yarn tsc --noEmit` (depende de 006).
- `yarn lint` sobre los 2 archivos.
- Diff final == diff del SOURCE (ver paso 4).

## Qué hacer después de mergear

- Coordinar con feature-014: cuando 014 entre, validar que `CommerceForm`/`DollarForm`
  compilan contra el hook y que los toasts muestran el copy nuevo.
- Smoke test manual del formulario de comercialización (ver validation.md).
