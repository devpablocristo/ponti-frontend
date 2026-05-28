import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Boxes, Pencil, Plus } from "lucide-react";

import { apiClient } from "@/api/client";
import type { SuccessResponse } from "@/api/types";
import Button from "../../../../components/Button/Button";
import { DrawerShell } from "../../../../components/Drawer/DrawerShell";
import { Checkbox } from "../../../../components/Input/Checkbox";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { ResponsiveTable } from "../../../../components/crud/ResponsiveTable";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../../components/feedback/Skeleton";
import { AppFilterBar, type FilterOption } from "../../../../components/filters/AppFilterBar";
import useActors, {
  type Actor,
  type ActorPayloadInput,
  type ActorRole,
} from "../../../../hooks/useActors";
import useCampaigns, {
  type Campaign,
  type CampaignPayloadInput,
} from "../../../../hooks/useCampaigns";
import useCrops, { type Crop, type CropPayloadInput } from "../../../../hooks/useCrops";
import useCustomers from "../../../../hooks/useCustomers";
import useProjects from "../../../../hooks/useDatabase/projects";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
import useFields from "../../../../hooks/useFields";
import useInvestors from "../../../../hooks/useInvestors";
import useLots from "../../../../hooks/useLots";
import type { LotsData, LotsDataUpdate } from "../../../../hooks/useLots/types";
import useManagers from "../../../../hooks/useManagers";
import useProviders from "../../../../hooks/useProviders";
import useSupplyMovements from "../../../../hooks/useSupplyMovements";
import { useConfirmDialog } from "../../../../hooks/useConfirmDialog";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import { formatError } from "../../../../lib/format";
import { notify } from "../../../../lib/notify";
import { formatEntityDisplayName, formatProperName } from "../../../../lib/properName";
import { usePagination } from "../../../../lib/dataDisplay";
import type { Column } from "../../types";
import { ACTOR_ENTITY } from "../../entities";
import ArchivedActorsByRole from "../actors/ArchivedActorsByRole";
import ActorFormDrawer from "../actors/ActorFormDrawer";
import {
  buildActorArchiveRelations,
  getActorArchivedDrawerTitle,
  resolveActorArchiveTarget,
} from "../actors/actorCrudarRouting";
import ArchivedCampaigns from "../campaigns/ArchivedCampaigns";
import CampaignFormDrawer from "../campaigns/CampaignFormDrawer";
import ArchivedCrops from "../crops/ArchivedCrops";
import CropFormDrawer from "../crops/CropFormDrawer";
import CustomerEditor from "../customers/CustomerEditor";
import FieldFormDrawer from "../fields/FieldFormDrawer";
import ArchivedFields from "../fields/ArchivedFields";
import ArchivedLots from "../lots/ArchivedLots";
import ArchivedProjects from "../projects/ArchivedProjects";
import { useSelection } from "../../../login/context/useSelection";
import LotEditDrawer from "./LotEditDrawer";
import {
  actorRoleByView,
  buildCascadingGeneralEntityFilterValues,
  buildGeneralEntityRows,
  filterGeneralEntityRows,
  filterOrder,
  generalEntityValueMatches,
  rowMatchesTableView,
  tableScopeFilters,
  type GeneralEntityFilters,
  type GeneralEntityRow,
  type GeneralEntityTableView,
  viewLabel,
  viewSingularLabel,
} from "./generalEntityRows";

type FilterMode = "search" | "all" | "value";
type FilterModes = Record<GeneralEntityTableView, FilterMode>;
type DisplayRow = GeneralEntityRow & Record<GeneralEntityTableView, string>;

type ProjectEditorState = {
  mode: "customerOnly" | "project";
  customerId?: number | null;
  initialProjectId?: number | null;
  title: string;
};

type FieldEditorState = {
  title: string;
  projectId: number | null;
  fieldId?: number | null;
};

type ActorEditorContext = {
  syncCustomer: boolean;
  customerId?: number | null;
};

const QUERY_ALL = "page=1&per_page=1000";

const initialFilterModes = (): FilterModes =>
  Object.fromEntries(filterOrder.map((key) => [key, "search"])) as FilterModes;

function filterValueExists(
  options: Record<GeneralEntityTableView, string[]>,
  key: GeneralEntityTableView,
  value?: string,
) {
  if (!value) return false;
  return options[key].some((option) => generalEntityValueMatches(option, value));
}

const filterLabels: Record<GeneralEntityTableView, string> = {
  customer: "Cliente",
  project: "Proyecto",
  investor: "Inversor",
  campaign: "Campaña",
  provider: "Proveedores",
  manager: "Responsable",
  tenant: "Arrendatario",
  field: "Campo",
  lot: "Lote",
  crop: "Cultivo",
};

