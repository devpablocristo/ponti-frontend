import { Checkbox } from "../Input/Checkbox";
import type { EntityCopy } from "../Modal/copy";
import { BulkActionBar, type BulkAction } from "./BulkActionBar";
import { formatTitleCase } from "../../lib/properName";

type BulkSelectionPanelProps = {
  selectedCount: number;
  totalCount: number;
  allSelected: boolean;
  onToggleAll: () => void;
  onClear: () => void;
  actions: BulkAction[];
  showActionBar?: boolean;
  showSelectionSummary?: boolean;
  /** Copy léxico de la entidad — se deriva el plural para los textos. */
  entity: EntityCopy;
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
  showActionBar = true,
  showSelectionSummary = false,
  entity,
}: BulkSelectionPanelProps) {
  if (totalCount === 0) return null;
  const plural = entity.plural;
  return (
    <>
      {showActionBar && selectedCount > 0 && (
        <BulkActionBar
          selectedCount={selectedCount}
          itemLabel={plural}
          onClear={onClear}
          actions={actions}
          showSelectionSummary={showSelectionSummary}
        />
      )}
      <div className="mb-2 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <Checkbox
          checked={allSelected}
          onChange={onToggleAll}
          aria-label={`Seleccionar todos los ${plural}`}
        />
        <span>{formatTitleCase("Seleccionar todo")}</span>
        {selectedCount > 0 && (
          <span className="ml-auto">
            {selectedCount} de {totalCount}
          </span>
        )}
      </div>
    </>
  );
}
