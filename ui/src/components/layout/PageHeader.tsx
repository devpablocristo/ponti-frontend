import { ReactNode } from "react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  subtitle,
  actions,
  className = "",
}: PageHeaderProps) {
  return (
    <header
      className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4 ${className}`}
    >
      <div className="min-w-0">
        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight tracking-tight text-slate-900 truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 md:ml-auto shrink-0">
          {actions}
        </div>
      )}
    </header>
  );
}

export default PageHeader;
