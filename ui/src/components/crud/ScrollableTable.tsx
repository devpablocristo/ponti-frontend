import { type ReactNode } from "react";

import { useIsMobile } from "../../hooks/useBreakpoint";

type ScrollableTableProps = {
  children: ReactNode;
  /** Clases extra para el wrapper scrollable (ej. `rounded-xl`). */
  className?: string;
  /**
   * Color del fade-gradient a la derecha. Por default `white` (match con cards
   * sobre bg blanco). Tailwind class `from-X dark:from-Y`. Permite ajustar
   * si el contenedor padre no es bg-white.
   */
  fadeFromClass?: string;
};

/**
 * Envuelve tablas/grids anchos en un contenedor con scroll horizontal y
 * agrega una pista visual (gradient + texto) en mobile para que el usuario
 * sepa que puede deslizar. Pensado para report tables con `min-w-[N]`
 * o `style.width` dinámico mayor al viewport.
 *
 * Pattern: el gradient siempre se renderiza pero solo es visible cuando hay
 * overflow real (la transparencia hacia el contenido lo hace imperceptible
 * cuando la tabla cabe entera).
 */
export function ScrollableTable({
  children,
  className = "",
  fadeFromClass = "from-white dark:from-slate-800",
}: ScrollableTableProps) {
  const isMobile = useIsMobile();

  return (
    <div className="relative">
      {isMobile && (
        <div className="pb-1 text-[10px] font-medium uppercase tracking-wider text-slate-400 dark:text-slate-500">
          ← Desliza horizontalmente →
        </div>
      )}
      <div className={`overflow-x-auto ${className}`.trim()}>{children}</div>
      {/* Fade a la derecha — visible cuando hay overflow real, transparente
          cuando la tabla cabe. md:hidden porque en desktop el contenedor
          suele ser ancho suficiente. */}
      <span
        aria-hidden="true"
        className={`pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l ${fadeFromClass} to-transparent md:hidden`}
      />
    </div>
  );
}
