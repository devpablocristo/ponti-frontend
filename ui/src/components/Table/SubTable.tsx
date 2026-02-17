export type SubColumn<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
};

type SubTableProps<T> = {
  data: T[];
  columns: SubColumn<T>[];
  className?: string;
};

export const SubTable = <T,>({
  data,
  columns,
  className,
}: SubTableProps<T>) => {
  return (
    <div className={`overflow-x-auto rounded-xl ${className ?? ""}`}>
      <table className="w-full text-sm text-left text-slate-700 bg-white rounded-xl border border-slate-200 overflow-hidden" style={{ boxShadow: "var(--shadow-sm)" }}>
        <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
          <tr>
            {columns.map((col) => (
              <th key={String(col.key)} className="px-4 py-2 text-[11px] font-semibold uppercase tracking-wider">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((item, idx) => (
            <tr key={idx} className="border-t border-slate-100 font-normal hover:bg-slate-50 transition-colors duration-150">
              {columns.map((col) => (
                <td key={String(col.key)} className="px-4 py-2 font-normal">
                  {col.render
                    ? col.render(item[col.key], item)
                    : String(item[col.key])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
