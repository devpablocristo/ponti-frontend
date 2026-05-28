# Lotes - Spec

## Alcance

Este spec gobierna el modulo de `Lotes` y los componentes compartidos que se reutilizan desde otras pantallas, incluyendo `Administrar Entidades`.

## Drawer De Lote

- El editor/creador compartido es `LegacyLotDrawer`.
- Toda pantalla que cree o edite lotes con este drawer debe respetar las mismas reglas visuales y de interaccion.
- Al crear un lote, el titulo debe ser solamente `Nuevo Lote`.
- El titulo de creacion no debe incluir campo, proyecto ni ningun contexto entre parentesis.
- Al editar un lote existente, el titulo puede mostrar contexto de proyecto/campo/lote.

## Cultivos

- `Cultivo Anterior` y `Cultivo Actual` deben usar buscador con trigrama/fuzzy sobre la lista de cultivos.
- No deben ser selects cerrados cuando se usa el drawer compartido.
- La seleccion debe guardar el `id` del cultivo correspondiente.
- Escribir en el buscador no crea cultivos; los cultivos se crean desde su editor propio.
- Cuando cambia `Periodo` y existe `Cultivo Actual`, el drawer debe pedir confirmacion antes de rotar cultivos.
- Antes de confirmar el cambio de `Periodo`, no se debe modificar ningun cultivo ni el periodo.
- Si el usuario cancela la confirmacion, el lote queda exactamente igual.
- Si el usuario confirma, el `Cultivo Actual` previo pasa a ser `Cultivo Anterior`.
- Al confirmar, `Cultivo Actual` queda sin seleccion para que el usuario elija el nuevo cultivo del periodo.
- Al confirmar, el `Cultivo Anterior` previo se descarta en esa rotacion.
- Despues de confirmar, debe mostrarse una accion `Deshacer` que restaure `Periodo`, `Cultivo Anterior` y `Cultivo Actual` al estado previo.
- Si no hay `Cultivo Actual`, cambiar `Periodo` no requiere confirmacion y solo cambia el periodo.

## Tests SDD

- Crear lote muestra titulo `Nuevo Lote` sin contexto.
- `Cultivo Anterior` busca por texto y selecciona el cultivo por `id`.
- `Cultivo Actual` busca por texto y selecciona el cultivo por `id`.
- Cambiar `Periodo` con `Cultivo Actual` pide confirmacion y no muta antes de confirmar.
- Confirmar cambio de `Periodo` mueve el `Cultivo Actual` previo a `Cultivo Anterior` y limpia `Cultivo Actual`.
- `Deshacer` restaura `Periodo`, `Cultivo Anterior` y `Cultivo Actual`.
