import { useEffect, useState } from "react";

type CloseStockDateProps = {
  date: string;
  onDateChange: (date: string) => void;
  enabledCloseStock: boolean;
  setEnabledCloseStock: (enabled: boolean) => void;
  disabledCloseStock: boolean;
};

/**
 * Date picker + checkbox para "Cerrar stock a fecha". El internalDate se
 * mantiene local para que el usuario pueda cambiar la fecha sin disparar
 * onDateChange hasta que tilde el checkbox.
 */
export function CloseStockDate({
  date,
  onDateChange,
  enabledCloseStock,
  setEnabledCloseStock,
  disabledCloseStock,
}: CloseStockDateProps) {
  const [internalDate, setInternalDate] = useState(date);

  useEffect(() => {
    setInternalDate(date);
  }, [date]);

  return (
    <div>
      <label className="block mb-1.5 text-xs font-medium text-slate-600 dark:text-slate-300">
        Cerrar stock a fecha
      </label>
      <div className="flex items-center gap-3">
        <input
          type="date"
          disabled={disabledCloseStock}
          value={internalDate}
          onChange={(e) => setInternalDate(e.target.value)}
          className="input-base appearance-none focus:ring-0 block text-sm py-2 px-3.5 disabled:bg-gray-100 dark:bg-slate-800 disabled:text-gray-400"
        />
        <label
          className={`inline-flex items-center gap-2 cursor-pointer ${
            disabledCloseStock ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          <input
            type="checkbox"
            checked={enabledCloseStock}
            onChange={() => {
              if (!enabledCloseStock && internalDate) {
                setEnabledCloseStock(true);
                onDateChange(internalDate);
              } else {
                setEnabledCloseStock(false);
              }
            }}
            className="w-4 h-4 text-custom-btn border-gray-300 dark:border-gray-600 rounded focus:ring-custom-btn/30"
            disabled={disabledCloseStock}
          />
          <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
            Cerrar stock
          </span>
        </label>
      </div>
    </div>
  );
}
