# Editor De Actores - Spec

## Alcance

El editor de actores administra personas y sociedades usadas como entidades maestras:

- Cliente
- Inversor
- Proveedor
- Responsable
- Arrendatario
- Contratista
- Facturador

El editor principal es `ActorFormDrawer`. Puede abrirse desde `Administrar Actores`, `Administrar Entidades` y cualquier flujo que necesite crear o editar un actor. La regla base es que el drawer edita el actor real; si otro feature necesita sincronizar una entidad legacy asociada, esa sincronizacion pertenece al feature consumidor.

## Layout

- El formulario empieza con `Nombre`.
- Los cuatro inputs principales tienen el mismo ancho visual:
  `Nombre`, `Tipo`, `Email`, `Telefono`.
- `Nombre` aparece antes que `Tipo`.
- Los roles aparecen despues de los datos principales.
- Los perfiles condicionales aparecen despues de roles:
  - `Persona` cuando `Tipo` es persona fisica.
  - `Empresa / Sociedad` cuando `Tipo` es organizacion.
- `Identificadores`, `Aliases` y `Notas` aparecen despues de perfiles.

## Visualizacion De Nombres

- El subtitulo del drawer debe mostrar el nombre con reglas de display, no el valor raw/canonico.
- El input `Nombre` debe mostrar el nombre con reglas de display cuando recibe un actor existente.
- Los valores canonicos o legacy en minuscula, por ejemplo `agro lajitas`, deben verse como `Agro Lajitas`.
- Las siglas y tipos societarios deben respetar mayusculas de display, por ejemplo `srl`, `sa`, `sas`.
- Las sugerencias y mensajes de duplicado tambien deben usar reglas de display.
- Bug de regresion: editar un actor con `display_name` raw/canonico no puede mostrar ese raw en el subtitulo ni en el input `Nombre`.

## Nombre Y Duplicados

- `Nombre` es obligatorio.
- Mientras se tipea el nombre, el input usa busqueda sobre la lista de actores existente.
- La busqueda debe mostrar coincidencias por trigrama/fuzzy.
- La lista visible de sugerencias debe limitarse a actores que tengan alguno de los roles seleccionados en el editor.
- Si el editor abre con `defaultRoles`, esos roles tambien limitan la lista inicial de sugerencias.
- Si no hay roles seleccionados, la lista visible de sugerencias no debe mostrar todos los actores.
- No pueden existir dos actores activos con el mismo nombre normalizado.
- La unicidad del nombre es global por tenant: no se permite repetir nombre aunque cambie `Tipo`, roles, perfil, email o telefono.
- Esta regla no puede depender solo del frontend: backend y base deben reforzarla con conflicto de dominio e indice unico parcial sobre actores activos.
- Crear un actor con nombre exacto ya existente esta prohibido.
- Editar un actor para usar el nombre de otro actor activo esta prohibido, aunque el otro actor tenga otro `Tipo`.
- Editar un actor mantiene permitido su propio nombre actual.
- Seleccionar una sugerencia existente no debe crear duplicado; debe mostrar bloqueo de duplicado.
- El mensaje de duplicado debe ser claro y mencionar el nombre existente.
- La deteccion de duplicados es global: aunque la sugerencia no aparezca por no coincidir con el rol, el guardado debe bloquear un nombre ya existente.

## Tipo

- `Tipo` define el perfil complementario.
- Si `Tipo` es persona fisica, se guarda `person_profile` y `organization_profile` debe ir en `null`.
- Si `Tipo` es organizacion, se guarda `organization_profile` y `person_profile` debe ir en `null`.
- Si `Tipo` es otro/sin definir, ambos perfiles deben ir en `null`.

## Roles

- Un actor puede tener multiples roles.
- Los roles se guardan como arreglo.
- Si un feature abre el editor con `defaultRoles`, esos roles deben aparecer preseleccionados en creacion.
- En edicion, los roles guardados del actor prevalecen sobre `defaultRoles`.
- Un rol no debe crear por si solo relaciones legacy; solo clasifica al actor.

## Identificadores

- Los identificadores vacios no se envian.
- Si hay identificadores y ninguno esta marcado como principal, el primero valido se marca como principal.
- Un identificador valido requiere tipo y valor.
- Pais vacio se normaliza a `AR`.

## Aliases

- Los aliases vacios no se envian.
- Al crear, el source por defecto es `ui_create`.
- Al editar, el source por defecto es `ui_edit`.

## Integraciones

- `ActorFormDrawer` no debe conocer reglas de clientes, proyectos, campos, lotes ni movimientos.
- `Administrar Entidades` puede usar este drawer para roles de actor.
- Si `Administrar Entidades` edita un `Cliente`, debe sincronizar el actor y el customer legacy fuera del drawer.
- Si otro feature necesita vincular el actor creado con otra entidad, debe hacerlo en su propio submit handler.

## Protocolo De Bugs

Cuando se detecte un bug del editor de actores:

1. Registrar el comportamiento esperado en esta spec.
2. Agregar un test de regresion que reproduzca el bug y falle antes del fix.
3. Implementar el fix mas chico posible.
4. Correr tests focalizados del editor y de los consumidores afectados.
5. No modificar features consumidores salvo que el bug pertenezca explicitamente a esa integracion.

Si el bug aparece usando el editor desde otro feature:

- La regla propia del editor va en esta spec.
- La regla de integracion va en la spec del feature consumidor.
- Debe existir al menos un test en el lugar donde se rompia.

## Tests SDD

- Render: muestra `Nombre` primero y `Tipo` segundo.
- Render: los cuatro inputs principales tienen el mismo layout.
- Render: subtitulo e input de nombre aplican reglas de display.
- Nombre: muestra sugerencias de actores mientras se tipea.
- Nombre: limita sugerencias a los roles seleccionados.
- Nombre: no muestra todos los actores si no hay roles seleccionados.
- Nombre: bloquea duplicados globalmente aunque el duplicado sea de otro rol.
- Nombre: bloquea duplicados exactos normalizados.
- Nombre: permite editar un actor conservando su propio nombre.
- Roles: aplica `defaultRoles` en creacion.
- Roles: respeta roles existentes en edicion.
- Payload: limpia aliases vacios.
- Payload: limpia identificadores invalidos.
- Payload: marca identificador principal si falta.
- Payload: envia perfil de persona solo para persona fisica.
- Payload: envia perfil de organizacion solo para organizacion.
