import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { formatError } from "@/lib/format";

import * as actions from "./actions";
import type { Action } from "./laborsReducer";
import { InvoiceData } from "./types";

type InvoiceMutationResponse = SuccessResponse<unknown>;

type InvoiceDeps = {
  dispatch: React.Dispatch<Action>;
  setProcessingInvoice: (v: boolean) => void;
  setErrorInvoice: (v: string | null) => void;
};

/**
 * Service aislado para create/update de invoices asociadas a labores. Tiene
 * su propio par processingInvoice/errorInvoice + result dispatched al
 * reducer (resultInvoice).
 */
export function createInvoiceService(deps: InvoiceDeps) {
  const { dispatch, setProcessingInvoice, setErrorInvoice } = deps;

  const setResult = (msg: string) => {
    dispatch({ type: actions.SET_RESULT_INVOICE, payload: msg });
  };
  const resetResult = () => setResult("");

  const createInvoice = async (invoice: InvoiceData) => {
    setProcessingInvoice(true);
    setErrorInvoice(null);
    resetResult();
    try {
      const response = await apiClient.post<InvoiceMutationResponse>(`/labors/invoice`, invoice);
      if (response.success) {
        setResult("Se creó la factura.");
        return;
      }
      setErrorInvoice("No se pudo crear la factura.");
    } catch (error) {
      setErrorInvoice(formatError(error, { fallback: "No se pudo crear la factura." }));
    } finally {
      setProcessingInvoice(false);
    }
  };

  const updateInvoice = async (id: number, invoice: InvoiceData) => {
    setProcessingInvoice(true);
    setErrorInvoice(null);
    resetResult();
    try {
      const response = await apiClient.put<InvoiceMutationResponse>(
        `/labors/invoice/${id}`,
        invoice,
      );
      if (response.success) {
        setResult("Se actualizó la factura.");
        return;
      }
      setErrorInvoice("No se pudo actualizar la factura.");
    } catch (error) {
      setErrorInvoice(formatError(error, { fallback: "No se pudo actualizar la factura." }));
    } finally {
      setProcessingInvoice(false);
    }
  };

  return { createInvoice, updateInvoice };
}
