import { useEffect, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import DataTable from "../../../../components/Table/DataTable";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import useProjects from "../../../../hooks/useDatabase/projects";
import { ProjectData } from "../../../../hooks/useDatabase/projects/types";

export default function ArchivedProjects() {
  const {
    projects,
    getArchivedProjects,
    restoreProject,
    hardDeleteProject,
    processing,
    error,
  } = useProjects();

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
    getArchivedProjects("page=1&per_page=1000");
  }, [getArchivedProjects]);

  const handleRestore = (item: ProjectData) => {
    setModalConfig({
      title: "Confirmar restauración",
      message: `¿Restaurar el proyecto "${item.name}"?`,
      primaryButtonText: "Restaurar",
      secondaryButtonText: "Cancelar",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await restoreProject(item.id);
          await getArchivedProjects("page=1&per_page=1000");
        } finally {
          setIsProcessing(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  const handleHardDelete = (item: ProjectData) => {
    setModalConfig({
      title: "Confirmar eliminación definitiva",
      message: `¿Eliminar definitivamente el proyecto "${item.name}"?`,
      primaryButtonText: "Eliminar",
      secondaryButtonText: "Cancelar",
      onConfirm: async () => {
        setIsProcessing(true);
        try {
          await hardDeleteProject(item.id);
          await getArchivedProjects("page=1&per_page=1000");
        } finally {
          setIsProcessing(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  const columns = [
    { key: "customer", header: "Cliente/Sociedad" },
    { key: "name", header: "Proyecto" },
    { key: "campaign", header: "Campaña" },
    { key: "managers", header: "Responsable" },
    { key: "investors", header: "Inversores y aportes" },
    {
      key: "actions",
      header: "Acciones",
      align: "center" as const,
      headerAlign: "center" as const,
      render: (_value: unknown, item: ProjectData) => (
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
    <div>
      <p className="text-sm text-gray-500 mb-4">Restaurar o eliminar proyectos de forma definitiva</p>
      <DataTable data={projects} columns={columns} />
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
