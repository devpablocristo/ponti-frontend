import type { ReactNode } from "react";

import AppButton, { type AppButtonVariant } from "./AppButton";

type ToolbarActionButtonProps = {
  label: string;
  variant?: AppButtonVariant;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  accept?: string;
  onFileChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  href?: string;
  isPrimary?: boolean;
  size?: "sm" | "md";
};

export function ToolbarActionButton({
  label,
  variant,
  icon,
  disabled,
  onClick,
  accept,
  onFileChange,
  href,
  isPrimary,
  size = "sm",
}: ToolbarActionButtonProps) {
  const resolvedVariant = variant ?? (isPrimary ? "primary" : "outlinePonti");

  return (
    <AppButton
      variant={resolvedVariant}
      size={size}
      iconLeft={icon}
      disabled={disabled}
      onClick={onClick}
      accept={accept}
      onFileChange={onFileChange}
      href={href}
      className="whitespace-nowrap"
    >
      {label}
    </AppButton>
  );
}
