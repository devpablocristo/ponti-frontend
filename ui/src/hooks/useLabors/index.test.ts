import { afterEach, describe, expect, it, vi } from "vitest";
import { act, renderHook, waitFor } from "@testing-library/react";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

import { apiClient } from "@/api/client";
import useLabors from "./index";

const mockedClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const sampleLabor = {
  name: "Pulverización",
  category_id: 10,
  price: "20",
  contractor_name: "VEDOYA",
  is_partial_price: false,
};

afterEach(() => {
  vi.clearAllMocks();
});

describe("useLabors.saveLabors", () => {
  it("devuelve true y dispatcha el resultado cuando todas las labores se guardan", async () => {
    mockedClient.post.mockResolvedValueOnce({
      success: true,
      data: {
        labors_ids: [
          { labor_id: 1, labor_name: "Pulverización", is_saved: true },
        ],
      },
    });
    const { result } = renderHook(() => useLabors());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.saveLabors([sampleLabor], 30);
    });

    expect(mockedClient.post).toHaveBeenCalledWith("/projects/30/labors", [
      sampleLabor,
    ]);
    expect(returned).toBe(true);
    expect(result.current.result).toBe("Se crearon las labores.");
  });

  it("devuelve false y setea error cuando alguna labor falla", async () => {
    mockedClient.post.mockResolvedValueOnce({
      success: true,
      data: {
        labors_ids: [
          {
            labor_id: 0,
            labor_name: "Pulverización",
            is_saved: false,
            error_detail: "labor already exists",
          },
        ],
      },
    });
    const { result } = renderHook(() => useLabors());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.saveLabors([sampleLabor], 30);
    });

    expect(returned).toBe(false);
    await waitFor(() => expect(result.current.error).toBeTruthy());
  });

  it("traduce el mensaje real del BE 'labor already exists' a copy en español", async () => {
    // El BE devuelve "labor already exists" para uniqueness; translateBackendError
    // lo mapea vía el pattern "X already exists" + el diccionario de entidades.
    mockedClient.post.mockRejectedValueOnce({
      response: {
        status: 409,
        data: { error: { details: "labor already exists" } },
      },
    });
    const { result } = renderHook(() => useLabors());

    let returned: boolean | undefined;
    await act(async () => {
      returned = await result.current.saveLabors([sampleLabor], 30);
    });

    expect(returned).toBe(false);
    await waitFor(() =>
      expect(result.current.error).toBe("La labor ya existe."),
    );
  });
});

describe("useLabors.archiveLabor", () => {
  it("hace POST al endpoint de archive", async () => {
    mockedClient.post.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useLabors());

    await act(async () => {
      await result.current.archiveLabor(99);
    });

    expect(mockedClient.post).toHaveBeenCalledWith("/labors/99/archive", {});
  });

  it("propaga el error si apiClient rechaza", async () => {
    mockedClient.post.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useLabors());

    await expect(
      act(async () => {
        await result.current.archiveLabor(99);
      }),
    ).rejects.toThrow();
  });
});

describe("useLabors.createInvoice", () => {
  it("dispatcha mensaje de éxito tras crear la factura", async () => {
    mockedClient.post.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useLabors());

    await act(async () => {
      await result.current.createInvoice({
        workorder_id: 1,
        investor_id: 2,
        invoice_id: 0,
        invoice_number: "001",
        invoice_company: "EmpresaX",
        invoice_date: "2026-01-01",
        invoice_status: "Pendiente",
      });
    });

    expect(mockedClient.post).toHaveBeenCalled();
    expect(result.current.resultInvoice).toBe("Se creó la factura.");
  });
});
