# spec — selectores-catalogo-proyecto-campo-lote

## Qué hace
En el alta/edición de cliente o sociedad, los campos de texto libre de Proyecto, Campo y
Lote son **combos editables**: se elige un nombre existente (sugerencias del registry) o se
escribe uno nuevo. El nombre nuevo se persiste al guardar el proyecto (comportamiento de
siempre: el payload del proyecto incluye los nombres y el core los crea). Esos nombres
aparecen luego en "Administrar entidades" y se pueden **editar desde ahí** (catálogo
unificado), incluido el nombre del proyecto y del campo, vía endpoints name-only nuevos.

## Archivos
| Archivo | Cambio | Qué hace |
|---|---|---|
| `ui/.../customers/CatalogNameSelect.tsx` | Nuevo | Combo editable: `value` = nombre (no id). Sugerencias con `searchRegistryAll({ type: base })`. Permite escribir un valor nuevo. |
| `ui/.../customers/Customers.tsx` | Modificado | Input "Proyecto" → `CatalogNameSelect base="project"`. |
| `ui/.../customers/Fields.tsx` | Modificado | Input "Campo" → `CatalogNameSelect base="field"`; "Lote" → `CatalogNameSelect base="lot"`. |
| `api/src/routes/catalogFactory.ts` (BFF) | Modificado | Opción `nameUpdatePath`: el `PUT /catalog/<base>/:id` hace `PATCH ${corePath}/:id${nameUpdatePath}` con `{name}` (para entidades estructurales). |
| `api/src/routes/index.ts` (BFF) | Modificado | `/catalog/project` y `/catalog/field` usan `nameUpdatePath: "/name"`. |
| `ponti-backend internal/project/*` | Modificado | Endpoint `PATCH /projects/:id/name` (handler + usecase + repo `UpdateProjectName` + DTO). Aislado del `UpdateProject` completo. |
| `ponti-backend internal/field/*` | Modificado | Endpoint `PATCH /fields/:id/name` (handler + usecase + repo `UpdateFieldName` + DTO). No toca lease_type/lotes. |

## Dependencias
- BE: `/registry` acepta `type=project|field|lot` y devuelve filas con `name` (ya existía).
- BE: contenedor Go rebuildeado para exponer los `PATCH .../name` nuevos.

## Criterios de aceptación
- [ ] En crear cliente/sociedad, Proyecto/Campo/Lote son combos: elegir existente o escribir nuevo.
- [ ] Un nombre nuevo se guarda al guardar el proyecto y aparece en Administrar entidades.
- [ ] Editar el nombre desde Administrar entidades funciona para Lote, Campo y Proyecto.
- [ ] Editar nombre de proyecto/campo NO requiere reenviar el resto del payload.

## Riesgos
- `searchRegistryAll` pagina; listas grandes = varias requests al abrir el form.
- Lote: el core ya hacía update parcial (solo campos no vacíos), por eso no necesitó endpoint nuevo.

## Decisiones de diseño
- Fuente de sugerencias = `searchRegistryAll` (no `listCatalog`): `/catalog/lot` y `/catalog/field` proxean al core jerárquico (`/lots`, `/fields`) que exige `project_id`/`field_id` y devuelve `lot_name`/`field_name`, dando listas vacías. El registry normaliza todo a `name`.
- `value` = nombre (string) para no alterar el payload del proyecto (que viaja con nombres).
- Edición name-only por endpoints dedicados y aislados (`PATCH .../name`) en vez de tocar el `UpdateProject`/`UpdateField` completos: bajo riesgo, aditivo, sin migración. project.name no tiene unique index → sin conflictos.
- project/field/lot siguen SIN ser categorías creables del modal de catálogo (son estructurales): se crean al guardar el proyecto, no sueltos por nombre.
