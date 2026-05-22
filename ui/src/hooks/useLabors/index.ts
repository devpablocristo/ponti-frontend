import React, { useState } from "react";

import useLaborReducer from "./laborsReducer";
import * as actions from "./actions";
import {
  InvoiceData,
  Metrics,
  LaborGroupData,
  LaborInfo,
  LaborToSave,
} from "./types";
import { PaginatedResponse, SuccessResponse } from "@/api/types";
import { apiClient } from "@/api/client";
import { formatError } from "@/lib/format";
import { withQuery } from "@/lib/workspaceQuery";

type LaborGroupsResponse = SuccessResponse<PaginatedResponse<LaborGroupData>>;
type LaborsResponse = SuccessResponse<LaborInfo[]>;
type InvoiceMutationResponse = SuccessResponse<unknown>;
type CreatedLaborResult = {
  labor_name: string;
  labor_id: number;
  is_saved: boolean;
  error_detail: string;
};

type LaborMutationResponse = SuccessResponse<{
  labors_ids?: CreatedLaborResult[];
  message?: string;
}>;

type WorkOrdersCountResponse = SuccessResponse<{ count: number }>;

const extractLaborsArray = (payload: unknown): LaborInfo[] => {
  if (Array.isArray(payload)) {
    return payload as LaborInfo[];
  }

  if (payload && typeof payload === "object") {
    const directData = (payload as { data?: unknown }).data;
    if (Array.isArray(directData)) {
      return directData as LaborInfo[];
    }

    if (directData && typeof directData === "object") {
      const nestedData = (directData as { data?: unknown }).data;
      if (Array.isArray(nestedData)) {
        return nestedData as LaborInfo[];
      }
    }
  }

  return [];
};

// El BE puede devolver un detalle por labor con un prefijo machine-readable
// como `CONFLICT: labor already exists in this project` (ver
// `internal/labor/usecases.go`). Lo mapeamos al copy en español acá porque
// el detail viene como parte de un payload de éxito parcial, no como axios
// error — formatError no aplica.
const translateLaborDetail = (message: string): string => {
  const normalized = message.trim();
  if (normalized === "CONFLICT: labor already exists in this project") {
    return "La labor ya existe en este proyecto.";
  }
  return message;
};

