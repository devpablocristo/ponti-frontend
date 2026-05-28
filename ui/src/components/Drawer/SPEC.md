# Drawer - Spec

## Alcance

Este spec gobierna `DrawerShell` y todos los drawers construidos encima de ese componente base.

## Capa Visual

- Todo drawer debe renderizarse por encima del contenido de la pantalla que lo abre.
- El drawer debe quedar por encima de filtros, dropdowns, tablas, toolbars y acciones flotantes.
- Los dropdowns o popovers de la pantalla de fondo no pueden tapar el header, body ni footer del drawer.
- `DrawerShell` debe usar una capa superior a `z-popover`; actualmente `z-tooltip`.
- La jerarquia entre dropdowns de filtros se rige por `src/components/filters/SPEC.md`, pero ningun dropdown de fondo puede superar al drawer.
- Si un drawer abre un modal de confirmacion encima, ese modal puede compartir `z-modal` porque se renderiza dentro del stacking context del drawer.

## Tests SDD

- `DrawerShell` renderiza `drawer-root` con clase `z-tooltip`.
- Ningun consumidor debe resolver z-index del drawer localmente con `z-[N]`.
