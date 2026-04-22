import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import useStock from ".";
import { apiClient } from "@/api/client";

vi.mock("@/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

describe("useStock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("consulta el summary continuo con cutoff_date y actualiza el estado", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: {
        items: [
          {
            supply_id: 9,
            supply_name: "Urea",
            out_stock: 30,
            last_count_at: "2026-04-21T12:00:00Z",
          },
        ],
        total_kilograms: 103,
        total_liters: 0,
        net_total_usd: 264,
      },
    });

    const { result } = renderHook(() => useStock());

    await act(async () => {
      await result.current.getStock(7, "2026-04-21");
    });

    expect(apiClient.get).toHaveBeenCalledWith("/stock/7?cutoff_date=2026-04-21");
    await waitFor(() => {
      expect(result.current.stock).toHaveLength(1);
      expect(result.current.summary).toEqual({
        total_kg: 103,
        total_lt: 0,
        total_usd: 264,
      });
    });
  });

  it("registra el conteo físico sobre supply_id", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({
      success: true,
      data: {
        id: 55,
        message: "stock count created successfully",
      },
    });

    const { result } = renderHook(() => useStock());

    await act(async () => {
      await result.current.updateStock(7, 9, 82);
    });

    expect(apiClient.post).toHaveBeenCalledTimes(1);
    expect(vi.mocked(apiClient.post).mock.calls[0][0]).toBe("/stock/7/supplies/9/counts");
    expect(vi.mocked(apiClient.post).mock.calls[0][1]).toMatchObject({
      counted_units: 82,
    });
    expect(result.current.resultStock).toBe("Se registró el conteo físico con éxito");
    expect(result.current.errorStock).toBeNull();
  });
});