const useLabors = () => {
  const [{ laborGroups, labors, result, pageInfo, resultInvoice, metrics }, dispatch] =
    useLaborReducer();
  const [processing, setProcessing] = useState(false);
  const [processingInvoice, setProcessingInvoice] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorUpdate, setErrorUpdate] = useState<string | null>(null);
  const [resultUpdate, setResultUpdate] = useState<string | null>(null);
  const [errorInvoice, setErrorInvoice] = useState<string | null>(null);

  const [processingMetrics, setProcessingMetrics] = useState(false);
  const [errorMetrics, setErrorMetrics] = useState<string | null>(null);

  const getLaborGroups = React.useCallback(
    async (query: string) => {
      setProcessing(true);
      setError(null);

      dispatch({
        type: actions.SET_LABOR_GROUPS,
        payload: [],
      });

      try {
        const response = await apiClient.get<LaborGroupsResponse>(withQuery("/labors/group", query));

        if (response.success) {
          dispatch({
            type: actions.SET_LABOR_GROUPS,
            payload: response.data.data ?? [],
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

        setError("No se pudieron cargar las labores.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron cargar las labores." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const getMetrics = React.useCallback(
    async (queryString: string) => {
      setProcessingMetrics(true);
      setErrorMetrics(null);

      try {
        const response = await apiClient.get<SuccessResponse<Metrics>>(
          withQuery("/labors/metrics", queryString)
        );

        if (response.success) {
          dispatch({
            type: actions.SET_METRICS,
            payload: response.data,
          });
          return;
        }

        setErrorMetrics("No se pudieron cargar los indicadores.");
      } catch (error) {
        setErrorMetrics(formatError(error, { fallback: "No se pudieron cargar los indicadores." }));
      } finally {
        setProcessingMetrics(false);
      }
    },
    [dispatch]
  );

  const createInvoice = React.useCallback(
    async (invoice: InvoiceData) => {
      setProcessingInvoice(true);
      setErrorInvoice(null);
      dispatch({
        type: actions.SET_RESULT_INVOICE,
        payload: "",
      });

      try {
        const response = await apiClient.post<InvoiceMutationResponse>(`/labors/invoice`, invoice);

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_INVOICE,
            payload: "Se creó la factura.",
          });
          return;
        }

        setErrorInvoice("No se pudo crear la factura.");
      } catch (error) {
        setErrorInvoice(formatError(error, { fallback: "No se pudo crear la factura." }));
      } finally {
        setProcessingInvoice(false);
      }
    },
    [dispatch]
  );

  const updateInvoice = React.useCallback(
    async (id: number, invoice: InvoiceData) => {
      setProcessingInvoice(true);
      setErrorInvoice(null);
      dispatch({
        type: actions.SET_RESULT_INVOICE,
        payload: "",
      });

      try {
        const response = await apiClient.put<InvoiceMutationResponse>(
          `/labors/invoice/${id}`,
          invoice
        );

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT_INVOICE,
            payload: "Se actualizó la factura.",
          });
          return;
        }

        setErrorInvoice("No se pudo actualizar la factura.");
      } catch (error) {
        setErrorInvoice(formatError(error, { fallback: "No se pudo actualizar la factura." }));
      } finally {
        setProcessingInvoice(false);
      }
    },
    [dispatch]
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
        const response = await apiClient.post<LaborMutationResponse>(
          `/projects/${projectId}/labors`,
          laborsToSave
        );

        const createdLabors = response.data?.labors_ids ?? [];
        const failedLabors = createdLabors.filter(
          (labor) => !labor.is_saved || !!labor.error_detail
        );

        if (failedLabors.length > 0) {
          const message = failedLabors
            .map((labor) => translateLaborDetail(labor.error_detail?.trim() || ""))
            .filter(Boolean)
            .join("\n");

          setError(message || "No se pudieron crear todas las labores.");
          return false;
        }

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se crearon las labores.",
          });
          return true;
        }

        setError("No se pudieron crear las labores.");
        return false;
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron crear las labores." }));
        return false;
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );


  const getLabors = React.useCallback(
    async (projectId: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.get<LaborsResponse>(`/projects/${projectId}/labors`);

        if (response.success) {
          const normalizedLabors = extractLaborsArray(response.data);
          dispatch({
            type: actions.SET_LABORS,
            payload: normalizedLabors,
          });
          return;
        }

        setError("No se pudieron cargar las labores del proyecto.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudieron cargar las labores del proyecto." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const deleteLabor = React.useCallback(
    async (id: number) => {
      setProcessing(true);
      setError(null);
      dispatch({
        type: actions.SET_RESULT,
        payload: "",
      });

      try {
        const response = await apiClient.delete<LaborMutationResponse>(`/labors/${id}/hard`);

        if (response.success) {
          dispatch({
            type: actions.SET_RESULT,
            payload: "Se eliminó la labor.",
          });
          return;
        }

        setError("No se pudo eliminar la labor.");
      } catch (error) {
        setError(formatError(error, { fallback: "No se pudo eliminar la labor." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch]
  );

  const archiveLabor = React.useCallback(async (id: number): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.post<LaborMutationResponse>(
        `/labors/${id}/archive`,
        {},
      );
      if (!response.success) {
        const message = "No se pudo archivar la labor.";
        setError(message);
        throw new Error(message);
      }
    } catch (err) {
      const message = formatError(err, { fallback: "No se pudo archivar la labor." });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const restoreLabor = React.useCallback(async (id: number): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.post<LaborMutationResponse>(
        `/labors/${id}/restore`,
        {},
      );
      if (!response.success) {
        const message = "No se pudo restaurar la labor.";
        setError(message);
        throw new Error(message);
      }
    } catch (err) {
      const message = formatError(err, { fallback: "No se pudo restaurar la labor." });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const hardDeleteLabor = React.useCallback(async (id: number): Promise<void> => {
    setProcessing(true);
    setError(null);
    try {
      const response = await apiClient.delete<LaborMutationResponse>(
        `/labors/${id}/hard`,
      );
      if (!response.success) {
        const message = "No se pudo eliminar la labor.";
        setError(message);
        throw new Error(message);
      }
    } catch (err) {
      const message = formatError(err, { fallback: "No se pudo eliminar la labor." });
      setError(message);
      throw new Error(message);
    } finally {
      setProcessing(false);
    }
  }, []);

  const getArchivedLabors = React.useCallback(
    async (projectId?: number | null) => {
      setProcessing(true);
      setError(null);
      try {
        const path =
          projectId && projectId > 0
            ? `/labors/projects/${projectId}/archived`
            : `/labors/archived`;
        const response = await apiClient.get<LaborsResponse>(path);
        if (response.success) {
          const normalized = extractLaborsArray(response.data);
          dispatch({ type: actions.SET_LABORS, payload: normalized });
          return;
        }
        setError("No se pudieron cargar las labores archivadas.");
      } catch (err) {
        setError(formatError(err, { fallback: "No se pudieron cargar las labores archivadas." }));
      } finally {
        setProcessing(false);
      }
    },
    [dispatch],
  );

  const getWorkOrdersCount = React.useCallback(
    async (projectId: number, laborId: number): Promise<number> => {
      try {
        const response = await apiClient.get<WorkOrdersCountResponse>(
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

  const updateLabor = React.useCallback(async (projectId: number, labor: LaborInfo) => {
    setProcessing(true);
    setErrorUpdate(null);
    setResultUpdate(null);

    try {
      const response = await apiClient.put<LaborMutationResponse>(
        `/labors/projects/${projectId}/${labor.id}`,
        labor
      );

      if (response.success) {
        setResultUpdate("Se actualizó la labor.");
        return;
      }

      setErrorUpdate("No se pudo actualizar la labor.");
    } catch (error) {
      setErrorUpdate(formatError(error, { fallback: "No se pudo actualizar la labor." }));
    } finally {
      setProcessing(false);
    }
  }, []);

  return {
    laborGroups,
    metrics,
    getLaborGroups,
    getMetrics,
    getLabors,
    getArchivedLabors,
    deleteLabor,
    archiveLabor,
    restoreLabor,
    hardDeleteLabor,
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
