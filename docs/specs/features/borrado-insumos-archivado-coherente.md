# spec — borrado-insumos-archivado-coherente

## Context

Al intentar **eliminar un insumo (supply)** que alguna vez tuvo un ingreso oficial,
un remito o un movimiento, el sistema responde *"no se puede porque está en uso"* —
y sigue respondiendo lo mismo **aunque el usuario ya haya borrado todos esos remitos
e ingresos**. El insumo queda en un estado del que nunca se puede salir.

### Causa raíz (confirmada en código)

1. Cuando se borra un remito/ingreso/movimiento, el backend hace **soft-delete**:
   `tx.Delete(...)` sin `Unscoped()`. Esto marca `deleted_at` pero **la fila sigue
   físicamente en la base** (`supply_movements`, `stocks`).
   - `internal/supply/repository_movement.go:519` (movimientos internos relacionados)
   - `internal/supply/repository_movement.go:534` y `:553` (stocks)
   - `internal/supply/repository_movement.go:542` (movimiento normal)
2. Cuando se borra el insumo, el backend hace **hard-delete**: `tx.Unscoped().Delete(&models.Supply{})`
   en `internal/supply/repository.go:370`.
3. Las foreign keys son `ON DELETE RESTRICT`
   (`migrations_v4/000080_constraints_fks_indexes.up.sql:215,228,233`).
   PostgreSQL ve las filas soft-deleted como **referencias vivas**, devuelve error `23503`,
   y `repository.go:376` lo traduce a `Conflict("supply has historical references...")`.

**Conclusión:** un insumo con cualquier historial **nunca** puede borrarse físicamente,
porque las filas archivadas quedan en la tabla. Las FK RESTRICT son precisamente lo que
impide esa inconsistencia.

### Bug secundario (frontend) que oculta el problema

- `ui/src/hooks/useSupplies/index.ts:131-133`: ante un 409 retorna `"conflict"`
  **sin setear ningún mensaje de error**.
- `ui/src/pages/admin/database/products/List.tsx:217`: `confirmDelete` solo maneja
  `result === "deleted"`. No maneja `"conflict"`.
- Resultado: el modal se cierra (`List.tsx:213`) y el usuario **no ve nada** — parece
  que se eliminó cuando en realidad falló.
- Además el modal de confirmación se titula **"Archivar insumo"** pero la acción que
  dispara es `deleteSupply` (hard-delete). Mensaje y acción no coinciden.

### Decisión de diseño (elegida por el usuario)

**Modelo de archivado coherente.** Un insumo con historial **no se borra físicamente
nunca** (es la realidad de las FK RESTRICT y preserva el historial). El sistema debe
**archivar en lugar de borrar** cuando hay historial, y comunicarlo con claridad.
El borrado físico queda reservado para insumos **sin ningún historial**.

Ya existe toda la infraestructura de archivado:
- BE: `Repository.ArchiveSupply` (`repository.go:393`) usando `sharedrepo.SoftArchive`.
- BFF: `PUT /supplies/:id/archive` (`api/src/routes/supplies.ts:400`).
- FE: `archiveSupply` (`ui/src/hooks/useSupplies/index.ts:150`).
- La lista ya distingue modos (`suppliesMode`: activos vs archivados), así que un
  insumo archivado desaparece de la vista de activos.

## Qué hace

Reorienta el flujo de "eliminar insumo" en tres casos según el estado del insumo:

1. **Tiene registros ACTIVOS** (órdenes de trabajo vigentes, ingresos/stocks o
   remitos/movimientos no eliminados) → **se bloquea**. El BE devuelve `422` y el FE
   muestra: *"El insumo está en uso. Eliminá los registros activos antes de eliminarlo."*
   No se archiva ni se elimina hasta que el usuario quite esos registros activos.
2. **Solo tiene historial** (registros ya eliminados/soft-deleted, sin nada activo) →
   no se puede borrar físicamente (FK RESTRICT). El BE devuelve `409` y el FE
   **archiva automáticamente**, avisando que se archivó por tener historial.
3. **No tiene ninguna referencia** → se **elimina físicamente**.

El gate de "uso activo" vive en el **backend** (`DeleteSupply`), única fuente de verdad,
contando referencias activas en `workorder_items` (de órdenes no eliminadas), `stocks`
y `supply_movements`. GORM excluye automáticamente los soft-deleted, así que solo cuenta
lo realmente en uso.

