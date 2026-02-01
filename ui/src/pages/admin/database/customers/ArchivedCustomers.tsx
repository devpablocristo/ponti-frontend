import React, { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import DataTable from "../../../../components/Table/DataTable";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import useCustomers from "../../../../hooks/useCustomers";

type ArchivedCustomer = {
  id: number;
  name: string;
};

export default function ArchivedCustomers() {
  const { customers, getArchivedCustomers, restoreCustomer, hardDeleteCustomer, processing, error } =
    useCustomers();

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
    getArchivedCustomers("page=1&per_page=1000");
  }, [getArchivedCustomers]);

  const handleRestore = (item: ArchivedCustomer) => {
    setModalConfig({
      title: "Confirmar restauración",
      message: `¿Restaurar el cliente "${item.name}"?`,
      primaryButtonText: "Restaurar",
      secondaryButtonText: "Cancelar",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await restoreCustomer(item.id);
          await getArchivedCustomers("page=1&per_page=1000");
        } finally {
          setIsProcessing(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  const handleHardDelete = (item: ArchivedCustomer) => {
    setModalConfig({
      title: "Confirmar eliminación definitiva",
      message: `¿Eliminar definitivamente el cliente "${item.name}"?`,
      primaryButtonText: "Eliminar",
      secondaryButtonText: "Cancelar",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await hardDeleteCustomer(item.id);
          await getArchivedCustomers("page=1&per_page=1000");
        } finally {
          setIsProcessing(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  const columns = [
    { key: "name", header: "Cliente/Sociedad" },
    {
      key: "actions",
      header: "Acciones",
      render: (_value, item) => (
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
  ] as any;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Clientes</h2>
      <DataTable data={customers as ArchivedCustomer[]} columns={columns} />
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
    </div>
  );
}
