import { useEffect, useMemo, useState } from "react";
import { RotateCcw, Trash2 } from "lucide-react";

import { apiClient } from "@/api/client";
import { DataTable } from "@/lib/dataDisplay";
import { BaseModal } from "../Modal/BaseModal";
import { BulkSelectionPanel } from "../crud/BulkSelectionPanel";
import { makeSelectColumn } from "../crud/makeSelectColumn";
import { Notification } from "../feedback/Notification";
import { Column } from "../../pages/admin/types";
import {
  ConfirmCopy,
  type EntityCopy,
  getBulkHardDeleteCopy,
  getBulkRestoreCopy,
} from "../Modal/copy";
import { useBulkSelection } from "../../hooks/useBulkSelection";
import { useWorkspaceFilters } from "../../hooks/useWorkspaceFilters";
import { notify } from "../../lib/notify";

// Genérico para vistas de "X Archivados". Encapsula tabla + selección masiva
// (Restaurar, Eliminar definitivamente) + modal de confirmación.
//
// Soporta opcionalmente bulk actions: si se pasa entityLabelPlural, agrega
// checkboxes por fila + barra de acciones masivas (Restaurar N / Eliminar definitivamente N).

type ArchivedListPageProps<T extends { id: number }> = {
  /** Texto legacy: los drawers de archivados no muestran subtítulos. */
  description?: string;
  /** Columnas de datos. Las acciones aparecen solo en la barra de selección. */
  columns: Column<T>[];
  /** Datos archivados a mostrar. */
  data: T[];
  /** Copy léxico de la entidad — se deriva singular y plural según se necesite. */
  entity: EntityCopy;
  /**
   * Si está en true, habilita bulk actions (checkbox por fila + barra de
   * acciones masivas). Por defecto false — las páginas opt-in pasan `bulk`.
   */
  bulk?: boolean;
  /** Cómo extraer el "nombre amigable" de un item para el modal. */
  getItemLabel: (item: T) => string;
  /** Relación opcional para que los 4 filtros de workspace filtren archivados. */
  getFilterRelations?: (item: T) => ArchivedFilterRelation[];
  /** Cuando está activo, la lista archivada ignora filtros de workspace. */
  ignoreWorkspaceFilters?: boolean;
  /** Disparar restore para el item seleccionado. Si no se pasa, no hay botón. */
  onRestore?: (item: T) => Promise<void> | void;
  /** Disparar hard-delete para el item seleccionado. Si no se pasa, no hay botón. */
  onHardDelete?: (item: T) => Promise<void> | void;
  /** Copy específico para hard-delete cuando la entidad tiene cascadas relevantes. */
  getHardDeleteCopy?: (count: number, entityLabelPlural: string) => ConfirmCopy;
  /** Callback opcional al montar (típicamente fetch inicial). */
  onMount?: () => void;
  /** Estado de processing externo (del hook useArchiveActions). */
  processing?: boolean;
  /** Mensaje de error a mostrar debajo de la tabla. */
  error?: string | null;
};

type ArchivedFilterRelation = {
  customerId?: number | null;
  customerName?: string | null;
  projectId?: number | null;
  projectName?: string | null;
  campaignId?: number | null;
  campaignName?: string | null;
  fieldId?: number | null;
  fieldName?: string | null;
  fieldIds?: number[];
  fieldNames?: string[];
};

type ProjectCatalogItem = ArchivedFilterRelation & {
  aliases: string[];
  fieldNames: string[];
};

type RawProjectSummary = {
  id?: number;
  name?: string;
  customer?: string;
  campaign?: string;
  managers?: string;
  investors?: string;
};

type RawProjectDetail = {
  name?: string;
  customer?: { id?: number | null; name?: string | null } | string | null;
  campaign?: { id?: number | null; name?: string | null } | string | null;
  managers?: Array<{ id?: number | null; name?: string | null }>;
  investors?: Array<{ id?: number | null; name?: string | null }>;
  admin_cost_investors?: Array<{ id?: number | null; name?: string | null }>;
  fields?: Array<{
    id?: number | null;
    name?: string | null;
    investors?: Array<{ id?: number | null; name?: string | null }>;
    lots?: Array<{ id?: number | null; name?: string | null }>;
  }>;
};

type ProjectListResponse = {
  data?: {
    data?: RawProjectSummary[];
  };
};

type ProjectDetailResponse = {
  data?: RawProjectDetail;
};

const normalizeText = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();

