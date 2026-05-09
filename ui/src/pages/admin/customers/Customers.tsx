import { useEffect, useMemo, useState, useCallback } from "react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { RowActions } from "../../../components/crud/RowActions";
import { Archive, Pencil, Trash2 } from "lucide-react";

import { DataTable, usePagination } from "@/lib/dataDisplay";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import { ProjectData } from "../../../hooks/useDatabase/projects/types";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { useNavigate } from "react-router-dom";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import useProjects from "../../../hooks/useDatabase/projects";
import ExpandedRow from "./ExpandedRow";
import { BaseModal } from "../../../components/Modal/BaseModal";
import useCustomers from "../../../hooks/useCustomers";
import { useSelection } from "../../login/context/useSelection";
import { useConfirmDialog } from "../../../hooks/useConfirmDialog";
import { toastError, toastSuccess } from "../../../lib/toast";
import { getHardDeleteCopy } from "../../../components/Modal/copy";
import { Column } from "../types";

const baseColumns: Column<ProjectData>[] = [
  { key: "customer", header: "Cliente/Sociedad" },
  {
    key: "name",
    header: "Proyecto",
    render: (value, data) => (
      <strong className="text-blue-700">
        <a href={`/admin/database/customers/${data.id}`}>
          {String(value ?? "")} ({data.campaign})
        </a>
      </strong>
    ),
  },
  { key: "managers", header: "Responsable" },
  {
    key: "investors",
    header: "Inversores y aportes",
  },
];

