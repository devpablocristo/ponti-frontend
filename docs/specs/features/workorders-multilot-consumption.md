# Work Orders Multi-Lote: Listado Sin Duplicar Consumo

## Purpose

Documentar la cobertura E2E del flujo donde Web lista las subordenes digitales
creadas por un batch multi-lote sin duplicar consumo.

## Expected Contract

- Una OT digital batch con numero base `D-n` puede existir internamente como
  subordenes `D-n.1`, `D-n.2`, etc.
- El dominio de work orders no tiene una orden multi-lote real. Cada suborden
  tiene un solo lote y debe mostrarse como fila propia en `/admin/work-orders`.
- El consumo visible por suborden debe ser la parte distribuida por Core, no una
  copia completa del consumo total del batch.

Ejemplo:

- Mobile/Core recibe una OT multi-lote con consumo total `200`.
- Core crea `D-n.1` y `D-n.2`.
- Web debe mostrar `D-n.1` y `D-n.2` como ordenes independientes.
- Cada suborden debe aparecer una sola vez. Si Core tiene filas internas de
  insumo/labor para la misma suborden, el BFF/UI no debe mostrarlas como filas
  duplicadas.
- Cada fila de 50 ha debe mostrar `100` de consumo; la suma de ambas es `200`,
  no `400`.

## Automated Evidence

- `ui/e2e/workorders-multilot.spec.ts`

El test crea un batch digital contra Core y valida el contrato desde el BFF Web
y la pantalla `/admin/work-orders`: dos subordenes visibles, sin duplicados por
componentes internos y consumo total sumado `200`.

El mismo spec incluye un smoke read-only contra datos guardados. Si existen las
ordenes `D-1905555.1`, `D-1905555.2`, y `D-1905555.3` en la DB activa, Web debe
recibirlas una sola vez cada una, no debe recibir una fila base `D-1905555`, y
la suma de consumo debe ser `4860`.

Validation 2026-06-08:

- `cd api && npm test`: passed.
- `cd ui && yarn test`: passed.
- `cd ui && yarn build`: passed.
- `cd ui && CHOKIDAR_USEPOLLING=true yarn test:e2e workorders-multilot.spec.ts tasks-labors.spec.ts`: passed.

## Non-Scope

- No cambia el modelo multi-lote real.
- No reemplaza las filas fisicas por lote ni agrupa el listado de work orders.
