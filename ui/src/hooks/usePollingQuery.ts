import { useCallback, useEffect, useRef, useState } from "react";

/** Piso defensivo: intervalos inválidos o demasiado cortos degenerarían en un hot-loop. */
const MIN_INTERVAL_MS = 1000;
const MAX_BACKOFF_MS = 5 * 60 * 1000;

export type UsePollingQueryOptions = {
  intervalMs: number;
  enabled?: boolean;
};

export type UsePollingQueryResult<T> = {
  data: T | null;
  error: string;
  loading: boolean;
  refresh: () => Promise<void>;
};

/**
 * Polling de una consulta async: pausa con la pestaña oculta (visibilitychange)
 * y duplica el intervalo ante errores hasta un techo de 5 minutos.
 *
 * `fn` define la identidad de la consulta: si cambia (los consumidores DEBEN
 * memoizarla con useCallback), se resetea el backoff y se consulta de inmediato.
 * El último `data` se mantiene visible durante ese refetch para evitar parpadeos.
 */
export function usePollingQuery<T>(
  fn: () => Promise<T>,
  { intervalMs, enabled = true }: UsePollingQueryOptions
): UsePollingQueryResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const safeIntervalMs = Number.isFinite(intervalMs)
    ? Math.max(intervalMs, MIN_INTERVAL_MS)
    : MIN_INTERVAL_MS;
  const delayRef = useRef(safeIntervalMs);
  const runRef = useRef<() => Promise<void>>(async () => {});

  const refresh = useCallback(async () => {
    // Refresh manual: resetea el backoff y consulta ya.
    delayRef.current = safeIntervalMs;
    await runRef.current();
  }, [safeIntervalMs]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let running = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const clearTimer = () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const schedule = () => {
      clearTimer();
      if (cancelled) return;
      timer = setTimeout(() => {
        void run();
      }, delayRef.current);
    };

    const run = async () => {
      if (cancelled || running) return;
      // Pestaña oculta: pausa; visibilitychange retoma al volver al foco.
      if (document.hidden) return;
      running = true;
      setLoading(true);
      try {
        const result = await fn();
        if (!cancelled) {
          setData(result);
          setError("");
          delayRef.current = safeIntervalMs;
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "No se pudo actualizar");
          delayRef.current = Math.min(
            Math.max(delayRef.current, safeIntervalMs) * 2,
            MAX_BACKOFF_MS
          );
        }
      } finally {
        running = false;
        if (!cancelled) {
          setLoading(false);
          schedule();
        }
      }
    };

    runRef.current = run;
    const handleVisibility = () => {
      if (!document.hidden) void run();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    delayRef.current = safeIntervalMs;
    void run();

    return () => {
      cancelled = true;
      clearTimer();
      document.removeEventListener("visibilitychange", handleVisibility);
      runRef.current = async () => {};
    };
  }, [enabled, safeIntervalMs, fn]);

  return { data, error, loading, refresh };
}
