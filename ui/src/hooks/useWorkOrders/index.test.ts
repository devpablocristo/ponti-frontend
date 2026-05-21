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
import useOrders from "./index";
import type { Workorder } from "./types";

const mockedClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const sampleOrder = {
  number: "1.1",
  project_id: 1,
  field_id: 2,
  lot_id: 3,
  crop_id: 4,
  labor_id: 5,
  is_digital: false,
  contractor: "Juan",
  observations: "",
  date: "2026-01-01",
  sequence_day: 0,
  investor_id: 7,
  effective_area: 10,
  items: [],
  investor_splits: [],
} as unknown as Workorder;

afterEach(() => {
  vi.clearAllMocks();
});

describe("useOrders.saveOrder", () => {
  it("dispatcha el resultado de éxito cuando el BE confirma", async () => {
    mockedClient.post.mockResolvedValueOnce({ success: true, data: {} });
    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.saveOrder(sampleOrder);
    });

    expect(mockedClient.post).toHaveBeenCalledWith("/work-orders", sampleOrder);
    expect(result.current.resultCreation).toBe("Se ha creado la orden con éxito!");
    expect(result.current.errorCreation).toBeNull();
  });

  it("setea error 409 con mensaje específico al intentar crear duplicado", async () => {
    mockedClient.post.mockRejectedValueOnce({
      response: { status: 409, data: { error: { details: "duplicate" } } },
    });
    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.saveOrder(sampleOrder);
    });

    await waitFor(() =>
      expect(result.current.errorCreation).toBe(
        "Ya existe una orden con el mismo número.",
      ),
    );
  });
});

describe("useOrders.updateOrder", () => {
  it("dispatcha el resultado de update cuando el BE confirma", async () => {
    mockedClient.put.mockResolvedValueOnce({ success: true, data: {} });
    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.updateOrder(42, sampleOrder);
    });

    expect(mockedClient.put).toHaveBeenCalledWith("/work-orders/42", sampleOrder);
    expect(result.current.resultCreation).toBe(
      "Se ha actualizado la orden con éxito!",
    );
  });
});

describe("useOrders.archiveOrder", () => {
  it("hace POST al endpoint de archive", async () => {
    mockedClient.post.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useOrders());

    await act(async () => {
      await result.current.archiveOrder(99);
    });

    expect(mockedClient.post).toHaveBeenCalledWith("/work-orders/99/archive", {});
  });

  it("propaga el error si el BE falla", async () => {
    mockedClient.post.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useOrders());

    await expect(
      act(async () => {
        await result.current.archiveOrder(99);
      }),
    ).rejects.toBeDefined();
  });
});

describe("useOrders.publishDraftOrder", () => {
  it("dispatcha mensaje de éxito y devuelve la data del BE", async () => {
    const payload = {
      draft_id: 5,
      published_work_order_id: 50,
      status: "published" as const,
    };
    mockedClient.post.mockResolvedValueOnce({ success: true, data: payload });
    const { result } = renderHook(() => useOrders());

    let returned;
    await act(async () => {
      returned = await result.current.publishDraftOrder(5);
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      "/work-orders/drafts/5/publish",
    );
    expect(returned).toEqual(payload);
    expect(result.current.resultCreation).toBe(
      "Se ha publicado el borrador con éxito!",
    );
  });

  it("tira error 404 si el draft no existe", async () => {
    mockedClient.post.mockRejectedValueOnce({
      response: { status: 404, data: { error: { details: "not found" } } },
    });
    const { result } = renderHook(() => useOrders());

    await expect(
      act(async () => {
        await result.current.publishDraftOrder(123);
      }),
    ).rejects.toThrow("No se encontro el borrador digital.");
  });
});
