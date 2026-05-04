import { Check, LoaderCircle, Pencil } from "lucide-react";
import { useEffect, useState } from "react";

import useLots from "../../../../hooks/useLots";
import { LotsData } from "../../../../hooks/useLots/types";

type EditableTonsCellProps = {
  item: LotsData;
  value: string;
  onSuccessEdit: () => void;
};

export function EditableTonsCell({
  item,
  value,
  onSuccessEdit,
}: EditableTonsCellProps) {
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(value ?? "");
  const { updateTons, processingTons, errorTons, resultTons } = useLots();

  useEffect(() => {
    setEditValue(value ?? "");
  }, [item.id, value]);

  const save = async () => {
    if (editValue === "") return;
    updateTons(item.id, Number(editValue));
  };

  useEffect(() => {
    if (errorTons) {
      alert(errorTons);
      return;
    }
    if (resultTons) {
      setEditing(false);
      onSuccessEdit();
    }
  }, [errorTons, onSuccessEdit, resultTons]);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="any"
          className="block w-full min-w-[80px] rounded-lg border border-gray-300 bg-gray-50 p-2 text-sm text-gray-900 focus:border-blue-500 focus:ring-blue-500"
          value={editValue}
          onChange={(event) => setEditValue(event.target.value)}
          disabled={processingTons}
          onBlur={save}
          onKeyDown={(event) => {
            if (event.key === "Enter") save();
            if (event.key === "Escape") setEditing(false);
          }}
        />
        {processingTons ? (
          <LoaderCircle className="h-4 w-4 animate-spin text-blue-500" />
        ) : (
          <button
            type="button"
            className="text-green-600 hover:text-green-800"
            onMouseDown={(event) => event.preventDefault()}
            onClick={save}
            aria-label="Guardar toneladas"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex w-full min-w-[80px] items-center justify-between">
      <span className="w-full truncate pr-2 text-right">{editValue}</span>
      <button
        type="button"
        className="flex min-h-6 min-w-6 items-center p-1 text-blue-600 hover:text-blue-800"
        onClick={() => setEditing(true)}
        aria-label="Editar toneladas"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
