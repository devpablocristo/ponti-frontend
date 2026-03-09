import React, { useState } from "react";

import useLaborReducer from "./laborsReducer";
import * as actions from "./actions";
import { InvoiceData, Metrics, LaborInfo, LaborToSave } from "./types";
import { SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { extractErrorMessage, extractErrorStatus } from "@/api/hooks/useApiCall";

const useLabors = () => {
  const [
    { laborGroups, labors, result, pageInfo, resultInvoice, metrics },
    dispatch,
  ] = useLaborReducer();
  const [processing, setProcessing] = useState(false);
  const [processingInvoice, setProcessingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorUpdate, setErrorUpdate] = useState<string | null>(null);
  const [resultUpdate, setResultUpdate] = useState<string | null>(null);
  const [errorInvoice, setErrorInvoice] = useState<string | null>(null);

  const [processingMetrics, setProcessingMetrics] = useState(false);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);

  const getLaborGroups = React.useCallback(
    async (projectId: number, query: string) => {
      setProcessing(true);
      setError(null);

      dispatch({
        type: actions.SET_LABOR_GROUPS,
        payload: [],
      });

      try {
        const response = await apiClient.get<SuccessResponse<any>>(
          `/labors/${projectId}${query}`
        );

        if (response.success) {
          dispatch({
            type: actions.SET_LABOR_GROUPS,
            payload: response.data.data,
          });

          dispatch({
            type: actions.SET_PAGE_INFO,
            payload: {
              page: response.data.page_info.page,
              per_page: response.data.page_info.per_page,
              total: response.data.page_info.total,
              max_page: response.data.page_info.max_page,
            },
          });
          return;
        }

        setError("Ocurrio un error en la busqueda de labores");
      } catch (error) {
        setError(
          extractErrorMessage(error, "Error desconocido en la busqueda de labores.")
        );
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const getMetrics = React.useCallback(
    async (projectId: number, queryString: string) => {
      setProcessingMetrics(true);
      setErrorMetrics(null);

      try {
        const response = await apiClient.get<SuccessResponse<Metrics>>(
          `/labors/metrics/${projectId}` + queryString
        );

        if (response.success) {
          dispatch({
            type: actions.SET_METRICS,
            payload: response.data,
          });
          return;
        }

        setErrorMetrics("Ocurrio un error en la busqueda de kpis");
      } catch (error) {
        setErrorMetrics(
          extractErrorMessage(error, "Error desconocido en la busqueda de metricas.")
        );
      } finally {
        setProcessingMetrics(false);
      }
    },
    [dispatch]
  );

  const createInvoice = React.useCallback(async (invoice: InvoiceData) => {
    setProcessingInvoice(true);
    setErrorInvoice(null);
    dispatch({
      type: actions.SET_RESULT_INVOICE,
      payload: "",
    });

    try {
      const response = await apiClient.post<SuccessResponse<any>>(
        `/labors/invoice`,
        invoice
      );

      if (response.success) {
        dispatch({
          type: actions.SET_RESULT_INVOICE,
          payload: "Se ha creado la factura con éxito!",
        });
        return;
      }

      setErrorInvoice("Ocurrio un error en la creación de la factura");
    } catch (error) {
      setErrorInvoice(
        extractErrorMessage(error, "Error desconocido en la creación de la factura.")
      );
    } finally {
      setProcessingInvoice(false);
    }
  }, []);

  const updateInvoice = React.useCallback(
    async (id: number, invoice: InvoiceData) => {
      setProcessingInvoice(true);
      setErrorInvoice(null);
      dispatch({
        type: actions.SET_RESULT_INVOICE,
        payload: "",
      });

      try {
        const response = await apiClient.put<SuccessResponse<any>>(
          `/labors/invoice/${id}`,
          invoice
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_INVOICE,
            payload: "Se ha actualizado la factura con éxito!",
          });
          return;
        }

        setErrorInvoice("Ocurrio un error en la actualización de la factura");
      } catch (error) {
        setErrorInvoice(
          extractErrorMessage(
            error,
            "Error desconocido en la actualización de la factura."
          )
        );
      } finally {
        setProcessingInvoice(false);
      }
    },
    []
  );

  const saveLabors = React.useCallback(
    async (laborsToSave: LaborToSave[], projectId: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.post<SuccessResponse<any>>(
          `/projects/${projectId}/labors`,
          laborsToSave
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se han creado las labores con éxito!",
          });
          return true;
        }

        setError("Ocurrio un error en la creación de los labores");
        return false;
      } catch (error) {
        if (extractErrorStatus(error) === 409) {
          setError("Ya existe una labor con el mismo nombre.");
          return false;
        }

        setError(
          extractErrorMessage(
            error,
            "Error desconocido en la creación de las labores."
          )
        );
        return false;
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  const getLabors = React.useCallback(async (projectId: number) => {
    setProcessing(true);
    setError(null);
    dispatch({
      type: actions.SET_RESULT,
      payload: "",
    });

    try {
      const response = await apiClient.get<SuccessResponse<any>>(
        `/projects/${projectId}/labors`
      );

      if (response.success) {
        dispatch({
          type: actions.SET_LABORS,
          payload: response.data.data,
        });
        return;
      }

      setError("Ocurrio un error en la busqueda de labores");
    } catch (error) {
      setError(
        extractErrorMessage(error, "Error desconocido en la busqueda de labores.")
      );
    } finally {
      setProcessing(false);
    }
  }, []);

  const deleteLabor = React.useCallback(async (id: number) => {
    setProcessing(true);
    setError(null);
    dispatch({
      type: actions.SET_RESULT,
      payload: "",
    });

    try {
      const response = await apiClient.delete<SuccessResponse<any>>(
        `/labors/${id}`
      );

      if (response.success) {
        dispatch({
          type: actions.SET_RESULT,
          payload: "Se ha eliminado el labor con éxito!",
        });
        return;
      }

      setError("Ocurrio un error en la eliminación del labor");
    } catch (error) {
      if (extractErrorStatus(error) === 409) {
        setError("La labor esta siendo usada en una orden de trabajo.");
        return;
      }

      setError(
        extractErrorMessage(error, "Error desconocido en la eliminación de la labor.")
      );
    } finally {
      setProcessing(false);
    }
  }, []);

  const getWorkOrdersCount = React.useCallback(
    async (projectId: number, laborId: number): Promise<number> => {
      try {
        const response = await apiClient.get<SuccessResponse<any>>(
          `/labors/workorders-count/${projectId}/${laborId}`
        );
        if (response.success) {
          return response.data?.count ?? 0;
        }
        return 0;
      } catch {
        return 0;
      }
    },
    []
  );

  const updateLabor = React.useCallback(
    async (projectId: number, labor: LaborInfo) => {
      setProcessing(true);
      setErrorUpdate(null);
      setResultUpdate(null);

      try {
        const response = await apiClient.put<SuccessResponse<any>>(
          `/labors/projects/${projectId}/${labor.id}`,
          labor
        );

        if (response.success) {
          setResultUpdate("Se editado el labor con éxito!");
          return;
        }

        setErrorUpdate("Ocurrio un error en la edicion del labor");
      } catch (error) {
        if (extractErrorStatus(error) === 404) {
          setErrorUpdate("La labor no existe.");
          return;
        }

        setErrorUpdate(
          extractErrorMessage(error, "Error desconocido en la edición de la labor.")
        );
      } finally {
        setProcessing(false);
      }
    },
    []
  );

  return {
    laborGroups,
    metrics,
    getLaborGroups,
    getMetrics,
    getLabors,
    deleteLabor,
    updateLabor,
    getWorkOrdersCount,
    saveLabors,
    updateInvoice,
    createInvoice,
    result,
    resultUpdate,
    resultInvoice,
    labors,
    processing,
    error,
    errorUpdate,
    errorInvoice,
    processingInvoice,
    pageInfo,
    processingMetrics,
    errorMetrics,
  };
};

export default useLabors;