const splitNames = (value: unknown) =>
  String(value ?? "")
    .split(/[,;]+/)
    .map((entry) =>
      entry
        .replace(/\s*[-–—]\s*\d+(?:[.,]\d+)?\s*%.*$/u, "")
        .replace(/\s+\d+(?:[.,]\d+)?\s*%.*$/u, "")
        .trim(),
    )
    .filter(Boolean);

function getNamedValue(value: RawProjectDetail["customer"] | RawProjectDetail["campaign"]) {
  if (!value) return { id: null, name: "" };
  if (typeof value === "string") return { id: null, name: value };
  return { id: value.id ?? null, name: value.name ?? "" };
}

function relationMatches(
  relation: ArchivedFilterRelation,
  selected: {
    customer?: { id: number; name: string };
    project?: { id: number; name: string };
    campaign?: { id: number; name: string };
    field?: { id: number; name: string };
  },
) {
  if (selected.customer) {
    const byId = relation.customerId && relation.customerId === selected.customer.id;
    const byName =
      relation.customerName &&
      normalizeText(relation.customerName) === normalizeText(selected.customer.name);
    if (!byId && !byName) return false;
  }

  if (selected.project) {
    const byId = relation.projectId && relation.projectId === selected.project.id;
    const byName =
      relation.projectName &&
      normalizeText(relation.projectName) === normalizeText(selected.project.name);
    if (!byId && !byName) return false;
  }

  if (selected.campaign) {
    const byId = relation.campaignId && relation.campaignId === selected.campaign.id;
    const byName =
      relation.campaignName &&
      normalizeText(relation.campaignName) === normalizeText(selected.campaign.name);
    if (!byId && !byName) return false;
  }

  if (selected.field) {
    const byId = relation.fieldId && relation.fieldId === selected.field.id;
    const byIds = relation.fieldIds?.includes(selected.field.id);
    const byName =
      relation.fieldName &&
      normalizeText(relation.fieldName) === normalizeText(selected.field.name);
    const byNames = relation.fieldNames
      ?.map(normalizeText)
      .includes(normalizeText(selected.field.name));
    if (!byId && !byIds && !byName && !byNames) return false;
  }

  return true;
}

function inferRelations<T extends { id: number }>(
  item: T,
  catalog: ProjectCatalogItem[],
): ArchivedFilterRelation[] {
  const record = item as Record<string, unknown>;
  const numberValue = (...keys: string[]) => {
    for (const key of keys) {
      if (typeof record[key] === "number") return record[key] as number;
    }
    return null;
  };
  const textValue = (...keys: string[]) => {
    for (const key of keys) {
      const value = record[key];
      if (typeof value === "string" && value.trim() !== "") return value;
    }
    return "";
  };
  const direct: ArchivedFilterRelation = {
    customerName: textValue(
      "customer",
      "customer_name",
      "customerName",
      "destination_customer_name",
      "origin_customer_name",
    ),
    projectId: numberValue("project_id", "destination_project_id", "origin_project_id"),
    projectName: textValue(
      "project_name",
      "projectName",
      "project",
      "destination_project_name",
      "origin_project_name",
    ),
    campaignName: textValue(
      "campaign",
      "campaign_name",
      "season",
      "destination_campaign_name",
      "origin_campaign_name",
    ),
    fieldId: numberValue("field_id", "destination_field_id", "origin_field_id"),
    fieldName: textValue("field_name", "fieldName", "field", "destination_field_name", "origin_field_name"),
  };

  const hasDirectRelation = Object.values(direct).some((value) => value !== "" && value !== null);
  const names = [
    record.name,
    record.lot_name,
    record.field_name,
    record.project_name,
    record.destination_project_name,
    record.origin_project_name,
    record.customer,
    record.destination_customer_name,
    record.origin_customer_name,
    record.campaign,
    record.destination_campaign_name,
    record.origin_campaign_name,
    record.season,
    record.investor_name,
    record.supply_name,
  ].map(normalizeText).filter(Boolean);

  const matches = catalog.filter((project) => {
    if (direct.projectId && project.projectId === direct.projectId) return true;
    if (direct.projectName && normalizeText(project.projectName) === normalizeText(direct.projectName)) return true;
    if (direct.customerName && normalizeText(project.customerName) === normalizeText(direct.customerName)) return true;
    if (direct.campaignName && normalizeText(project.campaignName) === normalizeText(direct.campaignName)) return true;
    if (direct.fieldName && project.fieldNames.includes(normalizeText(direct.fieldName))) return true;
    return names.some((name) => project.aliases.includes(name) || project.fieldNames.includes(name));
  });

  if (matches.length > 0) return matches;
  return hasDirectRelation ? [direct] : [];
}

