import { ReactNode, useState, useEffect } from "react";

import { BaseModal } from "../Modal/BaseModal";

export type ConfirmSeverity = "info" | "warning" | "danger";

const SEVERITY_TO_COLOR: Record<ConfirmSeverity, string> = {
  info: "bg-blue-600 hover:bg-blue-800 focus:ring-blue-300",
  warning: "bg-amber-500 hover:bg-amber-700 focus:ring-amber-300",
  danger: "bg-red-600 hover:bg-red-800 focus:ring-red-300",
};

export type ConfirmModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message?: string;
  severity?: ConfirmSeverity;
  primaryLabel?: string;
  secondaryLabel?: string;
  /** Si se pasa, el botón primary se deshabilita hasta que el usuario escriba este string exacto. */
  requireTypeToConfirm?: string;
  /** Slot opcional bajo el mensaje (ej: <DependencyError />). */
  extraContent?: ReactNode;
  /** Estado de processing: bloquea botones. */
  isSaving?: boolean;
};

/**
 * Wrapper sobre `<BaseModal>` que estandariza confirmaciones destructivas o
 * decisivas. Mapea `severity` → color del botón primario, soporta
 * `requireTypeToConfirm` para hard-deletes críticos, y permite slot extra
 * para `<DependencyError />`.
 */
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  severity = "danger",
  primaryLabel = "Confirmar",
  secondaryLabel = "Cancelar",
  requireTypeToConfirm,
  extraContent,
  isSaving = false,
}: ConfirmModalProps) {
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (!isOpen) setTyped("");
  }, [isOpen]);

  const matchesRequired =
    !requireTypeToConfirm || typed.trim() === requireTypeToConfirm.trim();
  const primaryColor = SEVERITY_TO_COLOR[severity];

  return (
    <BaseModal
      isOpen={isOpen}
      isSaving={isSaving || !matchesRequired}
      onClose={onClose}
      title={title}
      message={message}
      primaryButtonText={primaryLabel}
      secondaryButtonText={secondaryLabel}
      onPrimaryAction={() => {
        if (!matchesRequired || isSaving) return;
        void onConfirm();
      }}
      primaryButtonColor={primaryColor}
    >
      <div className="space-y-3 text-left">
        {message && (
          <p className="text-sm text-slate-600 text-center">{message}</p>
        )}
        {extraContent}
        {requireTypeToConfirm && (
          <div className="text-left">
            <label className="block text-xs text-slate-600 mb-1">
              Para confirmar, escribí{" "}
              <span className="font-mono font-semibold">
                {requireTypeToConfirm}
              </span>
              :
            </label>
            <input
              type="text"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              autoFocus
            />
          </div>
        )}
      </div>
    </BaseModal>
  );
}

export default ConfirmModal;
