import { useCallback, useMemo, useState } from "react";

/**
 * Hook genérico para manejar selección múltiple en tablas.
 *
 * El estado es por id (number). El consumidor puede derivar `selectedItems`
 * filtrando los items provistos.
 */
export function useBulkSelection<T extends { id: number }>(items: T[]) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const isSelected = useCallback(
    (id: number) => selectedIds.has(id),
    [selectedIds],
  );

  const toggle = useCallback((id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const allSelected = items.length > 0 && items.every((it) => selectedIds.has(it.id));
  const someSelected = !allSelected && items.some((it) => selectedIds.has(it.id));

  const toggleAll = useCallback(() => {
    setSelectedIds((prev) => {
      if (items.every((it) => prev.has(it.id))) {
        // Si todos están seleccionados → limpiar (al menos los visibles)
        const next = new Set(prev);
        items.forEach((it) => next.delete(it.id));
        return next;
      }
      // Caso contrario → seleccionar todos los visibles
      const next = new Set(prev);
      items.forEach((it) => next.add(it.id));
      return next;
    });
  }, [items]);

  const clear = useCallback(() => setSelectedIds(new Set()), []);

  const selectedItems = useMemo(
    () => items.filter((it) => selectedIds.has(it.id)),
    [items, selectedIds],
  );

  return {
    selectedIds: Array.from(selectedIds),
    selectedItems,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
    selectedCount: selectedIds.size,
  };
}

export default useBulkSelection;
