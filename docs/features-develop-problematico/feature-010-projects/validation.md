# validation.md — feature-010 projects (FE / repo web)

## Checklist pre-PR

- [ ] Deps en develop antes de mergear: FE 007 (actor), FE 009 (archive + `filterActive` + posiblemente `forwardQuery`), FE 014 (master-data customers/* + SmartEntityInput + fuzzySearch + entityNameMatcher).
- [ ] BE feature-010 (+009) mergeado/desplegado (BE-first).
- [ ] `api/src/utils/forwardQuery.ts` presente en develop (traído por 009/013 o por este PR).
- [ ] Los 5 archivos del módulo `ui/src/pages/admin/projects/` presentes.
- [ ] `api/src/routes/projects.ts`: solo hunks de 010 aplicados; NO arrastró hunks de lot-metrics/tentative-prices.
- [ ] `git diff --check` sin errores de whitespace.

## Tests sugeridos

### FE (ui/)
```bash
# desde la raíz del repo
yarn --cwd ui test -- src/pages/admin/projects/projectEditorScope.test.ts
yarn --cwd ui test -- src/pages/admin/projects/ProjectEditor.test.tsx
yarn --cwd ui tsc --noEmit          # type-check global
yarn --cwd ui build                 # build de producción
```
Casos que deben pasar (de las suites existentes):
- `buildProjectEditorScope` arma scope concreto por cliente+campaña sin projectId.
- `filterProjectEditorOptions` no devuelve responsables/inversores fuera del contexto ni de otro rol.
- `filterScopedFieldOptions`/`filterScopedLotOptions`/`collectScopedCropOptions` acotan al proyecto.
- fuzzy encuentra dentro del contexto y NO revela fuera.
- `ProjectEditor`: no muestra `Administrar`; dropdown clientes = todos activos; proyectos = del cliente; guardar = `PUT /projects/:id`, no `POST /projects`.

### BFF (api/)
```bash
yarn --cwd api build                # tsc
# smoke manual de rutas (con el BFF levantado):
#  GET /projects/123?fresh=1   -> NO debe servir de cache
#  GET /projects/archived?page=2 -> reenvía page=2 al backend
#  POST /projects/123/archive  -> 200 (antes era PUT)
#  POST /projects/123/restore  -> 200
#  DELETE /projects/123/hard   -> backend recibe /projects/123/hard
```

## Validación manual (UI)

1. Navegar a `/admin/projects/new`.
2. Verificar que NO hay botones `Administrar` ni flujos de creación de catálogo.
3. Elegir Cliente/Sociedad (dropdown muestra todos los clientes activos; no se puede escribir uno nuevo).
4. Elegir Proyecto existente del cliente (solo proyectos de ese cliente; no permite crear).
5. Elegir Campaña.
6. Confirmar que aparecen las secciones: Proyecto, Responsables, Inversores, Costo administrativo,
   Campos, Arrendatarios, Lotes, Cultivos.
7. En cada selector relacional: tipear texto -> la búsqueda fuzzy acota SOLO opciones del contexto;
   borrar texto -> vuelven todas las opciones permitidas por contexto (no globales).
8. Guardar -> debe llamar `PUT /projects/:id` (revisar Network tab), no `POST /projects`.
9. Tras guardar, recargar -> el editor debe pedir `/projects/:id?fresh=1` (cache bypass).

## Casos borde

- Cliente sin proyectos: dropdown de proyectos vacío, no crashea.
- Scope con `projectId` presente vs ausente (solo cliente+campaña): ambos deben acotar.
- Actor con múltiples roles: aparece solo en el dropdown del rol correspondiente.
- Cultivos anterior/actual sin id pero con nombre: `collectScopedCropOptions` los matchea por nombre normalizado.
- Borrar todo el texto de búsqueda: vuelve a opciones del contexto, nunca globales.

## Qué revisar en UI / API / DB / env

- **UI:** ruta `/admin/projects/new` realmente renderiza el flujo selection-only (depende del wiring de 014/router).
- **API:** que `forwardQuery` reenvíe `page`/`per_page` con defaults (1/1000) y los filtros de query.
- **DB:** N/A en FE.
- **env:** `configService.baseManagerApi` apunta al BE correcto.

## Qué validar en el OTRO repo (BE)

- Endpoints `GET /projects/archived`, `GET /customers/archived` aceptan query reenviada.
- `POST /projects/:id/archive` y `POST /projects/:id/restore` existen.
- `DELETE /projects/:id/hard` existe.
- El BE devuelve `actor_id`/`archived_at` en proyectos/inversores/campos/lotes para que el scope FE funcione.

## Señales de incompletitud / incompatibilidad

- Errores `Cannot find module` (deps 014/007/009 o `forwardQuery`).
- Errores de tipo sobre `actor_id`/`archived_at` en `Project`.
- Dropdowns siempre vacíos -> BE no manda referencias scopeadas.
- archive/restore devuelven 404/405 -> BE no migró a POST o ruta no existe.
