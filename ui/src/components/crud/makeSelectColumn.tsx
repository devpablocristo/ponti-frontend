import type { Column } from "../../pages/admin/types";

type Identifiable = { id: number };

type Bulk = {
  isSelected: (id: number) => boolean;
  toggle: (id: number) => void;
};

/**
 * Helper que arma la primera columna (checkbox) para tablas con multi-select.
 * Reusable junto con `useBulkActions` y `<BulkSelectionPanel>`.
 *
 * @param bulk         resultado de `useBulkActions` (o cualquier objeto que
 *                     exponga isSelected/toggle).
 * @param getLabel     función para extraer un label legible del item (para
 *                     el aria-label del checkbox, ej: "Seleccionar lote X").
 * @param entitySingular  singular de la entidad para el aria-label.
 */
export function makeSelectColumn<T extends Identifiable>(
  bulk: Bulk,
  getLabel: (item: T) => string,
  entitySingular: string,
): Column<T> {
  return {
    key: "id" as keyof T,
    header: "",
    align: "center",
    width: "40px",
    render: (_value: unknown, item: T) => (
      <input
        type="checkbox"
        className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
        checked={bulk.isSelected(item.id)}
        onChange={(e) => {
          e.stopPropagation();
          bulk.toggle(item.id);
        }}
        onClick={(e) => e.stopPropagation()}
        aria-label={`Seleccionar ${entitySingular} ${getLabel(item)}`}
      />
    ),
  };
}
