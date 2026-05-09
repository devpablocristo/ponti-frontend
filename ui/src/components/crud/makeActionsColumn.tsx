import { Archive, Pencil, Trash2 } from "lucide-react";

import type { Column } from "../../pages/admin/types";
import { RowActions } from "./RowActions";

type Identifiable = { id: number };

type MakeActionsColumnOptions<T> = {
  /** Si se omite, no se renderiza la opción Editar. */
  onEdit?: (item: T) => void;
  /** Si se omite, no se renderiza la opción Archivar. */
  onArchive?: (item: T) => void;
  /** Si se omite, no se renderiza la opción Eliminar. */
  onHardDelete?: (item: T) => void;
  /** Por defecto Editar/Archivar/Eliminar. Permite override de labels. */
  labels?: {
    edit?: string;
    archive?: string;
    hardDelete?: string;
  };
};

/**
 * Helper que arma la última columna (kebab ⋮) con las 3 acciones canónicas
 * Editar / Archivar / Eliminar. Cualquier acción puede omitirse pasando un
 * handler `undefined`. Reusable junto con `<RowActions>`.
 */
export function makeActionsColumn<T extends Identifiable>({
  onEdit,
  onArchive,
  onHardDelete,
  labels,
}: MakeActionsColumnOptions<T>): Column<T> {
  return {
    key: "id" as keyof T,
    header: "",
    align: "center",
    render: (_value: unknown, item: T) => {
      const actions = [];
      if (onEdit) {
        actions.push({
          label: labels?.edit ?? "Editar",
          icon: Pencil,
          onClick: () => onEdit(item),
        });
      }
      if (onArchive) {
        actions.push({
          label: labels?.archive ?? "Archivar",
          icon: Archive,
          onClick: () => onArchive(item),
        });
      }
      if (onHardDelete) {
        actions.push({
          label: labels?.hardDelete ?? "Eliminar",
          icon: Trash2,
          variant: "danger" as const,
          divider: actions.length > 0,
          onClick: () => onHardDelete(item),
        });
      }
      return <RowActions actions={actions} />;
    },
  };
}
