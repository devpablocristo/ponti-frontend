import React from "react";
import { X } from "lucide-react";

import AppButton, { type AppButtonVariant } from "../Button/Button";
import { IconActionButton } from "../Button/IconActionButton";

interface BaseModalProps {
  isOpen: boolean;
  isSaving?: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  primaryButtonText?: string | null;
  secondaryButtonText?: string | null;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  children?: React.ReactNode;
  primaryButtonColor?: string;
}

export function BaseModal({
  isOpen,
  isSaving = false,
  onClose,
  title = "Confirmación",
  message = "¿Está seguro de continuar?",
  icon,
  primaryButtonText,
  secondaryButtonText = "Cancelar",
  onPrimaryAction,
  onSecondaryAction,
  children,
  primaryButtonColor = "bg-red-600 hover:bg-red-800 focus:ring-red-300",
}: BaseModalProps) {
  const primaryVariant: AppButtonVariant = primaryButtonColor.includes("amber")
    ? "warning"
    : primaryButtonColor.includes("blue")
      ? "primary"
      : "danger";

  const defaultIcon = (
    <svg
      className="mx-auto mb-4 text-slate-800 w-12 h-12"
      aria-hidden="true"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 20 20"
    >
      <path
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );

  return (
    <div
      id="popup-modal"
      tabIndex={-1}
      className={`animate-modal-backdrop fixed top-0 right-0 left-0 z-50 flex justify-center items-center w-full h-screen backdrop-blur-sm bg-slate-900/50 ${
        isOpen ? "flex" : "hidden"
      }`}
    >
      <div className="relative p-4 w-full max-w-md max-h-full">
        <div
          className="animate-modal-content relative bg-white rounded-2xl"
          style={{ boxShadow: "var(--shadow-xl)" }}
        >
          <IconActionButton
            label="Cerrar modal"
            icon={<X className="h-4 w-4" />}
            onClick={onClose}
            disabled={isSaving}
            className="absolute right-2.5 top-3"
          />

          {/* Contenido del modal */}
          <div className="p-4 md:p-5 text-center">
            {icon ? icon : title !== "" ? defaultIcon : null}
            <h3 className="mb-2 text-lg font-semibold text-slate-800 font-display">{title}</h3>

            {children ? (
              <div className="mb-5">{children}</div>
            ) : (
              <p className="mb-5 text-sm text-slate-600">{message}</p>
            )}

            {primaryButtonText && (
              <AppButton
                disabled={isSaving}
                onClick={onPrimaryAction}
                type="button"
                variant={primaryVariant}
                size="md"
              >
                {primaryButtonText}
              </AppButton>
            )}
            {secondaryButtonText?.trim() && (
              <AppButton
                disabled={isSaving}
                onClick={onSecondaryAction || onClose}
                type="button"
                variant="light"
                size="md"
                className="ml-3"
              >
                {secondaryButtonText}
              </AppButton>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
