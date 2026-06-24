import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { usePollingQuery } from "./usePollingQuery";

const setDocumentHidden = (hidden: boolean) => {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    get: () => hidden,
  });
};

describe("usePollingQuery", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    setDocumentHidden(false);
  });

  afterEach(() => {
    vi.useRealTimers();
    setDocumentHidden(false);
  });

  it("consulta al montar y repite según intervalMs", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    const { result } = renderHook(() => usePollingQuery(fn, { intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe("ok");
    expect(result.current.error).toBe("");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("no consulta cuando enabled=false", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    renderHook(() => usePollingQuery(fn, { intervalMs: 1000, enabled: false }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it("duplica el intervalo ante errores hasta 5 minutos (backoff)", async () => {
    const fn = vi.fn().mockRejectedValue(new Error("boom"));
    const { result } = renderHook(() => usePollingQuery(fn, { intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe("boom");

    // El segundo intento recién a los 2000 ms (1000 * 2).
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fn).toHaveBeenCalledTimes(1);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fn).toHaveBeenCalledTimes(2);

    // El tercero a los 4000 ms.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(4000);
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("refresh() consulta de inmediato y resetea el backoff", async () => {
    const fn = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValue("ok");
    const { result } = renderHook(() => usePollingQuery(fn, { intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refresh();
    });
    expect(fn).toHaveBeenCalledTimes(2);
    expect(result.current.data).toBe("ok");

    // Tras el refresh exitoso el intervalo vuelve al base.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fn).toHaveBeenCalledTimes(3);
  });

  it("al cambiar la identidad de fn consulta de inmediato y resetea el backoff", async () => {
    const fnA = vi.fn().mockRejectedValue(new Error("boom"));
    const fnB = vi.fn().mockResolvedValue("b");
    const { result, rerender } = renderHook(
      ({ fn }: { fn: () => Promise<string> }) => usePollingQuery(fn, { intervalMs: 1000 }),
      { initialProps: { fn: fnA as () => Promise<string> } }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fnA).toHaveBeenCalledTimes(1);
    expect(result.current.error).toBe("boom");
    // El error dejó el backoff en 2000 ms; el cambio de fn no debe esperarlo.

    rerender({ fn: fnB });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe("b");
    expect(result.current.error).toBe("");

    // Backoff reseteado: el próximo poll vuelve al intervalo base.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1000);
    });
    expect(fnB).toHaveBeenCalledTimes(2);
    expect(fnA).toHaveBeenCalledTimes(1);
  });

  it("mantiene el último data visible mientras refetchea tras el cambio de fn", async () => {
    const fnA = vi.fn().mockResolvedValue("a");
    let resolveB: (value: string) => void = () => {};
    const fnB = vi.fn(() => new Promise<string>((resolve) => (resolveB = resolve)));
    const { result, rerender } = renderHook(
      ({ fn }: { fn: () => Promise<string> }) => usePollingQuery(fn, { intervalMs: 1000 }),
      { initialProps: { fn: fnA as () => Promise<string> } }
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toBe("a");

    rerender({ fn: fnB });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    // Refetch inmediato en curso: sin parpadeo, el data viejo sigue visible.
    expect(fnB).toHaveBeenCalledTimes(1);
    expect(result.current.data).toBe("a");
    expect(result.current.loading).toBe(true);

    await act(async () => {
      resolveB("b");
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(result.current.data).toBe("b");
  });

  it("aplica un piso de 1000 ms ante un intervalMs inválido para no hot-loopear", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    renderHook(() => usePollingQuery(fn, { intervalMs: 0 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    // Sin piso, intervalMs=0 reprogramaría el poll en un loop continuo.
    await act(async () => {
      await vi.advanceTimersByTimeAsync(999);
    });
    expect(fn).toHaveBeenCalledTimes(1);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it("pausa con la pestaña oculta y retoma con visibilitychange", async () => {
    const fn = vi.fn().mockResolvedValue("ok");
    setDocumentHidden(true);
    renderHook(() => usePollingQuery(fn, { intervalMs: 1000 }));

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });
    expect(fn).not.toHaveBeenCalled();

    setDocumentHidden(false);
    await act(async () => {
      document.dispatchEvent(new Event("visibilitychange"));
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(fn).toHaveBeenCalledTimes(1);
  });
});
