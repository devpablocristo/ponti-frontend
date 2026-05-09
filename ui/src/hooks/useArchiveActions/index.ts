import { useCallback, useState } from "react";

// Hook genérico para encapsular el flujo "iniciar acción → procesar → refrescar"
// para Archive / Restore / HardDelete. Centraliza el estado de loading local del
// modal y propaga errores para que la página los muestre.
//
// Las páginas que reusan este hook NO deberían volver a tener su propio estado
// de processing/error — ya viene resuelto.

export type ArchiveAction<T> = (item: T) => Promise<void>;

export type UseArchiveActionsOptions<T> = {
  /** Función para refrescar la lista después de cada acción exitosa. */
  refetch: () => Promise<void> | void;
  /** Acciones disponibles. Cualquiera puede ser undefined si la entidad no la soporta. */
  archive?: (id: number) => Promise<void>;
  restore?: (id: number) => Promise<void>;
  hardDelete?: (id: number) => Promise<void>;
};

export type UseArchiveActionsResult<T extends { id: number }> = {
  processing: boolean;
  lastError: string | null;
  runArchive: ArchiveAction<T> | null;
  runRestore: ArchiveAction<T> | null;
  runHardDelete: ArchiveAction<T> | null;
  clearError: () => void;
};

export function useArchiveActions<T extends { id: number }>({
  refetch,
  archive,
  restore,
  hardDelete,
}: UseArchiveActionsOptions<T>): UseArchiveActionsResult<T> {
  const [processing, setProcessing] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const wrap = useCallback(
    (op: ((id: number) => Promise<void>) | undefined): ArchiveAction<T> | null => {
      if (!op) return null;
      return async (item: T) => {
        setProcessing(true);
        setLastError(null);
        try {
          await op(item.id);
          await refetch();
        } catch (err) {
          const message = err instanceof Error ? err.message : "Error desconocido";
          setLastError(message);
          throw err;
        } finally {
          setProcessing(false);
        }
      };
    },
    [refetch],
  );

  return {
    processing,
    lastError,
    runArchive: wrap(archive),
    runRestore: wrap(restore),
    runHardDelete: wrap(hardDelete),
    clearError: () => setLastError(null),
  };
}
