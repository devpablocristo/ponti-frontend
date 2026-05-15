import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Briefcase, Download, Plus, Upload } from "lucide-react";

import { apiClient } from "@/api/client";
import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { Checkbox } from "../../../../components/Input/Checkbox";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { DrawerShell } from "../../../../components/Drawer/DrawerShell";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import useProjects from "../../../../hooks/useDatabase/projects";
import { buildTimestampedFilename, downloadBlob } from "../../fileTransfer";
import useCustomers from "../../../../hooks/useCustomers";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import { useSelection } from "../../../login/context/useSelection";
import { toastError, toastSuccess } from "../../../../lib/toast";
import { Column } from "../../types";
import { CUSTOMER_ENTITY, PROJECT_ENTITY } from "../../entities";
import { formatNumberAr } from "../../utils";
import ArchivedCustomers from "./ArchivedCustomers";
import ArchivedProjects from "../projects/ArchivedProjects";
import CustomerEditor from "./CustomerEditor";

type CustomerProjectMode = "customer" | "project";

type CustomerProjectRow = {
  id: number;
  mode: CustomerProjectMode;
  projectId?: number;
  projectIds: number[];
  customerId: number;
  customerName: string;
  projectName: string;
  campaignCount: number;
  fieldCount: number;
};

type ProjectSummaryResponse = {
  success: boolean;
  data?: {
    data?: RawProject[];
  };
};

type ProjectDetailResponse = {
  success: boolean;
  data?: RawProject;
};

type RawProject = {
  id?: number;
  name?: string;
  campaign?: { id?: number | null; name?: string | null } | string | null;
  campaign_id?: number | null;
  campaign_name?: string | null;
  fields?:
    | Array<
        | {
            id?: number;
            name?: string;
            lots?: Array<{ hectares?: number | string | null }> | null;
          }
        | string
      >
    | null;
};

function campaignKey(project: RawProject) {
  if (typeof project.campaign === "string") return project.campaign;
  return (
    project.campaign?.name ||
    project.campaign?.id ||
    project.campaign_name ||
    project.campaign_id ||
    ""
  );
}

