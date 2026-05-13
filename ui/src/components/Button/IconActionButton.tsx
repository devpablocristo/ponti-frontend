import type { ReactNode } from "react";

type IconActionButtonProps = {
  label: string;
  icon: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "neutral" | "primary" | "danger" | "success";
  className?: string;
  title?: string;
};

const toneClass = {
  neutral: "icon-action-button-neutral",
  primary: "icon-action-button-primary",
  danger: "icon-action-button-danger",
  success: "icon-action-button-success",
};

export function IconActionButton({
  label,
  icon,
  onClick,
  disabled,
  tone = "neutral",
  className = "",
  title,
}: IconActionButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={title ?? label}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      className={`icon-action-button ${toneClass[tone]} ${className}`.trim()}
    >
      {icon}
    </button>
  );
}
