import { JSX } from "react";
import { CheckIcon, ClockIcon, FileTextIcon, FileXIcon } from "lucide-react";

/**
 * Configuración de status visual para el campo invoice_status de cada
 * fila de Labors. Cada status tiene clases Tailwind + icono. Está como
 * .tsx (no .ts) porque los icons son JSX.
 */
export const statusConfig: Record<string, { classes: string; icon: JSX.Element }> = {
  Pendiente: {
    classes: "bg-amber-50 text-amber-700 border border-amber-200",
    icon: <ClockIcon className="w-3.5 h-3.5" />,
  },
  Pagada: {
    classes: "bg-emerald-50 text-emerald-700 border border-emerald-200",
    icon: <CheckIcon className="w-3.5 h-3.5" />,
  },
  Facturada: {
    classes: "bg-blue-50 text-blue-700 border border-blue-200",
    icon: <FileTextIcon className="w-3.5 h-3.5" />,
  },
  NoFacturada: {
    classes:
      "bg-gray-50 dark:bg-slate-900 text-gray-500 border border-gray-200 dark:border-gray-700",
    icon: <FileXIcon className="w-3.5 h-3.5" />,
  },
};

export const invoiceEmptyStatus = "NoFacturada";

export const invoiceStatusOptions = [
  { id: 1, name: "Pendiente" },
  { id: 2, name: "Pagada" },
  { id: 3, name: "Facturada" },
];
