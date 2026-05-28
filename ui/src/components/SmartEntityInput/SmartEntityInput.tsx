import {
  type CSSProperties,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

import { type EntityNameOption } from "../../lib/entityNameMatcher";
import { fuzzySearchOptions } from "../../lib/fuzzySearch";
import { formatProperName } from "../../lib/properName";

type SmartEntityInputSize = "sm" | "md" | "lg" | "xs";
type DropdownPosition = {
  top: number;
  left: number;
  width: number;
};

type SmartEntityInputProps<T extends EntityNameOption> = {
  label: string;
  name: string;
  value: string;
  options: T[];
  entityLabel: string;
  onChange: (value: string) => void;
  onSelectExisting: (option: T) => void;
  disabled?: boolean;
  /**
   * When true, the input is read-only (the name cannot be edited as free text)
   * but the dropdown remains usable so the caller can still pick a different
   * existing entity. Use this for catalog selectors (customer, campaign, ...)
   * where renaming belongs to the entity's own editor and inline rename
   * would have surprising side effects on other rows that share the catalog.
   */
  lockName?: boolean;
  /**
   * Selection-only keeps the input searchable, but typing does not commit a
   * free-text value. Callers use it when an existing entity must be selected.
   */
  selectionOnly?: boolean;
  required?: boolean;
  placeholder?: string;
  size?: SmartEntityInputSize;
  className?: string;
  formatDisplayValue?: boolean;
};

export function SmartEntityInput<T extends EntityNameOption>({
  label,
  name,
  value,
  options,
  entityLabel: _entityLabel,
  onChange,
  onSelectExisting,
  disabled = false,
  lockName = false,
  selectionOnly = false,
  required = false,
  placeholder,
  size = "md",
  className = "",
  formatDisplayValue = true,
}: SmartEntityInputProps<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [dropdownPosition, setDropdownPosition] = useState<DropdownPosition | null>(null);
  const sizeClasses =
    size === "xs"
      ? "text-xs py-1.5 px-3"
      : size === "sm"
        ? "text-sm py-2 px-3.5"
        : size === "lg"
          ? "text-base py-3 px-4"
          : "text-sm py-2.5 px-3.5";

  const visibleOptions = useMemo(
    () => fuzzySearchOptions(searchText, options),
    [options, searchText]
  );
  const showDropdown = open && !disabled && visibleOptions.length > 0;
  const inputValue = formatDisplayValue ? formatProperName(value) : value;
  const displayedInputValue = selectionOnly && open ? searchText : inputValue;
  const dropdownStyle: CSSProperties | undefined = dropdownPosition
    ? {
        position: "fixed",
        top: dropdownPosition.top,
        left: dropdownPosition.left,
        width: dropdownPosition.width,
        zIndex: 980,
      }
    : undefined;

  const updateDropdownPosition = useCallback(() => {
    const rect = inputRef.current?.getBoundingClientRect();
    if (!rect) return;
    setDropdownPosition({
      top: rect.bottom + 6,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  const openDropdown = () => {
    setSearchText("");
    updateDropdownPosition();
    setOpen(true);
  };

  useLayoutEffect(() => {
    if (open) {
      updateDropdownPosition();
    }
  }, [open, updateDropdownPosition, value, options.length]);

  useEffect(() => {
    if (!open) return undefined;

    const handleUpdate = () => updateDropdownPosition();
    window.addEventListener("resize", handleUpdate);
    window.addEventListener("scroll", handleUpdate, true);

    return () => {
      window.removeEventListener("resize", handleUpdate);
      window.removeEventListener("scroll", handleUpdate, true);
    };
  }, [open, updateDropdownPosition]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (rootRef.current?.contains(target) || dropdownRef.current?.contains(target)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [open]);

  const handleSelectExisting = (option: T) => {
    onSelectExisting(option);
    setSearchText("");
    setOpen(false);
  };

  const dropdown =
    showDropdown && dropdownStyle ? (
      <div
        ref={dropdownRef}
        data-testid={`${name}-smart-entity-dropdown`}
        className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm shadow-lg"
        style={dropdownStyle}
      >
        <div className="max-h-64 overflow-y-auto">
          {visibleOptions.map((match) => (
            <button
              key={String(match.id ?? match.name)}
              type="button"
              className="flex w-full items-center border-b border-slate-100 dark:border-slate-700 px-3 py-2.5 text-left text-slate-900 dark:text-slate-100 transition last:border-b-0 hover:bg-primary-50 dark:hover:bg-slate-700"
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => handleSelectExisting(match)}
            >
              <span className="min-w-0 truncate">{formatProperName(match.name)}</span>
            </button>
          ))}
        </div>
      </div>
    ) : null;

  return (
    <div ref={rootRef} className={`relative ${className}`.trim()}>
      <label
        className="mb-1.5 block text-xs font-medium text-slate-600 dark:text-slate-300"
        htmlFor={name}
      >
        {label}
      </label>
      <input
        ref={inputRef}
        id={name}
        autoComplete="off"
        role="combobox"
        aria-expanded={showDropdown}
        type="text"
        name={name}
        value={displayedInputValue}
        onChange={(event) => {
          if (lockName) return;
          setSearchText(event.target.value);
          if (!selectionOnly) {
            onChange(event.target.value);
          }
          updateDropdownPosition();
          setOpen(true);
        }}
        onFocus={openDropdown}
        onMouseDown={openDropdown}
        onClick={openDropdown}
        placeholder={placeholder}
        disabled={disabled}
        readOnly={lockName}
        required={required}
        className={`input-base block ${
          disabled
            ? "cursor-not-allowed border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-500 dark:text-slate-400"
            : ""
        } ${lockName && !disabled ? "cursor-pointer bg-slate-50 dark:bg-slate-900" : ""} ${sizeClasses}`}
      />

      {dropdown ? createPortal(dropdown, document.body) : null}
    </div>
  );
}

export default SmartEntityInput;