function normalizeFilter(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function campaignName(project: RawProject) {
  const key = campaignKey(project);
  return String(key || "");
}

function countUniqueCampaigns(projects: RawProject[]) {
  return new Set(projects.map(campaignName).filter(Boolean)).size;
}

function countUniqueFields(projects: RawProject[]) {
  const fields = new Set<string>();

  projects.forEach((project) => {
    (Array.isArray(project.fields) ? project.fields : []).forEach((field) => {
      if (typeof field === "string") {
        fields.add(normalizeFilter(field));
        return;
      }

      fields.add(String(field.id ?? normalizeFilter(field.name ?? "")));
    });
  });

  return fields.size;
}

function projectMatchesFilters(
  project: RawProject,
  selectedProject: { name?: string } | undefined,
  selectedCampaign: { name?: string } | undefined,
  selectedField: { id?: number; name?: string } | undefined,
) {
  const projectNeedle = normalizeFilter(selectedProject?.name ?? "");
  const campaignNeedle = normalizeFilter(selectedCampaign?.name ?? "");
  const fieldNeedle = normalizeFilter(selectedField?.name ?? "");

  const matchesProject =
    !selectedProject ||
    normalizeFilter(project.name ?? "").includes(projectNeedle);
  const matchesCampaign =
    !selectedCampaign ||
    normalizeFilter(campaignName(project)).includes(campaignNeedle);
  const matchesField =
    !selectedField ||
    (Array.isArray(project.fields) ? project.fields : []).some((field) => {
      if (typeof field === "string") return normalizeFilter(field).includes(fieldNeedle);
      return (
        field.id === selectedField.id ||
        normalizeFilter(field.name ?? "").includes(fieldNeedle)
      );
    });

  return matchesProject && matchesCampaign && matchesField;
}

function sumProjectHectares(
  project: RawProject,
  selectedField: { id?: number; name?: string } | undefined,
) {
  return (Array.isArray(project.fields) ? project.fields : []).reduce((total, field) => {
    if (typeof field === "string") return total;
    if (
      selectedField &&
      field.id !== selectedField.id &&
      !normalizeFilter(field.name ?? "").includes(normalizeFilter(selectedField.name ?? ""))
    ) {
      return total;
    }

    const lots = Array.isArray(field.lots) ? field.lots : [];
    return (
      total +
      lots.reduce((subtotal, lot) => {
        const hectares = Number(String(lot.hectares ?? 0).replace(",", "."));
        return subtotal + (Number.isFinite(hectares) ? hectares : 0);
      }, 0)
    );
  }, 0);
}

async function loadProjectDetails(projects: RawProject[]) {
  return Promise.all(
    projects.map(async (project) => {
      if (!project.id) return project;
      try {
        const response = await apiClient.get<ProjectDetailResponse>(
          `/projects/${project.id}`,
        );
        return response.data ?? project;
      } catch {
        return project;
      }
    }),
  );
}

export default function CustomersList() {
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const {
    customers,
    processing,
    error,
    getCustomers,
    createCustomer,
    archiveCustomer,
  } = useCustomers();
  const [projectsByCustomer, setProjectsByCustomer] = useState<Record<number, RawProject[]>>({});
  const [projectsLoading, setProjectsLoading] = useState(false);
  const { deleteProject } = useProjects();
  const { allSelection } = useSelection();
  const {
    filters,
    selectedCustomer,
    selectedProject,
    selectedCampaignId,
    selectedField,
    campaigns,
    hasWorkspaceSelection,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId],
  );
  const hasProjectScope = Boolean(
    selectedProject?.id ||
      selectedCampaign?.id ||
      selectedField?.id ||
      allSelection.project ||
      allSelection.campaign ||
      allSelection.field,
  );
  const mode: CustomerProjectMode = hasProjectScope ? "project" : "customer";
  const isProjectMode = mode === "project";
  const archivedShowsProjects = hasProjectScope;

  const refresh = useCallback(
    () => getCustomers("limit=1000"),
    [getCustomers],
  );
  const refreshAfterArchivedRestore = useCallback(async () => {
    await refresh();
    setDataVersion((current) => current + 1);
  }, [refresh]);

  const visibleCustomers = useMemo(() => {
    if (!hasWorkspaceSelection) return [];

    const customerNeedle = normalizeFilter(selectedCustomer?.name ?? "");

    return customers.filter((customer) => {
      if (selectedCustomer) {
        if (!normalizeFilter(customer.name).includes(customerNeedle)) return false;
      }

      const projects = projectsByCustomer[customer.id] ?? [];
      const hasRelationFilter =
        Boolean(selectedProject) ||
        Boolean(selectedCampaign) ||
        Boolean(selectedField) ||
        allSelection.project ||
        allSelection.campaign ||
        allSelection.field;

      if (!hasRelationFilter) return true;

      return projects.some((project) => {
        return projectMatchesFilters(project, selectedProject, selectedCampaign, selectedField);
      });
    });
  }, [
    customers,
    hasWorkspaceSelection,
    projectsByCustomer,
    selectedCampaign,
    selectedCustomer,
    selectedField,
    selectedProject,
    allSelection.project,
    allSelection.campaign,
    allSelection.field,
  ]);

  const totalVisibleHectares = useMemo(() => {
    if (!hasWorkspaceSelection) return 0;

    return visibleCustomers.reduce((total, customer) => {
      const projects = projectsByCustomer[customer.id] ?? [];
      const filteredProjects = projects.filter((project) =>
        projectMatchesFilters(project, selectedProject, selectedCampaign, selectedField),
      );

      return (
        total +
        filteredProjects.reduce(
          (subtotal, project) => subtotal + sumProjectHectares(project, selectedField),
          0,
        )
      );
    }, 0);
  }, [
    projectsByCustomer,
    hasWorkspaceSelection,
    selectedCampaign,
    selectedField,
    selectedProject,
    visibleCustomers,
  ]);

  const visibleProjectRows = useMemo<CustomerProjectRow[]>(() => {
    if (!hasWorkspaceSelection) return [];

    return visibleCustomers.flatMap((customer): CustomerProjectRow[] => {
      const allProjects = projectsByCustomer[customer.id] ?? [];
      const projectIds = allProjects
        .map((project) => project.id)
        .filter((projectId): projectId is number => typeof projectId === "number" && projectId > 0);
      const projects = allProjects.filter((project) =>
        projectMatchesFilters(project, selectedProject, selectedCampaign, selectedField)
      );

      if (projects.length === 0) {
        return [
          {
            id: -customer.id,
            mode: "customer",
            customerId: customer.id,
            customerName: customer.name,
            projectIds,
            projectName: "Sin proyecto",
            campaignCount: 0,
            fieldCount: 0,
          },
        ];
      }

      if (!isProjectMode) {
        return [
          {
            id: -customer.id,
            mode: "customer",
            customerId: customer.id,
            customerName: customer.name,
            projectIds,
            projectName: "Todos",
            campaignCount: countUniqueCampaigns(projects),
            fieldCount: countUniqueFields(projects),
          },
        ];
      }

      return projects.map((project, index) => ({
        id: project.id ?? Number(`${customer.id}${index}`),
        mode: "project" as const,
        projectId: project.id,
        projectIds: project.id ? [project.id] : [],
        customerId: customer.id,
        customerName: customer.name,
        projectName: project.name ?? "Sin proyecto",
        campaignCount: campaignName(project) ? 1 : 0,
        fieldCount: Array.isArray(project.fields) ? project.fields.length : 0,
      }));
    });
  }, [
    projectsByCustomer,
    hasWorkspaceSelection,
    isProjectMode,
    selectedCampaign,
    selectedField,
    selectedProject,
    visibleCustomers,
  ]);

  const exportVisibleCustomers = useCallback(() => {
    const rows = visibleProjectRows.map((row) => ({
      Cliente: row.customerName,
      Proyecto: row.projectName,
      "Cantidad de Campañas": row.campaignCount,
      "Cantidad de Campos": row.fieldCount,
    }));

    const csv = [
      ["Cliente", "Proyecto", "Cantidad de Campañas", "Cantidad de Campos"].join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      buildTimestampedFilename("clientes_proyectos", "csv"),
    );
  }, [visibleProjectRows]);

  const importCustomers = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const content = await file.text();
        const names = content
          .split(/\r?\n/)
          .map((line) => line.split(/[;,]/)[0]?.replace(/^"|"$/g, "").trim())
          .filter(Boolean)
          .filter((name, index) => index > 0 || !/cliente|sociedad|name/i.test(name));

        const uniqueNames = Array.from(new Set(names));
        if (uniqueNames.length === 0) {
          toastError("El archivo no tiene clientes válidos.");
          return;
        }

        await Promise.all(uniqueNames.map((name) => createCustomer({ name })));
        toastSuccess(`Se importaron ${uniqueNames.length} clientes.`);
        refresh();
      } catch {
        toastError("No se pudo importar clientes. Usá CSV con una columna Cliente.");
      }
    },
    [createCustomer, refresh],
  );

  useEffect(() => {
    if (!hasWorkspaceSelection) return;

    refresh();
  }, [hasWorkspaceSelection, refresh]);

  useEffect(() => {
    let cancelled = false;

    const loadSummaries = async () => {
      if (!hasWorkspaceSelection || customers.length === 0) {
        setProjectsByCustomer({});
        return;
      }

      setProjectsLoading(true);
      try {
        const entries = await Promise.all(
          customers.map(async (customer) => {
            try {
              const response = await apiClient.get<ProjectSummaryResponse>(
                `/projects/customers/${customer.id}?page=1&per_page=1000`,
              );
              const projects = Array.isArray(response.data?.data)
                ? response.data.data
                : [];
              const detailedProjects = await loadProjectDetails(projects);
              return [customer.id, detailedProjects] as const;
            } catch {
              return [customer.id, [] as RawProject[]] as const;
            }
          }),
        );

        if (!cancelled) {
          const projectsMap = Object.fromEntries(entries);
          setProjectsByCustomer(projectsMap);
        }
      } finally {
        if (!cancelled) {
          setProjectsLoading(false);
        }
      }
    };

    void loadSummaries();

    return () => {
      cancelled = true;
    };
  }, [customers, dataVersion, hasWorkspaceSelection]);

  const bulkEntity = isProjectMode ? PROJECT_ENTITY : CUSTOMER_ENTITY;
  const bulkRows = useMemo(
    () => (isProjectMode ? visibleProjectRows.filter((row) => row.projectId) : visibleProjectRows),
    [isProjectMode, visibleProjectRows],
  );
  const rowArchive = useCallback(
    async (rowId: number) => {
      const row = visibleProjectRows.find((item) => item.id === rowId);
      if (!row) return;

      if (row.mode === "project") {
        if (!row.projectId) return;
        await deleteProject(row.projectId);
        return;
      }

      await archiveCustomer(row.customerId);
    },
    [archiveCustomer, deleteProject, visibleProjectRows],
  );

  const bulk = useBulkActions<CustomerProjectRow>({
    items: bulkRows,
    entity: bulkEntity,
    archive: rowArchive,
    onEdit: (row) => {
      setEditingCustomerId(row.customerId);
      setEditingProjectId(row.mode === "project" ? row.projectId ?? null : null);
    },
    onAfter: refresh,
  });

  const selectColumn = useMemo<Column<CustomerProjectRow>>(
    () => ({
      key: "id",
      header: "",
      align: "center",
      width: "40px",
      render: (_value, row) => (
          <Checkbox
            checked={bulk.isSelected(row.id)}
            onChange={(event) => {
              event.stopPropagation();
              bulk.toggle(row.id);
            }}
            onClick={(event) => event.stopPropagation()}
            aria-label={
              isProjectMode
                ? `Seleccionar proyecto ${row.projectName}`
                : `Seleccionar cliente ${row.customerName}`
            }
          />
      ),
    }),
    [bulk, isProjectMode],
  );

  const tableColumns = useMemo<Column<CustomerProjectRow>[]>(
    () => [
      selectColumn,
      { key: "customerName", header: "Cliente" },
      { key: "projectName", header: "Proyecto" },
      {
        key: "campaignCount",
        header: "Cantidad de campañas",
        align: "center",
      },
      {
        key: "fieldCount",
        header: "Cantidad de campos",
        align: "center",
      },
    ],
    [selectColumn],
  );

  return (
    <div>
      <AppFilterBar
        filters={filters}
        actions={[
          {
            label: "Importar",
            icon: <Download className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            accept: ".csv,text/csv",
            onFileChange: importCustomers,
          },
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: exportVisibleCustomers,
          },
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => setArchivedDrawerOpen(true),
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => setCreateDrawerOpen(true),
          },
        ]}
      />

      <DrawerShell
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title="Nuevo Cliente"
      >
        <CustomerEditor embedded onClose={() => setCreateDrawerOpen(false)} />
      </DrawerShell>

      <DrawerShell
        open={editingCustomerId !== null}
        onClose={() => {
          setEditingCustomerId(null);
          setEditingProjectId(null);
        }}
        title={editingProjectId ? "Editar Proyecto" : "Editar Cliente"}
      >
        <CustomerEditor
          embedded
          mode={editingProjectId ? "project" : "customerOnly"}
          customerId={editingCustomerId}
          initialProjectId={editingProjectId}
          onClose={() => {
            setEditingCustomerId(null);
            setEditingProjectId(null);
          }}
        />
      </DrawerShell>

      <ArchivedDrawer
        open={archivedDrawerOpen}
        title={archivedShowsProjects ? "Proyectos archivados" : "Clientes archivados"}
        onClose={() => setArchivedDrawerOpen(false)}
      >
        {archivedShowsProjects ? (
          <ArchivedProjects onAfterRestore={refreshAfterArchivedRestore} />
        ) : (
          <ArchivedCustomers onAfterRestore={refreshAfterArchivedRestore} />
        )}
      </ArchivedDrawer>

      <div className="relative">
        <LoadingOverlay show={hasWorkspaceSelection && (processing || projectsLoading)} />
        {error && <ErrorBanner message={error} />}
        {!hasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver clientes y proyectos"
            description="El listado no carga datos globales automáticamente."
          />
        ) : !processing && visibleCustomers.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Aún no hay clientes"
            description="Creá el primero para empezar a gestionar proyectos."
            cta={
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={() => setCreateDrawerOpen(true)}
              >
                Nuevo Cliente
              </Button>
            }
          />
        ) : (
          <>
            <div className="my-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <IndicatorCard
                title="Superficie total de hectáreas"
                value={`${formatNumberAr(totalVisibleHectares)} Has`}
                color="amber"
              />
            </div>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={bulkRows.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={bulkEntity}
            />
            <DataTable data={visibleProjectRows} columns={tableColumns} />
          </>
        )}
      </div>

    </div>
  );
}
