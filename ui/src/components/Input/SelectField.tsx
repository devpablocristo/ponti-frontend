import { ChevronDown } from "lucide-react";

type SelectFieldProps = {
  label: string;
  name: string;
  placeholder?: string;
  options: { id: number; name: string }[];
  value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
  size?: "sm" | "md";
  fullWidth?: boolean;
  disabled?: boolean;
};

const SelectField: React.FC<SelectFieldProps> = ({
  label,
  name,
  placeholder = "",
  options,
  value,
  onChange,
  className = "",
  size = "md",
  fullWidth = false,
  disabled = false,
}) => {
  const sizeClasses =
    size === "sm" ? "text-sm py-2 px-3.5" : "text-sm py-2.5 px-3.5";

  return (
    <div className={`${fullWidth ? "w-full" : ""}`}>
      {label !== "" && (
        <label className="block mb-1.5 text-xs font-medium text-slate-600">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          name={name}
          value={value}
          disabled={disabled}
          onChange={onChange}
          className={`input-base appearance-none focus:ring-0 block px-3.5 ${sizeClasses} ${className}`}
        >
          <option value="" disabled>
            {placeholder ? placeholder : "Seleccionar..."}
          </option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {opt.name}
            </option>
          ))}
        </select>
        <ChevronDown
          size={16}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
      </div>
    </div>
  );
};

export default SelectField;
