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
import useSupplyMovements from "./index";
import type { SupplyMovementRequest } from "./types";

const mockedClient = apiClient as unknown as {
  get: ReturnType<typeof vi.fn>;
  post: ReturnType<typeof vi.fn>;
  put: ReturnType<typeof vi.fn>;
  delete: ReturnType<typeof vi.fn>;
};

const sampleMovement = {
  entry_type: "Remito oficial",
  reference_number: "001",
  entry_date: "2026-01-01",
  origin_project_id: 30,
  destination_project_id: null,
  investor_id: 7,
  provider_id: 8,
  provider_name: "",
  supply_movements: [],
} as unknown as SupplyMovementRequest;

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSupplyMovements.saveSupplyMovement", () => {
  it("dispatcha el resultado y limpia el error si el BE confirma", async () => {
    const payload = { supply_movements: [{ id: 1, supply_id: 10, quantity: "5" }] };
    mockedClient.post.mockResolvedValueOnce({ success: true, data: payload });
    const { result } = renderHook(() => useSupplyMovements());

    await act(async () => {
      await result.current.saveSupplyMovement(30, sampleMovement);
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      "/supply_movements/30",
      sampleMovement,
    );
    expect(result.current.errorCreation).toBeNull();
  });

  it("setea errorCreation cuando el BE rechaza", async () => {
    mockedClient.post.mockRejectedValueOnce({
      response: { status: 400, data: { error: { details: "bad" } } },
    });
    const { result } = renderHook(() => useSupplyMovements());

    await act(async () => {
      await result.current.saveSupplyMovement(30, sampleMovement);
    });

    await waitFor(() => expect(result.current.errorCreation).toBeTruthy());
  });
});

describe("useSupplyMovements.archiveSupplyMovement", () => {
  it("setea deleteResult=true al archivar OK", async () => {
    mockedClient.post.mockResolvedValueOnce({ success: true });
    const { result } = renderHook(() => useSupplyMovements());

    await act(async () => {
      await result.current.archiveSupplyMovement(5, 30);
    });

    expect(mockedClient.post).toHaveBeenCalledWith(
      "/supply_movements/5/project/30/archive",
      {},
    );
    await waitFor(() => expect(result.current.deleteResult).toBe(true));
  });

  it("setea deleteError cuando archive falla", async () => {
    mockedClient.post.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useSupplyMovements());

    await act(async () => {
      await result.current.archiveSupplyMovement(5, 30);
    });

    await waitFor(() => expect(result.current.deleteError).toBeTruthy());
  });
});

describe("useSupplyMovements.getSupplyMovements", () => {
  it("dispatcha la lista al recibir success", async () => {
    mockedClient.get.mockResolvedValueOnce({
      success: true,
      data: {
        entries: [{ id: 1, entry_type: "Stock" }],
        summary: { total_kg: 0, total_lt: 0, total_usd: 0 },
        page_info: { page: 1, per_page: 10, total: 1, max_page: 1 },
      },
    });
    const { result } = renderHook(() => useSupplyMovements());

    await act(async () => {
      await result.current.getSupplyMovements("project_id=30");
    });

    expect(mockedClient.get).toHaveBeenCalledWith(
      "/supply_movements?project_id=30",
    );
    await waitFor(() =>
      expect(result.current.supplyMovements.length).toBeGreaterThan(0),
    );
  });
});
