import { ReactNode } from "react";

import { DrawerButton } from "../Button/DrawerButton";

type DrawerFormActionsProps = {
  cancelLabel?: string;
  submitLabel?: string;
  onCancel: () => void;
  onSubmit: () => void;
  disabled?: boolean;
  extraActions?: ReactNode;
};

export function DrawerFormActions({
  cancelLabel = "Cancelar",
  submitLabel = "Guardar",
  onCancel,
  onSubmit,
  disabled,
  extraActions,
}: DrawerFormActionsProps) {
  return (
    <div className="drawer-form-actions">
      <div className="drawer-form-actions-extra">{extraActions}</div>
      <div className="drawer-form-actions-main">
        <DrawerButton variant="secondary" onClick={onCancel} disabled={disabled}>
          {cancelLabel}
        </DrawerButton>
        <DrawerButton variant="primary" onClick={onSubmit} disabled={disabled}>
          {submitLabel}
        </DrawerButton>
      </div>
    </div>
  );
}
