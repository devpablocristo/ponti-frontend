# Editor De Proyectos - Spec

## Alcance

Este spec gobierna `/admin/projects/new` y el editor completo de proyectos en `src/pages/admin/projects/ProjectEditor.tsx`.

Esta pantalla es operativa. No crea ni administra catalogos de entidades.

`Administrar Entidades` no usa este editor completo; para proyectos usa `src/pages/admin/master-data/entities/ProjectBasicDrawer.tsx`.

## Regla Principal

`/admin/projects/new` solo selecciona entidades existentes y edita valores o asignaciones operativas del proyecto.

Queda prohibido crear entidades desde esta pantalla:

- no crea clientes
- no crea proyectos
- no crea campanias
- no crea responsables
- no crea inversores
- no crea arrendatarios
- no crea campos
- no crea lotes
- no crea cultivos

Crear, editar, archivar o restaurar entidades pertenece a `/admin/master-data/entities`.

## Flujo

Aunque la ruta se llame `/admin/projects/new`, en este flujo el usuario configura un proyecto existente.

La seleccion base es:

1. Cliente / Sociedad existente
2. Proyecto existente de ese cliente
3. Campania existente

Sin cliente, proyecto y campania seleccionados no se abre la configuracion operativa.

Guardar un proyecto desde este flujo usa `PUT /projects/:id`. No debe llamar `POST /projects`.

## Editor Completo

El editor completo conserva estas secciones operativas:

- Proyecto
- Responsables
- Inversores
- Costo administrativo
- Campos
- Arrendatarios
- Lotes
- Cultivos

Cada bloque relacional usa la accion `Agregar`, no `Administrar`.

`Agregar` agrega una seleccion o asignacion operativa dentro del proyecto actual. No abre flujos de creacion de catalogo.

## Valores Y Asignaciones Permitidas

Esta pantalla si edita valores y asignaciones operativas:

- responsables asignados al proyecto
- inversores asignados al proyecto
- porcentajes de inversores
- costo planificado
- costo administrativo
- inversores de costo administrativo
- campos seleccionados para el proyecto
- arrendatarios y valores de arriendo
- lotes seleccionados
- hectareas
- fechas
- periodo
- variedad
- cultivo anterior
- cultivo actual

Estos valores no se editan en `/admin/master-data/entities`.

## Dropdowns Y Busqueda

- Todo selector relacional usa `SmartEntityInput`.
- `SmartEntityInput` aplica la busqueda fuzzy/trigrama frontend existente mediante `fuzzySearchOptions`.
- Selectores cubiertos: cliente, proyecto, campania, responsables, inversores, inversores de costo administrativo, campos, arrendatarios, lotes, cultivo anterior y cultivo actual.
- `Nombre del proyecto` nunca debe caer a `InputField` plano en el editor completo: usa dropdown con `SmartEntityInput`.
- Al abrir un selector selection-only con un valor ya elegido, el campo de busqueda se limpia y el dropdown muestra todas las opciones permitidas por contexto.
- Si el usuario borra el texto de busqueda, vuelve a ver todas las opciones permitidas por contexto.
- Mientras escribe, la busqueda fuzzy/trigrama acota esas opciones permitidas.
- La busqueda fuzzy/trigrama se aplica despues de filtrar por contexto, para que no revele opciones fuera del scope.

## Dropdowns Base

- `Cliente / Sociedad` siempre muestra todos los clientes activos en el dropdown.
- El usuario solo puede elegir un cliente existente; no puede escribir ni crear uno nuevo.
- Despues de elegir `Cliente / Sociedad`, `Nombre del proyecto` muestra solo proyectos existentes de ese cliente.
- El usuario solo puede elegir un proyecto existente de ese cliente; no puede escribir ni crear uno nuevo.
- `Campania` muestra campanias existentes permitidas para el contexto.
- El usuario solo puede elegir una campania existente; no puede escribir ni crear una nueva.

## Scope

El scope del editor completo se construye con `buildProjectEditorScope`:

- `customerId`
- `projectId`
- `campaignId`
- `projectName`

Reglas de filtrado:

- Si hay `projectId`, no se muestran opciones fuera de ese proyecto.
- Si no hay `projectId` pero hay `customerId + campaignId`, no se muestran opciones fuera de ese cliente/campania.
- Cuando existe contexto concreto, no hay fallback global.
- Actores se filtran tambien por rol: responsable, inversor o arrendatario.

## Contrato

`ProjectEditor` recibe el contrato de proyecto que historicamente usaba `CustomerEditor` en modo proyecto, mas las banderas necesarias para este flujo acotado:

- `initialCustomer`
- `initialCampaign`
- `contextProject`
- `projectNameScope`
- `customerId`
- `initialProjectId`
- `selectionOnlyRelations`
- `onSaved`
- `onClose`

En `/admin/projects/new`, `selectionOnlyRelations` debe estar activo y `createNewProject` no debe usarse para permitir creacion real de proyecto.

`CustomerEditor` queda reservado para flujos de cliente/customer-only.

## Tests SDD

- `ProjectEditor`: no muestra botones `Administrar` ni flujos de creacion de entidades.
- `ProjectEditor`: dropdown de clientes muestra todos los clientes activos.
- `ProjectEditor`: dropdown de proyectos se limita al cliente elegido.
- `ProjectEditor`: no permite crear/escribir un proyecto nuevo en selection-only.
- `ProjectEditor`: guardar en `/admin/projects/new` usa `PUT /projects/:id` y no `POST /projects`.
- Dropdown de responsables no muestra actores fuera del contexto.
- Dropdown de inversores no muestra inversores fuera del contexto.
- Dropdown de campos/lotes/cultivos se acota al proyecto o al cliente+campania.
- La busqueda fuzzy encuentra opciones dentro del contexto.
- La busqueda fuzzy no revela opciones fuera del contexto.
- No hay fallback global cuando existe scope concreto.
