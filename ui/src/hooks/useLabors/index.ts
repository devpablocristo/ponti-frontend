import { useMemo, useState } from "react";

import { createInvoiceService } from "./invoices";
import useLaborReducer from "./laborsReducer";
import { createLaborMetricsService } from "./metrics";
import { createLaborMutations } from "./mutations";
import { createLaborQueries } from "./queries";

/**
 * Hook compositor para labores. Delega a 4 services factory:
 *   - queries.ts: getLaborGroups, getLabors, getArchivedLabors, getWorkOrdersCount
 *   - mutations.ts: saveLabors (batch con translateLaborDetail), updateLabor (par errorUpdate/resultUpdate), deleteLabor + lifecycle (archive/restore/hardDelete)
 *   - invoices.ts: createInvoice, updateInvoice (par errorInvoice/resultInvoice)
 *   - metrics.ts: getMetrics (endpoint y par processing/error propios)
 *
 * API público intacto post-refactor.
 */
const useLabors = () => {
  const [
    { laborGroups, labors, result, pageInfo, resultInvoice, metrics },
    dispatch,
  ] = useLaborReducer();

  const [processing, setProcessing] = useState(false);
  const [processingInvoice, setProcessingInvoice] = useState(false);
  const [processingMetrics, setProcessingMetrics] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorUpdate, setErrorUpdate] = useState<string | null>(null);
  const [resultUpdate, setResultUpdate] = useState<string | null>(null);
  const [errorInvoice, setErrorInvoice] = useState<string | null>(null);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);

  const queries = useMemo(
    () => createLaborQueries({ dispatch, setProcessing, setError }),
    [dispatch],
  );

  const mutations = useMemo(
    () =>
      createLaborMutations({
        dispatch,
        setProcessing,
        setError,
        setErrorUpdate,
        setResultUpdate,
      }),
    [dispatch],
  );

  const invoices = useMemo(
    () => createInvoiceService({ dispatch, setProcessingInvoice, setErrorInvoice }),
    [dispatch],
  );

  const metricsService = useMemo(
    () => createLaborMetricsService({ dispatch, setProcessingMetrics, setErrorMetrics }),
    [dispatch],
  );

  return {
    // state
    laborGroups,
    labors,
    metrics,
    result,
    resultUpdate,
    resultInvoice,
    pageInfo,
    // processing
    processing,
    processingInvoice,
    processingMetrics,
    // errors
    error,
    errorUpdate,
    errorInvoice,
    errorMetrics,
    // queries
    getLaborGroups: queries.getLaborGroups,
    getLabors: queries.getLabors,
    getArchivedLabors: queries.getArchivedLabors,
    getWorkOrdersCount: queries.getWorkOrdersCount,
    // mutations
    saveLabors: mutations.saveLabors,
    updateLabor: mutations.updateLabor,
    deleteLabor: mutations.deleteLabor,
    archiveLabor: mutations.archiveLabor,
    restoreLabor: mutations.restoreLabor,
    hardDeleteLabor: mutations.hardDeleteLabor,
    // invoices
    createInvoice: invoices.createInvoice,
    updateInvoice: invoices.updateInvoice,
    // metrics
    getMetrics: metricsService.getMetrics,
  };
};

export default useLabors;
