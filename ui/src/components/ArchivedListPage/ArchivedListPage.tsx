import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { DataTable } from "@devpablocristo/modules-ui-data-display";
import { BaseModal } from "../Modal/BaseModal";
import { Column } from "../../pages/admin/types";
import {
  ConfirmCopy,
  getHardDeleteCopy,
  getRestoreCopy,
} from "../Modal/copy";

// Genérico para vistas de "X Archivados". Encapsula tabla + columna de acciones
// (Restaurar, Eliminar definitivamente) + modal de confirmación. Las páginas
// concretas solo pasan columns + handlers + getItemLabel.

type ArchivedListPageProps<T extends { id: number }> = {
  /** Texto descriptivo arriba de la tabla (1 línea). */
  description?: string;
  /** Columnas de datos (sin la columna de acciones, esa la agrega el componente). */
  columns: Column<T>[];
  /** Datos archivados a mostrar. */
  data: T[];
  /** Etiqueta de entidad para los modales (ej: "el cliente", "el proyecto"). */
  entityLabel: string;
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
  getItemLabel,
  onRestore,
  onHardDelete,
  onMount,
  processing = false,
  error,
}: ArchivedListPageProps<T>) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pending, setPending] = useState<{
    item: T;
    op: "restore" | "hard";
  } | null>(null);
  const [copy, setCopy] = useState<ConfirmCopy | null>(null);

  useEffect(() => {
    onMount?.();
    // intencionalmente sin deps: corre solo al montar.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openRestore = (item: T) => {
    setPending({ item, op: "restore" });
    setCopy(getRestoreCopy(entityLabel, getItemLabel(item)));
    setIsModalOpen(true);
  };

  const openHardDelete = (item: T) => {
    setPending({ item, op: "hard" });
    setCopy(getHardDeleteCopy(entityLabel, getItemLabel(item)));
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      if (pending.op === "restore" && onRestore) {
        await onRestore(pending.item);
      } else if (pending.op === "hard" && onHardDelete) {
        await onHardDelete(pending.item);
      }
    } finally {
      setIsModalOpen(false);
      setPending(null);
    }
  };

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

  const fullColumns: Column<T>[] = [...columns, actionsColumn];

  return (
    <div>
      {description && (
        <p className="text-sm text-gray-500 mb-4">{description}</p>
      )}
      <DataTable data={data as T[]} columns={fullColumns} />
      {error && (
        <div className="p-4 mt-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          <span className="font-medium">Error!</span> {error}
        </div>
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
