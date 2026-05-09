import { useEffect, useRef, useState } from "react";
import { MoreVertical } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type RowAction = {
  /** Texto visible en el dropdown. */
  label: string;
  /** Icono a la izquierda del label. */
  icon?: LucideIcon;
  onClick: () => void;
  /** "default" (gris) o "danger" (rojo). */
  variant?: "default" | "danger";
  disabled?: boolean;
  /** Si true, agrega un separador horizontal arriba de esta acción. */
  divider?: boolean;
  /** Tooltip / aria-label opcional. */
  title?: string;
};

type RowActionsProps = {
  actions: RowAction[];
  /** Tamaño del botón ⋮. Default "md". */
  size?: "sm" | "md";
  className?: string;
};

const SIZE_CLASS: Record<"sm" | "md", string> = {
  sm: "p-1",
  md: "p-1.5",
};

/**
 * Kebab menu (⋮) estándar para row actions en tablas. Click abre un dropdown
 * con las acciones provistas. Cierra con Esc o click fuera.
 *
 * Patrón estándar: Linear / GitHub / Notion. Permite escalar a 5+ acciones por
 * fila sin saturar la tabla.
 */
export function RowActions({ actions, size = "md", className = "" }: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const [openUp, setOpenUp] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [open]);

  const handleToggle = () => {
    if (!open && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const estimatedMenuHeight = Math.min(actions.length * 40 + 16, 240);
      setOpenUp(spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight);
    }
    setOpen((v) => !v);
  };

  if (actions.length === 0) return null;

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        className={`${SIZE_CLASS[size]} rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-300`}
        onClick={(e) => {
          e.stopPropagation();
          handleToggle();
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Acciones"
      >
        <MoreVertical className={size === "sm" ? "h-4 w-4" : "h-5 w-5"} />
      </button>

      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-50 ${
            openUp ? "bottom-full mb-1" : "top-full mt-1"
          } min-w-[160px] rounded-lg bg-white border border-slate-200 shadow-lg py-1`}
        >
          {actions.map((action, idx) => {
            const Icon = action.icon;
            const isDanger = action.variant === "danger";
            return (
              <div key={`${action.label}-${idx}`}>
                {action.divider && <div className="my-1 border-t border-slate-100" />}
                <button
                  type="button"
                  role="menuitem"
                  disabled={action.disabled}
                  title={action.title}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-sm text-left transition-colors ${
                    action.disabled
                      ? "text-slate-400 cursor-not-allowed"
                      : isDanger
                      ? "text-red-700 hover:bg-red-50"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (action.disabled) return;
                    setOpen(false);
                    action.onClick();
                  }}
                >
                  {Icon && <Icon className="h-4 w-4 shrink-0" />}
                  <span className="flex-1">{action.label}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default RowActions;
