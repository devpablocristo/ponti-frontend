import { useState, useRef, useEffect, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";

export type SupplyDropdownOption = {
  id: number;
  name: string;
  badge?: ReactNode;
};

type SupplyDropdownProps = {
  options: SupplyDropdownOption[];
  value: number | string | null;
  onSelect: (option: SupplyDropdownOption) => void;
  onCreateNew?: () => void;
  hasError?: boolean;
  placeholder?: string;
};

export default function SupplyDropdown({
  options,
  value,
  onSelect,
  onCreateNew,
  hasError = false,
  placeholder = "Seleccionar...",
}: SupplyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const filtered = options.filter(
    (o) => !search || o.name.toLowerCase().includes(search.toLowerCase())
  );

  const selected = value != null
    ? options.find((o) => o.id === Number(value))
    : null;

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const scrollToIndex = (index: number) => {
    requestAnimationFrame(() => {
      listRef.current
        ?.querySelector<HTMLLIElement>(`[data-option-index="${index}"]`)
        ?.scrollIntoView({ block: "nearest" });
    });
  };

  const open = () => {
    setIsOpen(true);
    setHighlightedIndex(0);
    setSearch("");
  };

  const close = () => {
    setIsOpen(false);
    setSearch("");
  };

  const selectOption = (option: SupplyDropdownOption) => {
    onSelect(option);
    close();
  };

  const handleTriggerKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      isOpen ? close() : open();
    }
    if (e.key === "Escape" && isOpen) {
      e.preventDefault();
      close();
    }
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filtered.length === 0) return;
      const next = highlightedIndex < filtered.length - 1 ? highlightedIndex + 1 : 0;
      setHighlightedIndex(next);
      scrollToIndex(next);
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filtered.length === 0) return;
      const next = highlightedIndex > 0 ? highlightedIndex - 1 : filtered.length - 1;
      setHighlightedIndex(next);
      scrollToIndex(next);
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[highlightedIndex];
      if (option) selectOption(option);
      return;
    }
    if (e.key === "Escape") {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab") {
      close();
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        role="combobox"
        tabIndex={0}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        className={`input-base cursor-pointer text-sm py-2 px-3.5 flex items-center justify-between ${
          hasError ? "border-red-500" : ""
        }`}
        onClick={() => (isOpen ? close() : open())}
        onKeyDown={handleTriggerKeyDown}
      >
        {selected ? (
          <span className="truncate font-semibold text-gray-900">
            {selected.name}
            {selected.badge && <> {selected.badge}</>}
          </span>
        ) : (
          <span className="text-gray-400">{placeholder}</span>
        )}
        <ChevronDown size={16} className="text-slate-400 shrink-0" />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-lg z-20 mt-1">
          <input
            type="text"
            placeholder="Buscar insumo..."
            className="w-full px-3 py-2 text-sm border-b outline-none"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setHighlightedIndex(0);
            }}
            onKeyDown={handleSearchKeyDown}
            autoFocus
          />
          <ul
            ref={listRef}
            role="listbox"
            className="max-h-[200px] overflow-y-auto"
          >
            {onCreateNew && (
              <li
                role="option"
                aria-selected={false}
                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-blue-600 font-semibold border-b"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onCreateNew();
                  close();
                }}
              >
                + Crear nuevo insumo
              </li>
            )}
            {filtered.map((option, idx) => (
              <li
                key={option.id}
                role="option"
                aria-selected={selected?.id === option.id}
                data-option-index={idx}
                className={`px-3 py-2 cursor-pointer font-semibold text-gray-900 ${
                  highlightedIndex === idx ? "bg-gray-100" : "hover:bg-gray-100"
                }`}
                onMouseEnter={() => setHighlightedIndex(idx)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(option);
                }}
              >
                <span>{option.name}</span>
                {option.badge && (
                  <span className="ml-1 text-xs text-gray-400">{option.badge}</span>
                )}
              </li>
            ))}
            {filtered.length === 0 && (
              <li className="px-3 py-2 text-sm text-gray-400">Sin resultados</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
