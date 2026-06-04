import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { DataTable } from "@devpablocristo/modules-ui-data-display";
import Drawer from "../../../components/Drawer/Drawer";
import { BaseModal } from "../../../components/Modal/BaseModal";
import useOrders from "../../../hooks/useWorkOrders";
import { OrdersData } from "../../../hooks/useWorkOrders/types";
import { Column } from "../types";

export default function ArchivedWorkOrdersDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Instancia propia del hook: la lista de archivadas NO debe pisar la lista activa.
  const { orders, getArchivedOrders, restoreOrder, deleteOrder, processing, error } =
    useOrders();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    primaryButtonText: "",
    secondaryButtonText: "Cancelar",
    onConfirm: () => {},
  });

  useEffect(() => {
    if (open) {
      getArchivedOrders("page=1&per_page=1000");
    }
  }, [open, getArchivedOrders]);

  const handleRestore = (item: OrdersData) => {
    setModalConfig({
      title: "Confirmar restauración",
      message: `¿Restaurar la orden ${item.number}?`,
      primaryButtonText: "Restaurar",
      secondaryButtonText: "Cancelar",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await restoreOrder(item.id);
          await getArchivedOrders("page=1&per_page=1000");
        } finally {
          setIsProcessing(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  const handleHardDelete = (item: OrdersData) => {
    setModalConfig({
      title: "Confirmar eliminación definitiva",
      message: `¿Eliminar definitivamente la orden ${item.number}? Esta acción no se puede deshacer.`,
      primaryButtonText: "Eliminar",
      secondaryButtonText: "Cancelar",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await deleteOrder(item.id);
          await getArchivedOrders("page=1&per_page=1000");
        } finally {
          setIsProcessing(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  const columns: Column<OrdersData>[] = [
    { key: "number", header: "N° Orden" },
    { key: "project_name", header: "Proyecto" },
    { key: "date", header: "Fecha" },
    {
      key: "id",
      header: "Acciones",
      render: (_value: unknown, item: OrdersData) => (
        <div className="flex items-center justify-center gap-3">
          <button
            className="text-green-700 hover:text-green-900"
            title="Restaurar"
            onClick={() => handleRestore(item)}
          >
            <RotateCcw size={16} />
          </button>
          <button
            className="text-red-700 hover:text-red-900"
            title="Eliminar definitivo"
            onClick={() => handleHardDelete(item)}
          >
            <Trash2 size={16} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <Drawer open={open} onClose={onClose}>
      <h2 className="text-lg font-semibold mb-4 pr-8">Órdenes Archivadas</h2>
      <DataTable data={orders as OrdersData[]} columns={columns} />
      {!processing && orders.length === 0 && (
        <p className="text-sm text-gray-400 mt-4">No hay órdenes archivadas.</p>
      )}
      {error && (
        <div className="p-4 mt-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          <span className="font-medium">Error!</span> {error}
        </div>
      )}
      <BaseModal
        isOpen={isModalOpen}
        isSaving={isProcessing || processing}
        onClose={() => setIsModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        primaryButtonText={modalConfig.primaryButtonText}
        secondaryButtonText={modalConfig.secondaryButtonText}
        onPrimaryAction={() => {
          modalConfig.onConfirm();
          setIsModalOpen(false);
        }}
      />
    </Drawer>
  );
}
