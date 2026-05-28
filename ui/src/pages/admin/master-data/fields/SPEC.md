# Campos - Spec

## Alcance

`Campo` es una entidad hija de `Proyecto`. Su editor no debe exponer ni permitir editar datos generales del proyecto.

## Editor De Campo

- El editor dedicado es `FieldFormDrawer`.
- El drawer se usa desde `Administrar Entidades` para crear y editar campos.
- El drawer no debe usar `CustomerEditor` ni mostrar el formulario completo de proyecto.
- Los botones del drawer deben usar verbos de una sola palabra: `Agregar`, `Guardar`, `Crear`, `Cancelar`, `Quitar`.
- Los botones no deben repetir el nombre de la entidad cuando el contexto visual ya lo indica.
- El drawer no debe mostrar ni editar:
  - Cliente
  - Nombre del proyecto
  - Campania
  - Responsables del proyecto
  - Inversores del proyecto
  - Costo planificado
  - Costo administrativo
  - Campos hermanos

## Campos Visibles

El drawer debe mostrar solamente:

- `Campo`
- `Tipo de Arriendo`
- `Valor (USD)` cuando el tipo de arriendo usa valor fijo
- `%` cuando el tipo de arriendo usa porcentaje
- `Arrendatario`
- `%` de cada arrendatario
- `Lotes` del campo:
  - `Lote`
  - `Hectareas`
  - `Cultivo Anterior`
  - `Cultivo Actual`
  - `Periodo`

## Guardado

- Aunque visualmente edite solo un campo, el guardado puede reutilizar el contrato de `PUT /projects/:id` mientras no exista un endpoint agregado de campo completo.
- Al guardar por proyecto, solo se debe modificar el campo editado o agregar el campo nuevo.
- El resto del proyecto debe conservarse sin cambios.
- Las entidades relacionadas se seleccionan de listas existentes; crear actores, cultivos o proyectos pertenece a sus editores propios.

## Tests SDD

- Render: no muestra secciones generales de proyecto.
- Render: muestra campo, tipo de arriendo, arrendatario y lotes.
- Submit: al editar un campo, envia `PUT /projects/:id` preservando el proyecto y reemplazando solo ese campo.
- `Administrar Entidades`: editar `Campo` abre `FieldFormDrawer`, no `CustomerEditor`.
