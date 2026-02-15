import React, { useState } from "react";

import useReportingReducer from "./useReportingReducer";
import * as actions from "./actions";
import { FieldCropReportData, InvestorContributionReportData, SummaryResultsReportData } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

const useReporting = () => {
  const [{
    fieldCropReportingData,
    investorContributionReportingData,
    summaryResultsReportingData
  }, dispatch] = useReportingReducer();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getFieldCropReportingData = React.useCallback(async (queryString: string) => {
    setProcessing(true);
    setError(null);
    let queryParams = "";
    if (queryString !== "") {
      queryParams = `?${ queryString }`;
    }

    try {
      const response = await apiClient.get<SuccessResponse<FieldCropReportData>>(
        `/reports/field-crop` + queryParams
      );

      if (response.success) {
        dispatch({
          type: actions.SET_FIELD_CROP_REPORTING,
          payload: response.data,
        });
        return;
      }

      setError("Ocurrió un error en la búsqueda del reporte");
    } catch (error) {
      dispatch({
        type: actions.SET_FIELD_CROP_REPORTING,
        payload: null,
      });
      setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  const getInvestorContributionReportingData = React.useCallback(async (queryString: string) => {
    setProcessing(true);
    setError(null);
    let queryParams = "";
    if (queryString !== "") {
      queryParams = `?${ queryString }`;
    }

    try {
      const response = await apiClient.get<SuccessResponse<InvestorContributionReportData>>(
        `/reports/investor-contribution` + queryParams
      );

      if (response.success) {
        dispatch({
          type: actions.SET_INVESTOR_CONTRIBUTION_REPORTING,
          payload: response.data,
        });
        return;
      }

      setError("Ocurrió un error en la búsqueda del reporte");
    } catch (error) {
      dispatch({
        type: actions.SET_INVESTOR_CONTRIBUTION_REPORTING,
        payload: null,
      });
      setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  const getSummaryResultsReportingData = React.useCallback(async (queryString: string) => {
    setProcessing(true);
    setError(null);
    let queryParams = "";
    if (queryString !== "") {
      queryParams = `?${ queryString }`;
    }

    try {
      const response = await apiClient.get<SuccessResponse<SummaryResultsReportData>>(
        `/reports/summary-results` + queryParams
      );

      if (response.success) {
        dispatch({
          type: actions.SET_SUMMARY_RESULTS_REPORTING,
          payload: response.data,
        });
        return;
      }

      setError("Ocurrió un error en la búsqueda del reporte");
    } catch (error) {
      dispatch({
        type: actions.SET_SUMMARY_RESULTS_REPORTING,
        payload: null,
      });
      setError(extractErrorMessage(error, "Error en el servicio, inténtalo más tarde."));
    } finally {
      setProcessing(false);
    }
  }, [dispatch]);

  return {
    fieldCropReportingData,
    investorContributionReportingData,
    summaryResultsReportingData,
    processing,
    error,
    getFieldCropReportingData,
    getInvestorContributionReportingData,
    getSummaryResultsReportingData,
  };
};

export default useReporting;
