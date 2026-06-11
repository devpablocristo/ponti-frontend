import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";

import { getPontiAiConfig } from "@/api/aiClient";
import {
  AiFeaturesProvider,
  resetAiFeaturesCacheForTests,
  useAiFeature,
  useAiFeatures,
} from "./useAiFeatures";

vi.mock("@/api/aiClient", () => ({
  getPontiAiConfig: vi.fn(),
}));

const mockedGetConfig = vi.mocked(getPontiAiConfig);

const wrapper = ({ children }: { children: ReactNode }) => (
  <AiFeaturesProvider>{children}</AiFeaturesProvider>
);

describe("useAiFeatures", () => {
  beforeEach(() => {
    resetAiFeaturesCacheForTests();
    mockedGetConfig.mockReset();
  });

  it("expone los flags de la config y respeta defaultEnabled", async () => {
    mockedGetConfig.mockResolvedValue({
      features: ["approvals_inbox"],
      badge_poll_ms: 30000,
      product_surface: "ponti",
    });

    const { result } = renderHook(
      () => ({
        loaded: useAiFeatures().loaded,
        approvals: useAiFeature("approvals_inbox"),
        floating: useAiFeature("floating_chat"),
        routing: useAiFeature("routing_indicator", true),
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.approvals).toBe(true);
    expect(result.current.floating).toBe(false);
    // default ON aunque el flag no figure en la config.
    expect(result.current.routing).toBe(true);
  });

  it("hace un único fetch de config aunque haya varios consumidores", async () => {
    mockedGetConfig.mockResolvedValue({
      features: [],
      badge_poll_ms: 60000,
      product_surface: "ponti",
    });

    const first = renderHook(() => useAiFeatures(), { wrapper });
    const second = renderHook(() => useAiFeatures(), { wrapper });

    await waitFor(() => expect(first.result.current.loaded).toBe(true));
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(mockedGetConfig).toHaveBeenCalledTimes(1);
  });

  it.each([
    ["null", null],
    ["0", 0],
    ["NaN", Number.NaN],
    ["menor al piso de 5 s", 1000],
  ])("normaliza badge_poll_ms inválido (%s) al default de 60000", async (_label, value) => {
    mockedGetConfig.mockResolvedValue({
      features: [],
      badge_poll_ms: value as unknown as number,
      product_surface: "ponti",
    });

    const { result } = renderHook(() => useAiFeatures(), { wrapper });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.config.badge_poll_ms).toBe(60000);
  });

  it("respeta un badge_poll_ms válido de la config", async () => {
    mockedGetConfig.mockResolvedValue({
      features: [],
      badge_poll_ms: 30000,
      product_surface: "ponti",
    });

    const { result } = renderHook(() => useAiFeatures(), { wrapper });

    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.config.badge_poll_ms).toBe(30000);
  });

  it("usa defaults si el BFF no expone la config", async () => {
    mockedGetConfig.mockRejectedValue(new Error("404"));

    const { result } = renderHook(
      () => ({
        state: useAiFeatures(),
        approvals: useAiFeature("approvals_inbox"),
      }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.state.loaded).toBe(true));
    expect(result.current.state.config.badge_poll_ms).toBe(60000);
    expect(result.current.approvals).toBe(false);
  });
});
