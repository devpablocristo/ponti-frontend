# Administrar Entidades - Spec

## Alcance

`Administrar Entidades` vive en `/admin/master-data/entities` y no modifica los flujos legacy de clientes, proyectos, lotes ni campos. La pantalla compone datos existentes y centraliza seleccion, edicion, creacion y archivado de datos maestros.

## Cadena

La cadena principal es:

`Cliente -> Proyecto -> Inversor -> Campania -> Proveedor -> Responsable -> Arrendatario -> Campo -> Lote -> Cultivo`

Reglas:

- Los filtros aplican solo hacia adelante.
- `Proveedor` se lista filtrado por `Cliente`, `Proyecto`, `Inversor` y `Campania`.
- `Proveedor` no tamiza `Responsable`, `Arrendatario`, `Campo`, `Lote` ni `Cultivo`.
- `Responsable` actua a nivel `Proyecto`/`Campania`; no depende de `Campo`, `Lote` ni `Cultivo`.
- `Arrendatario` se deriva del campo.
- `Campo` filtra `Lote`.
- `Lote` filtra `Cultivo`.
- Los matches de nombres numerados deben ser exactos por limite de numero: `Lote 1` no matchea `Lote 15`.

## Vistas

- La tabla muestra la entidad de la profundidad activa.
- Si todos los filtros estan en `Buscar`, no hay tabla.
- `Todos` es una seleccion explicita.
- `Buscar` equivale a sin seleccion.
- Seleccionar filtros nunca abre editores.
- Editar abre editor solo desde el boton `Editar`.

## Visualizacion De Nombres

- Los nombres de entidades en filtros, tablas, acciones y drawers deben mostrarse con las reglas de `formatProperName` / `formatEntityDisplayName`.
- Los valores canonicos o legacy en minuscula, por ejemplo `agro lajitas`, deben verse como `Agro Lajitas`.
- Las siglas y tipos societarios deben respetar mayusculas de display, por ejemplo `srl`, `sa`, `sas`, `inta`, `usd`.
- Los conectores en medio del nombre quedan en minuscula, por ejemplo `Juan de la Torre`.
- Las campanias/codigos como `2025-2026` no se formatean con reglas de nombre.
- Bug de regresion: al seleccionar un valor en un filtro, el input cerrado no puede mostrar el nombre raw/canonico; debe mostrar el display name.
- Bug de regresion: las celdas de la tabla no pueden mostrar el nombre raw/canonico; deben mostrar el display name.

## Crear

`Nuevo` crea la primera entidad mas general que todavia este en `Buscar`.

- `Nuevo Cliente` abre `ActorFormDrawer` con rol `cliente` y, al guardar, crea actor y customer legacy vinculado.
- Roles de actor (`Cliente`, `Inversor`, `Proveedor`, `Responsable`, `Arrendatario`) usan `ActorFormDrawer`.
- `Campania` usa `CampaignFormDrawer`.
- `Cultivo` usa `CropFormDrawer`.
- `Proyecto`/`Campo` usan `CustomerEditor` embebido.
- `Lote` usa el drawer real de lotes.

## Editar

- `Cliente` abre `ActorFormDrawer` del actor vinculado por `customer.actor_id`.
- Guardar un cliente debe sincronizar actor y customer legacy, porque la fila visible de cliente sale de `/customers`.
- Si un customer no tiene actor vinculado, guardar debe crear/vincular actor antes de actualizar customer.
- `Inversor`, `Proveedor`, `Responsable` y `Arrendatario` abren `ActorFormDrawer`.
- `Campania` abre `CampaignFormDrawer`.
- `Cultivo` abre `CropFormDrawer`.
- `Campo` abre el editor completo de proyecto/campo dentro del drawer de Administrar Entidades.
- `Lote` abre el drawer real de lotes.

## Archivado

- No se puede archivar una entidad con entidades activas asociadas.
- El bloqueo debe mostrar un motivo claro.
- Archivados reutiliza las listas/drawers existentes.
- Despues de archivar, restaurar o eliminar definitivamente, la pantalla debe refrescar datos activos y archivados.
- Si un filtro seleccionado deja de existir como entidad activa despues de archivar o eliminar, ese filtro y todos sus filtros posteriores deben volver a `Buscar`.
- Un valor archivado o eliminado no puede seguir visible como seleccion cerrada del filtro ni como opcion activa hasta refrescar manualmente.

## Tests SDD

- Builder: una fila por entidad real y sin duplicados de actores por contexto.
- Builder: proveedor filtra por anteriores y no tamiza posteriores.
- Builder: responsable no depende de lote/cultivo.
- Builder: arrendatario aparece si esta usado en campo.
- Builder: `Lote 1` no matchea `Lote 15`.
- Pantalla: filtros en orden correcto.
- Pantalla: `Nuevo` cambia segun primera entidad en `Buscar`.
- Pantalla: seleccionar filtros no abre editor.
- Pantalla: filtros seleccionados muestran nombres con reglas de display, no valores raw.
- Pantalla: columnas de tabla muestran nombres con reglas de display, no valores raw.
- Pantalla: editar cliente sincroniza actor y customer.
- Pantalla: nuevo cliente crea actor y customer vinculado.
- Pantalla: editar lote abre el drawer real de lotes.
- Pantalla: archivar/eliminar una entidad seleccionada la quita de filtros y tabla sin requerir refresh manual.
