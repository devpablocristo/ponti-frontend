# implementation-status.md — feature-007 actor-system (FE)

## Estado general
**Completa en el SOURCE (`3ffcf60`)** a nivel de código y tests, pero **NO portable en aislamiento**: requiere fe-006 + fe-014 (intra) y fe-007 BE (cross) para compilar/funcionar.

- **% completitud (FE, dentro de su carpeta)**: ~95%. 17 archivos, 3478 líneas, SPEC.md/SDD + 5 suites de test.
- **% completitud para "mergeable y funcional en develop hoy"**: ~0% sin las dependencias; ~90% una vez mergeados 006/014/BE-007.

## Estado en ESTE repo (FE)
- Código presente y coherente: BFF router, hook de dominio, componente SmartEntityInput, módulo de páginas completo.
- Todos los archivos son nuevos (status A); no hay edición de código preexistente en el flist (las ediciones de wiring están en archivos compartidos de otros features).
- El BFF implementa todos los verbos del contrato (incluido `merge` y `duplicate-candidates`), con hidratación post-create/update y cache flush.
- El hook expone toda la superficie (`createActor`, `updateActor`, `archiveActor`, `restoreActor`, `hardDeleteActor`, `addActorRole`, `addActorAlias`, `mergeActors`, `getDuplicateCandidates`).

## Estado en el OTRO repo (BE)
- Desconocido desde este paquete; según la NOTA: BE expone `/api/v1/actors` + migr 223/226/231/234. Confirmar en el paquete `feature-007` del repo BE (flist `be-007.txt`). La unicidad de nombre y el índice único parcial deben estar implementados en BE (lo exige el SPEC.md del editor).

## Tests
- FE incluidos: `SmartEntityInput.test.tsx`, `ActorFormDrawer.test.tsx`, `ArchivedActorsByRole.test.tsx`, `actorContextFilters.test.ts`, `actorCrudarRouting.test.ts`. Runner vitest (`yarn workspace ui test`).
- SPEC.md enumera ~16 casos SDD (render/layout, display, sugerencias por rol, bloqueo de duplicados global y exacto, edición conservando nombre propio, defaultRoles, limpieza de aliases/identifiers, perfil condicional). Confianza ALTA de que los tests cubren la mayoría; confianza MEDIA sobre si cubren el path completo de ActorsList (715 líneas, sin test propio dedicado además de los helpers).
- No corrí los tests (entorno de solo lectura). Validar localmente tras portar dependencias.

## Pendientes / gaps
- **Wiring compartido no está en el flist**: `router.tsx` (006) y `routes/index.ts` (014). Sin ellos, la feature no es alcanzable ni montada. → resolver vía orden de merge o partial-hunks.
- Verificar owner de `useDatabase/projects` (incierto).
- Verificar que `@/api/client`, `notify`, `dataDisplay`, `Button/*`, `Input/*`, `types.ts` existan en develop o lleguen con 006.

## Bugs conocidos / regresiones mencionadas
- El SPEC.md documenta un **bug de regresión**: editar un actor con `display_name` raw/canónico NO debe mostrar el raw en subtítulo ni en el input `Nombre` (debe aplicar reglas de display). Cubierto por tests SDD. Verificar que el fix esté presente en `3ffcf60` (se observa `formatProperName` usado en ActorFormDrawer y SmartEntityInput → confianza alta de que está resuelto).

## Clasificación

### BLOQUEANTE para mergear
- Mergear ANTES: fe-007 BE, fe-006, fe-014 (incluyendo wiring de `router.tsx` y `routes/index.ts`).
- `tsc -b` + `vite build` de ui en verde tras portar dependencias.
- vitest verde de las 5 suites.

### Mejora futura
- Test de integración dedicado para `ActorsList` (flujo bulk + filtros + integración con Archived/Duplicate).
- Alinear `lib/properName` (FE) con propername (BE/fe-004) para que la unicidad normalizada sea idéntica en ambos lados.

### Deuda aceptable
- `actorCrudarRouting.ts` acopla el módulo a tipos de customer/manager/investor (feature-014); aceptable porque es solo mapeo para archivado/bulk, no sync de negocio.
- Uso de `any` en el BFF (`apiClient.get<any>`) — consistente con el resto del BFF.

### Duda humana
- ¿Los hunks de wiring deben venir en fe-006/fe-014 o portarse aquí como partial-hunks? Decisión de coordinación.
- ¿El contrato `Actor` del BE-007 coincide exactamente con los tipos del hook? Validar contra OpenAPI (fe-024) antes del PR.
