import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Download, Plus, Upload, UserCog } from "lucide-react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useManagers, {
  Manager,
  ManagerPayloadInput,
} from "../../../../hooks/useManagers";
import useProjects from "../../../../hooks/useDatabase/projects";
import { Project, ProjectData } from "../../../../hooks/useDatabase/projects/types";
import { Column } from "../../types";
import { MANAGER_ENTITY as ENTITY } from "../../entities";
import ManagerFormDrawer from "./ManagerFormDrawer";
import ArchivedManagers from "./ArchivedManagers";
import { downloadCsvRows } from "../../fileTransfer";

const toFilterOptions = (values: string[]) =>
  values.map((value, index) => ({ id: `${value}-${index}`, name: value }));

type ManagerProjectRelation = {
  customer: string;
  project: string;
  campaign: string;
  fields: string[];
};

type ManagerRow = Manager & {
  project_count: number;
  related_customers: string;
  related_projects: string;
  related_campaigns: string;
  related_fields: string;
};

const relationColumns: Column<ManagerRow>[] = [
  { key: "name", header: "Nombre" },
  {
    key: "project_count",
    header: "Proyectos",
    align: "center",
    render: (value) => <strong>{String(value ?? 0)}</strong>,
  },
  {
    key: "related_customers",
    header: "Clientes / Sociedades",
    wrap: true,
    render: (value) => String(value || "-"),
  },
  {
    key: "related_projects",
    header: "Proyectos relacionados",
    wrap: true,
    render: (value) => String(value || "-"),
  },
  {
    key: "related_campaigns",
    header: "Campañas",
    render: (value) => String(value || "-"),
  },
  {
    key: "related_fields",
    header: "Campos",
    wrap: true,
    render: (value) => String(value || "-"),
  },
];

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function uniqueJoined(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).join(", ");
}

function uniqueOptions(values: string[]) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

function getProjectFieldNames(project: ProjectData, detail?: Project) {
  const fields = detail?.fields ?? project.fields ?? [];
  return fields.map((field) => field.name).filter(Boolean);
}

function managerBelongsToProject(
  manager: Manager,
  project: ProjectData,
  detail?: Project,
) {
  const normalizedManagerName = normalizeName(manager.name);
  const detailManagers = detail?.managers ?? [];

  if (
    detailManagers.some(
      (entry) =>
        (entry.id !== null && entry.id !== 0 && entry.id === manager.id) ||
        normalizeName(entry.name) === normalizedManagerName,
    )
  ) {
    return true;
  }

  return (project.managers || "")
    .split(/[,;]+/)
    .map((entry) => normalizeName(entry))
    .filter(Boolean)
    .some(
      (entry) =>
        entry === normalizedManagerName ||
        entry.includes(normalizedManagerName) ||
        normalizedManagerName.includes(entry),
    );
}

function findManagerRelations(
  manager: Manager,
  projects: ProjectData[],
  details: Record<number, Project>,
) {
  return projects.reduce<ManagerProjectRelation[]>((relations, project) => {
    const detail = details[project.id];
    if (!managerBelongsToProject(manager, project, detail)) return relations;

    relations.push({
      customer: detail?.customer.name || project.customer,
      project: project.name,
      campaign: detail?.campaign.name || project.campaign,
      fields: getProjectFieldNames(project, detail),
    });
    return relations;
  }, []);
}

function buildManagerRows(
  managers: Manager[],
  projects: ProjectData[],
  details: Record<number, Project>,
): ManagerRow[] {
  return managers.map((manager) => {
    const relations = findManagerRelations(manager, projects, details);

    return {
      ...manager,
      project_count: relations.length,
      related_customers: uniqueJoined(relations.map((relation) => relation.customer)),
      related_projects: uniqueJoined(relations.map((relation) => relation.project)),
      related_campaigns: uniqueJoined(relations.map((relation) => relation.campaign)),
      related_fields: uniqueJoined(relations.flatMap((relation) => relation.fields)),
    };
  });
}

type ManagersListProps = {
  editorOnly?: boolean;
};

