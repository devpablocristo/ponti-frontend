import { type ReactNode } from "react";
import { Plus, Trash2 } from "lucide-react";

import Button from "../../../../../components/Button/Button";
import { IconActionButton } from "../../../../../components/Button/IconActionButton";

type EditableListProps<T> = {
  title: string;
  emptyLabel: string;
  items: T[];
  onAdd: () => void;
  renderItem: (item: T, index: number) => ReactNode;
};

/**
 * Lista genérica usada para Projects/Fields/Lots/Managers/Investors dentro
 * del CustomerEditor. Cada sección renderiza items con su botón Add arriba
 * y un placeholder cuando está vacía. Diseñada para uso interno del editor;
 * si surge otra page que la necesite, considerar promoverla a
 * components/feedback o components/forms.
 */
export function EditableList<T>({
  title,
  emptyLabel,
  items,
  onAdd,
  renderItem,
}: EditableListProps<T>) {
  return (
    <div className="drawer-section">
      <div className="drawer-section-header">
        <h3 className="drawer-section-title">{title}</h3>
        <AddButton label={`Agregar ${title}`} onClick={onAdd} />
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-2.5 text-sm text-slate-500 dark:text-slate-400">
            {emptyLabel}
          </p>
        ) : (
          items.map((item, index) => <div key={index}>{renderItem(item, index)}</div>)
        )}
      </div>
    </div>
  );
}

export function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="light" size="xs" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={onClick}>
      Agregar
      <span className="sr-only">{label}</span>
    </Button>
  );
}

export function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <IconActionButton
      label={label}
      icon={<Trash2 className="h-4 w-4" />}
      tone="danger"
      className="mt-[22px]"
      onClick={onClick}
      title={label}
    />
  );
}
