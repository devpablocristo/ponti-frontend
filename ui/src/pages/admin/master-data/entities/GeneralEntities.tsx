import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Plus } from "lucide-react";

import { apiClient } from "@/api/client";
import type { SuccessResponse } from "@/api/types";
import Button from "../../../../components/Button/Button";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
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
import useManagers from "../../../../hooks/useManagers";
import useProviders from "../../../../hooks/useProviders";
import useSupplyMovements from "../../../../hooks/useSupplyMovements";
import { useConfirmDialog } from "../../../../hooks/useConfirmDialog";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import { formatError } from "../../../../lib/format";
import { notify } from "../../../../lib/notify";
import { formatEntityDisplayName, formatProperName } from "../../../../lib/properName";
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
import ArchivedFields from "../fields/ArchivedFields";
import ArchivedLots from "../lots/ArchivedLots";
import ArchivedProjects from "../projects/ArchivedProjects";
import EntityCatalogProjectModule from "./EntityCatalogProjectModule";
import FieldBasicDrawer from "./FieldBasicDrawer";
import LotBasicDrawer from "./LotBasicDrawer";
import ProjectBasicDrawer from "./ProjectBasicDrawer";
import {
  actorRoleByView,
  buildCascadingGeneralEntityFilterValues,
  buildGeneralEntityRows,
  filterGeneralEntityRows,
  filterOrder,
  generalEntityValueMatches,
  type GeneralEntityFilters,
  type GeneralEntityRow,
  type GeneralEntityTableView,
  viewSingularLabel,
} from "./generalEntityRows";

type FilterMode = "search" | "all" | "value";
type FilterModes = Record<GeneralEntityTableView, FilterMode>;

type ProjectEditorState = {
  mode: "create" | "edit";
  customerId?: number | null;
  campaignId?: number | null;
  projectId?: number | null;
};

type FieldEditorState = {
  mode: "create" | "edit";
  projectId: number | null;
  fieldId?: number | null;
};

type LotEditorState = {
  mode: "create" | "edit";
  fieldId: number | null;
  lotId?: number | null;
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
  value?: string
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
  customer: [
    "project",
    "investor",
    "campaign",
    "provider",
    "manager",
    "tenant",
    "field",
    "lot",
    "crop",
  ],
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
  modes: FilterModes
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
          (item.entityKind === "field" || item.entityKind === "lot")
      )
        ? "No se puede archivar: el proyecto tiene campos o lotes activos."
        : null;
    case "campaign":
      return rows.some((item) => item.entityKind === "project" && item.campaignId === row.sourceId)
        ? "No se puede archivar: la campaña tiene proyectos activos."
        : null;
    case "field":
      return rows.some((item) => item.entityKind === "lot" && item.fieldId === row.sourceId)
        ? "No se puede archivar: el campo tiene lotes activos."
        : null;
    case "crop":
      return rows.some(
        (item) =>
          item.entityKind === "lot" &&
          item.filterValues.crop.some((crop) => generalEntityValueMatches(crop, row.name))
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
    (item) => item.entityKind === "project" && generalEntityValueMatches(item.name, filters.project)
  );
  return row?.sourceId ?? null;
}

function customerIdFromFilter(rows: GeneralEntityRow[], filters: GeneralEntityFilters) {
  if (!filters.customer) return null;
  const row = rows.find(
    (item) =>
      item.entityKind === "customer" && generalEntityValueMatches(item.name, filters.customer)
  );
  return row?.sourceId ?? null;
}

function campaignIdFromFilter(rows: GeneralEntityRow[], filters: GeneralEntityFilters) {
  if (!filters.campaign) return null;
  const row = rows.find(
    (item) =>
      item.entityKind === "campaign" && generalEntityValueMatches(item.name, filters.campaign)
  );
  return row?.sourceId ?? null;
}

function fieldRowFromFilter(rows: GeneralEntityRow[], filters: GeneralEntityFilters) {
  if (!filters.field) return null;
  return (
    rows.find(
      (item) => item.entityKind === "field" && generalEntityValueMatches(item.name, filters.field)
    ) ?? null
  );
}

