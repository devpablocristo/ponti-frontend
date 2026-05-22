import { useMemo, useState } from "react";

import { createWorkOrderMetricsService } from "./metrics";
import { createWorkOrderMutations } from "./mutations";
import useOrdersReducer from "./ordersReducer";
import { createWorkOrderQueries } from "./queries";

/**
 * Hook compositor para work orders. Mantiene el reducer state + los setters
 * locales, y delega las funciones async a 3 servicios factory:
 *   - queries.ts: getOrders, getArchivedOrders, getWorkorder, getDraftWorkorder
 *   - mutations.ts: save/update/archive/restore/delete + draft variants
 *   - metrics.ts: getMetrics (endpoint separado, par processing/error propio)
 *
 * El API público (shape de return) NO cambió en este refactor; los callers
 * (WorkOrders.tsx, CreateOrder.tsx, UpdateOrder.tsx, Labors.tsx,
 * ArchivedWorkOrders.tsx) siguen funcionando sin modificación.
 */
const useOrders = () => {
  const [
    { orders, pageInfo, resultCreation, selectedOrder, metrics },
    dispatch,
  ] = useOrdersReducer();

  const [processing, setProcessing] = useState(false);
  const [processingCreation, setProcessingCreation] = useState(false);
  const [processingDetail, setProcessingDetail] = useState(false);
  const [processingMetrics, setProcessingMetrics] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorCreation, setErrorCreation] = useState<string | null>(null);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);

  // Los servicios son estables (depend solo de dispatch + setters, que son
  // estables across renders). useMemo previene recrearlos en cada render
  // sin pagar el costo de useCallback por cada función individual.
  const queries = useMemo(
    () =>
      createWorkOrderQueries({
        dispatch,
        setProcessing,
        setError,
        setProcessingDetail,
        setErrorCreation,
      }),
    [dispatch],
  );

  const mutations = useMemo(
    () =>
      createWorkOrderMutations({
        dispatch,
        setProcessing,
        setError,
        setProcessingCreation,
        setErrorCreation,
      }),
    [dispatch],
  );

  const metricsService = useMemo(
    () =>
      createWorkOrderMetricsService({
        dispatch,
        setProcessingMetrics,
        setErrorMetrics,
      }),
    [dispatch],
  );

  return {
    // state
    orders,
    pageInfo,
    selectedOrder,
    metrics,
    resultCreation,
    // processing/error flags
    processing,
    processingCreation,
    processingDetail,
    processingMetrics,
    error,
    errorCreation,
    errorMetrics,
    // queries
    getOrders: queries.getOrders,
    getArchivedOrders: queries.getArchivedOrders,
    getWorkorder: queries.getWorkorder,
    getDraftWorkorder: queries.getDraftWorkorder,
    // mutations
    saveOrder: mutations.saveOrder,
    updateOrder: mutations.updateOrder,
    updateDraftOrder: mutations.updateDraftOrder,
    publishDraftOrder: mutations.publishDraftOrder,
    deleteDraftOrder: mutations.deleteDraftOrder,
    deleteOrder: mutations.deleteOrder,
    archiveOrder: mutations.archiveOrder,
    restoreOrder: mutations.restoreOrder,
    hardDeleteOrder: mutations.hardDeleteOrder,
    // metrics
    getMetrics: metricsService.getMetrics,
  };
};

export default useOrders;
