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
            className="block mb-1.5 text-xs font-medium text-slate-600"
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
          className={`input-base block ${
            disabled
              ? "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"
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
