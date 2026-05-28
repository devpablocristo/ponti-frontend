# Campanias - Spec

## Alcance

Las campanias representan periodos agricolas, por ejemplo `2024-2025` o `2025-2026`.

## Contrato De Datos

- El campo tecnico/API sigue siendo `name` por compatibilidad con backend, hooks y tablas existentes.
- No renombrar `name` a `periodo`, `period` o `season` sin una migracion explicita de contrato.
- En UI, el valor de `name` se presenta como el periodo de la campania.

## Crear Y Editar

- `CampaignFormDrawer` se usa para crear y editar campanias.
- El titulo puede seguir siendo `Nueva campania` o `Editar campania`.
- El input visible no debe decir `Nombre`.
- El input visible debe decir `Periodo`.
- La validacion de campo requerido debe decir `El periodo es obligatorio.`
- Al guardar, el payload enviado sigue siendo `{ name: periodo }`.

## Tests SDD

- Render: el drawer muestra `Periodo` como label del input.
- Render: el drawer no muestra `Nombre` como label del input.
- Submit: envia `{ name: periodo }`.
- Validacion: no permite guardar vacio y muestra `El periodo es obligatorio.`
