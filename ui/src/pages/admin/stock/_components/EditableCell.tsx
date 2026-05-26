import { useEffect, useRef, useState } from "react";
import { Pencil } from "lucide-react";

import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import InputField from "../../../../components/Input/InputField";
import useStock from "../../../../hooks/useStock";
import { GetStockItems } from "../../../../hooks/useStock/types";

type EditableCellProps = {
  item: GetStockItems;
  value: string | number;
  projectId: number | null;
  onSaved?: () => void;
  onValidationError: (message: string) => void;
};

/**
 * Cell editable de la grilla de Stock: muestra el valor read-only + botón
 * editar que abre un drawer con InputField + Guardar. Internamente usa
 * `useStock.updateStock`. Las validaciones de pre-requisitos (proyecto,
 * múltiples inversores, ingreso previo) se reportan al parent via
 * `onValidationError` para mostrar en modal.
 */
export function EditableCell({
  item,
  value,
  projectId,
  onSaved,
  onValidationError,
}: EditableCellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const savingRef = useRef(false);
  const { updateStock, processingStock, errorStock, resultStock } = useStock();

  useEffect(() => {
    setEditValue(value ?? "");
  }, [value, item.id]);

  const save = async () => {
    if (savingRef.current || processingStock) {
      return;
    }

    if (editValue === "") {
      return;
    }

    if (projectId === null) {
      onValidationError("Seleccioná un proyecto antes de guardar stock de campo.");
      return;
    }

    if (item.has_multiple_investors) {
      onValidationError(
        "Existe más de un inversor asociado a este insumo. Corrobore los ingresos y asignaciones antes de cerrar stock.",
      );
      return;
    }

    if (!item.id || item.id <= 0) {
      onValidationError(
        "Para cargar stock de campo, primero cargá un ingreso del insumo.",
      );
      return;
    }

    savingRef.current = true;
    try {
      await updateStock(projectId, item.id, Number(editValue), item.updated_at);
    } finally {
      savingRef.current = false;
    }
  };

  useEffect(() => {
    if (errorStock) {
      onValidationError(errorStock);
      return;
    }
    if (resultStock) {
      setDrawerOpen(false);
      onSaved?.();
      return;
    }
  }, [errorStock, resultStock, onSaved, onValidationError]);

  return (
    <>
      <div className="flex items-center justify-between w-full min-w-[80px]">
        <input
          type="number"
          min="0"
          className="block w-full p-2 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-slate-800 text-sm"
          value={value}
          onChange={() => {}}
          disabled={true}
        />
        <button
          className="app-action-button-icon"
          style={{ minWidth: 24, minHeight: 24 }}
          onClick={() => setDrawerOpen(true)}
          aria-label="Editar"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      <EntityFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Editar stock de campo"
        subtitle={item.supply_name}
        submitLabel="Guardar"
        processing={processingStock}
        onSubmit={save}
      >
        <InputField
          label="Stock de campo"
          name={`real-stock-${item.id}`}
          type="number"
          placeholder="Stock de campo"
          value={editValue}
          disabled={processingStock}
          onChange={(e) => setEditValue(e.target.value)}
        />
      </EntityFormDrawer>
    </>
  );
}
