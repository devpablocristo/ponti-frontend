# Filtros - Spec

## Alcance

Este spec gobierna `AppFilterBar` y los dropdowns de filtros que se usan en pantallas con una o mas filas de filtros.

## Capas De Dropdown

- Los dropdowns de una fila superior deben renderizarse por encima de los controles de filas inferiores.
- Cuando una pantalla tiene dos filas de filtros, la fila superior debe usar una capa mayor que la fila inferior.
- La fila inferior puede usar la capa default `z-dropdown`.
- La fila superior puede usar `z-popover`.
- `AppFilterBar` debe permitir que el consumidor defina la capa con `className`.
- Si el consumidor no define capa, `AppFilterBar` usa `z-dropdown`.
- Ningun dropdown de filtro puede quedar por encima de un drawer abierto; los drawers se rigen por `src/components/Drawer/SPEC.md`.
- `AppFilterBar` debe permitir ubicar acciones en linea o debajo de los selectores.
- En pantallas con mucha cantidad de filtros, las acciones deben poder ir debajo para no competir visualmente con los selectores.
- Si las acciones pertenecen a un grupo con varias filas de filtros, deben renderizarse debajo de todas las filas del grupo, no debajo de la primera fila solamente.

## Tests SDD

- `AppFilterBar` usa `z-dropdown` por defecto.
- Si recibe una clase de capa, por ejemplo `z-popover`, no debe forzar `z-dropdown`.
- Con `actionsPlacement="below"`, las acciones desktop se renderizan debajo de los filtros.
