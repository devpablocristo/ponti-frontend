import { useEffect, useLayoutEffect, useRef, useState, type ComponentType, type SVGProps } from "react";
import { MoreVertical } from "lucide-react";

export type RowActionVariant = "default" | "danger";

export type RowAction = {
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  onClick: () => void;
  variant?: RowActionVariant;
  disabled?: boolean;
};

export type RowActionItem = RowAction | { divider: true };

export type RowActionsProps = {
  actions: RowActionItem[];
  ariaLabel?: string;
  className?: string;
};

function isDivider(item: RowActionItem): item is { divider: true } {
  return "divider" in item;
}

export function RowActions({
  actions,
  ariaLabel = "Más acciones",
  className = "",
}: RowActionsProps) {
  const [open, setOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", handleClick);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const estimatedMenuHeight = Math.max(actions.length, 1) * 36 + 16;
    setOpenUpward(spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight);
  }, [open, actions.length]);

  if (actions.length === 0) return null;

  return (
    <div ref={containerRef} className={`relative inline-flex ${className}`}>
      <button
        ref={buttonRef}
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <MoreVertical className="h-4 w-4" aria-hidden="true" />
      </button>
      {open && (
        <div
          role="menu"
          className={`absolute right-0 z-20 min-w-[10rem] rounded-md border border-slate-200 bg-white py-1 shadow-lg ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {actions.map((item, index) => {
            if (isDivider(item)) {
              return <div key={`divider-${index}`} className="my-1 h-px bg-slate-100" role="separator" />;
            }
            const Icon = item.icon;
            const danger = item.variant === "danger";
            const baseClasses =
              "flex w-full items-center gap-2 px-3 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-50";
            const toneClasses = danger
              ? "text-red-700 hover:bg-red-50"
              : "text-slate-700 hover:bg-slate-100";
            return (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className={`${baseClasses} ${toneClasses}`}
              >
                {Icon && <Icon className="h-4 w-4" aria-hidden="true" />}
                <span className="flex-1 text-left">{item.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
