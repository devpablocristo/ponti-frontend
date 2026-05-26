import { ChangeEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

export type AppButtonVariant =
  | "primary"
  | "secondary"
  | "success"
  | "danger"
  | "warning"
  | "light"
  | "dark"
  | "outlineGreen"
  | "outlineGray"
  | "outlinePonti";

export type AppButtonSize = "xs" | "sm" | "md" | "lg";

export type AppButtonProps = {
  children: ReactNode;
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  onClick?: () => void;
  onFileChange?: (event: ChangeEvent<HTMLInputElement>) => void;
  accept?: string;
  multiple?: boolean;
  href?: string;
  className?: string;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
};

const variantClasses: Record<AppButtonVariant, string> = {
  primary: "app-action-button-primary",
  secondary: "app-action-button-secondary",
  success: "app-action-button-primary",
  danger: "app-action-button-danger",
  warning: "app-action-button-warning",
  light: "app-action-button-light",
  dark: "app-action-button-dark",
  outlineGreen: "app-action-button-outline",
  outlineGray: "app-action-button-light",
  outlinePonti: "app-action-button-outline",
};

const sizeClasses: Record<AppButtonSize, string> = {
  xs: "app-action-button-xs",
  sm: "app-action-button-sm",
  md: "app-action-button-md",
  lg: "app-action-button-lg",
};

function content(iconLeft: ReactNode, children: ReactNode, iconRight: ReactNode) {
  return (
    <>
      {iconLeft ? <span className="app-action-button-icon-slot">{iconLeft}</span> : null}
      <span>{children}</span>
      {iconRight ? <span className="app-action-button-icon-slot">{iconRight}</span> : null}
    </>
  );
}

export function AppButton({
  children,
  variant = "primary",
  size = "md",
  iconLeft,
  iconRight,
  onClick,
  onFileChange,
  accept,
  multiple = false,
  href,
  className = "",
  disabled = false,
  ...props
}: AppButtonProps) {
  const classes = `app-action-button ${
    disabled ? "app-action-button-disabled" : ""
  } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`.trim();

  if (href) {
    return (
      <Link to={href} className={classes} aria-disabled={disabled ? "true" : undefined}>
        {content(iconLeft, children, iconRight)}
      </Link>
    );
  }

  if (onFileChange) {
    return (
      <label
        className={`${classes} relative overflow-hidden ${
          disabled ? "pointer-events-none" : ""
        }`.trim()}
      >
        <input
          type="file"
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          accept={accept}
          multiple={multiple}
          disabled={disabled}
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={(event) => {
            onFileChange(event);
            requestAnimationFrame(() => {
              event.target.value = "";
            });
          }}
        />
        {content(iconLeft, children, iconRight)}
      </label>
    );
  }

  return (
    <button
      type={props.type || "button"}
      className={classes}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      title={props.title}
    >
      {content(iconLeft, children, iconRight)}
    </button>
  );
}

export default AppButton;
