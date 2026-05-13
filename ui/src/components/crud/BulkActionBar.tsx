import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import AppButton from "../Button/Button";
import { IconActionButton } from "../Button/IconActionButton";

export type BulkAction = {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "danger";
  disabled?: boolean;
};

type BulkActionBarProps = {
  selectedCount: number;
  /** Etiqueta de la entidad en plural para el contador (ej: "lotes", "clientes"). */
  itemLabel?: string;
  actions: BulkAction[];
  onClear: () => void;
  showSelectionSummary?: boolean;
  className?: string;
};

/**
 * Barra sticky de acciones masivas. Aparece cuando hay items seleccionados.
 * Reusable en cualquier lista (activa o archivada). Estándar Linear/Notion.
 */
export function BulkActionBar({
  selectedCount,
  itemLabel = "items",
  actions,
  onClear,
  showSelectionSummary = true,
  className = "",
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div
      className={`sticky top-0 z-20 mb-3 flex items-center justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 shadow-sm ${className}`}
      role="toolbar"
      aria-label="Acciones masivas"
    >
      {showSelectionSummary ? (
        <div className="flex items-center gap-3 text-sm text-blue-900">
          <span className="font-medium">
            {selectedCount} {itemLabel} seleccionado{selectedCount === 1 ? "" : "s"}
          </span>
          <IconActionButton
            label="Limpiar selección"
            icon={<X className="h-3.5 w-3.5" />}
            onClick={onClear}
          />
        </div>
      ) : (
        <span />
      )}
      <div className="flex items-center gap-2">
        {actions.map((action) => {
          const Icon = action.icon;
          const isDanger = action.variant === "danger";
          return (
            <AppButton
              key={action.label}
              disabled={action.disabled}
              onClick={action.onClick}
              variant={isDanger ? "danger" : "primary"}
              size="sm"
              iconLeft={Icon ? <Icon className="h-4 w-4" /> : undefined}
            >
              {action.label}
            </AppButton>
          );
        })}
      </div>
    </div>
  );
}
