import React from "react";

interface PageShellProps {
  /** Header opcional (titulo, breadcrumb, acciones). Sticky en mobile. */
  header?: React.ReactNode;
  /** Toolbar opcional (filtros, búsqueda). Renderiza debajo del header. */
  toolbar?: React.ReactNode;
  /** Contenido principal. */
  children: React.ReactNode;
  /** Footer opcional. */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * Wrapper de página. Spacing vertical consistente entre header/toolbar/body/footer.
 * NO impone max-width — el caller decide si necesita Container adentro.
 */
export function PageShell({ header, toolbar, children, footer, className = "" }: PageShellProps) {
  return (
    <div className={["flex flex-col gap-4", className].filter(Boolean).join(" ")}>
      {header && <div>{header}</div>}
      {toolbar && <div>{toolbar}</div>}
      <div className="flex-1 min-w-0">{children}</div>
      {footer && <div>{footer}</div>}
    </div>
  );
}
