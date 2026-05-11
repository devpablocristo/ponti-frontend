import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Briefcase, Download, Plus, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { AppFilterBar as FilterBar } from "../../../../components/filters/AppFilterBar";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { IndicatorCard } from "../../../../components/Card/IndicatorCard";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import useCustomers from "../../../../hooks/useCustomers";
import { CustomerData } from "../../../../hooks/useCustomers/types";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import { toastError, toastSuccess } from "../../../../lib/toast";
import { Column } from "../../types";
import { CUSTOMER_ENTITY as ENTITY } from "../../entities";
import { formatNumberAr } from "../../utils";

type CustomerProjectSummary = {
  projects: number;
  campaigns: number;
  fields: number;
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

const emptySummary: CustomerProjectSummary = {
  projects: 0,
  campaigns: 0,
  fields: 0,
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

function summarizeProjects(projects: RawProject[]): CustomerProjectSummary {
  const campaigns = new Set<string | number>();
  let fields = 0;

  for (const project of projects) {
    const key = campaignKey(project);
    if (key) campaigns.add(key);

    const projectFields = Array.isArray(project.fields) ? project.fields : [];
    fields += projectFields.length;
  }

  return {
    projects: projects.length,
    campaigns: campaigns.size,
    fields,
  };
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
  const navigate = useNavigate();
  const {
    customers,
    processing,
    error,
    getCustomers,
    createCustomer,
    archiveCustomer,
  } = useCustomers();
  const [summaries, setSummaries] = useState<Record<number, CustomerProjectSummary>>({});
  const [projectsByCustomer, setProjectsByCustomer] = useState<Record<number, RawProject[]>>({});
  const [summariesLoading, setSummariesLoading] = useState(false);
  const {
    filters,
    selectedCustomer,
    selectedProject,
    selectedCampaignId,
    selectedField,
    campaigns,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const selectedCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId),
    [campaigns, selectedCampaignId],
  );

  const refresh = useCallback(
    () => getCustomers("limit=1000"),
    [getCustomers],
  );

  const visibleCustomers = useMemo(() => {
    const customerNeedle = normalizeFilter(selectedCustomer?.name ?? "");

    return customers.filter((customer) => {
      if (selectedCustomer) {
        if (!normalizeFilter(customer.name).includes(customerNeedle)) return false;
      }

      const projects = projectsByCustomer[customer.id] ?? [];
      const hasRelationFilter =
        Boolean(selectedProject) ||
        Boolean(selectedCampaign) ||
        Boolean(selectedField);

      if (!hasRelationFilter) return true;

      return projects.some((project) => {
        return projectMatchesFilters(project, selectedProject, selectedCampaign, selectedField);
      });
    });
  }, [
    customers,
    projectsByCustomer,
    selectedCampaign,
    selectedCustomer,
    selectedField,
    selectedProject,
  ]);

  const totalVisibleHectares = useMemo(() => {
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
    selectedCampaign,
    selectedField,
    selectedProject,
    visibleCustomers,
  ]);

  const exportVisibleCustomers = useCallback(() => {
    const rows = visibleCustomers.map((customer) => {
      const summary = summaries[customer.id] ?? emptySummary;
      return {
        "Cliente / Sociedad": customer.name,
        Proyectos: summary.projects,
        Campañas: summary.campaigns,
        Campos: summary.fields,
      };
    });

    const csv = [
      ["Cliente / Sociedad", "Proyectos", "Campañas", "Campos"].join(","),
      ...rows.map((row) =>
        Object.values(row)
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(","),
      ),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `clientes_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [visibleCustomers, summaries]);

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
    refresh();
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;

    const loadSummaries = async () => {
      if (customers.length === 0) {
        setSummaries({});
        setProjectsByCustomer({});
        return;
      }

      setSummariesLoading(true);
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
          setSummaries(
            Object.fromEntries(
              entries.map(([customerId, projects]) => [
                customerId,
                summarizeProjects(projects),
              ]),
            ),
          );
        }
      } finally {
        if (!cancelled) {
          setSummariesLoading(false);
        }
      }
    };

    void loadSummaries();

    return () => {
      cancelled = true;
    };
  }, [customers]);

  const bulk = useBulkActions<CustomerData>({
    items: visibleCustomers,
    entity: ENTITY,
    archive: archiveCustomer,
    onEdit: (customer) => navigate(`/admin/database/customers/${customer.id}/editor`),
    onAfter: refresh,
  });

  const selectColumn = useMemo<Column<CustomerData>>(
    () => makeSelectColumn<CustomerData>(bulk, (c) => c.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<CustomerData>[]>(
    () => [
      selectColumn,
      { key: "name", header: "Cliente / Sociedad" },
      {
        key: "id",
        header: "Proyectos",
        align: "center",
        render: (_value, item) => summaries[item.id]?.projects ?? 0,
      },
      {
        key: "id",
        header: "Campañas",
        align: "center",
        render: (_value, item) => summaries[item.id]?.campaigns ?? 0,
      },
      {
        key: "id",
        header: "Campos",
        align: "center",
        render: (_value, item) => summaries[item.id]?.fields ?? 0,
      },
    ],
    [selectColumn, summaries],
  );

  return (
    <div>
      <FilterBar
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
            href: "/admin/database/customers/archived",
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            href: "/admin/database/customers/editor",
          },
        ]}
      />

      <div className="relative">
        <LoadingOverlay show={processing || summariesLoading} />
        {error && <ErrorBanner message={error} />}
        {!processing && visibleCustomers.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Aún no hay clientes"
            description="Creá el primero para empezar a gestionar proyectos."
            cta={
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                href="/admin/database/customers/editor"
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
              totalCount={visibleCustomers.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <DataTable data={visibleCustomers} columns={tableColumns} />
          </>
        )}
      </div>

    </div>
  );
}
