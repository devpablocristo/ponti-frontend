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
  /** Si se pasa, filtra el listado por ese lote (usado por el flujo de Lotes archivados). */
  lotIdFilter?: number | null;
};

export default function ArchivedWorkOrders({
  onAfterRestore,
  lotIdFilter,
}: ArchivedWorkOrdersProps = {}) {
  const {
    orders,
    getArchivedOrders,
    restoreOrder,
    hardDeleteOrder,
    processing,
    error,
  } = useOrders();

  const refetch = useCallback(() => {
    const params = new URLSearchParams({ page: "1", per_page: "1000" });
    if (lotIdFilter && lotIdFilter > 0) params.set("lot_id", String(lotIdFilter));
    return getArchivedOrders(params.toString());
  }, [getArchivedOrders, lotIdFilter]);

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
      description={
        lotIdFilter
          ? "Órdenes de trabajo asociadas al lote seleccionado"
          : "Restaurar o eliminar órdenes de trabajo de forma definitiva"
      }
      columns={columns}
      data={orders}
      entity={ENTITY}
      bulk
      ignoreWorkspaceFilters={!!lotIdFilter}
      getItemLabel={(item) => item.number}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? (error ?? undefined)}
    />
  );
}
