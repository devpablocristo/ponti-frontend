import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useOrders from "../../../../hooks/useWorkOrders";
import type { OrdersData } from "../../../../hooks/useWorkOrders/types";
import { Column } from "../../types";
import { WORKORDER_ENTITY as ENTITY } from "../../entities";

const columns: Column<OrdersData>[] = [
  { key: "number", header: "Número" },
  { key: "project_name", header: "Proyecto" },
  { key: "field_name", header: "Campo" },
  { key: "lot_name", header: "Lote" },
  { key: "date", header: "Fecha" },
  { key: "labor_name", header: "Labor" },
];

type ArchivedWorkOrdersProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedWorkOrders({ onAfterRestore }: ArchivedWorkOrdersProps = {}) {
  const {
    orders,
    getArchivedOrders,
    restoreOrder,
    hardDeleteOrder,
    processing,
    error,
  } = useOrders();

  const refetch = useCallback(
    () => getArchivedOrders("page=1&per_page=1000"),
    [getArchivedOrders],
  );

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreOrder(id);
      onAfterRestore?.();
    },
    [restoreOrder, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      await hardDeleteOrder(id);
      onAfterRestore?.();
    },
    [hardDeleteOrder, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<OrdersData>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  return (
    <ArchivedListPage<OrdersData>
      description="Restaurar o eliminar órdenes de trabajo de forma definitiva"
      columns={columns}
      data={orders}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.number}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? (error ?? undefined)}
    />
  );
}
