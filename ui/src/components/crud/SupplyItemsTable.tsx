import { Plus, Trash } from "lucide-react";

import Button from "../Button/Button";
import { IconActionButton } from "../Button/IconActionButton";
import InputField from "../Input/InputField";
import SupplyDropdown from "../Dropdown/SupplyDropdown";

export type SupplyItemRow = {
  supplyId: number | null;
  quantity: string;
  dose?: string;
};

export type SupplyItemsTableOption = {
  id: number;
  name: string;
  availableQty: number;
  unitName?: string;
};

export type SupplyItemsTableField = "supplyId" | "quantity" | "dose";

export type SupplyItemsTableProps = {
  items: SupplyItemRow[];
  options: SupplyItemsTableOption[];
  itemErrors?: Record<number, string>;
  showDoseColumn?: boolean;
  onItemChange: (
    rowIndex: number,
    field: SupplyItemsTableField,
    value: number | string | null,
  ) => void;
  onAddRow?: () => void;
  onRemoveRow: (rowIndex: number) => void;
  onRequestCreateSupply?: (rowIndex: number) => void;
  disabled?: boolean;
  quantityPlaceholder?: string;
  dosePlaceholder?: string;
  addRowLabel?: string;
};

const NUMERIC_INPUT_REGEX = /^\d*\.?\d{0,3}$/;

const formatAvailableQty = (value: number) =>
  value.toFixed(2).replace(/\.?0+$/, "");

export default function SupplyItemsTable({
  items,
  options,
  itemErrors = {},
  showDoseColumn = false,
  onItemChange,
  onAddRow,
  onRemoveRow,
  onRequestCreateSupply,
  disabled = false,
  quantityPlaceholder = "Lt/Kg/Bolsas",
  dosePlaceholder = "Dosis/ha",
  addRowLabel = "Agregar Insumo",
}: SupplyItemsTableProps) {
  const dropdownOptions = options.map((s) => ({
    id: s.id,
    name: s.name,
    badge: (
      <span className="ml-1 text-xs text-gray-400 font-normal">
        <span className={s.availableQty < 0 ? "text-red-600" : undefined}>
          {formatAvailableQty(s.availableQty)}
        </span>
        {s.unitName ? ` ${s.unitName}` : ""}
      </span>
    ),
  }));

  const gridColsClass = showDoseColumn
    ? "sm:grid-cols-[1.5fr_1fr_1fr_1.5fr]"
    : "sm:grid-cols-[1.5fr_1fr_1.5fr]";

  return (
    <div>
      <div className={`hidden sm:grid ${gridColsClass} gap-4 mb-2`}>
        <span className="font-sm text-gray-900 dark:text-gray-100">Insumo</span>
        <span className="font-sm text-gray-900 dark:text-gray-100">Cantidad</span>
        {showDoseColumn && <span className="font-sm text-gray-900 dark:text-gray-100">Dosis/ha</span>}
        <div />
      </div>

      <div className={`grid grid-cols-1 ${gridColsClass} gap-4`}>
        {items.map((item, i) => (
          <div
            key={i}
            className="sm:contents border sm:border-0 p-4 sm:p-0 rounded-md sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none"
          >
            <div className="sm:col-span-1">
              <SupplyDropdown
                options={dropdownOptions}
                value={item.supplyId}
                onSelect={(option) => onItemChange(i, "supplyId", option.id)}
                onCreateNew={
                  onRequestCreateSupply
                    ? () => onRequestCreateSupply(i)
                    : undefined
                }
                hasError={!!itemErrors[i]}
              />
            </div>
            <div className="sm:col-span-1">
              <InputField
                label=""
                placeholder={quantityPlaceholder}
                name={`supply-item-quantity-${i}`}
                type="text"
                value={item.quantity}
                inputClassName={
                  itemErrors[i]
                    ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                    : ""
                }
                onChange={(e) => {
                  const value = e.target.value.replace(/,/g, ".");
                  if (NUMERIC_INPUT_REGEX.test(value)) {
                    onItemChange(i, "quantity", value);
                  }
                }}
                size="sm"
                disabled={disabled}
              />
              {itemErrors[i] && (
                <p className="mt-1 text-xs text-red-600">{itemErrors[i]}</p>
              )}
            </div>
            {showDoseColumn && (
              <div className="sm:col-span-1">
                <InputField
                  label=""
                  placeholder={dosePlaceholder}
                  name={`supply-item-dose-${i}`}
                  type="text"
                  value={item.dose ?? ""}
                  onChange={(e) => {
                    const value = e.target.value.replace(/,/g, ".");
                    if (NUMERIC_INPUT_REGEX.test(value)) {
                      onItemChange(i, "dose", value);
                    }
                  }}
                  size="sm"
                  disabled={disabled}
                />
              </div>
            )}
            <div>
              <IconActionButton
                label="Eliminar insumo"
                icon={<Trash size={14} />}
                tone="danger"
                onClick={() => onRemoveRow(i)}
                disabled={disabled}
              />
            </div>
          </div>
        ))}
        {onAddRow && (
          <Button
            variant="secondary"
            size="sm"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={onAddRow}
            className="max-w-fit"
            disabled={disabled}
          >
            {addRowLabel}
          </Button>
        )}
      </div>
    </div>
  );
}
