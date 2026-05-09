import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { DataTable } from "@devpablocristo/modules-ui-data-display";
import { BaseModal } from "../Modal/BaseModal";
import { BulkSelectionPanel } from "../crud/BulkSelectionPanel";
import { makeSelectColumn } from "../crud/makeSelectColumn";
import { ErrorBanner } from "../feedback/ErrorBanner";
import { Column } from "../../pages/admin/types";
import {
  ConfirmCopy,
  getBulkHardDeleteCopy,
  getBulkRestoreCopy,
  getHardDeleteCopy,
  getRestoreCopy,
} from "../Modal/copy";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { toastError, toastSuccess } from "../../lib/toast";

// Genérico para vistas de "X Archivados". Encapsula tabla + columna de acciones
// (Restaurar, Eliminar definitivamente) + modal de confirmación. Las páginas
// concretas solo pasan columns + handlers + getItemLabel.
//
// Soporta opcionalmente bulk actions: si se pasa entityLabelPlural, agrega
// checkboxes por fila + barra de acciones masivas (Restaurar N / Eliminar N).

type ArchivedListPageProps<T extends { id: number }> = {
  /** Texto descriptivo arriba de la tabla (1 línea). */
  description?: string;
  /** Columnas de datos (sin la columna de acciones, esa la agrega el componente). */
  columns: Column<T>[];
  /** Datos archivados a mostrar. */
  data: T[];
  /** Etiqueta de entidad para los modales (ej: "el cliente", "el proyecto"). */
  entityLabel: string;
  /** Etiqueta plural (ej: "clientes", "proyectos") — habilita bulk actions si está. */
  entityLabelPlural?: string;
  /** Cómo extraer el "nombre amigable" de un item para el modal. */
  getItemLabel: (item: T) => string;
  /** Disparar restore para el item seleccionado. Si no se pasa, no hay botón. */
  onRestore?: (item: T) => Promise<void> | void;
  /** Disparar hard-delete para el item seleccionado. Si no se pasa, no hay botón. */
  onHardDelete?: (item: T) => Promise<void> | void;
  /** Callback opcional al montar (típicamente fetch inicial). */
  onMount?: () => void;
  /** Estado de processing externo (del hook useArchiveActions). */
  processing?: boolean;
  /** Mensaje de error a mostrar debajo de la tabla. */
  error?: string | null;
};

export function ArchivedListPage<T extends { id: number }>({
  description,
  columns,
  data,
  entityLabel,
  entityLabelPlural,
  getItemLabel,
  onRestore,
  onHardDelete,
  onMount,
  processing = false,
  error,
}: ArchivedListPageProps<T>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pending, setPending] = useState<{
    items: T[];
    op: "restore" | "hard";
  } | null>(null);
  const [copy, setCopy] = useState<ConfirmCopy | null>(null);

  const selection = useBulkSelection(data);
  const { toggleAll, clear, allSelected, selectedItems, selectedCount } =
    selection;

  const bulkEnabled = Boolean(entityLabelPlural);

  useEffect(() => {
    onMount?.();
    // intencionalmente sin deps: corre solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRestore = (item: T) => {
    setPending({ items: [item], op: "restore" });
    setCopy(getRestoreCopy(entityLabel, getItemLabel(item)));
    setIsModalOpen(true);
  };

  const openHardDelete = (item: T) => {
    setPending({ items: [item], op: "hard" });
    setCopy(getHardDeleteCopy(entityLabel, getItemLabel(item)));
    setIsModalOpen(true);
  };

  const openBulkRestore = () => {
    if (!entityLabelPlural || selectedItems.length === 0) return;
    setPending({ items: selectedItems, op: "restore" });
    setCopy(getBulkRestoreCopy(selectedItems.length, entityLabelPlural));
    setIsModalOpen(true);
  };

  const openBulkHardDelete = () => {
    if (!entityLabelPlural || selectedItems.length === 0) return;
    setPending({ items: selectedItems, op: "hard" });
    setCopy(getBulkHardDeleteCopy(selectedItems.length, entityLabelPlural));
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const { items, op } = pending;
    const handler = op === "restore" ? onRestore : onHardDelete;
    if (!handler) {
      setIsModalOpen(false);
      setPending(null);
      return;
    }
    try {
      if (items.length === 1) {
        await handler(items[0]);
      } else {
        const results = await Promise.allSettled(
          items.map((item) => Promise.resolve(handler(item))),
        );
        const ok = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.length - ok;
        if (failed === 0) {
          toastSuccess(
            op === "restore"
              ? `Se restauraron ${ok} ${entityLabelPlural}.`
              : `Se eliminaron ${ok} ${entityLabelPlural}.`,
          );
        } else {
          toastError(
            `${ok} de ${results.length} OK; ${failed} fallaron (probablemente por dependencias).`,
          );
        }
        clear();
      }
    } finally {
      setIsModalOpen(false);
      setPending(null);
    }
  };

  const selectColumn: Column<T> | null = bulkEnabled
    ? makeSelectColumn<T>(selection, getItemLabel, entityLabel)
    : null;

  const actionsColumn: Column<T> = {
    key: "id" as keyof T,
    header: "Acciones",
    render: (_value: unknown, item: T) => (
      <div className="flex items-center justify-center gap-3">
        {onRestore && (
          <button
            className="text-green-700 hover:text-green-900"
            title="Restaurar"
            onClick={() => openRestore(item)}
          >
            <RotateCcw size={16} />
          </button>
        )}
        {onHardDelete && (
          <button
            className="text-red-700 hover:text-red-900"
            title="Eliminar definitivo"
            onClick={() => openHardDelete(item)}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>
    ),
  };

  const fullColumns: Column<T>[] = useMemo(
    () =>
      selectColumn
        ? [selectColumn, ...columns, actionsColumn]
        : [...columns, actionsColumn],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columns, selectColumn, actionsColumn],
  );

  const bulkActions = useMemo(
    () =>
      [
        onRestore && {
          label: `Restaurar ${selectedCount}`,
          icon: RotateCcw,
          onClick: openBulkRestore,
        },
        onHardDelete && {
          label: `Eliminar ${selectedCount}`,
          icon: Trash2,
          variant: "danger" as const,
          onClick: openBulkHardDelete,
        },
      ].filter(Boolean) as {
        label: string;
        icon: typeof RotateCcw;
        variant?: "danger";
        onClick: () => void;
      }[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onRestore, onHardDelete, selectedCount],
  );

  return (
    <div>
      {description && (
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      )}
      {bulkEnabled && entityLabelPlural && (
        <BulkSelectionPanel
          selectedCount={selectedCount}
          totalCount={data.length}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onClear={clear}
          actions={bulkActions}
          entityLabelPlural={entityLabelPlural}
        />
      )}
      <DataTable data={data as T[]} columns={fullColumns} />
      {error && (
        <ErrorBanner className="mt-4">
          <span className="font-medium">Error!</span> {error}
        </ErrorBanner>
      )}

      <BaseModal
        isOpen={isModalOpen}
        isSaving={processing}
        onClose={() => {
          setIsModalOpen(false);
          setPending(null);
        }}
        title={copy?.title ?? ""}
        message={copy?.message ?? ""}
        primaryButtonText={copy?.primaryButtonText ?? null}
        secondaryButtonText={copy?.secondaryButtonText ?? "Cancelar"}
        onPrimaryAction={handleConfirm}
      />
    </div>
  );
}
