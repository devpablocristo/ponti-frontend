export type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: unknown, item: T) => React.ReactNode;
  filterable?: boolean;
  filterType?: "text" | "number" | "select" | "date";
  filterOptions?: string[];
  sortable?: boolean;
  width?: string;
  minWidth?: string;
  maxWidth?: string;
  align?: "left" | "center" | "right";
  headerAlign?: "left" | "center" | "right";
  padding?: "xs" | "sm" | "md";
  wrap?: boolean;
  headerPadding?: "xs" | "sm" | "md";
  headerWrap?: boolean;
};
