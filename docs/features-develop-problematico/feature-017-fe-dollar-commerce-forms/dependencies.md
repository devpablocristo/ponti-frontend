# dependencies.md — feature-017 · FE dollar / commercialization forms

## Resumen de grafo

```
feature-006 (fe-design-system)  ──FUERTE──▶  feature-017  ◀──DÉBIL──  feature-014 (fe-master-data-pages)
   (provee @/lib/format)                         │                          (consume el hook)
                                                 └─ Solo-FE: sin BE
```

## Depende de (upstream)

| feature | fuerza | tipo | qué aporta | evidencia |
|---|---|---|---|---|
| **006 fe-design-system** | **FUERTE (bloqueante)** | intra-repo | `@/lib/format` (`formatError`) que `index.ts` importa | `git ls-tree develop ui/src/lib/format` vacío hoy; `formatError.ts`/`index.ts` solo en `/tmp/flists/fe-006.txt` |
| `ui/src/lib/translateBackendError.ts` | DÉBIL | intra-repo | traducción de patrones de error (ej. 409 "already exists") usada DENTRO de `formatError` | ya existe en `develop` (`git ls-tree develop ui/src/lib/translateBackendError.ts`) |
| `ui/src/api/hooks/useApiCall.ts` | DÉBIL | intra-repo | `extractErrorStatus` (sigue usándose para el 404) | ya en develop; no cambia |

## Bloquea a (downstream)

| feature | fuerza | tipo | relación | nota |
|---|---|---|---|---|
| **014 fe-master-data-pages** | DÉBIL | intra-repo | `CommerceForm.tsx`/`DollarForm.tsx` consumen `useCommercializations` | el shape del return del hook NO cambió → 014 puede mergear antes o después sin romper |

## Inciertas

- **Patrón 409 en `translateBackendError`**: se eliminó el mensaje hardcodeado
  "Ya existe un valor con el mismo nombre." asumiendo que `translateBackendError` lo cubre.
  Incierto si el patrón exacto del BE matchea. Riesgo de copy degradado, no de ruptura.
  Revisar: `git show develop:ui/src/lib/translateBackendError.ts | grep -i "already\|existe\|exists"`.

## Archivos / tipos / config / APIs compartidos

- **Archivos compartidos (routers/registries/lockfiles)**: NINGUNO en este flist.
- **Tipos compartidos**: `CommercializationData`, `CommercializationInfoData` (en
  `./types`, no cambian; locales al módulo).
- **APIs (backend Go, no en este repo)**: `GET`/`POST /projects/:id/commercializations`.
  Contrato estable, sin cambios.
- **Config / env**: ninguno.
- **Migraciones**: ninguna.

## Cross-repo

NINGUNA. Solo-FE. En el cross-repo-map del BE: **"sin cambios BE"**.

## Recomendación de orden

1. **006 (fe-design-system)** primero (provee `@/lib/format`). BLOQUEANTE.
2. **017** (esta feature).
3. **014** indistinto (antes o después de 017; recomendable después para validar el hook ya migrado).
