# Work Orders Multi-Lote: Listado Sin Duplicar Consumo

## Purpose

Documentar la cobertura E2E del flujo donde Web lista una OT digital multi-lote
como una sola orden logica sin duplicar consumo.

## Expected Contract

- Una OT digital batch con numero base `D-n` puede existir internamente como
  subordenes `D-n.1`, `D-n.2`, etc.
- Para el usuario de `/admin/work-orders`, esas subordenes representan una sola
  OT logica.
- El consumo visible y los KPIs deben sumar el consumo real de la OT completa,
  no una copia del consumo total por lote.

Ejemplo:

- Mobile/Core recibe una OT multi-lote con consumo total `200`.
- Web debe mostrar una sola OT logica `D-n`.
- Web no debe mostrar `D-n.1` y `D-n.2` como ordenes independientes.
- El consumo total visible debe ser `200`, no `400`.
- El BFF conserva los campos existentes y puede recibir los metadatos
  opcionales de Core: `base_number`, `is_grouped_digital`, `lots_count`.
- Cuando `is_grouped_digital=true`, la fila representa un grupo digital; las
  subordenes `D-n.1`, `D-n.2` son detalle interno.

## Automated Evidence

- `ui/e2e/workorders-multilot.spec.ts`

El test crea un batch digital contra Core y valida el contrato desde el BFF Web
y la pantalla `/admin/work-orders`: una fila logica, numero base `D-n` y
consumo `200`.

Validation 2026-06-08:

- `CHOKIDAR_USEPOLLING=true yarn test:e2e workorders-multilot.spec.ts`: passed.

## Non-Scope

- No cambia el modelo multi-lote real.
- No reemplaza las filas fisicas por lote; Core agrupa la respuesta de listado.
