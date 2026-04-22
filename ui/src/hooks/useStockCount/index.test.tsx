import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useStockCount from ".";
import { apiClient } from "@/api/client";

vi.mock("@/api/client", () => ({
  apiClient: {
    post: vi.fn(),
  },
}));

describe("useStockCount", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("crea múltiples conteos físicos y conserva errores por ítem", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({
        success: true,
        data: {
          id: 1,
          message: "ok",
        },
      })
      .mockRejectedValueOnce({
        response: {
          data: {
            error: {
              details: "Conteo inválido",
            },
          },
        },
      });

    const { result } = renderHook(() => useStockCount());

    await act(async () => {
      await result.current.createStockCounts(7, [
        {
          supply_id: 9,
          counted_units: 80,
          counted_at: new Date("2026-04-21T12:00:00Z"),
        },
        {
          supply_id: 10,
          counted_units: 20,
          counted_at: new Date("2026-04-21T12:00:00Z"),
          note: "revisión",
        },
      ]);
    });

    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      "/stock/7/supplies/9/counts",
      {
        counted_units: 80,
        counted_at: "2026-04-21T12:00:00.000Z",
        note: undefined,
      },
    );
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      "/stock/7/supplies/10/counts",
      {
        counted_units: 20,
        counted_at: "2026-04-21T12:00:00.000Z",
        note: "revisión",
      },
    );

    await waitFor(() => {
      expect(result.current.resultCreation).toEqual([
        {
          supply_id: 9,
          is_saved: true,
          error_detail: "",
        },
        {
          supply_id: 10,
          is_saved: false,
          error_detail: "Conteo inválido",
        },
      ]);
    });
    expect(result.current.errorCreation).toBeNull();
  });
});
