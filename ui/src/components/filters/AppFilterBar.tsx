import React, { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";

import { ToolbarActionButton } from "../Button/ToolbarActionButton";
import type { AppButtonVariant } from "../Button/AppButton";
import { fuzzySearchOptions } from "../../lib/fuzzySearch";

export interface FilterOption {
  id: number | string;
  name: string;
  code?: string | number | null;
}

export interface FilterItem {
  type: "select" | "search";
  ref?: string;
  name: string;
  label: string;
  total?: number;
  placeholder?: string;
  options?: FilterOption[];
  value?: string | number | null;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  allowAll?: boolean;
  allLabel?: string;
  preserveAllSelection?: boolean;
  onChange: (value: string) => void;
  setData: (value: unknown) => void;
}

interface ActionButton {
  label: string;
  variant?: AppButtonVariant;
  icon?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
  accept?: string;
  onFileChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  href?: string;
  isPrimary?: boolean;
}

export type FilterBarProps = {
  filters: FilterItem[];
  actions?: ActionButton[];
  children?: ReactNode;
  className?: string;
  inputSize?: "sm" | "md";
};

function sizeClass(size: "sm" | "md") {
  return size === "sm" ? "px-3.5 py-2 text-sm" : "px-3.5 py-2.5 text-sm";
}

function ActionButtonView({ action, size }: { action: ActionButton; size: "sm" | "md" }) {
  return (
    <ToolbarActionButton
      label={action.label}
      variant={action.variant}
      icon={action.icon}
      disabled={action.disabled}
      onClick={action.onClick}
      accept={action.accept}
      onFileChange={action.onFileChange}
      href={action.href}
      isPrimary={action.isPrimary}
      size={size}
    />
  );
}

function SearchInput({
  label,
  name,
  value,
  disabled,
  onClick,
  onChange,
  onFocus,
  onKeyDown,
  placeholder,
  size,
}: {
  label: string;
  name: string;
  value: string;
  disabled?: boolean;
  onClick?: React.MouseEventHandler<HTMLInputElement>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
  onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  size: "sm" | "md";
}) {
  return (
    <div className="w-full">
      {label ? (
        <label className="mb-1.5 block text-xs font-medium text-slate-600">{label}</label>
      ) : null}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          autoComplete="off"
          name={name}
          value={value}
          disabled={disabled}
          onClick={onClick}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onFocus={onFocus}
          placeholder={placeholder}
          className={`input-base block w-full pl-9 pr-8 ${sizeClass(size)} ${
            disabled ? "cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400" : ""
          }`}
        />
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      </div>
    </div>
  );
}

function ResponsiveActionContainer({
  actions,
  size,
}: {
  actions: ActionButton[];
  size: "sm" | "md";
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {open ? (
        <div className="mb-3 flex flex-col items-end gap-2">
          {actions.map((action) => (
            <ActionButtonView key={`floating-action-${action.label}`} action={action} size={size} />
          ))}
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex h-12 w-12 items-center justify-center rounded-full bg-custom-btn text-2xl text-white shadow-lg transition-all duration-200 hover:bg-custom-btn/85 active:scale-95"
        aria-label="Acciones"
      >
        +
      </button>
    </div>
  );
}

function FilterSuggestions({
  filter,
  visible,
  highlightedIndex,
  options,
  onSelect,
}: {
  filter: FilterItem;
  visible: boolean;
  highlightedIndex: number;
  options: FilterOption[];
  onSelect: (option: FilterOption) => void;
}) {
  if (!visible) return null;

  const allowAll = filter.allowAll !== false;
  const allLabel = filter.allLabel ?? "Todos los registros";
  const hasOptions = options.length > 0;

  return (
    <ul className="absolute top-full z-[70] mt-1 max-h-[240px] w-full overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
      {allowAll ? (
        <li
          className="cursor-pointer px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors duration-150 hover:bg-slate-50"
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onSelect({ id: 0, name: allLabel })}
        >
          {allLabel}
        </li>
      ) : null}

      {filter.loading ? (
        <li className="px-3.5 py-2.5 text-sm text-slate-500">Cargando...</li>
      ) : null}

      {!filter.loading && filter.error ? (
        <li className="px-3.5 py-2.5 text-sm text-red-600">{filter.error}</li>
      ) : null}

      {!filter.loading && !filter.error && !hasOptions ? (
        <li className="px-3.5 py-2.5 text-sm text-slate-500">
          {filter.emptyMessage ?? "Sin resultados"}
        </li>
      ) : null}

      {!filter.loading && !filter.error
        ? options.map((option, index) => (
            <li
              key={`${filter.name}-${String(option.id)}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => onSelect(option)}
              className={`cursor-pointer px-3.5 py-2.5 text-sm transition-colors duration-150 ${
                highlightedIndex === index
                  ? "bg-primary-50 font-medium text-primary-700"
                  : "hover:bg-slate-50"
              }`}
            >
              {option.name}
            </li>
          ))
        : null}
    </ul>
  );
}

export function AppFilterBar({
  filters,
  actions = [],
  children,
  className = "",
  inputSize = "sm",
}: FilterBarProps) {
  const [suggestionsVisible, setSuggestionsVisible] = useState<Record<string, boolean>>({});
  const [highlightedIndex, setHighlightedIndex] = useState<Record<string, number>>({});
  const [searchByFilter, setSearchByFilter] = useState<Record<string, string>>({});
  const refs = useRef<Record<string, HTMLDivElement | null>>({});

  const optionsByFilter = useMemo(() => {
    return filters.reduce<Record<string, FilterOption[]>>((acc, filter) => {
      const value = suggestionsVisible[filter.name]
        ? (searchByFilter[filter.name] ?? "")
        : String(filter.value ?? "");
      const allLabel = filter.allLabel ?? "Todos los registros";
      const query =
        value === allLabel || value.startsWith("Todos los ") || value.startsWith("Todas las ")
          ? ""
          : value;
      acc[filter.name] = fuzzySearchOptions(query, filter.options ?? []);
      return acc;
    }, {});
  }, [filters, searchByFilter, suggestionsVisible]);

  const hideSuggestions = useCallback((name: string) => {
    setSuggestionsVisible((prev) => ({ ...prev, [name]: false }));
  }, []);

  const showSuggestions = useCallback((name: string) => {
    setSearchByFilter((prev) => ({ ...prev, [name]: "" }));
    setSuggestionsVisible((prev) => ({ ...prev, [name]: true }));
  }, []);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      Object.entries(refs.current).forEach(([name, element]) => {
        if (suggestionsVisible[name] && element && !element.contains(event.target as Node)) {
          hideSuggestions(name);
        }
      });
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        Object.keys(suggestionsVisible).forEach((name) => hideSuggestions(name));
      }
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [hideSuggestions, suggestionsVisible]);

  const handleSuggestionClick = useCallback(
    (filter: FilterItem, option: FilterOption) => {
      filter.setData(option);
      filter.onChange(option.name);
      setSearchByFilter((prev) => ({ ...prev, [filter.name]: "" }));
      hideSuggestions(filter.name);
    },
    [hideSuggestions]
  );

  const createHandleKeyDown = useCallback(
    (filter: FilterItem) => (event: React.KeyboardEvent<HTMLInputElement>) => {
      const options = optionsByFilter[filter.name] ?? [];
      const currentIndex = highlightedIndex[filter.name] || 0;
      let nextIndex = currentIndex;

      if (event.key === "ArrowDown") {
        event.preventDefault();
        nextIndex = Math.min(options.length - 1, currentIndex + 1);
      } else if (event.key === "ArrowUp") {
        event.preventDefault();
        nextIndex = Math.max(0, currentIndex - 1);
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (options.length > 0) {
          handleSuggestionClick(filter, options[Math.max(0, currentIndex)]);
        }
      } else if (event.key === "Escape") {
        event.preventDefault();
        hideSuggestions(filter.name);
      }

      setHighlightedIndex((prev) => ({ ...prev, [filter.name]: nextIndex }));
    },
    [handleSuggestionClick, hideSuggestions, highlightedIndex, optionsByFilter]
  );

  return (
    <div className={`relative z-[60] w-full ${className}`.trim()}>
      <div className="flex flex-col items-start justify-between gap-3 px-1 py-2 sm:flex-row sm:items-end sm:gap-4">
        <div className="flex w-full flex-col gap-4 sm:flex-1 sm:flex-row">
          {filters.map((filter) => {
            const filteredOptions = optionsByFilter[filter.name] ?? [];
            return (
              <div
                key={`filter-${filter.name}`}
                className="w-full flex-1 sm:w-auto sm:max-w-60"
                ref={(element) => {
                  refs.current[filter.name] = element;
                }}
              >
                <div className="relative">
                  <SearchInput
                    label={filter.label}
                    name={filter.name}
                    placeholder="Buscar"
                    value={
                      suggestionsVisible[filter.name]
                        ? (searchByFilter[filter.name] ?? "")
                        : String(filter.value ?? "")
                    }
                    size={inputSize}
                    onClick={() => showSuggestions(filter.name)}
                    onChange={(event) => {
                      const nextValue = event.target.value;
                      filter.setData(undefined);
                      filter.onChange(nextValue);
                      setSearchByFilter((prev) => ({
                        ...prev,
                        [filter.name]: nextValue,
                      }));
                      setSuggestionsVisible((prev) => ({
                        ...prev,
                        [filter.name]: true,
                      }));
                      setHighlightedIndex((prev) => ({ ...prev, [filter.name]: 0 }));
                    }}
                    onFocus={() => showSuggestions(filter.name)}
                    onKeyDown={createHandleKeyDown(filter)}
                    disabled={filter.disabled}
                  />
                  <FilterSuggestions
                    filter={filter}
                    visible={Boolean(suggestionsVisible[filter.name])}
                    highlightedIndex={highlightedIndex[filter.name] || 0}
                    options={filteredOptions}
                    onSelect={(option) => handleSuggestionClick(filter, option)}
                  />
                </div>
              </div>
            );
          })}

          {children ? <div className="mx-2">{children}</div> : null}
        </div>

        {actions.length > 0 ? (
          <>
            <div className="hidden items-center justify-end gap-2 sm:flex">
              {actions.map((action) => (
                <ActionButtonView key={`action-${action.label}`} action={action} size={inputSize} />
              ))}
            </div>
            <div className="sm:hidden">
              <ResponsiveActionContainer actions={actions} size={inputSize} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
