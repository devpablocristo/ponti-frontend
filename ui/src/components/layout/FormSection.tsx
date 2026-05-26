import React from "react";

interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Acciones a la derecha del título (botones, links). */
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

/**
 * Sección de formulario con spacing consistente. Title + description
 * arriba (stack mobile, row con actions desktop), content abajo.
 */
export function FormSection({
  title,
  description,
  actions,
  children,
  className = "",
}: FormSectionProps) {
  return (
    <section className={["flex flex-col gap-4", className].filter(Boolean).join(" ")}>
      {(title || description || actions) && (
        <header className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between md:gap-4">
          <div className="flex flex-col gap-1">
            {title && (
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 font-display">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-slate-600 dark:text-slate-400">{description}</p>
            )}
          </div>
          {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </header>
      )}
      <div className="flex flex-col gap-3">{children}</div>
    </section>
  );
}
