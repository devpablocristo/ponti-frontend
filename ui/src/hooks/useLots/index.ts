import { useEffect, useMemo, useRef, useState } from "react";

import lotsReducer from "./lotsReducer";
import { createLotMutations } from "./mutations";
import { createLotQueries } from "./queries";
import type { LotsData } from "./types";

/**
 * Hook compositor para lots. 2 factory services:
 *   - queries.ts: getLots, getArchivedLots, getCrops, getLotsKpis (incluye
 *     KPIs porque comparten reducer state).
 *   - mutations.ts: archive/restore/hardDelete (lifecycle) + updateTons (con
 *     par processingTons/errorTons/resultTons propio).
 *
 * API público intacto post-refactor.
 */
const useLots = () => {
  const [{ lots, pageInfo, crops, result, kpis }, dispatch] = lotsReducer();
  const [processing, setProcessing] = useState(false);
  const [processingKpis, setProcessingKpis] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorKpis, setErrorKpis] = useState<string | null>(null);
  const [updateLotError, setUpdateLotError] = useState<string | null>(null);

  const [processingTons, setProcessingTons] = useState(false);
  const [errorTons, setErrorTons] = useState<string | null>(null);
  const [resultTons, setResultTons] = useState<string | null>(null);

  // Ref con la lista de lots actual. Permite que updateTons (closure estable
  // en la factory memoizada) lea el tons previo del lote para rollback en caso
  // de fallo del server, sin re-crear la factory en cada render.
  const lotsRef = useRef<LotsData[]>(lots);
  useEffect(() => {
    lotsRef.current = lots;
  }, [lots]);

  const queries = useMemo(
    () =>
      createLotQueries({
        dispatch,
        setProcessing,
        setError,
        setProcessingKpis,
        setErrorKpis,
      }),
    [dispatch]
  );

  const mutations = useMemo(
    () =>
      createLotMutations({
        dispatch,
        lotsRef,
        setProcessing,
        setError,
        setProcessingTons,
        setErrorTons,
        setResultTons,
        setUpdateLotError,
      }),
    [dispatch]
  );

  return {
    lots,
    pageInfo,
    crops,
    kpis,
    result,
    processing,
    processingKpis,
    processingTons,
    error,
    errorKpis,
    updateLotError,
    errorTons,
    resultTons,
    setResultTons,
    getLots: queries.getLots,
    getArchivedLots: queries.getArchivedLots,
    getCrops: queries.getCrops,
    getLotsKpis: queries.getLotsKpis,
    archiveLot: mutations.archiveLot,
    restoreLot: mutations.restoreLot,
    hardDeleteLot: mutations.hardDeleteLot,
    createLot: mutations.createLot,
    updateLot: mutations.updateLot,
    updateTons: mutations.updateTons,
  };
};

export default useLots;
