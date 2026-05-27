import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Download, Plus, Upload, Users } from "lucide-react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../../components/crud/ResponsiveTable";
import { formatProperName } from "@/lib/properName";
import Button from "../../../../components/Button/Button";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { notify } from "@/lib/notify";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../../components/feedback/Skeleton";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useInvestors, {
  Investor,
  InvestorPayloadInput,
} from "../../../../hooks/useInvestors";
import useProjects from "../../../../hooks/useDatabase/projects";
import { Project } from "../../../../hooks/useDatabase/projects/types";
import { Column } from "../../types";
import { INVESTOR_ENTITY as ENTITY } from "../../entities";
import InvestorFormDrawer from "./InvestorFormDrawer";
import ArchivedInvestors from "./ArchivedInvestors";
import { downloadCsvRows, EXCEL_ACCEPT, readImportTableAsCsvText } from "../../fileTransfer";

const toFilterOptions = (values: string[], formatDisplay = true) =>
  values.map((value, index) => ({
    id: `${value}-${index}`,
    name: value,
    displayName: formatDisplay ? formatProperName(value) : value,
  }));

import {
  type InvestorRow,
  buildInvestorRows,
  getProjectFieldNames,
  uniqueOptions,
} from "./investorsListHelpers";

const relationColumns: Column<InvestorRow>[] = [
  { key: "name", header: "Nombre", render: (value) => formatProperName(value) },
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
    render: (value) => String(value || "—"),
  },
  {
    key: "related_projects",
    header: "Proyectos relacionados",
    wrap: true,
    render: (value) => String(value || "—"),
  },
  {
    key: "related_campaigns",
    header: "Campañas",
    render: (value) => String(value || "—"),
  },
  {
    key: "related_percentages",
    header: "Aportes",
    align: "right",
    render: (value) => <span className="tabular-nums">{String(value || "—")}</span>,
  },
];

type InvestorsListProps = {
  editorOnly?: boolean;
};

