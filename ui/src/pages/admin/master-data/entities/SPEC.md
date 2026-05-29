# Administrar Entidades - Spec

## Alcance

`Administrar Entidades` vive en `/admin/master-data/entities`.

Esta pantalla es el catalogo maestro. Ahi, y solo ahi dentro de este flujo, se crean, editan, archivan y restauran entidades. No es un editor operativo de proyecto.

La pantalla no debe afectar los flujos legacy fuera de `/admin/master-data/entities` ni el editor operativo de `/admin/projects/new`.

## Regla Principal

`/admin/master-data/entities` edita solo entidades y relaciones estructurales entre entidades.

No edita valores operativos. Quedan prohibidos en esta pantalla:

- costo planificado
- costo administrativo
- porcentajes
- hectareas
- fechas
- periodo
- variedad
- cultivo anterior
- cultivo actual
- tipo de arriendo
- valor de arriendo
- asignaciones operativas de responsables, inversores o arrendatarios a proyectos/campos/lotes

Los valores y asignaciones operativas viven solo en `/admin/projects/new`.

## Entidades

La pantalla permite crear, editar, archivar y restaurar estas entidades:

- Cliente / Sociedad
- Proyecto
- Campania
- Actor por rol: inversor, proveedor, responsable y arrendatario
- Campo
- Lote
- Cultivo

Responsables, inversores y arrendatarios son entidades actor en esta pantalla. Se pueden crear o editar como catalogo, pero no asignar a un proyecto desde aca.

## Relaciones Estructurales

Las relaciones permitidas en el catalogo son estructurales:

- cliente -> proyecto
- proyecto -> campania
- campo -> proyecto
- lote -> campo

No se consideran estructurales, y por lo tanto no se editan en esta pantalla, las relaciones operativas de personas o valores contra un proyecto.

## Modulo Vivo Tipo Drawer Congelado

La pantalla reemplaza la tabla/columnas y cualquier tarjeta suelta por el modulo vivo basado en el drawer congelado de proyecto.

El modulo se renderiza inline en `/admin/master-data/entities`, no como drawer modal. Debe conservar el comportamiento y la estructura visual del drawer congelado:

- seccion `Proyecto` arriba
- secciones con borde tipo `drawer-section`
- encabezados con boton `Administrar`
- campos/selectores tipo input del drawer original
- listas de entidades relacionadas debajo, con el mismo agregado/quitado del modulo original

Regla de implementacion: no reconstruir este modulo con tarjetas, filas propias, iconos de edicion o una UI parecida. El modulo vivo usa `CustomerEditor.project-drawer.reference` como base visual/comportamental y `EntityCatalogProjectModule` aplica solo la capa de catalogo que oculta la edicion de valores.

El modulo se llena con los datos seleccionados en los filtros y conserva los accesos de administracion del drawer original:

- crear entidad
- editar entidad
- archivar entidad
- abrir archivados

No se deben usar tarjetas de resumen por entidad como superficie principal de esta pantalla. Tampoco deben agregarse filas artificiales de entidad con acciones que no existian en el drawer congelado.

La unica diferencia visible contra el drawer congelado es que no se muestran ni se pueden editar controles de valores operativos:

- costos
- porcentajes
- hectareas
- tipo de arriendo
- valor de arriendo
- cultivos anterior/actual como dato operativo
- periodo

Los botones `Administrar` siguen abriendo los flujos de catalogo correspondientes. En esta pantalla esos flujos pueden crear/editar entidades de catalogo; no deben pedir valores operativos.

Los filtros siguen sirviendo para navegar la cadena de entidades y acotar lo visible, pero seleccionar filtros nunca abre editores. Editar abre un editor solo desde una accion explicita de edicion.

## Cadena Y Filtros

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
- `Todos` es una seleccion explicita.
- `Buscar` equivale a sin seleccion.

## Visualizacion De Nombres

- Los nombres de entidades en filtros, editores y acciones deben mostrarse con las reglas de `formatProperName` / `formatEntityDisplayName`.
- Los valores canonicos o legacy en minuscula, por ejemplo `agro lajitas`, deben verse como `Agro Lajitas`.
- Las siglas y tipos societarios deben respetar mayusculas de display, por ejemplo `srl`, `sa`, `sas`, `inta`, `usd`.
- Los conectores en medio del nombre quedan en minuscula, por ejemplo `Juan de la Torre`.
- Las campanias/codigos como `2025-2026` no se formatean con reglas de nombre.
- Bug de regresion: al seleccionar un valor en un filtro, el input cerrado no puede mostrar el nombre raw/canonico; debe mostrar el display name.

## Crear

`Nuevo` crea la primera entidad mas general que todavia este en `Buscar`, o la entidad indicada por la accion del editor vivo.