export default function GeneralEntities() {
  const confirm = useConfirmDialog();

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
  const { projects, getProjects, deleteProject, processing: projectsProcessing } = useProjects();
  const {
    campaigns,
    getCampaigns,
    createCampaign,
    updateCampaign,
    archiveCampaign,
    processing: campaignsProcessing,
  } = useCampaigns();
  const { fields, getFields, archiveField, processing: fieldsProcessing } = useFields();
  const { lots, getLots, archiveLot, processing: lotsProcessing } = useLots();
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
  const { managers, getManagers, archiveManager } = useManagers();
  const { investors, getInvestors, archiveInvestor } = useInvestors();

  const [filters, setFilters] = useState<GeneralEntityFilters>({});
  const [filterModes, setFilterModes] = useState<FilterModes>(() => initialFilterModes());
  const [projectDetails, setProjectDetails] = useState<Record<number, Project>>({});
  const [loadingDetails, setLoadingDetails] = useState(false);
  const requestedProjectDetailIdsRef = useRef<Set<number>>(new Set());
  const [actorDefaultRoles, setActorDefaultRoles] = useState<ActorRole[]>([]);
  const [actorEditorContext, setActorEditorContext] = useState<ActorEditorContext | null>(null);
  const [actorSubmitError, setActorSubmitError] = useState<string | null>(null);
  const [projectEditor, setProjectEditor] = useState<ProjectEditorState | null>(null);
  const [fieldEditor, setFieldEditor] = useState<FieldEditorState | null>(null);
  const [lotEditor, setLotEditor] = useState<LotEditorState | null>(null);
  const [archivedOpen, setArchivedOpen] = useState(false);
  const [archivedTarget, setArchivedTarget] = useState<GeneralEntityTableView | null>(null);
  const [archiving, setArchiving] = useState(false);

  const refresh = useCallback(
    async (options?: { clearDetails?: boolean }) => {
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
    },
    [
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
    ]
  );

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshAfterMutation = useCallback(() => refresh({ clearDetails: true }), [refresh]);

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
    [
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
    ]
  );

  const activeView = useMemo(
    () => activeViewFromFilters(filters, filterModes),
    [filterModes, filters]
  );
  const createView = useMemo(() => firstSearchFilter(filterModes), [filterModes]);

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
    (
      [
        "customer",
        "project",
        "investor",
        "campaign",
        "manager",
        "field",
        "lot",
        "crop",
      ] as GeneralEntityTableView[]
    ).forEach((key) => {
      if (filters[key]) projectScope[key] = filters[key];
    });

    return filterGeneralEntityRows(
      rows.filter((row) => row.entityKind === "project"),
      projectScope
    )
      .map((row) => row.sourceId)
      .filter((projectId) => projectId > 0);
  }, [activeView, createView, filterModes, filters, rows]);

  useEffect(() => {
    const missing = projectDetailCandidateIds.filter(
      (projectId) =>
        !projectDetails[projectId] && !requestedProjectDetailIdsRef.current.has(projectId)
    );
    if (missing.length === 0) return;

    let cancelled = false;
    missing.forEach((projectId) => requestedProjectDetailIdsRef.current.add(projectId));
    setLoadingDetails(true);

    void Promise.allSettled(
      missing.map(async (projectId) => {
        const response = await apiClient.get<SuccessResponse<Project>>(
          `/projects/${projectId}?fresh=1`
        );
        return [projectId, response.data] as const;
      })
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
    [filters, rows]
  );

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
        !filterValueExists(filterOptions, key, filters[key])
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
        setActorSubmitError(formatError(error, { fallback: "No se pudo guardar el cliente." }));
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
    ]
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
    [clearDownstream]
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
    [filterModes, filterOptions, filters, setFilterSelection]
  );

  const openActorEditor = useCallback(
    (row: GeneralEntityRow, fallbackRole: ActorRole) => {
      const customerActorId =
        fallbackRole === "cliente" && row.entityKind === "customer"
          ? customers.find((customer) => customer.id === row.sourceId)?.actor_id
          : undefined;
      const actor =
        (customerActorId ? actors.find((candidate) => candidate.id === customerActorId) : null) ??
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
    [actorForm, actors, customers]
  );

  const openEditor = useCallback(
    (row: GeneralEntityRow) => {
      if (row.entityKind === "actor" || row.entityKind === "customer") {
        const role = activeView
          ? (actorRoleForView(activeView) ?? actorRoleForView(row.view) ?? "cliente")
          : (actorRoleForView(row.view) ?? "cliente");
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
          mode: "edit",
          customerId: row.customerId ?? null,
          campaignId:
            row.campaignId ??
            campaigns.find((campaign) =>
              generalEntityValueMatches(campaign.name, row.filterValues.campaign[0])
            )?.id ??
            null,
          projectId: row.sourceId,
        });
        return;
      }

      if (row.entityKind === "field") {
        setFieldEditor({
          mode: "edit",
          projectId: row.projectId ?? null,
          fieldId: row.sourceId,
        });
        return;
      }

      if (row.entityKind === "lot") {
        const lot = lots.find((item) => item.id === row.sourceId) ?? null;
        if (lot) {
          setLotEditor({
            mode: "edit",
            fieldId: row.fieldId ?? lot.field_id ?? null,
            lotId: lot.id,
          });
        }
      }
    },
    [activeView, campaignForm, campaigns, cropForm, crops, lots, openActorEditor]
  );

  const openCreate = useCallback(
    (forcedView?: GeneralEntityTableView) => {
      const targetView = forcedView ?? createView;
      const role = actorRoleForView(targetView);
      if (role) {
        setActorSubmitError(null);
        setActorDefaultRoles([role]);
        setActorEditorContext({
          syncCustomer: targetView === "customer",
          customerId: null,
        });
        actorForm.openCreate();
        return;
      }

      if (targetView === "campaign") {
        campaignForm.openCreate();
        return;
      }

      if (targetView === "crop") {
        cropForm.openCreate();
        return;
      }

      const selectedCustomerId = customerIdFromFilter(rows, filters);
      const selectedProjectId = projectIdFromFilter(rows, filters);
      const selectedCampaignId = campaignIdFromFilter(rows, filters);
      if (targetView === "project") {
        setProjectEditor({
          mode: "create",
          customerId: selectedCustomerId,
          campaignId: selectedCampaignId,
          projectId: null,
        });
        return;
      }

      if (targetView === "field") {
        if (!selectedProjectId) {
          notify.error("Seleccioná un proyecto antes de crear un campo.");
          return;
        }
        setFieldEditor({
          mode: "create",
          projectId: selectedProjectId,
          fieldId: null,
        });
        return;
      }

      if (targetView === "lot") {
        const selectedFieldRow = fieldRowFromFilter(rows, filters);
        if (!selectedFieldRow) {
          notify.error("Seleccioná un campo antes de crear un lote.");
          return;
        }
        setLotEditor({
          mode: "create",
          fieldId: selectedFieldRow.sourceId,
          lotId: null,
        });
        return;
      }

      notify.error(
        `No hay un editor básico disponible para crear ${viewSingularLabel[targetView].toLowerCase()} desde esta vista.`
      );
    },
    [actorForm, campaignForm, createView, cropForm, filters, rows]
  );

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
            buildActorArchiveRelations({ customers, managers, investors })
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
    ]
  );

  const archiveRows = useCallback(
    async (rowsToArchive: GeneralEntityRow[]) => {
      if (rowsToArchive.length === 0) return;
      const ok = await confirm({
        title: "Archivar entidades",
        message:
          rowsToArchive.length === 1
            ? `¿Archivar ${formatProperName(rowsToArchive[0].name)}?`
            : `¿Archivar ${rowsToArchive.length} entidades seleccionadas?`,
        severity: "warning",
        primaryLabel: "Archivar",
        secondaryLabel: "Cancelar",
      });
      if (!ok) return;

      setArchiving(true);
      try {
        let archivedCount = 0;
        for (const row of rowsToArchive) {
          const archived = await archiveOne(row);
          if (archived) archivedCount += 1;
        }
        if (archivedCount > 0) {
          notify.success(
            archivedCount === 1 ? "Entidad archivada." : `${archivedCount} entidades archivadas.`
          );
          await refreshAfterMutation();
        }
      } catch (error) {
        notify.error(formatError(error, { fallback: "No se pudo archivar la selección." }));
      } finally {
        setArchiving(false);
      }
    },
    [archiveOne, confirm, refreshAfterMutation]
  );

  const archivedView = archivedTarget ?? activeView ?? createView;
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
      <ArchivedActorsByRole filters={{ role: "cliente" }} onAfterRestore={refreshAfterMutation} />
    );
  };

  return (
    <div className="relative">
      <LoadingOverlay show={archiving} />

      <div className="space-y-2">
        <AppFilterBar
          className="z-popover"
          filters={filterItems(["customer", "project", "investor", "campaign", "provider"])}
        />
        <AppFilterBar
          className="z-dropdown"
          filters={filterItems(["manager", "tenant", "field", "lot", "crop"])}
        />
        <div className="flex justify-end gap-2 pt-1">
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Archive className="h-4 w-4" />}
            onClick={() => {
              setArchivedTarget(activeView ?? createView);
              setArchivedOpen(true);
            }}
          >
            Archivados
          </Button>
          <Button
            variant="primary"
            size="sm"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={() => openCreate()}
          >
            Nuevo {viewSingularLabel[createView]}
          </Button>
        </div>
      </div>

      <EntityCatalogProjectModule
        rows={rows}
        filters={filters}
        filterModes={filterModes}
        projectDetails={projectDetails}
        loading={loading}
        onCreate={(view) => openCreate(view)}
        onEdit={openEditor}
        onArchive={(row) => void archiveRows([row])}
        onOpenArchived={(view) => {
          setArchivedTarget(view);
          setArchivedOpen(true);
        }}
        onSaved={refreshAfterMutation}
      />

      <ActorFormDrawer
        open={actorForm.open}
        actor={actorForm.editing}
        processing={
          actorsProcessing || (actorEditorContext?.syncCustomer ? customersProcessing : false)
        }
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

      <ProjectBasicDrawer
        open={projectEditor !== null}
        mode={projectEditor?.mode ?? "create"}
        projectId={projectEditor?.projectId ?? null}
        customerId={projectEditor?.customerId ?? null}
        campaignId={projectEditor?.campaignId ?? null}
        project={
          projectEditor?.projectId ? (projectDetails[projectEditor.projectId] ?? null) : null
        }
        customers={customers}
        campaigns={campaigns}
        onClose={() => setProjectEditor(null)}
        onSaved={refreshAfterMutation}
      />

      <FieldBasicDrawer
        open={fieldEditor !== null}
        mode={fieldEditor?.mode ?? "edit"}
        projectId={fieldEditor?.projectId ?? null}
        fieldId={fieldEditor?.fieldId ?? null}
        project={fieldEditor?.projectId ? (projectDetails[fieldEditor.projectId] ?? null) : null}
        field={
          fieldEditor?.fieldId
            ? (fields.find((field) => field.id === fieldEditor.fieldId) ?? null)
            : null
        }
        projects={projects.map((project) => ({ id: project.id, name: project.name }))}
        onClose={() => setFieldEditor(null)}
        onSaved={refreshAfterMutation}
      />

      <LotBasicDrawer
        open={lotEditor !== null}
        mode={lotEditor?.mode ?? "edit"}
        lot={lotEditor?.lotId ? (lots.find((lot) => lot.id === lotEditor.lotId) ?? null) : null}
        fieldId={lotEditor?.fieldId ?? null}
        fields={fields.map((field) => ({ id: field.id, name: field.name }))}
        onClose={() => setLotEditor(null)}
        onSaved={refreshAfterMutation}
      />

      <ArchivedDrawer
        open={archivedOpen}
        title={archivedTitle}
        onClose={() => {
          setArchivedOpen(false);
          setArchivedTarget(null);
        }}
      >
        {renderArchived()}
      </ArchivedDrawer>
    </div>
  );
}