export default function InvestorsList({ editorOnly = false }: InvestorsListProps) {
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const pagination = usePagination({ perPage: 25 });
  const [selectedCustomer, setSelectedCustomer] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState("");
  const [selectedField, setSelectedField] = useState("");
  const [projectDetails, setProjectDetails] = useState<Record<number, Project>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const {
    investors,
    processing,
    error,
    getInvestors,
    createInvestor,
    updateInvestor,
    archiveInvestor,
  } = useInvestors();
  const {
    projects,
    processing: projectsProcessing,
    error: projectsError,
    getProjects,
  } = useProjects();

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  useEffect(() => {
    if (projectsError) notify.error(projectsError);
  }, [projectsError]);

  const refresh = useCallback(
    () => getInvestors("limit=1000"),
    [getInvestors],
  );

  const refreshProjects = useCallback(
    () => getProjects("page=1&per_page=1000"),
    [getProjects],
  );

  const filteredProjects = useMemo(
    () =>
      projects.filter((project) => {
        const fieldNames = getProjectFieldNames(project, projectDetails[project.id]);
        return (
          (!selectedCustomer ||
            (projectDetails[project.id]?.customer.name || project.customer) === selectedCustomer) &&
          (!selectedProject || project.name === selectedProject) &&
          (!selectedCampaign ||
            (projectDetails[project.id]?.campaign.name || project.campaign) ===
              selectedCampaign) &&
          (!selectedField || fieldNames.includes(selectedField))
        );
      }),
    [
      projectDetails,
      projects,
      selectedCampaign,
      selectedCustomer,
      selectedField,
      selectedProject,
    ],
  );

  const hasActiveFilters =
    Boolean(selectedCustomer) ||
    Boolean(selectedProject) ||
    Boolean(selectedCampaign) ||
    Boolean(selectedField);

  const rows = useMemo(
    () => {
      const builtRows = buildInvestorRows(investors, filteredProjects, projectDetails);
      return hasActiveFilters
        ? builtRows.filter((row) => row.project_count > 0)
        : builtRows;
    },
    [filteredProjects, hasActiveFilters, investors, projectDetails],
  );

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
              (projectDetails[project.id]?.customer.name || project.customer) ===
                selectedCustomer,
          )
          .map((project) => project.name),
      ),
      campaigns: uniqueOptions(
        projects
          .filter(
            (project) =>
              !selectedCustomer ||
              (projectDetails[project.id]?.customer.name || project.customer) ===
                selectedCustomer,
          )
          .filter((project) => !selectedProject || project.name === selectedProject)
          .map((project) => projectDetails[project.id]?.campaign.name || project.campaign),
      ),
      fields: uniqueOptions(
        projects
          .filter(
            (project) =>
              !selectedCustomer ||
              (projectDetails[project.id]?.customer.name || project.customer) ===
                selectedCustomer,
          )
          .filter((project) => !selectedProject || project.name === selectedProject)
          .filter(
            (project) =>
              !selectedCampaign ||
              (projectDetails[project.id]?.campaign.name || project.campaign) ===
                selectedCampaign,
          )
          .flatMap((project) => getProjectFieldNames(project, projectDetails[project.id])),
      ),
    }),
    [projectDetails, projects, selectedCampaign, selectedCustomer, selectedProject],
  );

  const drawer = useEntityFormDrawer<Investor, InvestorPayloadInput>({
    buildSuccessLabel: (input) => `el inversor "${input.name}"`,
    create: createInvestor,
    update: updateInvestor,
    fallbackErrorMessage: "No se pudo guardar el inversor",
    onAfter: refresh,
  });

  const importInvestors = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await readImportTableAsCsvText(file);
      const names = Array.from(
        new Set(
          text
            .split(/\r?\n/)
            .map((line) => line.split(/[;,]/)[0]?.replace(/^"|"$/g, "").trim())
            .filter(Boolean)
            .filter((name, index) => index > 0 || !/inversor|nombre|name/i.test(name)),
        ),
      );
      await Promise.all(names.map((name) => createInvestor({ name })));
      refresh();
    },
    [createInvestor, refresh],
  );

  const handleExport = useCallback(() => {
    downloadCsvRows(
      `inversores_${new Date().toISOString()}.csv`,
      rows.map((row) => ({
        Nombre: row.name,
        Proyectos: row.project_count,
        "Clientes / Sociedades": row.related_customers,
        "Proyectos relacionados": row.related_projects,
        Campañas: row.related_campaigns,
        Aportes: row.related_percentages,
      })),
    );
  }, [rows]);

  const bulk = useBulkActions<InvestorRow>({
    items: rows,
    entity: ENTITY,
    archive: archiveInvestor,
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

  const selectColumn = useMemo<Column<InvestorRow>>(
    () => makeSelectColumn<InvestorRow>(bulk, (i) => i.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<InvestorRow>[]>(
    () => [
      selectColumn,
      ...relationColumns,
    ],
    [selectColumn],
  );

  return (
    <div>
      <div className="relative">
        <LoadingOverlay show={(processing || projectsProcessing || loadingDetails) && rows.length > 0} />
        <AppFilterBar
          filters={[
            {
              type: "search",
              name: "cliente",
              label: "Cliente",
              placeholder: "Buscar",
              value: selectedCustomer ? formatProperName(selectedCustomer) : "Todos los clientes",
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
              value: selectedProject ? formatProperName(selectedProject) : "Todos los proyectos",
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
              options: toFilterOptions(filterOptions.campaigns, false),
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
              value: selectedField ? formatProperName(selectedField) : "Todos los campos",
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
              accept: EXCEL_ACCEPT,
              onFileChange: importInvestors,
            },
            {
              label: "Exportar",
              icon: <Upload className="h-4 w-4" />,
              variant: "primary",
              isPrimary: true,
              onClick: handleExport,
            },
            {
              label: "Nuevo Inversor",
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
        {(processing || projectsProcessing || loadingDetails) && rows.length === 0 ? (
          <TableSkeleton rows={10} columns={tableColumns.length} />
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aún no hay inversores"
            description={
              editorOnly
                ? "No hay inversores disponibles para editar."
                : "Creá el primero para asociarlo a tus proyectos."
            }
            cta={!editorOnly ? (
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={drawer.openCreate}
              >
                Nuevo inversor
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
            <ResponsiveTable<InvestorRow>
              data={rows}
              columns={tableColumns}
              pagination={pagination.buildPagination(rows.length)}
              primaryKey="name"
              rowKey={(i) => i.id}
              emptyMessage="No hay inversores para mostrar"
            />
          </>
        )}
      </div>

      <InvestorFormDrawer
        open={drawer.open}
        investor={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Inversores archivados"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedInvestors onAfterRestore={refresh} />
      </ArchivedDrawer>
    </div>
  );
}