export function Customers() {
  const navigate = useNavigate();

  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<"project" | "customer" | null>(
    null
  );
  const [archiveCustomerWithProject, setArchiveCustomerWithProject] =
    useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    primaryButtonText: "",
    secondaryButtonText: "Cancelar",
    onConfirm: () => {},
  });

  const {
    projects,
    totalHectares,
    getProjects,
    deleteProject,
    hardDeleteProject,
    pageInfo: projectPageInfo,
    processing,
    error,
  } = useProjects();
  const { archiveCustomer } = useCustomers();
  const { setCustomer, setProject, setCampaign, setProjectId, setField } =
    useSelection();
  const confirm = useConfirmDialog();

  const {
    selectedCustomer,
    selectedCampaignId,
    selectedProject,
    filters,
    loading, // Contains loading.customers, loading.projects, loading.campaigns
    errors,
  } = useWorkspaceFilters(["customer", "project", "campaign"]);
  const pagination = usePagination({ perPage: 10 });

  const projectsQuery = useMemo(() => {
    if (!selectedCustomer) return "";

    const params = new URLSearchParams();
    params.set("page", String(pagination.page));
    params.set("per_page", String(pagination.perPage));
    params.set("customer_id", String(selectedCustomer.id));

    if (selectedProject && selectedProject.id !== 0) {
      params.set("name", selectedProject.name);
    }

    if (selectedCampaignId && selectedCampaignId !== 0) {
      params.set("campaign_id", String(selectedCampaignId));
    }

    return params.toString();
  }, [
    pagination.page,
    pagination.perPage,
    selectedCampaignId,
    selectedCustomer,
    selectedProject,
  ]);

  useEffect(() => {
    pagination.resetPage();
  }, [selectedCampaignId, selectedCustomer?.id, selectedProject?.id, selectedProject?.name]);

  useEffect(() => {
    if (!projectsQuery) return;
    getProjects(projectsQuery);
  }, [projectsQuery, getProjects]);

  const renderExpandedRow = (rowData: ProjectData) => {
    return <ExpandedRow projectId={rowData.id} />;
  };

  const handleHardDeleteProject = useCallback(
    async (item: ProjectData) => {
      const ok = await confirm({
        ...getHardDeleteCopy("el proyecto", item.name),
        primaryLabel: getHardDeleteCopy("el proyecto", item.name).primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "danger",
      });
      if (!ok) return;
      try {
        await hardDeleteProject(Number(item.id));
        toastSuccess(`Se eliminó "${item.name}" definitivamente`);
        getProjects(`page=1&per_page=10`);
      } catch (err) {
        toastError(
          err instanceof Error ? err.message : "No se pudo eliminar el proyecto",
        );
      }
    },
    [confirm, getProjects, hardDeleteProject],
  );

  const tableColumns = useMemo<Column<ProjectData>[]>(
    () => [
      ...baseColumns,
      {
        key: "id",
        header: "",
        align: "center",
        render: (_value, item) => (
          <RowActions
            actions={[
              {
                label: "Editar",
                icon: Pencil,
                onClick: () =>
                  navigate(`/admin/database/customers?id=${item.id}`),
              },
              {
                label: "Archivar",
                icon: Archive,
                onClick: () => handlePreFinish(item.id),
              },
              {
                label: "Eliminar",
                icon: Trash2,
                variant: "danger",
                divider: true,
                onClick: () => handleHardDeleteProject(item),
              },
            ]}
          />
        ),
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [handleHardDeleteProject, navigate],
  );

  const handlePreFinish = (id: number) => {
    setModalMode("project");
    setArchiveCustomerWithProject(false);
    setModalConfig({
      title: "Confirmar archivo",
      message: "¿Está seguro que desea archivar el proyecto?",
      primaryButtonText: "Sí, archivar",
      secondaryButtonText: "Cancelar",
      onConfirm: () => handleFinishConfirmed(id),
    });
    setIsModalOpen(true);
  };

  const handleFinishConfirmed = async (id: number) => {
    setIsProcessing(true);
    let successMessage = "";
    let errorMessage = "";

    try {
      await deleteProject(Number(id));
      if (archiveCustomerWithProject && selectedCustomer) {
        await archiveCustomer(Number(selectedCustomer.id));
        setCustomer(undefined);
        setProject(undefined);
        setCampaign(undefined);
        setProjectId(undefined);
        setField(undefined);
      }
      successMessage = archiveCustomerWithProject
        ? "El proyecto y el cliente han sido archivados."
        : "El proyecto ha sido archivado.";
      getProjects(
        `customer_id=${selectedCustomer?.id}${
          selectedProject && selectedProject.id !== 0
            ? `&name=${selectedProject.name}`
            : ""
        }${
          selectedCampaignId && selectedCampaignId !== 0
            ? `&campaign_id=${selectedCampaignId}`
            : ""
        }`
      );
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo archivar el proyecto.";
    } finally {
      if (errorMessage) {
        setModalConfig({
          title: "Error",
          message: errorMessage,
          primaryButtonText: "Volver",
          secondaryButtonText: "Volver",
          onConfirm: () => {
            setIsModalOpen(false);
          },
        });
      } else {
        setModalConfig({
          title: "Confirmación",
          message: successMessage,
          primaryButtonText: "Volver",
          secondaryButtonText: "Volver",
          onConfirm: () => {
            window.location.href = "/admin/customers";
          },
        });
      }
      setIsModalOpen(true);
      setIsProcessing(false);
    }
  };

  const handlePreArchiveCustomer = () => {
    if (!selectedCustomer) return;
    setModalMode("customer");
    setModalConfig({
      title: "Confirmar archivo",
      message: "¿Está seguro que desea archivar el cliente?",
      primaryButtonText: "Sí, archivar",
      secondaryButtonText: "Cancelar",
      onConfirm: handleArchiveCustomerConfirmed,
    });
    setIsModalOpen(true);
  };

  const handleArchiveCustomerConfirmed = async () => {
    if (!selectedCustomer) return;
    setIsProcessing(true);
    let errorMessage = "";

    try {
      await archiveCustomer(Number(selectedCustomer.id));
      setCustomer(undefined);
      setProject(undefined);
      setCampaign(undefined);
      setProjectId(undefined);
      setField(undefined);
    } catch (error) {
      errorMessage =
        error instanceof Error
          ? error.message
          : "No se pudo archivar el cliente.";
    } finally {
      if (errorMessage) {
        setModalConfig({
          title: "Error",
          message: errorMessage,
          primaryButtonText: "Volver",
          secondaryButtonText: "Volver",
          onConfirm: () => {
            setIsModalOpen(false);
          },
        });
      } else {
        setModalConfig({
          title: "Confirmación",
          message: "El cliente ha sido archivado.",
          primaryButtonText: "Volver",
          secondaryButtonText: "Volver",
          onConfirm: () => {
            window.location.href = "/admin/customers";
          },
        });
      }
      setIsModalOpen(true);
      setIsProcessing(false);
    }
  };

  return (
    <div>
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "+ Nuevo Cliente",
            variant: "primary",
            isPrimary: true,
            href: "/admin/database/customers",
          },
          {
            label: "Archivar Cliente",
            variant: "primary",
            onClick: handlePreArchiveCustomer,
            disabled:
              !selectedCustomer || selectedCustomer.id === 0 || isProcessing,
          },
        ]}
      >
        <IndicatorCard
          title="Superficie total de hectáreas"
          value={`${totalHectares} Has`}
          color="amber"
          className="w-[220px] max-w-[220px] flex-none"
        />
      </FilterBar>

      {errors.customers ||
        errors.projects ||
        (errors.campaigns && (
          <div
            className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
            role="alert"
          >
            <span className="font-medium">Error!</span> {errors.customers}{" "}
            {errors.projects} {errors.campaigns}
          </div>
        ))}

      <div className="mt-2 relative">
        <LoadingOverlay
          show={
            processing ||
            loading.campaigns ||
            loading.customers ||
            loading.projects
          }
        />
        <DataTable
          data={projects}
          columns={tableColumns}
          expandableRowRender={renderExpandedRow}
          className={`${processing ? "pointer-events-none opacity-60" : ""}`}
          pagination={
            projectPageInfo
              ? pagination.buildPagination(projectPageInfo.total, { serverSide: true })
              : undefined
          }
        />
        {error && (
          <div
            className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
            role="alert"
          >
            <span className="font-medium">Error!</span> {error}
          </div>
        )}
      </div>
      <BaseModal
        isOpen={isModalOpen}
        isSaving={isProcessing}
        onClose={() => setIsModalOpen(false)}
        title={modalConfig.title}
        message={modalConfig.message}
        primaryButtonText={modalConfig.primaryButtonText}
        secondaryButtonText={modalConfig.secondaryButtonText}
        onPrimaryAction={() => {
          modalConfig.onConfirm();
          setIsModalOpen(false);
        }}
      >
        {modalMode === "project" ? (
          <div className="flex flex-col items-center gap-3 text-sm text-gray-700">
            <p>{modalConfig.message}</p>
            {selectedCustomer && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={archiveCustomerWithProject}
                  onChange={(event) =>
                    setArchiveCustomerWithProject(event.target.checked)
                  }
                />
                <span>Archivar también el cliente</span>
              </label>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2">
            <p>{modalConfig.message}</p>
          </div>
        )}
      </BaseModal>
    </div>
  );
}

export default Customers;