No se toca la lógica de borrado de remitos/ingresos ni las FK. El historial se conserva.

### Distinción de errores (BE → FE)

- `domainerr.BusinessRule(...)` → HTTP **422** → caso "en uso activo" → FE bloquea.
- `domainerr.Conflict(...)` → HTTP **409** → caso "solo historial" → FE archiva.

## Archivos

| Archivo | Cambio | Qué hace |
|---|---|---|
| `ui/src/pages/admin/database/products/List.tsx` | Modificar `confirmDelete` (~209-226) | Manejar el caso `"conflict"`: llamar a `archiveSupply`, refrescar lista y mostrar mensaje "El insumo tiene historial; se archivó en lugar de eliminarse". |
| `ui/src/pages/admin/database/products/List.tsx` | Texto del modal de confirmación (~528-543) | Que el copy refleje la realidad: si hay `count > 0` / historial, hablar de **archivar**; reservar "eliminar" para el caso sin historial. Quitar la ambigüedad actual entre título "Archivar" y acción borrar. |
| `ui/src/hooks/useSupplies/index.ts` | `deleteSupply` | Retornos `"in_use"` (422) y `"conflict"` (409) distinguidos por status. No tragar el caso en silencio. |
| `internal/supply/repository.go` (BE) | `DeleteSupply` + helper `countActiveSupplyReferences` | Antes del hard-delete, contar referencias activas; si hay, devolver `BusinessRule` (422). Si el hard-delete falla por FK (historial), devolver `Conflict` (409) con mensaje claro. |

> Nota: el gate de uso activo es **backend**; la orquestación (bloquear vs archivar vs
> eliminar) y los mensajes son **frontend**.

### Flujo objetivo de `confirmDelete`

```
result = await deleteSupply(id)
- "deleted"  → mensaje de éxito de eliminación + refrescar (igual que hoy)
- "conflict" → await archiveSupply(id)
               → ok:   "El insumo tiene historial, se archivó en lugar de eliminarse." + refrescar
               → fail: mostrar error real
- "error"    → mostrar mensaje de error (hoy queda mudo en algunos caminos)
```

Decisión a confirmar en implementación: ¿archivado **automático** ante 409, o
**preguntar** al usuario "¿Querés archivarlo en su lugar?". El spec recomienda
automático con mensaje claro (menos fricción; el usuario ya pidió eliminarlo y archivar
es el único resultado posible sin perder datos). Si se prefiere confirmación explícita,
agregar un segundo modal.

## Dependencias

- No requiere cambios de base de datos ni migraciones.
- `archiveSupply` y el endpoint `/supplies/:id/archive` ya existen y funcionan.
- Verificar que la vista de insumos archivados (`suppliesMode`) sea accesible para que
  el usuario pueda ver/restaurar lo archivado (ya existe `RestoreSupply` en BE).

## Criterios de aceptación

- [ ] Insumo **sin referencias**: "Eliminar" lo borra físicamente y muestra éxito.
- [ ] Insumo **con registros activos** (orden/ingreso/remito vigente): "Eliminar" se
      **bloquea** con mensaje "está en uso, eliminá los registros activos primero". No
      se archiva.
- [ ] Insumo **solo con historial** (todos sus registros ya eliminados): "Eliminar" lo
      **archiva** y avisa que se archivó por tener historial.
- [ ] Tras quitar TODOS los registros activos de un insumo, "Eliminar" pasa de bloquear
      a archivar correctamente.
- [ ] El modal **nunca** se cierra en silencio sin feedback.
- [ ] El insumo archivado desaparece de la lista de activos.

## Riesgos

- Archivado automático ante 409 puede sorprender a quien esperaba un borrado real:
  mitigar con un mensaje explícito e inequívoco.
- `getWorkOrdersCount` solo cuenta **órdenes de trabajo**, no remitos/stocks; por eso
  no alcanza para decidir de antemano si hay historial. La señal autoritativa es el
  **409 del BE** — el flujo debe basarse en eso, no solo en `count`.

## Decisiones de diseño

- **Por qué archivar en vez de borrar en cascada:** preservar el historial (movimientos,
  remitos, stocks) es un requisito implícito del dominio; las FK RESTRICT existen para
  protegerlo. Borrar en cascada perdería trazabilidad. Elegido por el usuario.
- **Por qué el fix es mayormente FE:** el BE ya rechaza correctamente el hard-delete;
  el defecto real es que el FE oculta ese rechazo y no ofrece la alternativa (archivar).