const allLabels: Record<GeneralEntityTableView, string> = {
  customer: "Todos los clientes",
  project: "Todos los proyectos",
  investor: "Todos los inversores",
  campaign: "Todas las campañas",
  provider: "Todos los proveedores",
  manager: "Todos los responsables",
  tenant: "Todos los arrendatarios",
  field: "Todos los campos",
  lot: "Todos los lotes",
  crop: "Todos los cultivos",
};

const downstreamFilters: Record<GeneralEntityTableView, GeneralEntityTableView[]> = {
  customer: ["project", "investor", "campaign", "provider", "manager", "tenant", "field", "lot", "crop"],
  project: ["investor", "campaign", "provider", "manager", "tenant", "field", "lot", "crop"],
  investor: ["campaign", "provider", "manager", "tenant", "field", "lot", "crop"],
  campaign: ["provider", "manager", "tenant", "field", "lot", "crop"],
  provider: [],
  manager: ["tenant", "field", "lot", "crop"],
  tenant: ["field", "lot", "crop"],
  field: ["lot", "crop"],
  lot: ["crop"],
  crop: [],
};

const columnKeysByView: Record<GeneralEntityTableView, GeneralEntityTableView[]> = {
  customer: ["customer"],
  project: ["customer", "project"],
  investor: ["customer", "project", "investor"],
  campaign: ["customer", "project", "investor", "campaign"],
  provider: ["customer", "project", "investor", "campaign", "provider"],
  manager: ["customer", "project", "investor", "campaign", "manager"],
  tenant: ["customer", "project", "investor", "campaign", "manager", "tenant"],
  field: ["customer", "project", "investor", "campaign", "manager", "tenant", "field"],
  lot: ["customer", "project", "investor", "campaign", "manager", "tenant", "field", "lot"],
  crop: ["customer", "project", "investor", "campaign", "manager", "tenant", "field", "lot", "crop"],
};

function optionFromValue(value: string, index: number): FilterOption {
  return { id: `${index}-${value}`, name: value, displayName: formatProperName(value) };
}

function formatEntityValue(key: GeneralEntityTableView, value: string | undefined) {
  if (!value) return "";
  if (key === "campaign") return value;
  return formatEntityDisplayName(value);
}

function activeViewFromFilters(
  filters: GeneralEntityFilters,
  modes: FilterModes,
): GeneralEntityTableView | null {
  let active: GeneralEntityTableView | null = null;
  filterOrder.forEach((key) => {
    if (modes[key] === "all" || Boolean(filters[key])) active = key;
  });
  return active;
}

function firstSearchFilter(modes: FilterModes): GeneralEntityTableView {
  return filterOrder.find((key) => modes[key] === "search") ?? "crop";
}

function displayValue(
  row: GeneralEntityRow,
  key: GeneralEntityTableView,
  view: GeneralEntityTableView,
  filters: GeneralEntityFilters,
) {
  if (key === view) return formatEntityValue(key, row.name);
  if (filters[key]) return formatEntityValue(key, filters[key]);
  return row.filterValues[key].map((value) => formatEntityValue(key, value)).join(", ");
}

function toDisplayRow(
  row: GeneralEntityRow,
  view: GeneralEntityTableView,
  filters: GeneralEntityFilters,
): DisplayRow {
  const values = Object.fromEntries(
    filterOrder.map((key) => [key, displayValue(row, key, view, filters)]),
  ) as Record<GeneralEntityTableView, string>;
  return { ...row, ...values };
}

function actorRoleForView(view: GeneralEntityTableView): ActorRole | null {
  return actorRoleByView[view] ?? null;
}

function rowActor(rows: Actor[], row: GeneralEntityRow) {
  if (row.entityKind !== "actor" || row.sourceId <= 0) return null;
  return rows.find((actor) => actor.id === row.sourceId) ?? null;
}

function actorIdFromResult(result: unknown) {
  if (result && typeof result === "object" && "id" in result) {
    const id = Number((result as { id?: unknown }).id);
    return Number.isFinite(id) && id > 0 ? id : null;
  }
  const id = Number(result);
  return Number.isFinite(id) && id > 0 ? id : null;
}

function rowHasActiveAssociations(row: GeneralEntityRow, rows: GeneralEntityRow[]) {
  switch (row.entityKind) {
    case "customer":
      return rows.some((item) => item.entityKind === "project" && item.customerId === row.sourceId)
        ? "No se puede archivar: el cliente tiene proyectos activos."
        : null;
    case "project":
      return rows.some(
        (item) =>
          item.projectId === row.sourceId &&
          (item.entityKind === "field" || item.entityKind === "lot"),
      )
        ? "No se puede archivar: el proyecto tiene campos o lotes activos."
        : null;
    case "campaign":
      return rows.some(
        (item) => item.entityKind === "project" && item.campaignId === row.sourceId,
      )
        ? "No se puede archivar: la campaña tiene proyectos activos."
        : null;
    case "field":
      return rows.some((item) => item.entityKind === "lot" && item.fieldId === row.sourceId)
        ? "No se puede archivar: el campo tiene lotes activos."
        : null;
    case "crop":
      return rows.some(
        (item) => item.entityKind === "lot" && item.filterValues.crop.some((crop) => generalEntityValueMatches(crop, row.name)),
      )
        ? "No se puede archivar: el cultivo está usado en lotes activos."
        : null;
    case "actor":
      if (row.roles.includes("proveedor") && row.filterValues.project.length > 0) {
        return "No se puede archivar: el proveedor tiene movimientos o contexto activo.";
      }
      if (
        (row.roles.includes("cliente") ||
          row.roles.includes("inversor") ||
          row.roles.includes("responsable") ||
          row.roles.includes("arrendatario")) &&
        row.filterValues.project.length > 0
      ) {
        return "No se puede archivar: el actor tiene proyectos activos asociados.";
      }
      return null;
    default:
      return null;
  }
}

