import { ChangeEvent, ReactNode } from "react";
import { Link } from "react-router-dom";

interface ButtonProps {
  children: ReactNode;
  variant?:
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
  size?: "sm" | "md" | "lg" | "xs";
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
}

const variantClasses = {
  primary:
    "bg-primary-700 hover:bg-primary-800 text-white shadow-sm hover:shadow-md",
  secondary:
    "bg-slate-100 hover:bg-slate-200 text-slate-700 shadow-sm",
  success:
    "bg-custom-btn hover:bg-custom-btn/85 text-white shadow-sm hover:shadow-md",
  danger:
    "bg-red-600 hover:bg-red-700 text-white shadow-sm hover:shadow-md",
  warning:
    "bg-amber-500 hover:bg-amber-600 text-white shadow-sm hover:shadow-md",
  light:
    "bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-sm",
  dark:
    "bg-slate-800 hover:bg-slate-900 text-white shadow-sm hover:shadow-md",
  outlineGreen:
    "border border-custom-btn text-custom-btn hover:bg-primary-50 bg-transparent",
  outlineGray:
    "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50",
  outlinePonti:
    "bg-transparent border border-custom-btn text-custom-btn hover:bg-primary-50",
};

const sizeClasses = {
  xs: "px-2.5 py-1.5 text-xs gap-1.5",
  sm: "px-3.5 py-2 text-sm gap-1.5",
  md: "px-5 py-2.5 text-sm gap-2",
  lg: "px-6 py-3 text-base gap-2",
};

export default function Button({
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
}: ButtonProps) {
  const classes = `inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 active:scale-[0.97] ${
    disabled ? "opacity-50 cursor-not-allowed active:scale-100" : ""
  } ${variantClasses[variant]} ${sizeClasses[size]} ${className}`;

  if (href) {
    return (
      <Link to={href} className={classes}>
        {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
        {children}
        {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
      </Link>
    );
  }

  if (onFileChange) {
    return (
      <label
        className={`${classes} relative overflow-hidden ${
          disabled ? "pointer-events-none" : ""
        }`}
      >
        <input
          type="file"
          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
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
        <span className="inline-flex items-center justify-center w-full">
          {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
          {children}
          {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
        </span>
      </label>
    );
  }

  return (
    <button
      type={props.type || "button"}
      className={classes}
      disabled={disabled}
      onClick={disabled ? undefined : onClick}
      {...props}
    >
      {iconLeft && <span className="flex-shrink-0">{iconLeft}</span>}
      {children}
      {iconRight && <span className="flex-shrink-0">{iconRight}</span>}
    </button>
  );
}
