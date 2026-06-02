# notes-for-future-agent.md — feature-017 · FE dollar / commercialization forms

## Resumen corto

Feature **chica y Solo-FE**. A pesar del nombre ("dollar / commercialization forms"), el
flist autoritativo (`/tmp/flists/fe-017.txt`) son SOLO 2 archivos del hook
`useCommercializations`. Es un refactor de manejo de errores: pasa de `extractErrorMessage`
a `formatError` (`@/lib/format`), unifica copy en español, conserva 404→[], elimina la rama
409 y borra el símbolo muerto `SET_CROPS`.

## Qué está en FE y qué en BE

- **FE (web/ui)**: los 2 archivos. Es todo.
- **BE (core/platform)**: NADA. "Sin cambios BE". Los endpoints
  `GET`/`POST /projects/:id/commercializations` ya existen en el backend Go y se consumen
  por axios (`apiClient`), no por el BFF (`api/src` no tiene nada `commerc*`).

## Archivos esenciales

- `ui/src/hooks/useCommercializations/index.ts` — el cambio sustancial.
- `ui/src/hooks/useCommercializations/actions.ts` — borra `SET_CROPS`.

## Archivos peligrosos / trampas

- **NO** traer `ui/src/pages/admin/master-data/commerce/CommerceForm.tsx` ni
  `.../dollar/DollarForm.tsx`: son CREADOS en este rango (+322 / +255) pero pertenecen a
  **feature-014** (verificado en `/tmp/flists/fe-014.txt`). La nota de 017 los menciona; el
  flist no los incluye. Respetar el flist.
- **NO** traer `ui/src/lib/format/*`: es **feature-006**.
- `SET_CROPS` existe en DOS hooks: el de `useCommercializations` (muerto, se borra) y el de
  `useLots` (vivo, NO se toca). No confundir.

## Archivos mezclados (compartidos / partial-hunks)

Ninguno. No hay routers/registries/bootstrap/lockfiles en este flist. Extracción limpia
whole-file de 2 archivos.

## Decisiones ya tomadas

- Extraer tal cual (whole-file los 2), **después de feature-006**.
- No incluir tests (no hay propios).
- Eliminar el mapeo 409 hardcodeado, delegando a `formatError`/`translateBackendError`.

## Dudas abiertas (para humano)

- ¿`translateBackendError` (en develop/006) cubre el patrón 409 "already exists"? Si no, el
  duplicado mostrará el fallback genérico. Mirar:
  `git show develop:ui/src/lib/translateBackendError.ts`.
- QA del copy nuevo cuando entre 014.

## Comandos a mirar PRIMERO

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web
cat /tmp/flists/fe-017.txt                                   # 2 líneas
git ls-tree develop ui/src/lib/format                        # ¿006 ya está? (HOY: vacío)
git diff develop..3ffcf60 -- ui/src/hooks/useCommercializations/   # el diff a portear
git show 3ffcf60:ui/src/hooks/useCommercializations/index.ts # versión objetivo
```

## Errores a evitar

- Mergear 017 antes de 006 → rompe el build (`@/lib/format` no existe en develop).
- Arrastrar las páginas de 014 o `lib/format` de 006 "porque la nota los menciona".
- Tomar `develop-problematico` (tip) como SOURCE: su tip es un restore vacío. SOURCE =
  `develop-problematico~1` (`3ffcf60`).

## Camino más seguro

1. Asegurar 006 en develop. 2. Rama desde develop. 3. `git checkout 3ffcf60 -- <2 paths>`.
4. `yarn build`/`tsc`. 5. PR contra develop.

## PR del otro repo antes/después

Ninguno. Solo-FE; sin acoplamiento con BE. Orden respecto a BE: indiferente.
Orden intra-FE: **006 → 017 → (014)**.
