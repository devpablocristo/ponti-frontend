# risks.md — feature-007 actor-system (FE)

## Riesgos funcionales
1. **Unicidad de nombre solo aparente** (ALTO). El SPEC exige que la unicidad global por tenant NO dependa del FE; el BE/DB la refuerza con conflicto de dominio + índice único parcial sobre actores activos. Si se mergea FE sin el BE-007 correspondiente, dos usuarios pueden crear duplicados que el FE no detecta.
   - *Mitigación*: BE-first. No habilitar la pantalla en prod hasta que migr 223/226/231/234 estén aplicadas y el endpoint devuelva el conflicto de dominio. Verificar que el FE muestre el mensaje de duplicado del BE (no solo la validación cliente).
2. **Display de nombres raw/canónicos** (MEDIO). Regresión documentada en SPEC. Si `formatProperName`/`canonicalizeName` (fe-006) no están bien portados, el subtítulo/input muestran `agro lajitas` en vez de `Agro Lajitas`.
   - *Mitigación*: correr `ActorFormDrawer.test.tsx` y `SmartEntityInput.test.tsx`; verificar que `lib/properName` (fe-006) está mergeado antes.
3. **Perfil condicional mal guardado** (MEDIO). Persona debe anular `organization_profile` y viceversa; "otro/unknown" ambos null. Un bug aquí ensucia datos.
   - *Mitigación*: tests SDD de payload; smoke manual creando un actor de cada tipo.

## Riesgos técnicos
4. **No compila sin fe-006/fe-014** (ALTO/seguro). ~25 imports a módulos ausentes en develop (crud/*, feedback/*, filters, useEntityCrud, properName, fuzzySearch, entityNameMatcher, entities.ts, useInvestors, useManagers, fileTransfer, Archived*).
   - *Mitigación*: orden de merge 006→014→007; `yarn workspace ui build` como gate previo al PR.
5. **Owner incierto de `useDatabase/projects`** (MEDIO). Si no llega con ningún feature previo, ActorsList/actorContextFilters no compilan.
   - *Mitigación*: `git cat-file -e develop:ui/src/hooks/useDatabase/projects/types.ts` antes del PR.

## Riesgos de integración
6. **Contrato BFF↔BE divergente** (MEDIO). El BFF asume `page_info.total` para lista, `data` numérico o `{id}` en create, y rutas `/actors/:id/{archive,restore,hard,roles,aliases}` + `/actors/merge` + `/actors/duplicate-candidates`. Si el BE-007 nombró distinto, falla en runtime.
   - *Mitigación*: validar contra OpenAPI del BE (fe-024); probar cada verbo en network tab.
7. **Auth/tenant headers** (MEDIO). El BFF inyecta `X-API-KEY` (config) y `X-User-Id` (de `req.user.userID`); 401 si falta. Depende de fe-008 (identity-tenant-context).
   - *Mitigación*: validar que el middleware de auth puebla `req.user.userID` en develop.

## Riesgos cross-repo
8. **Mergear solo FE** (ALTO). UI presente pero `/actors*` 404 → pantalla rota/errores. NO mergear FE sin BE-007.
9. **Mergear solo BE** (BAJO para este repo). El BE-007 puede vivir sin el FE; solo no habrá UI. Aceptable como paso intermedio (de hecho es el orden BE-first esperado).
10. **Normalización divergente FE/BE** (MEDIO). `canonicalizeName` (fe-006) vs propername del BE (fe-004): si difieren, el índice único del BE puede rechazar nombres que el FE consideró distintos, o viceversa.
    - *Mitigación*: alinear reglas; test de paridad en ambos repos.

## Riesgos de datos / migración
11. Ninguna migración en FE. El riesgo de datos vive en BE-007 (backfill de actores desde customers/managers/investors legacy, índice único que puede fallar si ya hay duplicados normalizados en prod).
    - *Mitigación (BE)*: deduplicar antes de crear el índice único parcial; coordinar con paquete BE-007.

## Riesgos de archivos compartidos
12. **Conflictos de merge en `router.tsx` y `routes/index.ts`** (ALTO si concurrente). Estos archivos los tocan fe-006/fe-014 y deben contener los hunks de actors.
    - *Mitigación*: que 006/014 incluyan las líneas de actors; si no, portar solo esos hunks con `git restore -p` y resolver conflictos manualmente. Nunca traer estos archivos enteros desde 3ffcf60.

## Riesgos de extracción parcial
13. **Olvidar el wiring** (ALTO). Si se traen los 17 archivos pero no los hunks de `router.tsx`/`routes/index.ts`, las páginas no son alcanzables y el BFF no expone `/actors` (síntoma silencioso: build verde, navegación rota).
    - *Mitigación*: checklist de validación (navegar las 8 rutas, network tab a `/actors`).
14. **Traer dependencias por accidente** (MEDIO). Resolver imports copiando archivos de fe-006/014 dentro de este PR → solapamiento y conflictos con esos PRs.
    - *Mitigación*: restringir el `git checkout 3ffcf60 --` exactamente a los 17 paths del flist.

## Riesgo de mergear solo este repo / solo el otro
- **Solo FE (sin BE-007)**: NO recomendado — runtime roto. 
- **Solo BE-007 (sin FE)**: aceptable como paso BE-first; sin superficie de usuario.
- **Solo FE-007 sin fe-006/014**: imposible (no compila).
