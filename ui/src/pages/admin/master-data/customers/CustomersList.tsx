import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Briefcase, Download, Plus, Upload } from "lucide-react";

import { apiClient } from "@/api/client";
import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../../components/crud/ResponsiveTable";
import { formatProperName } from "@/lib/properName";
import Button from "../../../../components/Button/Button";
import { Checkbox } from "../../../../components/Input/Checkbox";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { notify } from "@/lib/notify";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../../components/feedback/Skeleton";
import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { DrawerShell } from "../../../../components/Drawer/DrawerShell";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import useProjects from "../../../../hooks/useDatabase/projects";
import {
  buildTimestampedFilename,
  downloadExcelRows,
  EXCEL_ACCEPT,
  readImportTableAsCsvText,
} from "../../fileTransfer";
import useCustomers from "../../../../hooks/useCustomers";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import { useSelection } from "../../../login/context/useSelection";
import { Column } from "../../types";
import { CUSTOMER_ENTITY, PROJECT_ENTITY } from "../../entities";
import { formatNumberAr } from "../../utils";
import ArchivedCustomers from "./ArchivedCustomers";
import ArchivedProjects from "../projects/ArchivedProjects";
import CustomerEditor from "./CustomerEditor";
import ProjectEditor from "../../projects/ProjectEditor";

import {
  type CustomerProjectMode,
  type CustomerProjectRow,
  type ProjectSummaryResponse,
  type RawProject,
  campaignName,
  countUniqueCampaigns,
  countUniqueFields,
  customerMatchesFilter,
  getProjectIdForEdit,
  loadProjectDetails,
  normalizeFilter,
  projectMatchesFilters,
  sumProjectHectares,
  uniqueProjectRowsByName,
} from "./customersListHelpers";

type CustomersListProps = {
  /**
   * Si es true, la pantalla se centra en proyectos:
   *   - lista solo filas de tipo project (sin customers vacíos)
   *   - botón "+ Nuevo" crea proyecto (no cliente)
   *   - títulos y copy adaptados
   * Se monta desde `/admin/projects` (alias legacy:
   * `/admin/master-data/projects/list`). Si es false (default),
   * comportamiento histórico de "Clientes y Proyectos" mezclados.
   */
  projectsOnly?: boolean;
  selectionOnlyRelations?: boolean;
};