- `Nuevo Cliente` abre `ActorFormDrawer` con rol `cliente` y, al guardar, crea actor y customer legacy vinculado.
- Roles de actor (`Cliente`, `Inversor`, `Proveedor`, `Responsable`, `Arrendatario`) usan `ActorFormDrawer`.
- `Campania` usa `CampaignFormDrawer`.
- `Cultivo` usa `CropFormDrawer`.
- `Proyecto` usa `ProjectBasicDrawer`, un editor basico propio de dato maestro.
- Crear `Proyecto` solo permite seleccionar entidades existentes minimas: `Cliente / Sociedad`, `Campania` y `Nombre del proyecto`.
- Crear `Proyecto` no crea ni administra actores, campanias, campos, lotes ni cultivos.
- Crear `Proyecto` muestra un warning claro y no guarda si falta cliente, campania o nombre.
- `Campo` usa `FieldBasicDrawer` del catalogo.
- Crear `Campo` solo permite seleccionar `Proyecto` existente y escribir `Nombre del campo`.
- Crear `Campo` no muestra ni edita tipo/valor de arriendo, arrendatarios, inversores, lotes ni cultivos.
- `Lote` usa `LotBasicDrawer` del catalogo.
- Crear `Lote` solo permite seleccionar `Campo` existente y escribir `Nombre del lote`.
- Crear `Lote` no muestra ni edita hectareas, fechas, periodo, variedad ni cultivos.
- Si el contrato backend actual exige valores operativos para crear campo o lote, esta pantalla no debe exponer esos valores; debe preservar defaults internos seguros o bloquear la accion con un warning claro hasta que exista un contrato de catalogo.

## Editar

- `Cliente` abre `ActorFormDrawer` del actor vinculado por `customer.actor_id`.
- Guardar un cliente debe sincronizar actor y customer legacy, porque la fila visible de cliente sale de `/customers`.
- Si un customer no tiene actor vinculado, guardar debe crear/vincular actor antes de actualizar customer.
- `Inversor`, `Proveedor`, `Responsable` y `Arrendatario` abren `ActorFormDrawer`.
- `Campania` abre `CampaignFormDrawer`.
- `Cultivo` abre `CropFormDrawer`.
- `Proyecto` abre `ProjectBasicDrawer`.
- Editar `Proyecto` muestra `Cliente / Sociedad` y `Campania` como contexto de solo lectura.
- Editar `Proyecto` solo permite cambiar `Nombre del proyecto`.
- Guardar `Proyecto` usa `PUT /projects/:id` preservando el proyecto completo y reemplazando solo `name`.
- El editor basico de `Proyecto` no muestra ni edita responsables, inversores, costo planificado, costo administrativo, campos, lotes ni cultivos.
- `Campo` abre `FieldBasicDrawer`.
- Editar `Campo` solo permite cambiar `Nombre del campo` y preservar su relacion estructural con `Proyecto`.
- `Lote` abre `LotBasicDrawer`.
- Editar `Lote` solo permite cambiar `Nombre del lote` y preservar su relacion estructural con `Campo`.

## Referencia Congelada

- El drawer `Editar Proyecto` de `/admin/master-data/entities` tiene una copia congelada de referencia tomada el 2026-05-29.
- Wrapper del drawer: `src/pages/admin/master-data/entities/ProjectEditorDrawer.reference.tsx`.
- Cuerpo del editor congelado: `src/pages/admin/master-data/customers/CustomerEditor.project-drawer.reference.tsx`.
- Estas copias quedan intactas como referencia historica. El flujo vivo de `Administrar Entidades` monta el cuerpo congelado mediante `src/pages/admin/master-data/entities/EntityCatalogProjectModule.tsx` para preservar exactamente el estilo y comportamiento base, y aplica encima la restriccion de no editar valores operativos.

## Archivado

- No se puede archivar una entidad con entidades activas asociadas.
- El bloqueo debe mostrar un motivo claro.
- Archivados reutiliza las listas/drawers existentes cuando no arrastran valores operativos a esta pantalla.
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
- Pantalla: renderiza el modulo vivo tipo drawer congelado, no tabla ni tarjetas de resumen.
- Pantalla: el modulo vivo de catalogo oculta campos de valores operativos.
- Pantalla: el modulo conserva la estructura del drawer congelado: `Proyecto`, `Responsables`, `Inversores`, `Campos`, `Lotes` anidado y accesos para cultivos.
- Pantalla: los botones `Administrar` abren flujos de catalogo, no editores de valores.
- Pantalla: editar cliente sincroniza actor y customer.
- Pantalla: nuevo cliente crea actor y customer vinculado.
- Pantalla: crear/editar actor por rol no asigna ese actor a un proyecto.
- Pantalla: editar proyecto abre `ProjectBasicDrawer`, no `CustomerEditor`.
- `ProjectBasicDrawer`: editar proyecto cambia solo `name`.
- `ProjectBasicDrawer`: crear proyecto requiere cliente, campania y nombre.
- `ProjectBasicDrawer`: no renderiza secciones completas de proyecto.
- Pantalla: crear/editar campo abre `FieldBasicDrawer` y no muestra valores de arriendo.
- Pantalla: crear/editar lote abre `LotBasicDrawer` y no muestra hectareas, fechas, cultivos, periodo ni variedad.
- Pantalla: archivar/eliminar una entidad seleccionada la quita de filtros y catalogo sin requerir refresh manual.
