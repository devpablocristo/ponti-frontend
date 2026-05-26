type FilterChipProps = {
  label: string;
  active: boolean;
  tone?: "green" | "red" | "yellow";
  onClick: () => void;
};

/**
 * Chip filtro tipo pill para el preview del importador. Cambia color según
 * tone (verde = ok, rojo = error, amarillo = existente). Usado solo en
 * ImportSupplyMovements; si se reusa fuera mover a components/Button/.
 */
export function FilterChip({ label, active, tone, onClick }: FilterChipProps) {
  const base =
    "px-3 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer";
  const idle =
    "bg-white dark:bg-slate-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:bg-slate-900";
  const activeCls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
      : tone === "red"
        ? "bg-red-50 text-red-700 border-red-300"
        : tone === "yellow"
          ? "bg-amber-50 text-amber-700 border-amber-300"
          : "bg-blue-50 text-blue-700 border-blue-300";
  return (
    <button type="button" onClick={onClick} className={`${base} ${active ? activeCls : idle}`}>
      {label}
    </button>
  );
}