export default function ManagersList({ editorOnly = false }: ManagersListProps) {
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [projectDetails, setProjectDetails] = useState<Record<number, Project>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const {
    managers,
    processing,
    error,
    getManagers,
    createManager,
    updateManager,
    archiveManager,
  } = useManagers();
  const {
    projects,
    processing: projectsProcessing,
    error: projectsError,
    getProjects,
  } = useProjects();

  const refresh = useCallback(() => {
    getManagers("limit=1000");
  }, [getManagers]);

  const refreshProjects = useCallback(() => {
    getProjects("page=1&per_page=1000");
  }, [getProjects]);

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const detail = projectDetails[project.id];
        const fieldNames = getProjectFieldNames(project, detail);
        return (
          (!selectedCustomer || (detail?.customer.name || project.customer) === selectedCustomer) &&
          (!selectedProject || project.name === selectedProject) &&
          (!selectedCampaign || (detail?.campaign.name || project.campaign) === selectedCampaign) &&
          (!selectedField || fieldNames.includes(selectedField))
        );
      }),
    [projectDetails, projects, selectedCampaign, selectedCustomer, selectedField, selectedProject],
  );

  const hasActiveFilters =
    Boolean(selectedCustomer) ||
    Boolean(selectedProject) ||
    Boolean(selectedCampaign) ||
    Boolean(selectedField);

  const rows = useMemo(() => {
    const builtRows = buildManagerRows(managers, filteredProjects, projectDetails);
    return hasActiveFilters
      ? builtRows.filter((row) => row.project_count > 0)
      : builtRows;
  }, [filteredProjects, hasActiveFilters, managers, projectDetails]);

  const filterOptions = useMemo(
    () => ({
      customers: uniqueOptions(
        projects.map((project) => projectDetails[project.id]?.customer.name || project.customer),
      ),
      projects: uniqueOptions(
        projects
          .filter(
            (project) =>
              !selectedCustomer ||
              (projectDetails[project.id]?.customer.name || project.customer) === selectedCustomer,
          )
          .map((project) => project.name),
      ),
      campaigns: uniqueOptions(
        projects
          .filter(
            (project) =>
              !selectedCustomer ||
              (projectDetails[project.id]?.customer.name || project.customer) === selectedCustomer,
          )
          .filter((project) => !selectedProject || project.name === selectedProject)
          .map((project) => projectDetails[project.id]?.campaign.name || project.campaign),
      ),
      fields: uniqueOptions(
        projects
          .filter(
            (project) =>
              !selectedCustomer ||
              (projectDetails[project.id]?.customer.name || project.customer) === selectedCustomer,
          )
          .filter((project) => !selectedProject || project.name === selectedProject)
          .filter(
            (project) =>
              !selectedCampaign ||
              (projectDetails[project.id]?.campaign.name || project.campaign) === selectedCampaign,
          )
          .flatMap((project) => getProjectFieldNames(project, projectDetails[project.id])),
      ),
    }),
    [projectDetails, projects, selectedCampaign, selectedCustomer, selectedProject],
  );

  const drawer = useEntityFormDrawer<Manager, ManagerPayloadInput>({
    buildSuccessLabel: (input) => `el responsable "${input.name}"`,
    create: createManager,
    update: updateManager,
    fallbackErrorMessage: "No se pudo guardar el responsable",
    onAfter: refresh,
  });

  const importManagers = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const names = Array.from(
        new Set(
          text
            .split(/\r?\n/)
            .map((line) => line.split(/[;,]/)[0]?.replace(/^"|"$/g, "").trim())
            .filter(Boolean)
            .filter((name, index) => index > 0 || !/responsable|nombre|name/i.test(name)),
        ),
      );
      await Promise.all(names.map((name) => createManager({ name })));
      refresh();
    },
    [createManager, refresh],
  );

  const handleExport = useCallback(() => {
    downloadCsvRows(
      `responsables_${new Date().toISOString()}.csv`,
      rows.map((row) => ({
        Nombre: row.name,
        Proyectos: row.project_count,
        "Clientes / Sociedades": row.related_customers,
        "Proyectos relacionados": row.related_projects,
        Campañas: row.related_campaigns,
        Campos: row.related_fields,
      })),
    );
  }, [rows]);

  const bulk = useBulkActions<ManagerRow>({
    items: rows,
    entity: ENTITY,
    archive: archiveManager,
    onEdit: (item) => drawer.openEdit(item),
    onAfter: () => {
      refresh();
      refreshProjects();
    },
  });

  useEffect(() => {
    refresh();
    refreshProjects();
  }, [refresh, refreshProjects]);

  useEffect(() => {
    if (projects.length === 0) return;
    const missingProjects = projects.filter((project) => !projectDetails[project.id]);
    if (missingProjects.length === 0) return;

    let cancelled = false;
    setLoadingDetails(true);

    Promise.all(
      missingProjects.map(async (project) => {
        const response = await apiClient.get<SuccessResponse<Project>>(
          `/projects/${project.id}`,
        );
        return [project.id, response.data] as const;
      }),
    )
      .then((entries) => {
        if (cancelled) return;
        setProjectDetails((prev) => {
          const next = { ...prev };
          entries.forEach(([id, detail]) => {
            next[id] = detail;
          });
          return next;
        });
      })
      .catch(() => {
        // Si falla el detalle, la tabla conserva el resumen disponible.
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectDetails, projects]);

  const selectColumn = useMemo<Column<ManagerRow>>(
    () => makeSelectColumn<ManagerRow>(bulk, (m) => m.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<ManagerRow>[]>(
    () => [
      selectColumn,
      ...relationColumns,
    ],
    [selectColumn],
  );

  return (
    <div>
      <div className="relative">
        <LoadingOverlay show={processing || projectsProcessing || loadingDetails} />
        {(error || projectsError) && <ErrorBanner message={error || projectsError} />}
        <AppFilterBar
          filters={[
            {
              type: "search",
              name: "cliente",
              label: "Cliente",
              placeholder: "Buscar",
              value: selectedCustomer || "Todos los clientes",
              options: toFilterOptions(filterOptions.customers),
              onChange: setSelectedCustomer,
              setData: (data) => {
                const option = data as { id?: number | string; name?: string } | undefined;
                setSelectedCustomer(option?.id === 0 ? "" : option?.name ?? "");
                setSelectedProject("");
                setSelectedCampaign("");
                setSelectedField("");
              },
              allLabel: "Todos los clientes",
            },
            {
              type: "search",
              name: "proyecto",
              label: "Proyecto",
              placeholder: "Buscar",
              value: selectedProject || "Todos los proyectos",
              options: toFilterOptions(filterOptions.projects),
              onChange: setSelectedProject,
              setData: (data) => {
                const option = data as { id?: number | string; name?: string } | undefined;
                setSelectedProject(option?.id === 0 ? "" : option?.name ?? "");
                setSelectedCampaign("");
                setSelectedField("");
              },
              allLabel: "Todos los proyectos",
            },
            {
              type: "search",
              name: "campaña",
              label: "Campaña",
              placeholder: "Buscar",
              value: selectedCampaign || "Todas las campañas",
              options: toFilterOptions(filterOptions.campaigns),
              onChange: setSelectedCampaign,
              setData: (data) => {
                const option = data as { id?: number | string; name?: string } | undefined;
                setSelectedCampaign(option?.id === 0 ? "" : option?.name ?? "");
                setSelectedField("");
              },
              allLabel: "Todas las campañas",
            },
            {
              type: "search",
              name: "campo",
              label: "Campo",
              placeholder: "Buscar",
              value: selectedField || "Todos los campos",
              options: toFilterOptions(filterOptions.fields),
              onChange: setSelectedField,
              setData: (data) => {
                const option = data as { id?: number | string; name?: string } | undefined;
                setSelectedField(option?.id === 0 ? "" : option?.name ?? "");
              },
              allLabel: "Todos los campos",
            },
          ]}
          actions={[
            {
              label: "Importar",
              icon: <Download className="h-4 w-4" />,
              variant: "primary",
              isPrimary: true,
              accept: ".csv,text/csv",
              onFileChange: importManagers,
            },
            {
              label: "Exportar",
              icon: <Upload className="h-4 w-4" />,
              variant: "primary",
              isPrimary: true,
              onClick: handleExport,
            },
            {
              label: "Nuevo Responsable",
              icon: <Plus className="h-4 w-4" />,
              variant: "primary",
              isPrimary: true,
              onClick: drawer.openCreate,
            },
            {
              label: "Archivados",
              icon: <Archive className="h-4 w-4" />,
              variant: "primary",
              isPrimary: true,
              onClick: () => setArchivedDrawerOpen(true),
            },
          ]}
        />
        {!processing && rows.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="Aún no hay responsables"
            description={
              editorOnly
                ? "No hay responsables disponibles para editar."
                : "Creá el primero para asociarlo a tus proyectos."
            }
            cta={!editorOnly ? (
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={drawer.openCreate}
              >
                Nuevo responsable
              </Button>
            ) : undefined}
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={rows.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <DataTable data={rows} columns={tableColumns} />
          </>
        )}
      </div>

      <ManagerFormDrawer
        open={drawer.open}
        manager={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Responsables archivados"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedManagers onAfterRestore={refresh} />
      </ArchivedDrawer>
    </div>
  );
}