export default function CustomersList({
  projectsOnly = false,
  selectionOnlyRelations,
}: CustomersListProps = {}) {
  const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<number | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<number | null>(null);
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [dataVersion, setDataVersion] = useState(0);
  const pagination = usePagination({ perPage: 25 });
  const { customers, processing, error, getCustomers, createCustomer, archiveCustomer } =
    useCustomers();

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  const [projectsByCustomer, setProjectsByCustomer] = useState<Record<number, RawProject[]>>({});
  const [projectsLoading, setProjectsLoading] = useState(false);
  const { deleteProject } = useProjects();
  const { allSelection } = useSelection();
  const restrictedProjectFlow = selectionOnlyRelations ?? projectsOnly;
  const {
    filters,
    selectedCustomer,
    selectedProject,
    selectedCampaignId,
    selectedField,
    campaigns,
    hasWorkspaceSelection,
    workspaceReady,
  } = useWorkspaceFilters(
    ["customer", "project", "campaign", "field"],
    restrictedProjectFlow
      ? {
          requiredFilters: ["customer", "project", "campaign"],
          allowAll: false,
          uniqueProjectNames: true,
        }
      : {}
  );
  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId]
  );
  const canLoadList = restrictedProjectFlow ? workspaceReady : hasWorkspaceSelection;
  const canCreateProject = restrictedProjectFlow
    ? Boolean(selectedCustomer?.id && selectedProject?.id && selectedCampaign?.id)
    : true;
  const hasProjectScope = Boolean(
    selectedProject?.id ||
    selectedCampaign?.id ||
    selectedField?.id ||
    allSelection.project ||
    allSelection.campaign ||
    allSelection.field
  );
  const mode: CustomerProjectMode = projectsOnly || hasProjectScope ? "project" : "customer";
  const isProjectMode = mode === "project";
  const archivedShowsProjects = projectsOnly || hasProjectScope;

  const refresh = useCallback(() => getCustomers("per_page=1000"), [getCustomers]);
  const refreshAfterArchivedRestore = useCallback(async () => {
    await refresh();
    setDataVersion((current) => current + 1);
  }, [refresh]);

  const visibleCustomers = useMemo(() => {
    if (!canLoadList) return [];

    return customers.filter((customer) => {
      if (!customerMatchesFilter(customer, selectedCustomer, allSelection.customer)) return false;

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
    canLoadList,
    hasWorkspaceSelection,
    projectsByCustomer,
    allSelection.customer,
    selectedCampaign,
    selectedCustomer,
    selectedField,
    selectedProject,
    allSelection.project,
    allSelection.campaign,
    allSelection.field,
  ]);

  const totalVisibleHectares = useMemo(() => {
    if (!canLoadList) return 0;

    return visibleCustomers.reduce((total, customer) => {
      const projects = projectsByCustomer[customer.id] ?? [];
      const filteredProjects = projects.filter((project) =>
        projectMatchesFilters(project, selectedProject, selectedCampaign, selectedField)
      );

      return (
        total +
        filteredProjects.reduce(
          (subtotal, project) => subtotal + sumProjectHectares(project, selectedField),
          0
        )
      );
    }, 0);
  }, [
    projectsByCustomer,
    canLoadList,
    hasWorkspaceSelection,
    selectedCampaign,
    selectedField,
    selectedProject,
    visibleCustomers,
  ]);

  const visibleProjectNameOptions = useMemo(() => {
    if (!canLoadList) return [];

    return visibleCustomers
      .flatMap((customer) => {
        const allProjects = projectsByCustomer[customer.id] ?? [];
        return allProjects
          .filter((project) =>
            projectMatchesFilters(project, selectedProject, selectedCampaign, selectedField)
          )
          .map((project) => ({
            id: project.id ?? null,
            name: project.name ?? "",
          }));
      })
      .filter((project) => project.name.trim());
  }, [
    canLoadList,
    projectsByCustomer,
    selectedCampaign,
    selectedField,
    selectedProject,
    visibleCustomers,
  ]);

  const visibleProjectRows = useMemo<CustomerProjectRow[]>(() => {
    if (!canLoadList) return [];

    const baseRows = visibleCustomers.flatMap((customer): CustomerProjectRow[] => {
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
        campaignLabel: campaignName(project) || undefined,
        campaignCount: campaignName(project) ? 1 : 0,
        fieldCount: Array.isArray(project.fields) ? project.fields.length : 0,
      }));
    });

    // Annotate project rows with the size of their (customerId, projectName)
    // group so the renderer can disambiguate homónimos with the campaign label.
    const groupSizes = new Map<string, number>();
    for (const row of baseRows) {
      if (row.mode !== "project") continue;
      const key = `${row.customerId}|${normalizeFilter(row.projectName)}`;
      groupSizes.set(key, (groupSizes.get(key) ?? 0) + 1);
    }
    const annotatedRows = baseRows.map((row) => {
      if (row.mode !== "project") return row;
      const key = `${row.customerId}|${normalizeFilter(row.projectName)}`;
      return { ...row, groupSize: groupSizes.get(key) ?? 1 };
    });
    return restrictedProjectFlow ? uniqueProjectRowsByName(annotatedRows) : annotatedRows;
  }, [
    projectsByCustomer,
    canLoadList,
    hasWorkspaceSelection,
    isProjectMode,
    restrictedProjectFlow,
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

    void downloadExcelRows(
      buildTimestampedFilename("clientes_proyectos", "xlsx"),
      rows,
      "Clientes"
    );
  }, [visibleProjectRows]);

  const importCustomers = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      try {
        const content = await readImportTableAsCsvText(file);
        const names = content
          .split(/\r?\n/)
          .map((line) => line.split(/[;,]/)[0]?.replace(/^"|"$/g, "").trim())
          .filter(Boolean)
          .filter((name, index) => index > 0 || !/cliente|sociedad|name/i.test(name));

        const uniqueNames = Array.from(new Set(names));
        if (uniqueNames.length === 0) {
          notify.error("El archivo no tiene clientes válidos.");
          return;
        }

        await Promise.all(uniqueNames.map((name) => createCustomer({ name })));
        notify.success(`Se importaron ${uniqueNames.length} clientes.`);
        refresh();
      } catch {
        notify.error("No se pudo importar clientes. Usá Excel con una columna Cliente.");
      }
    },
    [createCustomer, refresh]
  );

  useEffect(() => {
    if (!canLoadList) return;

    refresh();
  }, [canLoadList, refresh]);

  useEffect(() => {
    let cancelled = false;

    const loadSummaries = async () => {
      if (!canLoadList || customers.length === 0) {
        setProjectsByCustomer({});
        return;
      }

      setProjectsLoading(true);
      try {
        const entries = await Promise.all(
          customers.map(async (customer) => {
            try {
              const response = await apiClient.get<ProjectSummaryResponse>(
                `/projects/customers/${customer.id}?page=1&per_page=1000`
              );
              const projects = Array.isArray(response.data?.data) ? response.data.data : [];
              const detailedProjects = await loadProjectDetails(projects);
              return [customer.id, detailedProjects] as const;
            } catch {
              return [customer.id, [] as RawProject[]] as const;
            }
          })
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
  }, [canLoadList, customers, dataVersion]);

  const bulkEntity = isProjectMode ? PROJECT_ENTITY : CUSTOMER_ENTITY;
  const bulkRows = useMemo(
    () => (isProjectMode ? visibleProjectRows.filter((row) => row.projectId) : visibleProjectRows),
    [isProjectMode, visibleProjectRows]
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
    [archiveCustomer, deleteProject, visibleProjectRows]
  );

  const bulk = useBulkActions<CustomerProjectRow>({
    items: bulkRows,
    entity: bulkEntity,
    archive: rowArchive,
    onEdit: (row) => {
      const projectIdForEdit = getProjectIdForEdit(row, selectedProject);
      setEditingCustomerId(row.customerId);
      setEditingProjectId(projectIdForEdit);
    },
    onAfter: refreshAfterArchivedRestore,
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
    [bulk, isProjectMode]
  );

  const tableColumns = useMemo<Column<CustomerProjectRow>[]>(
    () => [
      selectColumn,
      { key: "customerName", header: "Cliente", render: (value) => formatProperName(value) },
      {
        key: "projectName",
        header: "Proyecto",
        render: (value, row) => {
          const base = formatProperName(value);
          if (row.mode === "project" && row.groupSize && row.groupSize > 1 && row.campaignLabel) {
            return `${base} (${row.campaignLabel})`;
          }
          return base;
        },
      },
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
    [selectColumn]
  );

  return (
    <div>
      <AppFilterBar
        filters={filters}
        actions={[
          ...(projectsOnly
            ? []
            : [
                {
                  label: "Importar",
                  icon: <Download className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  accept: EXCEL_ACCEPT,
                  onFileChange: importCustomers,
                },
                {
                  label: "Exportar",
                  icon: <Upload className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  onClick: exportVisibleCustomers,
                },
              ]),
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => setArchivedDrawerOpen(true),
          },
          {
            label: projectsOnly ? "Configurar Proyecto" : "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: !canCreateProject,
            onClick: () => {
              if (!canCreateProject) {
                notify.warning(
                  "Seleccioná cliente, proyecto y campaña para configurar el proyecto."
                );
                return;
              }
              setCreateDrawerOpen(true);
            },
          },
        ]}
      />

      <DrawerShell
        open={createDrawerOpen}
        onClose={() => setCreateDrawerOpen(false)}
        title={projectsOnly ? "Configurar Proyecto" : "Nuevo Cliente"}
      >
        {projectsOnly ? (
          <ProjectEditor
            embedded
            customerId={selectedCustomer?.id ?? null}
            initialProjectId={selectedProject?.id ?? null}
            selectionOnlyRelations={restrictedProjectFlow}
            initialCustomer={selectedCustomer ?? null}
            initialCampaign={
              selectedCampaign ? { id: selectedCampaign.id, name: selectedCampaign.name } : null
            }
            contextProject={selectedProject ?? null}
            projectNameScope={visibleProjectNameOptions}
            onSaved={refreshAfterArchivedRestore}
            onClose={() => setCreateDrawerOpen(false)}
          />
        ) : (
          <CustomerEditor
            embedded
            selectionOnlyRelations={restrictedProjectFlow}
            initialCustomer={selectedCustomer ?? null}
            initialCampaign={
              selectedCampaign ? { id: selectedCampaign.id, name: selectedCampaign.name } : null
            }
            contextProject={selectedProject ?? null}
            projectNameScope={visibleProjectNameOptions}
            onSaved={refreshAfterArchivedRestore}
            onClose={() => setCreateDrawerOpen(false)}
          />
        )}
      </DrawerShell>

      <DrawerShell
        open={editingCustomerId !== null}
        onClose={() => {
          setEditingCustomerId(null);
          setEditingProjectId(null);
        }}
        title={editingProjectId ? "Editar Proyecto" : "Editar Cliente"}
      >
        {editingProjectId ? (
          <ProjectEditor
            embedded
            customerId={editingCustomerId}
            initialProjectId={editingProjectId}
            selectionOnlyRelations={restrictedProjectFlow}
            initialCustomer={selectedCustomer ?? null}
            initialCampaign={
              selectedCampaign ? { id: selectedCampaign.id, name: selectedCampaign.name } : null
            }
            contextProject={selectedProject ?? null}
            projectNameScope={visibleProjectNameOptions}
            onSaved={refreshAfterArchivedRestore}
            onClose={() => {
              setEditingCustomerId(null);
              setEditingProjectId(null);
            }}
          />
        ) : (
          <CustomerEditor
            embedded
            customerId={editingCustomerId}
            selectionOnlyRelations={restrictedProjectFlow}
            initialCustomer={selectedCustomer ?? null}
            initialCampaign={
              selectedCampaign ? { id: selectedCampaign.id, name: selectedCampaign.name } : null
            }
            contextProject={selectedProject ?? null}
            projectNameScope={visibleProjectNameOptions}
            onSaved={refreshAfterArchivedRestore}
            onClose={() => {
              setEditingCustomerId(null);
              setEditingProjectId(null);
            }}
          />
        )}
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
        <LoadingOverlay
          show={
            hasWorkspaceSelection &&
            (processing || projectsLoading) &&
            visibleProjectRows.length > 0
          }
        />
        {!canLoadList ? (
          <EmptyState
            icon={Briefcase}
            title={
              restrictedProjectFlow
                ? "Seleccioná cliente, proyecto y campaña"
                : "Seleccioná filtros para ver clientes y proyectos"
            }
            description={
              restrictedProjectFlow
                ? "El listado de proyectos se muestra únicamente dentro de ese contexto."
                : "El listado no carga datos globales automáticamente."
            }
          />
        ) : (processing || projectsLoading) && visibleProjectRows.length === 0 ? (
          <TableSkeleton rows={10} columns={tableColumns.length} />
        ) : visibleCustomers.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title={projectsOnly ? "No hay proyectos para los filtros" : "Aún no hay clientes"}
            description={
              projectsOnly
                ? "Cambiá la selección o creá un proyecto para el cliente y campaña elegidos."
                : "Creá el primero para empezar a gestionar proyectos."
            }
            cta={
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                disabled={!canCreateProject}
                onClick={() => {
                  if (!canCreateProject) {
                    notify.warning("Seleccioná cliente y campaña para crear un proyecto.");
                    return;
                  }
                  setCreateDrawerOpen(true);
                }}
              >
                {projectsOnly ? "Configurar Proyecto" : "Nuevo Cliente"}
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
            <ResponsiveTable<CustomerProjectRow>
              data={visibleProjectRows}
              columns={tableColumns}
              pagination={pagination.buildPagination(visibleProjectRows.length)}
              primaryKey="customerName"
              rowKey={(r) => `${r.customerId}-${r.id}`}
              emptyMessage="No hay clientes para mostrar"
            />
          </>
        )}
      </div>
    </div>
  );
}
