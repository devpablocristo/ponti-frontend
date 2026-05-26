import { useMemo, useState } from "react";

import { createSupplyMovementMutations } from "./mutations";
import { createSupplyMovementQueries } from "./queries";
import useOrdersReducer from "./supplyMovementsReducer";
import { BatchErrorPayload } from "./types";

/**
 * Hook compositor para supply movements. Mantiene el reducer state + setters
 * y delega async functions a 2 services factory:
 *   - queries.ts: getSupplyMovements (lista + summary), getArchivedSupplyMovements, getSupplyMovement
 *   - mutations.ts: save/import/update (batch); destructivas (delete/archive/restore/hardDelete)
 *
 * NO hay endpoint metrics separado: el summary viene en el response de la
 * lista (queries.ts maneja el dispatch combinado).
 *
 * API público (return shape) intacto post-refactor.
 */
const useSupplyMovements = () => {
  const [
    { supplyMovements, summary, pageInfo, resultCreation, selectedSupplyMovement },
    dispatch,
  ] = useOrdersReducer();

  const [processing, setProcessing] = useState(false);
  const [processingCreation, setProcessingCreation] = useState(false);
  const [processingDetail, setProcessingDetail] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [errorCreation, setErrorCreation] = useState<string | null>(null);
  const [errorCreationPayload, setErrorCreationPayload] =
    useState<BatchErrorPayload | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteResult, setDeleteResult] = useState(false);

  const queries = useMemo(
    () =>
      createSupplyMovementQueries({
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
      createSupplyMovementMutations({
        dispatch,
        setProcessingCreation,
        setErrorCreation,
        setErrorCreationPayload,
        setProcessingDelete,
        setDeleteError,
        setDeleteResult,
      }),
    [dispatch],
  );

  return {
    // state
    supplyMovements,
    summary,
    pageInfo,
    selectedSupplyMovement,
    resultCreation,
    // processing flags
    processing,
    processingCreation,
    processingDetail,
    processingDelete,
    // error flags
    error,
    errorCreation,
    errorCreationPayload,
    deleteError,
    deleteResult,
    // queries
    getSupplyMovements: queries.getSupplyMovements,
    getArchivedSupplyMovements: queries.getArchivedSupplyMovements,
    getSupplyMovement: queries.getSupplyMovement,
    // mutations
    saveSupplyMovement: mutations.saveSupplyMovement,
    saveImportedSupplyMovement: mutations.saveImportedSupplyMovement,
    updateSupplyMovement: mutations.updateSupplyMovement,
    deleteSupplyMovement: mutations.deleteSupplyMovement,
    archiveSupplyMovement: mutations.archiveSupplyMovement,
    restoreSupplyMovement: mutations.restoreSupplyMovement,
    hardDeleteSupplyMovement: mutations.hardDeleteSupplyMovement,
  };
};

export default useSupplyMovements;
