import { Checkbox } from "../Input/Checkbox";
import type { EntityCopy } from "../Modal/copy";
import type { Column } from "../../pages/admin/types";

type Identifiable = { id: number };

type Bulk = {
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
};

/**
 * Helper que arma la primera columna (checkbox) para tablas con multi-select.
 * Reusable junto con `useBulkActions` y `<BulkSelectionPanel>`.
 */
export function makeSelectColumn<T extends Identifiable>(
  bulk: Bulk,
  getLabel: (item: T) => string,
  entity: EntityCopy,
): Column<T> {
  return {
    key: "id" as keyof T,
    header: "",
    align: "center",
    width: "40px",
    render: (_value: unknown, item: T) => (
      <Checkbox
        checked={bulk.isSelected(item.id)}
        onChange={(e) => {
          e.stopPropagation();
          bulk.toggle(item.id);
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Seleccionar ${entity.singular} ${getLabel(item)}`}
      />
    ),
  };
}
