import React from "react";

type InputFieldProps = {
  label: string;
  type?: "text" | "number" | "password" | "date";
  name: string;
  value: string | number;
  onBlur?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onPaste?: (e: React.ClipboardEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  placeholder?: string;
  step?: string;
  min?: string | number;
  max?: string | number;
  required?: boolean;
  fullWidth?: boolean;
  inputClassName?: string;
  className?: string;
  size?: "sm" | "md" | "lg" | "xs";
};

const InputField = React.forwardRef<HTMLInputElement, InputFieldProps>(
  (
    {
      label = "",
      type = "text",
      name,
      value,
      onBlur,
      onChange,
      onKeyDown,
      onFocus,
      onPaste,
      disabled = false,
      placeholder,
      step,
      min,
      max,
      required = false,
      fullWidth = false,
      inputClassName = "",
      className = "",
      size = "md",
    },
    ref
  ) => {
    const sizeClasses =
      size === "sm"
        ? "text-sm py-2 px-3.5"
        : size === "lg"
        ? "text-base py-3 px-4"
        : "text-sm py-2.5 px-3.5";

    return (
      <div className={`${fullWidth ? "w-full" : ""} ${className}`}>
        {label !== "" && (
          <label
            className="block mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          autoComplete="off"
          type={type}
          name={name}
          value={value}
          onBlur={onBlur}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          onPaste={onPaste}
          placeholder={placeholder}
          step={step}
          min={min}
          max={max}
          className={`input-base block ${
            disabled
              ? "bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 dark:text-slate-400 cursor-not-allowed border-slate-200 dark:border-slate-700"
              : ""
          } ${sizeClasses} ${inputClassName}`}
          required={required}
          disabled={disabled}
        />
      </div>
    );
  }
);

export default InputField;
