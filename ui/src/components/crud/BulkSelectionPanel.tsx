import { BulkActionBar, type BulkAction } from "./BulkActionBar";

type BulkSelectionPanelProps = {
  /** Cantidad de items seleccionados. */
  selectedCount: number;
  /** Cantidad total de items en la lista (para "X de N"). */
  totalCount: number;
  /** ¿Están todos seleccionados? */
  allSelected: boolean;
  /** Toggle "select all". */
  onToggleAll: () => void;
  /** Limpiar selección. */
  onClear: () => void;
  /** Acciones masivas (provistas por useBulkActions). */
  actions: BulkAction[];
  /** Plural de la entidad (ej: "lotes", "inversores"). */
  entityLabelPlural: string;
};

/**
 * Combina la `<BulkActionBar>` sticky con el strip "Seleccionar todo / X de N"
 * que va arriba de la tabla. Reusable en cualquier lista con multi-select.
 */
export function BulkSelectionPanel({
  selectedCount,
  totalCount,
  allSelected,
  onToggleAll,
  onClear,
  actions,
  entityLabelPlural,
}: BulkSelectionPanelProps) {
  if (totalCount === 0) return null;
  return (
    <>
      {selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          itemLabel={entityLabelPlural}
          onClear={onClear}
          actions={actions}
        />
      )}
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
          checked={allSelected}
          onChange={onToggleAll}
          aria-label={`Seleccionar todos los ${entityLabelPlural}`}
        />
        <span>Seleccionar todo</span>
        {selectedCount > 0 && (
          <span className="ml-auto">
            {selectedCount} de {totalCount}
          </span>
        )}
      </div>
    </>
  );
}

export default BulkSelectionPanel;