function projectIdFromFilter(rows: GeneralEntityRow[], filters: GeneralEntityFilters) {
  if (!filters.project) return null;
  const row = rows.find(
    (item) => item.entityKind === "project" && generalEntityValueMatches(item.name, filters.project),
  );
  return row?.sourceId ?? null;
}

function customerIdFromFilter(rows: GeneralEntityRow[], filters: GeneralEntityFilters) {
  if (!filters.customer) return null;
  const row = rows.find(
    (item) => item.entityKind === "customer" && generalEntityValueMatches(item.name, filters.customer),
  );
  return row?.sourceId ?? null;
}

function fieldRowFromFilter(rows: GeneralEntityRow[], filters: GeneralEntityFilters) {
  if (!filters.field) return null;
  return rows.find(
    (item) => item.entityKind === "field" && generalEntityValueMatches(item.name, filters.field),
  ) ?? null;
}

export default function GeneralEntities() {
  const pagination = usePagination({ perPage: 10 });
  const { buildPagination, resetPage } = pagination;
  const confirm = useConfirmDialog();
  const { seasons } = useSelection();

  const {
    actors,
    getActors,
    createActor,
    updateActor,
    archiveActor,
    processing: actorsProcessing,
  } = useActors();
  const {
    customers,
    getCustomers,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    processing: customersProcessing,
  } = useCustomers();
  const {
    projects,
    getProjects,
    deleteProject,
    processing: projectsProcessing,
  } = useProjects();
  const {
    campaigns,
    getCampaigns,
    createCampaign,
    updateCampaign,
    archiveCampaign,
    processing: campaignsProcessing,
  } = useCampaigns();
  const {
    fields,
    getFields,
    archiveField,
    processing: fieldsProcessing,
  } = useFields();
  const {
    lots,
    getLots,
    archiveLot,
    processing: lotsProcessing,
  } = useLots();
  const {
    crops,
    getCrops,
    createCrop,
    updateCrop,
    archiveCrop,
    processing: cropsProcessing,
  } = useCrops();
  const { providers, getProviders, processing: providersProcessing } = useProviders();
  const {
    supplyMovements,
    getSupplyMovements,
    processing: supplyMovementsProcessing,
  } = useSupplyMovements();
  const {
    managers,
    getManagers,
    archiveManager,
  } = useManagers();
  const {
    investors,
    getInvestors,
    archiveInvestor,
  } = useInvestors();

  const [filters, setFilters] = useState<GeneralEntityFilters>({});
  const [filterModes, setFilterModes] = useState<FilterModes>(() => initialFilterModes());
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [projectDetails, setProjectDetails] = useState<Record<number, Project>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const requestedProjectDetailIdsRef = useRef<Set<number>>(new Set());
  const [actorDefaultRoles, setActorDefaultRoles] = useState<ActorRole[]>([]);
  const [actorEditorContext, setActorEditorContext] = useState<ActorEditorContext | null>(null);
  const [actorSubmitError, setActorSubmitError] = useState<string | null>(null);
  const [projectEditor, setProjectEditor] = useState<ProjectEditorState | null>(null);
  const [fieldEditor, setFieldEditor] = useState<FieldEditorState | null>(null);
  const [editingLot, setEditingLot] = useState<LotsData | null>(null);
  const [newLot, setNewLot] = useState<LotsDataUpdate | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const refresh = useCallback(async (options?: { clearDetails?: boolean }) => {
    if (options?.clearDetails) {
      requestedProjectDetailIdsRef.current.clear();
      setProjectDetails({});
    }

    await Promise.all([
      getActors(QUERY_ALL),
      getCustomers(QUERY_ALL),
      getProjects(QUERY_ALL),
      getCampaigns(QUERY_ALL),
      getFields(QUERY_ALL),
      getLots(QUERY_ALL),
      getCrops(QUERY_ALL),
      getProviders(QUERY_ALL),
      getSupplyMovements(QUERY_ALL),
      getManagers(QUERY_ALL),
      getInvestors(QUERY_ALL),
    ]);
  }, [
    getActors,
    getCampaigns,
    getCrops,
    getCustomers,
    getFields,
    getInvestors,
    getLots,
    getManagers,
    getProjects,
    getProviders,
    getSupplyMovements,
  ]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshAfterMutation = useCallback(
    () => refresh({ clearDetails: true }),
    [refresh],
  );

  const rows = useMemo(
    () =>
      buildGeneralEntityRows({
        actors,
        campaigns,
        crops,
        customers,
        fields,
        lots,
        projectDetails,
        projects,
        providers,
        supplyMovements,
      }),
    [actors, campaigns, crops, customers, fields, lots, projectDetails, projects, providers, supplyMovements],
  );

  const activeView = useMemo(() => activeViewFromFilters(filters, filterModes), [filterModes, filters]);
  const createView = useMemo(() => firstSearchFilter(filterModes), [filterModes]);
  const tableView = activeView;

  const projectDetailCandidateIds = useMemo(() => {
    const activeIndex = activeView ? filterOrder.indexOf(activeView) : -1;
    const createIndex = filterOrder.indexOf(createView);
    const tenantIndex = filterOrder.indexOf("tenant");
    const detailNeeded =
      Boolean(filters.project) ||
      activeIndex >= tenantIndex ||
      createIndex >= tenantIndex ||
      filterModes.tenant !== "search" ||
      filterModes.field !== "search" ||
      filterModes.lot !== "search" ||
      filterModes.crop !== "search";

    if (!detailNeeded) return [];

    const projectScope: GeneralEntityFilters = {};
    ([
      "customer",
      "project",
      "investor",
      "campaign",
      "manager",
      "field",
      "lot",
      "crop",
    ] as GeneralEntityTableView[]).forEach((key) => {
      if (filters[key]) projectScope[key] = filters[key];
    });

    return filterGeneralEntityRows(
      rows.filter((row) => row.entityKind === "project"),
      projectScope,
    )
      .map((row) => row.sourceId)
      .filter((projectId) => projectId > 0);
  }, [activeView, createView, filterModes, filters, rows]);

  useEffect(() => {
    const missing = projectDetailCandidateIds.filter(
      (projectId) =>
        !projectDetails[projectId] && !requestedProjectDetailIdsRef.current.has(projectId),
    );
    if (missing.length === 0) return;

    let cancelled = false;
    missing.forEach((projectId) => requestedProjectDetailIdsRef.current.add(projectId));
    setLoadingDetails(true);

    void Promise.allSettled(
      missing.map(async (projectId) => {
        const response = await apiClient.get<SuccessResponse<Project>>(
          `/projects/${projectId}?fresh=1`,
        );
        return [projectId, response.data] as const;
      }),
    )
      .then((results) => {
        if (cancelled) return;
        setProjectDetails((current) => {
          const next = { ...current };
          results.forEach((result) => {
            if (result.status === "fulfilled") next[result.value[0]] = result.value[1];
          });
          return next;
        });
      })
      .finally(() => {
        if (!cancelled) setLoadingDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [projectDetailCandidateIds, projectDetails]);

  const filterOptions = useMemo(
    () => buildCascadingGeneralEntityFilterValues(rows, filters),
    [filters, rows],
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedIds.includes(row.id)),
    [rows, selectedIds],
  );

  const tableRows = useMemo(() => {
    if (!tableView) return [];
    const baseRows = rows.filter((row) => rowMatchesTableView(row, tableView));
    const scopedRows = filterGeneralEntityRows(baseRows, tableScopeFilters(filters, tableView));
    return scopedRows.filter((row) => rowMatchesTableView(row, tableView, filters));
  }, [filters, rows, tableView]);

  const displayRows = useMemo(
    () => (tableView ? tableRows.map((row) => toDisplayRow(row, tableView, filters)) : []),
    [filters, tableRows, tableView],
  );

  const columns = useMemo<Column<DisplayRow>[]>(() => {
    if (!tableView) return [];

    const selectColumn: Column<DisplayRow> = {
      key: "id",
      header: "",
      sortable: false,
      filterable: false,
      width: "56px",
      render: (_value, row) => (
        <Checkbox
          checked={selectedIds.includes(row.id)}
          onChange={() =>
            setSelectedIds((current) =>
              current.includes(row.id)
                ? current.filter((id) => id !== row.id)
                : [...current, row.id],
            )
          }
          aria-label={`Seleccionar ${row.name}`}
        />
      ),
    };

    const dataColumns = columnKeysByView[tableView].map<Column<DisplayRow>>((key) => ({
      key,
      header: filterLabels[key],
      wrap: true,
      minWidth: key === tableView ? "180px" : "160px",
      format: key === "campaign" ? "none" : "properName",
      render: (_value, row) => row[key] || "—",
    }));

    return [selectColumn, ...dataColumns];
  }, [selectedIds, tableView]);

  const displayedSelectedRows = useMemo(
    () => displayRows.filter((row) => selectedIds.includes(row.id)),
    [displayRows, selectedIds],
  );
  const allSelected =
    displayRows.length > 0 && displayedSelectedRows.length === displayRows.length;

  useEffect(() => {
    setSelectedIds((current) =>
      current.filter((id) => rows.some((row) => row.id === id)),
    );
  }, [rows]);

  useEffect(() => {
    resetPage();
    setSelectedIds([]);
  }, [filters, filterModes, resetPage]);

  const loading =
    actorsProcessing ||
    customersProcessing ||
    projectsProcessing ||
    campaignsProcessing ||
    fieldsProcessing ||
    lotsProcessing ||
    cropsProcessing ||
    providersProcessing ||
    supplyMovementsProcessing ||
    loadingDetails;

  useEffect(() => {
    if (loading) return;

    const invalidIndex = filterOrder.findIndex(
      (key) =>
        filterModes[key] === "value" &&
        Boolean(filters[key]) &&
        !filterValueExists(filterOptions, key, filters[key]),
    );
    if (invalidIndex < 0) return;

    const keysToClear = filterOrder.slice(invalidIndex);
    setFilters((current) => {
      const next = { ...current };
      keysToClear.forEach((key) => {
        delete next[key];
      });
      return next;
    });
    setFilterModes((current) => {
      const next = { ...current };
      keysToClear.forEach((key) => {
        next[key] = "search";
      });
      return next;
    });
  }, [filterModes, filterOptions, filters, loading]);

  const actorForm = useEntityFormDrawer<Actor, ActorPayloadInput>({
    buildSuccessLabel: (input) => `el actor "${input.display_name}"`,
    create: createActor,
    update: updateActor,
    fallbackErrorMessage: "No se pudo guardar el actor.",
    onAfter: () => {
      void refreshAfterMutation();
    },
  });

  const campaignForm = useEntityFormDrawer<Campaign, CampaignPayloadInput>({
    buildSuccessLabel: (input) => `la campaña "${input.name}"`,
    create: createCampaign,
    update: updateCampaign,
    fallbackErrorMessage: "No se pudo guardar la campaña.",
    onAfter: () => {
      void refreshAfterMutation();
    },
  });

  const cropForm = useEntityFormDrawer<Crop, CropPayloadInput>({
    buildSuccessLabel: (input) => `el cultivo "${input.name}"`,
    create: createCrop,
    update: updateCrop,
    fallbackErrorMessage: "No se pudo guardar el cultivo.",
    onAfter: () => {
      void refreshAfterMutation();
    },
  });

  const closeActorForm = useCallback(() => {
    actorForm.close();
    setActorEditorContext(null);
    setActorSubmitError(null);
  }, [actorForm]);

  const handleActorSubmit = useCallback(
    async (input: ActorPayloadInput) => {
      setActorSubmitError(null);
      if (!actorEditorContext?.syncCustomer) {
        await actorForm.handleSubmit(input);
        return;
      }

      try {
        let actorId = actorForm.editing?.id ?? null;
        if (actorForm.editing) {
          await updateActor(actorForm.editing.id, input);
        } else {
          actorId = actorIdFromResult(await createActor(input));
        }

        if (!actorId) throw new Error("No se pudo vincular el actor del cliente.");

        const customerPayload = {
          name: input.display_name,
          actor_id: actorId,
        };
        if (actorEditorContext.customerId) {
          await updateCustomer(actorEditorContext.customerId, customerPayload);
          notify.success("Cliente actualizado.");
        } else {
          await createCustomer(customerPayload);
          notify.success("Cliente creado.");
        }

        closeActorForm();
        await refreshAfterMutation();
      } catch (error) {
        setActorSubmitError(
          formatError(error, { fallback: "No se pudo guardar el cliente." }),
        );
      }
    },
    [
      actorEditorContext,
      actorForm,
      closeActorForm,
      createActor,
      createCustomer,
      refreshAfterMutation,
      updateActor,
      updateCustomer,
    ],
  );

  const clearDownstream = useCallback((key: GeneralEntityTableView) => {
    const downstream = downstreamFilters[key];
    setFilters((current) => {
      const next = { ...current };
      downstream.forEach((item) => {
        delete next[item];
      });
      return next;
    });
    setFilterModes((current) => {
      const next = { ...current };
      downstream.forEach((item) => {
        next[item] = "search";
      });
      return next;
    });
  }, []);

  const setFilterSelection = useCallback(
    (key: GeneralEntityTableView, option: unknown) => {
      const selected = option as FilterOption | undefined;
      if (!selected) {
        setFilters((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        setFilterModes((current) => ({ ...current, [key]: "search" }));
        clearDownstream(key);
        return;
      }

      clearDownstream(key);
      if (selected.id === 0) {
        setFilters((current) => {
          const next = { ...current };
          delete next[key];
          return next;
        });
        setFilterModes((current) => ({ ...current, [key]: "all" }));
        return;
      }

      setFilters((current) => ({ ...current, [key]: selected.name }));
      setFilterModes((current) => ({ ...current, [key]: "value" }));
    },
    [clearDownstream],
  );

  const filterItems = useCallback(
    (keys: GeneralEntityTableView[]) =>
      keys.map((key) => ({
        type: "search" as const,
        name: key,
        label: filterLabels[key],
        options: filterOptions[key].map(optionFromValue),
        value: filterModes[key] === "all" ? allLabels[key] : formatEntityValue(key, filters[key]),
        allowAll: true,
        allLabel: "Todos",
        clearOnClickOutside: true,
        emptyMessage: "Sin resultados",
        onChange: () => undefined,
        setData: (option: unknown) => setFilterSelection(key, option),
      })),
    [filterModes, filterOptions, filters, setFilterSelection],
  );

  const openActorEditor = useCallback(
    (row: GeneralEntityRow, fallbackRole: ActorRole) => {
      const customerActorId =
        fallbackRole === "cliente" && row.entityKind === "customer"
          ? customers.find((customer) => customer.id === row.sourceId)?.actor_id
          : undefined;
      const actor =
        (customerActorId
          ? actors.find((candidate) => candidate.id === customerActorId)
          : null) ??
        rowActor(actors, row) ??
        actors.find((candidate) => generalEntityValueMatches(candidate.display_name, row.name)) ??
        null;
      setActorSubmitError(null);
      setActorDefaultRoles([fallbackRole]);
      setActorEditorContext({
        syncCustomer: row.entityKind === "customer",
        customerId: row.entityKind === "customer" ? row.sourceId : null,
      });
      if (actor) actorForm.openEdit(actor);
      else actorForm.openCreate();
    },
    [actorForm, actors, customers],
  );

  const openEditor = useCallback(
    (row: GeneralEntityRow) => {
      if (row.entityKind === "actor" || row.entityKind === "customer") {
        const role = activeView
          ? actorRoleForView(activeView) ?? actorRoleForView(row.view) ?? "cliente"
          : actorRoleForView(row.view) ?? "cliente";
        openActorEditor(row, role);
        return;
      }

      if (row.entityKind === "campaign") {
        const campaign = campaigns.find((item) => item.id === row.sourceId) ?? null;
        if (campaign) campaignForm.openEdit(campaign);
        return;
      }

      if (row.entityKind === "crop") {
        const crop = crops.find((item) => item.id === row.sourceId) ?? null;
        if (crop) cropForm.openEdit(crop);
        return;
      }

      if (row.entityKind === "project") {
        setProjectEditor({
          title: "Editar Proyecto",
          mode: "project",
          customerId: row.customerId ?? null,
          initialProjectId: row.sourceId,
        });
        return;
      }

      if (row.entityKind === "field") {
        setFieldEditor({
          title: "Editar Campo",
          projectId: row.projectId ?? null,
          fieldId: row.sourceId,
        });
        return;
      }

      if (row.entityKind === "lot") {
        const lot = lots.find((item) => item.id === row.sourceId) ?? null;
        if (lot) {
          setNewLot(null);
          setEditingLot(lot);
        }
      }
    },
    [activeView, campaignForm, campaigns, cropForm, crops, lots, openActorEditor],
  );

  const openCreate = useCallback(() => {
    const role = actorRoleForView(createView);
    if (role) {
      setActorSubmitError(null);
      setActorDefaultRoles([role]);
      setActorEditorContext({
        syncCustomer: createView === "customer",
        customerId: null,
      });
      actorForm.openCreate();
      return;
    }

    if (createView === "campaign") {
      campaignForm.openCreate();
      return;
    }

    if (createView === "crop") {
      cropForm.openCreate();
      return;
    }

    const selectedCustomerId = customerIdFromFilter(rows, filters);
    const selectedProjectId = projectIdFromFilter(rows, filters);
    if (createView === "project") {
      setProjectEditor({
        title: "Nuevo Proyecto",
        mode: "project",
        customerId: selectedCustomerId,
        initialProjectId: null,
      });
      return;
    }

    if (createView === "field") {
      if (!selectedProjectId) {
        notify.error("Seleccioná un proyecto antes de crear un campo.");
        return;
      }
      setFieldEditor({
        title: "Nuevo Campo",
        projectId: selectedProjectId,
        fieldId: null,
      });
      return;
    }

    if (createView === "lot") {
      const selectedFieldRow = fieldRowFromFilter(rows, filters);
      if (!selectedFieldRow) {
        notify.error("Seleccioná un campo antes de crear un lote.");
        return;
      }
      setEditingLot(null);
      setNewLot({
        id: 0,
        field_id: selectedFieldRow.sourceId,
        project_name: selectedFieldRow.filterValues.project[0] ?? filters.project ?? "",
        field_name: selectedFieldRow.name,
        lot_name: "",
        previous_crop_id: 0,
        current_crop_id: 0,
        variety: "",
        sowed_area: "",
        dates: [],
        season: "",
        updated_at: new Date().toISOString(),
      });
      return;
    }

    setProjectEditor({
      title: "Nuevo Lote",
      mode: "project",
      customerId: selectedCustomerId,
      initialProjectId: selectedProjectId,
    });
  }, [actorForm, campaignForm, createView, cropForm, filters, rows]);

  const archiveOne = useCallback(
    async (row: GeneralEntityRow) => {
      const blockReason = rowHasActiveAssociations(row, rows);
      if (blockReason) {
        notify.error(blockReason);
        return false;
      }

      switch (row.entityKind) {
        case "customer":
          await archiveCustomer(row.sourceId);
          return true;
        case "project":
          await deleteProject(row.sourceId);
          return true;
        case "campaign":
          await archiveCampaign(row.sourceId);
          return true;
        case "field":
          await archiveField(row.sourceId);
          return true;
        case "lot":
          await archiveLot(row.sourceId);
          return true;
        case "crop":
          await archiveCrop(row.sourceId);
          return true;
        case "actor": {
          const actor =
            rowActor(actors, row) ??
            actors.find((candidate) => generalEntityValueMatches(candidate.display_name, row.name));
          if (!actor) {
            notify.error("No se encontró el actor activo para archivar.");
            return false;
          }
          const target = resolveActorArchiveTarget(
            actor,
            buildActorArchiveRelations({ customers, managers, investors }),
          );
          if (target.kind === "customer") await archiveCustomer(target.id);
          if (target.kind === "manager") await archiveManager(target.id);
          if (target.kind === "investor") await archiveInvestor(target.id);
          if (target.kind === "actor") await archiveActor(target.id);
          return true;
        }
      }
    },
    [
      actors,
      archiveActor,
      archiveCampaign,
      archiveCrop,
      archiveCustomer,
      archiveField,
      archiveInvestor,
      archiveLot,
      archiveManager,
      customers,
      deleteProject,
      investors,
      managers,
      rows,
    ],
  );

  const archiveSelected = useCallback(async () => {
    if (selectedRows.length === 0) return;
    const ok = await confirm({
      title: "Archivar entidades",
      message:
        selectedRows.length === 1
          ? `¿Archivar ${formatProperName(selectedRows[0].name)}?`
          : `¿Archivar ${selectedRows.length} entidades seleccionadas?`,
      severity: "warning",
      primaryLabel: "Archivar",
      secondaryLabel: "Cancelar",
    });
    if (!ok) return;

    setArchiving(true);
    try {
      let archivedCount = 0;
      for (const row of selectedRows) {
        const archived = await archiveOne(row);
        if (archived) archivedCount += 1;
      }
      if (archivedCount > 0) {
        notify.success(
          archivedCount === 1
            ? "Entidad archivada."
            : `${archivedCount} entidades archivadas.`,
        );
        setSelectedIds([]);
        await refreshAfterMutation();
      }
    } catch (error) {
      notify.error(formatError(error, { fallback: "No se pudo archivar la selección." }));
    } finally {
      setArchiving(false);
    }
  }, [archiveOne, confirm, refreshAfterMutation, selectedRows]);

  const tableEntityCopy = useMemo(
    () => ({
      ...ACTOR_ENTITY,
      singular: tableView ? viewSingularLabel[tableView].toLowerCase() : "entidad",
      plural: tableView ? viewLabel[tableView] : "entidades",
    }),
    [tableView],
  );

  const actions = [
    {
      label: "Editar",
      icon: Pencil,
      onClick: () => selectedRows[0] && openEditor(selectedRows[0]),
      disabled: selectedRows.length !== 1,
    },
    {
      label: "Archivar",
      icon: Archive,
      onClick: archiveSelected,
      disabled: selectedRows.length === 0 || archiving,
      variant: "default" as const,
    },
  ];

  const archivedView = tableView ?? createView;
  const archivedRole = actorRoleForView(archivedView);
  const archivedTitle = archivedRole
    ? getActorArchivedDrawerTitle(archivedRole)
    : `${viewSingularLabel[archivedView]}s archivados`;

  const renderArchived = () => {
    if (archivedRole) {
      return (
        <ArchivedActorsByRole
          filters={{ role: archivedRole }}
          onAfterRestore={refreshAfterMutation}
        />
      );
    }
    if (archivedView === "project") {
      return <ArchivedProjects onAfterRestore={refreshAfterMutation} />;
    }
    if (archivedView === "campaign") {
      return <ArchivedCampaigns onAfterRestore={refreshAfterMutation} />;
    }
    if (archivedView === "field") {
      return <ArchivedFields onAfterRestore={refreshAfterMutation} />;
    }
    if (archivedView === "lot") {
      return <ArchivedLots onAfterRestore={refreshAfterMutation} />;
    }
    if (archivedView === "crop") {
      return <ArchivedCrops onAfterRestore={refreshAfterMutation} />;
    }
    return (
      <ArchivedActorsByRole
        filters={{ role: "cliente" }}
        onAfterRestore={refreshAfterMutation}
      />
    );
  };

  return (
    <div className="relative">
      <LoadingOverlay show={archiving} />

      <div className="space-y-2">
        <AppFilterBar
          className="z-[80]"
          filters={filterItems(["customer", "project", "investor", "campaign", "provider"])}
          actions={[
            {
              label: "Archivados",
              icon: <Archive className="h-4 w-4" />,
              variant: "primary",
              isPrimary: true,
              onClick: () => setArchivedOpen(true),
            },
            {
              label: `Nuevo ${viewSingularLabel[createView]}`,
              icon: <Plus className="h-4 w-4" />,
              isPrimary: true,
              onClick: openCreate,
            },
          ]}
        />
        <AppFilterBar
          className="z-[70]"
          filters={filterItems(["manager", "tenant", "field", "lot", "crop"])}
        />
      </div>

      {tableView ? (
        <div className="mt-4 text-sm font-medium text-slate-600 dark:text-slate-300">
          {displayRows.length} de {tableRows.length} {viewLabel[tableView]}
        </div>
      ) : null}

      {tableView && displayRows.length > 0 ? (
        <>
          <BulkSelectionPanel
            selectedCount={selectedRows.length}
            totalCount={displayRows.length}
            allSelected={allSelected}
            onToggleAll={() =>
              setSelectedIds((current) =>
                allSelected
                  ? current.filter((id) => !displayRows.some((row) => row.id === id))
                  : Array.from(new Set([...current, ...displayRows.map((row) => row.id)])),
              )
            }
            onClear={() => setSelectedIds([])}
            actions={actions}
            entity={tableEntityCopy}
          />

          {loading ? (
            <TableSkeleton columns={columns.length || 4} rows={6} />
          ) : (
            <ResponsiveTable
              data={displayRows}
              columns={columns}
              primaryKey="name"
              rowKey={(row) => row.id}
              pagination={buildPagination(displayRows.length)}
              actionsHeader="Acciones"
            />
          )}
        </>
      ) : tableView ? (
        <EmptyState
          icon={Boxes}
          title={`No hay ${viewLabel[tableView]} para los filtros`}
          cta={
            <Button
              variant="primary"
              size="sm"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={openCreate}
            >
              Nuevo {viewSingularLabel[createView]}
            </Button>
          }
        />
      ) : null}

      <ActorFormDrawer
        open={actorForm.open}
        actor={actorForm.editing}
        processing={actorsProcessing || (actorEditorContext?.syncCustomer ? customersProcessing : false)}
        errorMessage={actorSubmitError ?? actorForm.submitError}
        defaultRoles={actorDefaultRoles}
        actorOptions={actors}
        onClose={closeActorForm}
        onSubmit={handleActorSubmit}
      />

      <CampaignFormDrawer
        open={campaignForm.open}
        campaign={campaignForm.editing}
        processing={campaignsProcessing}
        errorMessage={campaignForm.submitError}
        onClose={campaignForm.close}
        onSubmit={campaignForm.handleSubmit}
      />

      <CropFormDrawer
        open={cropForm.open}
        crop={cropForm.editing}
        processing={cropsProcessing}
        errorMessage={cropForm.submitError}
        onClose={cropForm.close}
        onSubmit={cropForm.handleSubmit}
      />

      <DrawerShell
        open={projectEditor !== null}
        onClose={() => setProjectEditor(null)}
        title={projectEditor?.title ?? "Editar"}
      >
        {projectEditor ? (
          <CustomerEditor
            embedded
            mode={projectEditor.mode}
            customerId={projectEditor.customerId}
            initialProjectId={projectEditor.initialProjectId}
            onClose={() => setProjectEditor(null)}
            onSaved={refreshAfterMutation}
          />
        ) : null}
      </DrawerShell>

      <FieldFormDrawer
        open={fieldEditor !== null}
        title={fieldEditor?.title ?? "Campo"}
        projectId={fieldEditor?.projectId ?? null}
        fieldId={fieldEditor?.fieldId ?? null}
        project={
          fieldEditor?.projectId
            ? projectDetails[fieldEditor.projectId] ?? null
            : null
        }
        actors={actors}
        crops={crops}
        seasons={seasons}
        onClose={() => setFieldEditor(null)}
        onSaved={refreshAfterMutation}
      />

      <LotEditDrawer
        open={editingLot !== null || newLot !== null}
        lot={editingLot}
        initialLot={newLot}
        selectedFieldName={editingLot?.field_name ?? newLot?.field_name}
        seasons={seasons}
        onClose={() => {
          setEditingLot(null);
          setNewLot(null);
        }}
        onSaved={refreshAfterMutation}
      />

      <ArchivedDrawer
        open={archivedOpen}
        title={archivedTitle}
        onClose={() => setArchivedOpen(false)}
      >
        {renderArchived()}
      </ArchivedDrawer>
    </div>
  );
}
