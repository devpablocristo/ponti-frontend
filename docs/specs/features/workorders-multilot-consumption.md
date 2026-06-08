# Work Orders Multi-Lote: Listado Sin Duplicar Consumo

## Purpose

Documentar la reproduccion E2E del bug donde Web lista una OT digital multi-lote
como subordenes separadas y termina mostrando consumo duplicado.

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

## Automated Evidence

- `ui/e2e/workorders-multilot.spec.ts`

El test crea un batch digital contra Core y valida el contrato desde el BFF Web
y la pantalla `/admin/work-orders`. Hasta corregir Core/Web, el test debe fallar
porque observa subordenes separadas y/o consumo total duplicado.

## Non-Scope

- No agrega migraciones.
- No cambia el modelo multi-lote real.
- No corrige la persistencia; solamente deja una prueba roja de reproduccion.
