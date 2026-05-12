import { useCallback, useEffect, useMemo, useState } from "react";
import { Download, Plus, Upload, Users } from "lucide-react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useInvestors, {
  Investor,
  InvestorPayloadInput,
} from "../../../../hooks/useInvestors";
import useProjects from "../../../../hooks/useDatabase/projects";
import { Project, ProjectData } from "../../../../hooks/useDatabase/projects/types";
import { Column } from "../../types";
import { INVESTOR_ENTITY as ENTITY } from "../../entities";
import InvestorFormDrawer from "./InvestorFormDrawer";
import { downloadCsvRows } from "../../fileTransfer";

const toFilterOptions = (values: string[]) =>
  values.map((value, index) => ({ id: `${value}-${index}`, name: value }));

type InvestorProjectRelation = {
  customer: string;
  project: string;
  campaign: string;
  fields: string[];
  percentage: string;
};

type InvestorRow = Investor & {
  project_count: number;
  related_customers: string;
  related_projects: string;
  related_campaigns: string;
  related_percentages: string;
};

const relationColumns: Column<InvestorRow>[] = [
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

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function parseProjectInvestors(raw: string) {
  return raw
    .split(/[,;]+/)
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const percentageMatch = entry.match(/(\d+(?:[.,]\d+)?)\s*%/);
      const name = entry
        .replace(/\s*[-–—]\s*\d+(?:[.,]\d+)?\s*%.*$/u, "")
        .replace(/\s+\d+(?:[.,]\d+)?\s*%.*$/u, "")
        .trim();
      return {
        name,
        normalizedName: normalizeName(name),
        percentage: percentageMatch ? `${percentageMatch[1].replace(",", ".")}%` : "",
      };
    });
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
  return fields
    .map((field) => field.name)
    .filter(Boolean);
}

function getProjectInvestorMatches(investor: Investor, project: ProjectData, detail?: Project) {
  const normalizedInvestorName = normalizeName(investor.name);
  const matches: string[] = [];

  if (detail) {
    const detailInvestors = [
      ...(detail.investors ?? []),
      ...(detail.admin_cost_investors ?? []),
      ...(detail.fields ?? []).flatMap((field) => field.investors ?? []),
    ];

    detailInvestors.forEach((entry) => {
      const isSameInvestor =
        (entry.id !== null && entry.id !== 0 && entry.id === investor.id) ||
        normalizeName(entry.name) === normalizedInvestorName;

      if (isSameInvestor && Number(entry.percentage) > 0) {
        matches.push(`${entry.percentage}%`);
      }
    });
  }

  parseProjectInvestors(project.investors || "").forEach((entry) => {
    const isSameInvestor =
      entry.normalizedName === normalizedInvestorName ||
      entry.normalizedName.includes(normalizedInvestorName) ||
      normalizedInvestorName.includes(entry.normalizedName);

    if (isSameInvestor && entry.percentage) {
      matches.push(entry.percentage);
    }
  });

  return Array.from(new Set(matches));
}

function findInvestorRelations(
  investor: Investor,
  projects: ProjectData[],
  details: Record<number, Project>,
) {
  const normalizedInvestorName = normalizeName(investor.name);

  return projects.reduce<InvestorProjectRelation[]>((relations, project) => {
    const detail = details[project.id];
    const matches = getProjectInvestorMatches(investor, project, detail);

    if (matches.length === 0) {
      const projectInvestors = parseProjectInvestors(project.investors || "");
      const match = projectInvestors.find((entry) => {
        if (!entry.normalizedName) return false;
        return (
          entry.normalizedName === normalizedInvestorName ||
          entry.normalizedName.includes(normalizedInvestorName) ||
          normalizedInvestorName.includes(entry.normalizedName)
        );
      });

      if (!match) return relations;
      matches.push(match.percentage);
    }

    relations.push({
      customer: detail?.customer.name || project.customer,
      project: project.name,
      campaign: detail?.campaign.name || project.campaign,
      fields: getProjectFieldNames(project, detail),
      percentage: matches.filter(Boolean).join(", "),
    });
    return relations;
  }, []);
}

function buildInvestorRows(
  investors: Investor[],
  projects: ProjectData[],
  details: Record<number, Project>,
): InvestorRow[] {
  return investors.map((investor) => {
    const relations = findInvestorRelations(investor, projects, details);

    return {
      ...investor,
      project_count: relations.length,
      related_customers: uniqueJoined(relations.map((relation) => relation.customer)),
      related_projects: uniqueJoined(relations.map((relation) => relation.project)),
      related_campaigns: uniqueJoined(relations.map((relation) => relation.campaign)),
      related_percentages: uniqueJoined(
        relations.map((relation) =>
          relation.percentage ? `${relation.project}: ${relation.percentage}` : ""
        ),
      ),
    };
  });
}

type InvestorsListProps = {
  editorOnly?: boolean;
};

export default function InvestorsList({ editorOnly = false }: InvestorsListProps) {
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
      const text = await file.text();
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
          ]}
        />
        {!processing && rows.length === 0 ? (
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
            <DataTable data={rows} columns={tableColumns} />
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
    </div>
  );
}
