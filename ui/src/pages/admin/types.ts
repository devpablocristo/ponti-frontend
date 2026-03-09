export type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: T[keyof T], item: T) => React.ReactNode;
  filterable?: boolean;
  filterType?: "text" | "number" | "select" | "date";
  filterOptions?: string[];
};
