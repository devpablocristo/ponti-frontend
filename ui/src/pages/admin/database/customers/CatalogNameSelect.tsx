import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRegistryOptions } from "@/hooks/useRegistryOptions";

type Props = {
  base: string; // "project" | "field" | "lot"
  label: string;
  placeholder?: string;
  value: string; // nombre seleccionado o escrito
  onChange: (name: string) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
};

// Combo editable: lista los nombres existentes del registry como sugerencias, pero
// permite escribir uno nuevo (que se persiste al guardar el proyecto). El value es el
// nombre (no el id) para no alterar el payload del proyecto.
export default function CatalogNameSelect({
  base,
  label,
  placeholder = "Seleccione o escriba",
  value,
  onChange,
  size = "md",
  fullWidth = false,
}: Props) {
  const { options } = useRegistryOptions(base);
  const names = useMemo(
    () => options.map((r) => r.name).filter(Boolean),
    [options]
  );
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const suggestions = useMemo(() => {
    const uniq = [...new Set(names)].sort((a, b) =>
      a.localeCompare(b, "es", { sensitivity: "base" })
    );
    const q = value.trim().toLowerCase();
    if (!q) return uniq;
    return uniq.filter((n) => n.toLowerCase().includes(q));
  }, [names, value]);

  const typed = value.trim();
  // Mostrar "Crear «X»" cuando lo escrito no coincide exacto con una opción existente.
  const canCreate =
    typed.length > 0 &&
    !names.some((n) => n.toLowerCase() === typed.toLowerCase());

  const sizeClasses = size === "sm" ? "text-sm py-2 px-3.5" : "text-sm py-2.5 px-3.5";

  return (
    <div className={fullWidth ? "w-full" : ""} ref={wrapperRef}>
      {label !== "" && (
        <label className="block mb-1.5 text-xs font-medium text-slate-600">{label}</label>
      )}
      <div className="relative">
        <input
          autoComplete="off"
          value={value}
          placeholder={placeholder}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          className={`input-base block pr-9 ${sizeClasses}`}
        />
        <ChevronDown
          size={16}
          onClick={() => setOpen((p) => !p)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 cursor-pointer"
        />
        {open && (suggestions.length > 0 || canCreate) && (
          <ul className="absolute top-full mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-md z-20 max-h-[200px] overflow-y-auto">
            {canCreate && (
              <li
                onClick={() => setOpen(false)}
                className="px-4 py-2 text-sm cursor-pointer hover:bg-primary-50 text-primary-700 font-medium border-b border-gray-100"
              >
                Crear «{typed}»
              </li>
            )}
            {suggestions.map((name) => (
              <li
                key={name}
                onClick={() => {
                  onChange(name);
                  setOpen(false);
                }}
                className="px-4 py-2 text-sm cursor-pointer hover:bg-gray-100"
              >
                {name}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
