# validation.md — feature-017 · FE dollar / commercialization forms

## Checklist PRE-PR (estático)

- [ ] **Pre-req 006**: `git -C web ls-tree develop ui/src/lib/format` lista `formatError.ts` e `index.ts`.
- [ ] Solo 2 archivos staged: `ui/src/hooks/useCommercializations/{actions.ts,index.ts}`.
- [ ] `git grep -n "extractErrorMessage" ui/src/hooks/useCommercializations` → 0 resultados.
- [ ] `git grep -n "SET_CROPS" ui/src/hooks/useCommercializations` → 0 resultados.
- [ ] `git grep -n "formatError" ui/src/hooks/useCommercializations/index.ts` → 2 resultados.
- [ ] `git grep -n "Ocurrio un error" ui/src/hooks/useCommercializations` → 0 (copy viejo fuera).
- [ ] `git diff develop-problematico~1 -- <los 2 paths>` → vacío (lo traído == SOURCE).
- [ ] `git diff --check` → sin warnings de whitespace.

## Comandos de validación (FE)

```bash
cd /home/pablocristo/Proyectos/pablo/ponti/web

# Type-check (depende de @/lib/format / 006)
yarn workspace ui tsc --noEmit        # o: cd ui && yarn tsc --noEmit

# Lint de los 2 archivos
yarn workspace ui lint

# Build
yarn workspace ui build

# Tests (no hay tests propios; corre la suite por regresión de 006)
yarn workspace ui test
```

> Nota: usar el invocador de workspace real del repo. Si no hay `workspace ui`, hacer el
> equivalente dentro de `ui/` (yarn está a nivel monorepo).

## Pruebas manuales (UI)

Requiere que feature-014 (páginas) también esté presente para ver la UI; si no, validar
solo a nivel hook/consumidor existente:

1. Abrir el formulario de comercialización (`/admin/master-data/commerce`, CommerceForm).
2. Proyecto SIN comercializaciones → debe cargar lista vacía, SIN toast de error
   (verifica el 404→[]).
3. Guardar valores válidos → toast/success "Se guardaron los valores de comercialización."
4. Forzar error de red/500 → mensaje en español vía `formatError` (no inglés crudo).
5. Intentar crear un duplicado (si el BE devuelve 409) → mensaje legible (idealmente el de
   "ya existe"; si sale el fallback genérico, registrar como deuda de `translateBackendError`).

## Casos borde

- 404 con cuerpo no-JSON → debe mapear a `[]` igual (el guard es por status).
- Excepción no-axios (objeto raro) → `formatError` no debe romper (tiene type-guard).
- `result` se setea a `""` antes de guardar (reset) → el efecto de éxito en CommerceForm no
  dispara con valor vacío.

## Qué revisar en API / DB / env

- **API**: ninguna definición de ruta en este repo; el hook pega a `/projects/:id/commercializations`
  del backend Go. Confirmar que ese endpoint sigue vivo en el entorno de prueba.
- **DB**: nada.
- **env**: nada (usa `apiClient` con baseURL ya configurada).

## Qué validar en el OTRO repo

Nada. Solo-FE. No hay PR ni cambios de BE asociados.

## Señales de incompletitud / incompatibilidad

- Build falla con `Cannot find module '@/lib/format'` → falta 006 en develop.
- Aparece `SET_CROPS` aún en `useCommercializations/actions.ts` → no se trajo la versión nueva.
- Toasts en inglés crudo o el copy viejo ("Ocurrio…") → extracción incompleta de `index.ts`.
- `extractErrorMessage` aún importado en el hook → quedó la versión vieja.