export function ArchivedListPage<T extends { id: number }>({
  description: _description,
  columns,
  data,
  entity,
  bulk: bulkEnabled = false,
  getItemLabel,
  getFilterRelations,
  ignoreWorkspaceFilters = false,
  onRestore,
  onHardDelete,
  getHardDeleteCopy,
  onMount,
  processing = false,
  error,
}: ArchivedListPageProps<T>) {
  const entityLabelPlural = entity.plural;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [pending, setPending] = useState<{
    items: T[];
    op: "restore" | "hard";
  } | null>(null);
  const [copy, setCopy] = useState<ConfirmCopy | null>(null);
  const [projectCatalog, setProjectCatalog] = useState<ProjectCatalogItem[]>([]);

  const {
    selectedCustomer,
    selectedProject,
    selectedCampaignId,
    selectedField,
    campaigns,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  useEffect(() => {
    let cancelled = false;

    const buildCatalogItem = (
      summary: RawProjectSummary,
      detail?: RawProjectDetail,
    ): ProjectCatalogItem => {
      const customer = getNamedValue(detail?.customer);
      const campaign = getNamedValue(detail?.campaign);
      const fields = detail?.fields ?? [];
      const fieldNames = fields.map((field) => field.name ?? "").filter(Boolean);
      const fieldIds = fields
        .map((field) => field.id)
        .filter((id): id is number => typeof id === "number");

      const aliases = [
        summary.name,
        summary.customer,
        summary.campaign,
        customer.name,
        campaign.name,
        ...splitNames(summary.managers),
        ...splitNames(summary.investors),
        ...(detail?.managers ?? []).map((item) => item.name ?? ""),
        ...(detail?.investors ?? []).map((item) => item.name ?? ""),
        ...(detail?.admin_cost_investors ?? []).map((item) => item.name ?? ""),
        ...fields.map((field) => field.name ?? ""),
        ...fields.flatMap((field) => (field.investors ?? []).map((item) => item.name ?? "")),
        ...fields.flatMap((field) => (field.lots ?? []).map((item) => item.name ?? "")),
      ]
        .map(normalizeText)
        .filter(Boolean);

      return {
        customerId: customer.id,
        customerName: customer.name || summary.customer || "",
        projectId: summary.id ?? null,
        projectName: detail?.name || summary.name || "",
        campaignId: campaign.id,
        campaignName: campaign.name || summary.campaign || "",
        fieldIds,
        fieldNames,
        aliases: Array.from(new Set(aliases)),
      };
    };

    const loadProjects = async () => {
      try {
        const [active, archived] = await Promise.all([
          apiClient.get<ProjectListResponse>("/projects?page=1&per_page=1000"),
          apiClient.get<ProjectListResponse>("/projects/archived?page=1&per_page=1000"),
        ]);

        const summaries = [
          ...(active.data?.data ?? []),
          ...(archived.data?.data ?? []),
        ].filter((project) => typeof project.id === "number");

        const details = await Promise.all(
          summaries.map(async (project) => {
            try {
              const response = await apiClient.get<ProjectDetailResponse>(
                `/projects/${project.id}`,
              );
              return [project.id as number, response.data] as const;
            } catch {
              return [project.id as number, undefined] as const;
            }
          }),
        );

        if (cancelled) return;

        const detailsById = new Map(details);
        setProjectCatalog(
          summaries.map((project) => buildCatalogItem(project, detailsById.get(project.id as number))),
        );
      } catch {
        if (!cancelled) setProjectCatalog([]);
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedCampaign =
    selectedCampaignId && selectedCampaignId > 0
      ? campaigns.find((campaign) => campaign.id === selectedCampaignId)
      : undefined;

  const activeWorkspaceFilter = Boolean(
    !ignoreWorkspaceFilters &&
      (selectedCustomer?.id ||
      selectedProject?.id ||
      selectedCampaign?.id ||
      selectedField?.id),
  );

  const filteredData = useMemo(() => {
    if (!activeWorkspaceFilter) return data;

    const selected = {
      customer:
        selectedCustomer && selectedCustomer.id > 0
          ? { id: selectedCustomer.id, name: selectedCustomer.name }
          : undefined,
      project:
        selectedProject && selectedProject.id > 0
          ? { id: selectedProject.id, name: selectedProject.name }
          : undefined,
      campaign: selectedCampaign
        ? { id: selectedCampaign.id, name: selectedCampaign.name }
        : undefined,
      field:
        selectedField && selectedField.id > 0
          ? { id: selectedField.id, name: selectedField.name }
          : undefined,
    };

    return data.filter((item) => {
      const relations = getFilterRelations?.(item) ?? inferRelations(item, projectCatalog);
      if (relations.length === 0) return false;
      return relations.some((relation) => relationMatches(relation, selected));
    });
  }, [
    activeWorkspaceFilter,
    data,
    getFilterRelations,
    projectCatalog,
    selectedCampaign,
    selectedCustomer,
    selectedField,
    selectedProject,
  ]);

  const selection = useBulkSelection(filteredData);
  const { toggleAll, clear, allSelected, selectedItems, selectedCount } =
    selection;

  useEffect(() => {
    onMount?.();
  }, [onMount]);

  const openBulkRestore = () => {
    if (selectedItems.length === 0) return;
    setPending({ items: selectedItems, op: "restore" });
    setCopy(getBulkRestoreCopy(selectedItems.length, entityLabelPlural));
    setIsModalOpen(true);
  };

  const openBulkHardDelete = () => {
    if (selectedItems.length === 0) return;
    setPending({ items: selectedItems, op: "hard" });
    setCopy(
      getHardDeleteCopy
        ? getHardDeleteCopy(selectedItems.length, entityLabelPlural)
        : getBulkHardDeleteCopy(selectedItems.length, entityLabelPlural),
    );
    setIsModalOpen(true);
  };

  const handleConfirm = async () => {
    if (!pending) return;
    const { items, op } = pending;
    const handler = op === "restore" ? onRestore : onHardDelete;
    if (!handler) {
      setIsModalOpen(false);
      setPending(null);
      return;
    }
    try {
      if (items.length === 1) {
        await handler(items[0]);
      } else {
        const results = await Promise.allSettled(
          items.map((item) => Promise.resolve(handler(item))),
        );
        const ok = results.filter((r) => r.status === "fulfilled").length;
        const failed = results.length - ok;
        if (failed === 0) {
          notify.success(
            op === "restore"
              ? `Se restauraron ${ok} ${entityLabelPlural}.`
              : `Se eliminaron definitivamente ${ok} ${entityLabelPlural}.`,
          );
        } else {
          notify.error(
            `${ok} de ${results.length} OK; ${failed} fallaron (probablemente por dependencias).`,
          );
        }
        clear();
      }
    } finally {
      setIsModalOpen(false);
      setPending(null);
      // Refetch final para garantizar que la lista refleje el estado del servidor,
      // sin importar race conditions entre múltiples runRestore en bulk.
      onMount?.();
    }
  };

  const selectColumn: Column<T> | null = bulkEnabled
    ? makeSelectColumn<T>(selection, getItemLabel, entity)
    : null;

  const fullColumns: Column<T>[] = useMemo(
    () => (selectColumn ? [selectColumn, ...columns] : columns),
    [columns, selectColumn],
  );

  const bulkActions = useMemo(
    () =>
      [
        onRestore && {
          label: `Restaurar ${selectedCount}`,
          icon: RotateCcw,
          onClick: openBulkRestore,
        },
        onHardDelete && {
          label: "Eliminar",
          icon: Trash2,
          variant: "danger" as const,
          onClick: openBulkHardDelete,
        },
      ].filter(Boolean) as {
        label: string;
        icon: typeof RotateCcw;
        variant?: "danger";
        onClick: () => void;
      }[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onRestore, onHardDelete, selectedCount],
  );

  return (
    <div>
      {bulkEnabled && (
        <BulkSelectionPanel
          selectedCount={selectedCount}
          totalCount={filteredData.length}
          allSelected={allSelected}
          onToggleAll={toggleAll}
          onClear={clear}
          actions={bulkActions}
          entity={entity}
        />
      )}
      <DataTable data={filteredData as T[]} columns={fullColumns} />
      {error && (
        <Notification variant="error" className="mt-4">
          <span className="font-medium">Error!</span> {error}
        </Notification>
      )}

      <BaseModal
        isOpen={isModalOpen}
        isSaving={processing}
        onClose={() => {
          setIsModalOpen(false);
          setPending(null);
        }}
        title={copy?.title ?? ""}
        message={copy?.message ?? ""}
        primaryButtonText={copy?.primaryButtonText ?? null}
        secondaryButtonText={copy?.secondaryButtonText ?? "Cancelar"}
        onPrimaryAction={handleConfirm}
      />
    </div>
  );
}
