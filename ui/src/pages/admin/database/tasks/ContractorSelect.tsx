import { useEffect, useRef, useState } from "react";
import Search from "../../../../components/Input/Search";

type ContractorOption = {
  id: number;
  name: string;
};

type Props = {
  name: string;
  value: string;
  options: ContractorOption[];
  onSelect: (name: string) => void;
  placeholder?: string;
};

export default function ContractorSelect({
  name,
  value,
  options,
  onSelect,
  placeholder = "Buscar contratista",
}: Props) {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
        setQuery("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filtered =
    query.trim() === ""
      ? options
      : options.filter((option) =>
          option.name.toLowerCase().includes(query.toLowerCase())
        );

  const handleSelect = (option: ContractorOption) => {
    onSelect(option.name);
    setQuery("");
    setShowSuggestions(false);
  };

  return (
    <div ref={wrapperRef} className="relative">
      <Search
        name={name}
        placeholder={placeholder}
        value={showSuggestions ? query : value}
        onFocus={() => {
          setQuery("");
          setShowSuggestions(true);
        }}
        onChange={(e) => setQuery(e.target.value)}
        className="w-full"
        fullWidth
      />
      {showSuggestions && (
        <ul className="absolute top-full mt-1 w-full bg-white border rounded-lg shadow-md z-50 max-h-[200px] overflow-y-auto">
          {filtered.map((option) => (
            <li
              key={option.id}
              onClick={() => handleSelect(option)}
              className="px-4 py-2 cursor-pointer hover:bg-gray-300 hover:font-medium"
            >
              {option.name}
            </li>
          ))}
          {filtered.length === 0 && (
            <li className="px-4 py-2 text-sm text-gray-400 italic">
              No se encontraron contratistas
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
