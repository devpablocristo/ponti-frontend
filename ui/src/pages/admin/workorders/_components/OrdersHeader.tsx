import { ColumnConfigHeader } from "../../../../components/crud/ColumnConfigHeader";
import { OrdersData } from "../../../../hooks/useWorkOrders/types";
import { Column } from "../../types";

type OrdersHeaderProps = {
  selectedColumns: Array<keyof OrdersData>;
  setSelectedColumns: (columns: Array<keyof OrdersData>) => void;
  setVisibleColumns: (columns: Array<keyof OrdersData>) => void;
  allColumns: Column<OrdersData>[];
};

/**
 * Header del DataTable de WorkOrders. Thin wrapper sobre `ColumnConfigHeader`
 * que mantiene el typing específico de `OrdersData`. La UI vive en el
 * componente compartido.
 */
export function OrdersHeader(props: OrdersHeaderProps) {
  return <ColumnConfigHeader<OrdersData> {...props} />;
}
