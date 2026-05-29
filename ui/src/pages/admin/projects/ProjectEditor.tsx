import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Save } from "lucide-react";

import { apiClient } from "@/api/client";
import { formatError } from "@/lib/format";
import { leaseTypeHasFixedValue, leaseTypeHasPercent } from "@/lib/leaseTypes";
import { filterActive } from "@/lib/lifecycle/filterActive";
import Button from "../../../components/Button/Button";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import SmartEntityInput from "../../../components/SmartEntityInput/SmartEntityInput";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { FormSkeleton } from "../../../components/feedback/Skeleton";
import { notify } from "../../../lib/notify";
import type { CustomerData, CustomerPayload } from "../../../hooks/useCustomers/types";
import { normalizeCropPayload } from "../../../hooks/useCrops";
import type { Project } from "../../../hooks/useDatabase/projects/types";
import { collapseInternalSpaces } from "../../../lib/properName";
import { useSelection } from "../../login/context/useSelection";
import {
  AddButton,
  EditableList,
  RemoveButton,
} from "../master-data/customers/_components/EditableList";
import {
  buildProjectPayloadForSave,
  formatValidationErrors,
  parseProjectFieldErrorMessage,
  validateActorIdentity,
  validateCustomerIdentity,
  type ProjectNameOption,
  validateProjectSelectionsForSave,
  validateUniqueProjectName,
  validatePercentageGroup,
  validateProjectForSave,
} from "../master-data/customers/customerEditorValidation";

import type {
  ActorOption,
  ActorPayload,
  ApiResponse,
  CampaignPayload,
  EntityOption,
  FieldPayload,
  FormOptionsPayload,
  LotListPayload,
  ProjectDetailResponse,
  ProjectListResponse,
  SelectionValue,
} from "../master-data/customers/types";

import {
  COST_INPUT_REGEX,
  HECTARES_INPUT_REGEX,
  NEW_VALUE,
  SEASON_OPTIONS,
  applyCustomerNameEdit,
  createEmptyProject,
  emptyFieldInvestor,
  extractEntityOptions,
  isExistingId,
  isSeasonOneStepForward,
  normalizeDecimalInputValue,
  normalizeProject,
  numericActorId,
  parseBoundedPercentage,
} from "../master-data/customers/helpers";
import {
  buildProjectEditorScope,
  collectScopedCropOptions,
  collectTenantReferences,
  filterProjectEditorOptions,
  filterScopedFieldOptions,
  filterScopedLotOptions,
} from "./projectEditorScope";

export type ProjectEditorProps = {
  embedded?: boolean;
  mode?: "customerOnly" | "project";
  customerId?: number | null;
  initialProjectId?: number | null;
  createNewProject?: boolean;
  selectionOnlyRelations?: boolean;
  initialCustomer?: CustomerData | null;
  initialCampaign?: EntityOption | null;
  contextProject?: EntityOption | null;
  projectNameScope?: ProjectNameOption[];
  cancelPath?: string;
  onClose?: () => void;
  onSaved?: () => Promise<void> | void;
};

type FieldOption = EntityOption & { project_id?: number };
type LotOption = EntityOption & { field_id?: number };

const freshProjectDetailUrl = (projectId: number) => `/projects/${projectId}?fresh=1`;
const EMPTY_PROJECT_NAME_SCOPE: ProjectNameOption[] = [];

const notifyWorkspaceDataUpdated = (entity: "customer" | "project", id: number) => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("ponti:workspace-data-updated", {
      detail: { entity, id },
    })
  );
};

const readSavedCustomer = (response: unknown): CustomerData | null => {
  const root =
    response && typeof response === "object" ? (response as Record<string, unknown>) : null;
  const nested =
    root?.data && typeof root.data === "object" ? (root.data as Record<string, unknown>) : null;
  const source = nested ?? root;
  const id = Number(source?.id);
  const name = typeof source?.name === "string" ? source.name : "";
  if (!Number.isFinite(id) || id <= 0 || !name.trim()) return null;

  const actorId = Number(source?.actor_id);
  return {
    id,
    name,
    ...(Number.isFinite(actorId) && actorId > 0 ? { actor_id: actorId } : {}),
  };
};

const toActorOptions = (
  actors: Array<{
    id: number;
    display_name: string;
    roles?: string[];
    archived_at?: string | null;
    deleted_at?: string | null;
  }>
): ActorOption[] =>
  filterActive(actors).map((actor) => ({
    id: actor.id,
    name: actor.display_name,
    roles: actor.roles ?? [],
  }));

export default function ProjectEditor({
  embedded = false,
  mode = "project",
  customerId,
  initialProjectId,
  createNewProject = false,
  selectionOnlyRelations = false,
  initialCustomer,
  initialCampaign,
  contextProject,
  projectNameScope = EMPTY_PROJECT_NAME_SCOPE,
  cancelPath = "/admin/master-data/customers/list",
  onClose,
  onSaved,
}: ProjectEditorProps = {}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const directInitialProjectId =
    !createNewProject && !customerId && initialProjectId ? initialProjectId : null;
  const initialCustomerId =
    createNewProject && initialCustomer?.id
      ? initialCustomer.id
      : directInitialProjectId
        ? NEW_VALUE
        : (customerId ?? (Number(id) || NEW_VALUE));
  const {
    setCustomer: contextSetCustomer,
    setProject: contextSetProject,
    projectId: contextProjectId,
    setProjectId: contextSetProjectId,
    allSelection,
  } = useSelection();
  const preferredInitialProjectId = initialProjectId ?? contextProjectId ?? null;
  const customerOnly = mode === "customerOnly";

  const [customerOptions, setCustomerOptions] = useState<CustomerData[]>([]);
  const [actorOptions, setActorOptions] = useState<ActorOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<EntityOption[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<EntityOption[]>([]);
  const [fieldOptions, setFieldOptions] = useState<FieldOption[]>([]);
  const [lotOptions, setLotOptions] = useState<LotOption[]>([]);
  const [cropOptions, setCropOptions] = useState<EntityOption[]>([]);
  const [leaseTypeOptions, setLeaseTypeOptions] = useState<EntityOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<SelectionValue>(initialCustomerId);
  const [selectedProjectId, setSelectedProjectId] = useState<SelectionValue>(
    initialCustomerId === NEW_VALUE ? NEW_VALUE : ""
  );
  const [projectDraft, setProjectDraft] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Tracks the name of the project currently loaded into the draft so the
  // editor can refresh its baseline after save/select.
  const loadedProjectName = useRef<string>("");
  const projectEditorScope = useMemo(
    () =>
      buildProjectEditorScope({
        selectionOnlyRelations,
        selectedCustomerId,
        selectedProjectId,
        initialCustomer,
        initialCampaign,
        contextProject,
        projectDraft,
        loadedProjectName: loadedProjectName.current,
      }),
    [
      contextProject,
      initialCampaign,
      initialCustomer,
      projectDraft,
      selectedCustomerId,
      selectedProjectId,
      selectionOnlyRelations,
    ]
  );
  const selectionReferenceCustomerId = projectEditorScope.customerId;
  const selectionReferenceProjectId = projectEditorScope.projectId;
  const selectionReferenceProjectName = projectEditorScope.projectName;
  const referenceListUrls = useMemo(() => {
    const campaignParams = new URLSearchParams({ limit: "1000" });
    if (selectionOnlyRelations) {
      if (selectionReferenceCustomerId) {
        campaignParams.set("customer_id", String(selectionReferenceCustomerId));
      }
      if (selectionReferenceProjectName) {
        campaignParams.set("project_name", selectionReferenceProjectName);
      }
    }

    const fieldParams = new URLSearchParams({ per_page: "1000" });
    const lotParams = new URLSearchParams({ per_page: "1000" });
    if (selectionOnlyRelations && selectionReferenceProjectId) {
      fieldParams.set("project_id", String(selectionReferenceProjectId));
      lotParams.set("project_id", String(selectionReferenceProjectId));
    }

    return {
      campaigns: `/campaigns?${campaignParams.toString()}`,
      fields: `/fields?${fieldParams.toString()}`,
      lots: `/lots?${lotParams.toString()}`,
    };
  }, [
    selectionOnlyRelations,
    selectionReferenceCustomerId,
    selectionReferenceProjectId,
    selectionReferenceProjectName,
  ]);
  const createInitialProjectDraft = useCallback(
    (customer?: CustomerData | null): Project => {
      const draft = createEmptyProject(customer ?? initialCustomer ?? null);
      if (initialCampaign?.id && initialCampaign.name) {
        draft.campaign = {
          id: initialCampaign.id,
          name: initialCampaign.name,
        };
      }
      return draft;
    },
    [initialCampaign?.id, initialCampaign?.name, initialCustomer]
  );
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);

      const loadCustomers = async () => {
        try {
          const customersResponse =
            await apiClient.get<ApiResponse<CustomerPayload>>("/customers?limit=1000");
          if (!cancelled) {
            setCustomerOptions(customersResponse.data?.data ?? []);
          }
        } catch {
          if (!cancelled) {
            notify.error("No se pudieron cargar los clientes.");
          }
        }
      };

      const loadActors = async () => {
        try {
          const actorsResponse = await apiClient.get<ApiResponse<ActorPayload>>(
            "/actors?page=1&per_page=1000"
          );
          if (!cancelled) {
            // filterActive defensivo: el BFF debería devolver solo activos,
            // pero hasta que migremos el endpoint (Fase 8) garantizamos
            // aquí que el selector nunca muestre un actor archivado.
            setActorOptions(toActorOptions(actorsResponse.data?.data ?? []));
          }
        } catch {
          if (!cancelled) {
            setActorOptions([]);
            notify.error("No se pudieron cargar los actores.");
          }
        }
      };

      const loadReferenceLists = async () => {
        const [campaignsResult, fieldsResult, cropsResult, lotsResult, formOptionsResult] =
          await Promise.allSettled([
            apiClient.get<ApiResponse<CampaignPayload>>(referenceListUrls.campaigns),
            apiClient.get<ApiResponse<FieldPayload>>(referenceListUrls.fields),
            apiClient.get<ApiResponse<unknown>>("/crops"),
            apiClient.get<ApiResponse<LotListPayload>>(referenceListUrls.lots),
            apiClient.get<ApiResponse<FormOptionsPayload>>("/form-options"),
          ]);

        if (cancelled) return;

        if (campaignsResult.status === "fulfilled") {
          setCampaignOptions(campaignsResult.value.data?.data ?? []);
        }
        if (fieldsResult.status === "fulfilled") {
          setFieldOptions(fieldsResult.value.data?.data ?? []);
        }
        if (cropsResult.status === "fulfilled") {
          setCropOptions(normalizeCropPayload(cropsResult.value.data).data);
        }
        if (lotsResult.status === "fulfilled") {
          const lots = lotsResult.value.data?.data ?? lotsResult.value.data?.items ?? [];
          setLotOptions(
            lots
              .map((lot) => ({
                id: lot.id,
                name: lot.lot_name ?? lot.name ?? "",
                field_id: lot.field_id,
              }))
              .filter((lot) => lot.name.trim())
          );
        }
        if (formOptionsResult.status === "fulfilled") {
          setLeaseTypeOptions(extractEntityOptions(formOptionsResult.value.data?.rentTypes));
        }
      };

      try {
        await Promise.allSettled([
          loadCustomers(),
          loadActors(),
          ...(customerOnly ? [] : [loadReferenceLists()]),
        ]);
        if (!cancelled) {
          setLoading(false);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [customerOnly, referenceListUrls]);

  useEffect(() => {
    setSelectedCustomerId(initialCustomerId);
    if (createNewProject) {
      setSelectedProjectId(NEW_VALUE);
      setProjectDraft(createInitialProjectDraft(initialCustomer ?? null));
      loadedProjectName.current = "";
      return;
    }
    if (initialCustomerId === NEW_VALUE) {
      setSelectedProjectId(NEW_VALUE);
      setProjectDraft(createEmptyProject(null));
      loadedProjectName.current = "";
    }
  }, [createInitialProjectDraft, createNewProject, initialCustomer, initialCustomerId]);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      if (createNewProject) {
        const selectedCustomer =
          initialCustomer ??
          (isExistingId(selectedCustomerId)
            ? (customerOptions.find((customer) => customer.id === selectedCustomerId) ?? null)
            : null);
        setSelectedProjectId(NEW_VALUE);
        setProjectOptions(
          projectNameScope
            .map((project) => ({
              id: typeof project.id === "number" ? project.id : 0,
              name: project.name ?? "",
            }))
            .filter((project) => project.name.trim())
        );
        setProjectDraft(createInitialProjectDraft(selectedCustomer));
        loadedProjectName.current = "";
        return;
      }

      if (customerOnly) {
        setSelectedProjectId("");
        setProjectOptions([]);
        setProjectDraft(
          createEmptyProject(
            isExistingId(selectedCustomerId)
              ? (customerOptions.find((customer) => customer.id === selectedCustomerId) ?? null)
              : null
          )
        );
        loadedProjectName.current = "";
        return;
      }

      if (selectedCustomerId === NEW_VALUE) {
        setSelectedProjectId(NEW_VALUE);
        setProjectDraft(createEmptyProject(null));
        setProjectOptions([]);
        loadedProjectName.current = "";
        return;
      }

      setLoading(true);
      try {
        const url = isExistingId(selectedCustomerId)
          ? `/projects/customers/${selectedCustomerId}?page=1&per_page=1000`
          : "/projects?page=1&per_page=1000";
        const projectsResponse = await apiClient.get<ApiResponse<ProjectListResponse>>(url);
        const projects = projectsResponse.data?.data ?? projectsResponse.data?.items ?? [];
        setProjectOptions(projects.map((project) => ({ id: project.id, name: project.name })));

        const detailsEntries = await Promise.all(
          projects.map(async (project) => {
            const detail = await apiClient.get<ProjectDetailResponse>(
              freshProjectDetailUrl(project.id)
            );
            return [project.id, normalizeProject(detail.data)] as const;
          })
        );

        if (cancelled) return;

        const details = Object.fromEntries(detailsEntries);
        const preferredProject =
          (preferredInitialProjectId
            ? projects.find((project) => project.id === preferredInitialProjectId)
            : undefined) ?? projects[0];
        const preferredDetail = preferredProject
          ? details[preferredProject.id]
          : createEmptyProject(
              customerOptions.find((customer) => customer.id === selectedCustomerId) ?? null
            );

        setSelectedProjectId(preferredProject?.id ?? NEW_VALUE);
        setProjectDraft(preferredDetail ?? null);
        loadedProjectName.current = preferredDetail?.name ?? "";
      } catch {
        if (!cancelled) {
          notify.error("No se pudieron cargar los proyectos.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProjects();

    return () => {
      cancelled = true;
    };
  }, [
    createInitialProjectDraft,
    createNewProject,
    customerOnly,
    customerOptions,
    initialCustomer,
    preferredInitialProjectId,
    projectNameScope,
    selectedCustomerId,
  ]);

  useEffect(() => {
    if (!directInitialProjectId) return;
    let cancelled = false;

    const loadDirectProject = async () => {
      setLoading(true);
      try {
        const detail = await apiClient.get<ProjectDetailResponse>(
          freshProjectDetailUrl(directInitialProjectId)
        );
        if (cancelled) return;
        const loaded = normalizeProject(detail.data);
        setSelectedCustomerId(loaded.customer.id ?? NEW_VALUE);
        setSelectedProjectId(directInitialProjectId);
        setProjectOptions([{ id: directInitialProjectId, name: loaded.name }]);
        setProjectDraft(loaded);
        loadedProjectName.current = loaded.name;
      } catch {
        if (!cancelled) {
          notify.error("No se pudo cargar el proyecto seleccionado.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadDirectProject();

    return () => {
      cancelled = true;
    };
  }, [directInitialProjectId]);

  const customerByActorId = useMemo(() => {
    const map = new Map<number, CustomerData>();
    customerOptions.forEach((customer) => {
      if (customer.actor_id) {
        map.set(customer.actor_id, customer);
      }
    });
    return map;
  }, [customerOptions]);

  const customerActorOptions = useMemo(() => {
    const filtered = actorOptions.filter(
      (actor) => !actor.roles?.length || actor.roles.includes("cliente")
    );
    const source = filtered.length > 0 ? filtered : actorOptions;
    if (source.length > 0) {
      return source.map((actor) => ({
        ...actor,
        customer_id: typeof actor.id === "number" ? customerByActorId.get(actor.id)?.id : null,
      }));
    }
    return customerOptions.map((customer) => ({
      id: customer.actor_id ?? `customer-${customer.id}`,
      name: customer.name,
      roles: ["cliente"],
      customer_id: customer.id,
    }));
  }, [actorOptions, customerByActorId, customerOptions]);

  const customerMatchOptions = useMemo(() => customerActorOptions, [customerActorOptions]);

  const managerOptions = useMemo(() => {
    const filtered = actorOptions.filter(
      (actor) => !actor.roles?.length || actor.roles.includes("responsable")
    );
    return filtered.length > 0 ? filtered : actorOptions;
  }, [actorOptions]);

  const investorOptions = useMemo(() => {
    const filtered = actorOptions.filter(
      (actor) => !actor.roles?.length || actor.roles.includes("inversor")
    );
    return filtered.length > 0 ? filtered : actorOptions;
  }, [actorOptions]);

  const tenantOptions = useMemo(() => {
    const filtered = actorOptions.filter(
      (actor) => !actor.roles?.length || actor.roles.includes("arrendatario")
    );
    return filtered.length > 0 ? filtered : actorOptions;
  }, [actorOptions]);

  const scopedManagerOptions = useMemo(
    () =>
      selectionOnlyRelations
        ? filterProjectEditorOptions(
            managerOptions,
            projectEditorScope,
            projectDraft?.managers ?? [],
            "responsable"
          )
        : managerOptions,
    [managerOptions, projectDraft?.managers, projectEditorScope, selectionOnlyRelations]
  );

  const scopedInvestorOptions = useMemo(
    () =>
      selectionOnlyRelations
        ? filterProjectEditorOptions(
            investorOptions,
            projectEditorScope,
            projectDraft?.investors ?? [],
            "inversor"
          )
        : investorOptions,
    [investorOptions, projectDraft?.investors, projectEditorScope, selectionOnlyRelations]
  );

  const scopedAdminCostInvestorOptions = useMemo(
    () =>
      selectionOnlyRelations
        ? filterProjectEditorOptions(
            investorOptions,
            projectEditorScope,
            projectDraft?.admin_cost_investors ?? [],
            "inversor"
          )
        : investorOptions,
    [
      investorOptions,
      projectDraft?.admin_cost_investors,
      projectEditorScope,
      selectionOnlyRelations,
    ]
  );

  const scopedTenantOptions = useMemo(
    () =>
      selectionOnlyRelations
        ? filterProjectEditorOptions(
            tenantOptions,
            projectEditorScope,
            collectTenantReferences(projectDraft),
            "arrendatario"
          )
        : tenantOptions,
    [projectDraft, projectEditorScope, selectionOnlyRelations, tenantOptions]
  );

  const selectableCustomerActorOptions = useMemo(() => {
    if (!selectionOnlyRelations) return customerActorOptions;
    return customerActorOptions;
  }, [customerActorOptions, selectionOnlyRelations]);

  const selectableProjectOptions = useMemo(() => {
    const customerChanged =
      selectionOnlyRelations &&
      Boolean(projectDraft?.customer.id && initialCustomer?.id) &&
      projectDraft?.customer.id !== initialCustomer?.id;
    const candidates = [
      ...projectOptions,
      ...(customerChanged
        ? []
        : [
            ...projectNameScope.map((project) => ({
              id: typeof project.id === "number" ? project.id : 0,
              name: project.name ?? "",
            })),
            contextProject,
            isExistingId(selectedProjectId) && projectDraft?.name
              ? { id: selectedProjectId, name: projectDraft.name }
              : null,
          ]),
    ];
    const seen = new Set<string>();
    const options = candidates.filter((option): option is EntityOption => {
      if (!option?.name?.trim()) return false;
      if (
        selectionOnlyRelations &&
        !customerChanged &&
        projectEditorScope.projectId &&
        option.id !== projectEditorScope.projectId
      ) {
        return false;
      }
      const key = `${option.id}:${option.name.trim().toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (!selectionOnlyRelations) return options;
    if (customerChanged) return options;
    if (projectEditorScope.projectId) return options;
    if (projectEditorScope.customerId && projectEditorScope.campaignId) return options;
    return [];
  }, [
    contextProject,
    initialCustomer?.id,
    projectDraft?.name,
    projectDraft?.customer.id,
    projectEditorScope.campaignId,
    projectEditorScope.customerId,
    projectEditorScope.projectId,
    projectNameScope,
    projectOptions,
    selectedProjectId,
    selectionOnlyRelations,
  ]);

  const selectableCampaignOptions = useMemo(() => {
    if (!selectionOnlyRelations) return campaignOptions;
    const selectedIds = new Set<number>();
    if (initialCampaign?.id) selectedIds.add(initialCampaign.id);
    if (projectDraft?.campaign.id) selectedIds.add(projectDraft.campaign.id);
    if (!projectEditorScope.hasConcreteScope || selectedIds.size === 0) return [];

    const filtered = campaignOptions.filter((option) => selectedIds.has(option.id));
    const currentCampaign =
      projectDraft?.campaign.id && projectDraft.campaign.name
        ? { id: projectDraft.campaign.id, name: projectDraft.campaign.name }
        : null;
    const initialCampaignOption =
      initialCampaign?.id && initialCampaign.name
        ? { id: initialCampaign.id, name: initialCampaign.name }
        : null;
    const seenIds = new Set<number>();

    return [initialCampaignOption, currentCampaign, ...filtered].filter(
      (option): option is EntityOption => {
        if (!option || seenIds.has(option.id)) return false;
        seenIds.add(option.id);
        return true;
      }
    );
  }, [
    campaignOptions,
    initialCampaign?.id,
    initialCampaign?.name,
    projectDraft?.campaign.id,
    projectDraft?.campaign.name,
    projectEditorScope.hasConcreteScope,
    selectionOnlyRelations,
  ]);

  const selectableFieldOptions = useMemo(() => {
    if (!selectionOnlyRelations) return fieldOptions;
    return filterScopedFieldOptions(fieldOptions, projectEditorScope, projectDraft?.fields ?? []);
  }, [fieldOptions, projectDraft?.fields, projectEditorScope, selectionOnlyRelations]);

  const getSelectableLotOptions = useCallback(
    (fieldId: number) => {
      if (!selectionOnlyRelations) return lotOptions;
      return filterScopedLotOptions(lotOptions, fieldId);
    },
    [lotOptions, selectionOnlyRelations]
  );

  const selectableCropOptions = useMemo(() => {
    if (!selectionOnlyRelations) return cropOptions;
    return collectScopedCropOptions(projectDraft, cropOptions);
  }, [cropOptions, projectDraft, selectionOnlyRelations]);

  const seasonOptions = SEASON_OPTIONS;

  const updateProjectValue = (key: "name" | "admin_cost" | "planned_cost", rawValue: string) => {
    const value = key === "name" ? collapseInternalSpaces(rawValue) : rawValue;
    if (key !== "name" && !COST_INPUT_REGEX.test(value)) return;
    const numericValue = key === "name" ? null : normalizeDecimalInputValue(value);
    if (key !== "name" && (numericValue === null || numericValue < 0)) return;

    if (key === "name") {
      setProjectDraft((prev) => (prev ? { ...prev, name: value } : prev));
      return;
    }

    setProjectDraft((prev) => {
      if (!prev) return prev;
      return { ...prev, [key]: numericValue ?? 0 };
    });
  };

  const updateCustomerName = (rawValue: string) => {
    setProjectDraft((prev) => applyCustomerNameEdit(prev, rawValue));
  };

  const loadProjectOptionsForCustomer = async (customerId: number) => {
    try {
      const response = await apiClient.get<ApiResponse<ProjectListResponse>>(
        `/projects/customers/${customerId}?page=1&per_page=1000`
      );
      const projects = response.data?.data ?? response.data?.items ?? [];
      setProjectOptions(projects.map((project) => ({ id: project.id, name: project.name })));
    } catch {
      setProjectOptions([]);
    }
  };

  const selectExistingCustomer = (actor: ActorOption) => {
    const actorId = typeof actor.id === "number" ? actor.id : null;
    const linkedCustomer =
      (actor.customer_id
        ? customerOptions.find((customer) => customer.id === actor.customer_id)
        : null) ??
      (actorId ? customerByActorId.get(actorId) : null) ??
      null;
    setSelectedCustomerId(linkedCustomer?.id ?? NEW_VALUE);
    setSelectedProjectId("");
    setProjectDraft((prev) => {
      if (!prev) return prev;
      return {
        ...createInitialProjectDraft(linkedCustomer),
        customer: {
          ...prev.customer,
          id: linkedCustomer?.id ?? null,
          actor_id: actorId,
          name: linkedCustomer?.name ?? actor.name,
        },
      };
    });
    loadedProjectName.current = "";
    if (linkedCustomer) {
      void loadProjectOptionsForCustomer(linkedCustomer.id);
    } else {
      setProjectOptions([]);
    }
  };

  const selectProjectOption = async (project: EntityOption) => {
    setSelectedProjectId(project.id);
    setLoading(true);
    try {
      const detail = await apiClient.get<ProjectDetailResponse>(freshProjectDetailUrl(project.id));
      const loaded = normalizeProject(detail.data);
      loadedProjectName.current = loaded.name;
      setProjectDraft(loaded);
    } catch {
      loadedProjectName.current = project.name;
      setProjectDraft((prev) => (prev ? { ...prev, name: project.name } : prev));
      notify.error("No se pudo cargar el proyecto seleccionado.");
    } finally {
      setLoading(false);
    }
  };

  const updateCampaignName = (rawValue: string) => {
    const value = collapseInternalSpaces(rawValue);
    // Same freeSolo semantics as customer: clear the id so the BE treats a
    // typed value as "lookup-by-name or create" instead of renaming the
    // currently-linked campaign at save time.
    setProjectDraft((prev) =>
      prev ? { ...prev, campaign: { ...prev.campaign, id: null, name: value } } : prev
    );
  };

  const selectCampaignOption = (campaign: EntityOption) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            campaign: { id: campaign.id, name: campaign.name },
          }
        : prev
    );
  };

  const updateFieldName = (fieldIndex: number, rawValue: string) => {
    const value = collapseInternalSpaces(rawValue);
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex ? { ...field, name: value } : field
            ),
          }
        : prev
    );
  };

  const selectFieldOption = (fieldIndex: number, fieldOption: EntityOption) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex ? { ...field, id: fieldOption.id, name: fieldOption.name } : field
            ),
          }
        : prev
    );
  };

  const updateLotName = (fieldIndex: number, lotIndex: number, rawValue: string) => {
    const value = collapseInternalSpaces(rawValue);
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    lots: field.lots.map((lot, itemIdx) =>
                      itemIdx === lotIndex ? { ...lot, name: value } : lot
                    ),
                  }
                : field
            ),
          }
        : prev
    );
  };

  const selectLotOption = (fieldIndex: number, lotIndex: number, lotOption: EntityOption) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    lots: field.lots.map((lot, itemIdx) =>
                      itemIdx === lotIndex
                        ? { ...lot, id: lotOption.id, name: lotOption.name }
                        : lot
                    ),
                  }
                : field
            ),
          }
        : prev
    );
  };

  const updateCropName = (
    fieldIndex: number,
    lotIndex: number,
    kind: "previous" | "current",
    rawValue: string
  ) => {
    const value = collapseInternalSpaces(rawValue);
    const nameKey = kind === "previous" ? "previous_crop_name" : "current_crop_name";
    updateLotAt(fieldIndex, lotIndex, nameKey, value);
  };

  const selectCropOption = (
    fieldIndex: number,
    lotIndex: number,
    kind: "previous" | "current",
    crop: EntityOption
  ) => {
    const idKey = kind === "previous" ? "previous_crop_id" : "current_crop_id";
    const nameKey = kind === "previous" ? "previous_crop_name" : "current_crop_name";
    updateLotAt(fieldIndex, lotIndex, idKey, String(crop.id));
    updateLotAt(fieldIndex, lotIndex, nameKey, crop.name);
  };

  const updateManagerName = (index: number, rawValue: string) => {
    const value = collapseInternalSpaces(rawValue);
    // freeSolo: typing clears id/actor_id so the BE looks up by name (or
    // creates) at save time instead of renaming the currently-linked manager.
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            managers: prev.managers.map((manager, idx) =>
              idx === index ? { ...manager, id: 0, actor_id: null, name: value } : manager
            ),
          }
        : prev
    );
  };

  const selectManager = (index: number, actor: ActorOption) => {
    const actorId = numericActorId(actor);
    if (!actorId) return;
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            managers: prev.managers.map((manager, idx) =>
              idx === index ? { ...manager, id: 0, actor_id: actorId, name: actor.name } : manager
            ),
          }
        : prev
    );
  };

  const addManager = () => {
    setProjectDraft((prev) =>
      prev ? { ...prev, managers: [...prev.managers, { id: 0, actor_id: null, name: "" }] } : prev
    );
  };

  const removeManager = (index: number) => {
    setProjectDraft((prev) =>
      prev ? { ...prev, managers: prev.managers.filter((_item, idx) => idx !== index) } : prev
    );
  };

  const updateInvestor = (
    group: "investors" | "admin_cost_investors",
    index: number,
    key: "name" | "percentage",
    rawValue: string
  ) => {
    const value = key === "name" ? collapseInternalSpaces(rawValue) : rawValue;
    const percentage = key === "percentage" ? parseBoundedPercentage(value) : null;
    if (key === "percentage" && percentage === null) return;

    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            [group]: prev[group].map((investor, idx) =>
              idx === index
                ? key === "name"
                  ? {
                      // freeSolo: typing the name clears id/actor_id so the BE
                      // looks up or creates by name at save time.
                      ...investor,
                      id: 0,
                      actor_id: null,
                      name: value,
                    }
                  : {
                      ...investor,
                      percentage: percentage ?? 0,
                    }
                : investor
            ),
          }
        : prev
    );
  };

  const selectInvestor = (
    group: "investors" | "admin_cost_investors",
    index: number,
    actor: ActorOption
  ) => {
    const actorId = numericActorId(actor);
    if (!actorId) return;
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            [group]: prev[group].map((investor, idx) =>
              idx === index ? { ...investor, id: 0, actor_id: actorId, name: actor.name } : investor
            ),
          }
        : prev
    );
  };

  const addInvestor = (group: "investors" | "admin_cost_investors") => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            [group]: [...prev[group], { id: 0, actor_id: null, name: "", percentage: 0 }],
          }
        : prev
    );
  };

  const removeInvestor = (group: "investors" | "admin_cost_investors", index: number) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            [group]: prev[group].filter((_item, idx) => idx !== index),
          }
        : prev
    );
  };

  const leaseTypeName = (leaseTypeId: number, fallback?: string) =>
    fallback ||
    leaseTypeOptions.find((leaseType) => Number(leaseType.id) === Number(leaseTypeId))?.name ||
    "";

  const updateFieldLeaseTypeName = (fieldIndex: number, value: string) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex ? { ...field, lease_type_name: value } : field
            ),
          }
        : prev
    );
  };

  const selectLeaseTypeOption = (fieldIndex: number, leaseType: EntityOption) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    lease_type_id: Number(leaseType.id),
                    lease_type_name: leaseType.name,
                  }
                : field
            ),
          }
        : prev
    );
  };

  const updateFieldLeasePercent = (fieldIndex: number, value: string) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex ? { ...field, lease_type_percent: value } : field
            ),
          }
        : prev
    );
  };

  const updateFieldLeaseValue = (fieldIndex: number, value: string) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex ? { ...field, lease_type_value: value } : field
            ),
          }
        : prev
    );
  };

  const createEmptyField = () => ({
    id: -Date.now(),
    name: "",
    lease_type_id: 0,
    lease_type_percent: "",
    lease_type_value: "",
    investors: [emptyFieldInvestor()],
    lots: [
      {
        id: 0,
        name: "",
        hectares: 0,
        previous_crop_id: 0,
        previous_crop_name: "",
        current_crop_id: 0,
        current_crop_name: "",
        season: "",
      },
    ],
  });

  const addField = () => {
    setProjectDraft((prev) =>
      prev ? { ...prev, fields: [...prev.fields, createEmptyField()] } : prev
    );
  };

  const removeField = (fieldIndex: number) => {
    setProjectDraft((prev) => {
      if (!prev) return prev;
      const fields = prev.fields.filter((_, idx) => idx !== fieldIndex);
      return {
        ...prev,
        fields: fields.length > 0 ? fields : [createEmptyField()],
      };
    });
  };

  const updateFieldInvestorAt = (
    fieldIndex: number,
    investorIndex: number,
    key: "name" | "percentage",
    rawValue: string
  ) => {
    const value = key === "name" ? collapseInternalSpaces(rawValue) : rawValue;
    const percentage = key === "percentage" ? parseBoundedPercentage(value) : null;
    if (key === "percentage" && percentage === null) return;

    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    investors: field.investors.map((investor, invIdx) =>
                      invIdx === investorIndex
                        ? key === "name"
                          ? {
                              // freeSolo: typing clears id/actor_id so BE
                              // looks up or creates by name at save time.
                              ...investor,
                              id: 0,
                              actor_id: null,
                              name: value,
                            }
                          : {
                              ...investor,
                              percentage: percentage ?? 0,
                            }
                        : investor
                    ),
                  }
                : field
            ),
          }
        : prev
    );
  };

  const selectFieldInvestorAt = (fieldIndex: number, investorIndex: number, actor: ActorOption) => {
    const actorId = numericActorId(actor);
    if (!actorId) return;
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    investors: field.investors.map((investor, invIdx) =>
                      invIdx === investorIndex
                        ? { ...investor, id: 0, actor_id: actorId, name: actor.name }
                        : investor
                    ),
                  }
                : field
            ),
          }
        : prev
    );
  };

  const addFieldInvestorAt = (fieldIndex: number) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    investors: [...field.investors, emptyFieldInvestor()],
                  }
                : field
            ),
          }
        : prev
    );
  };

  const removeFieldInvestorAt = (fieldIndex: number, investorIndex: number) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    investors:
                      field.investors.length <= 1
                        ? [emptyFieldInvestor()]
                        : field.investors.filter((_item, invIdx) => invIdx !== investorIndex),
                  }
                : field
            ),
          }
        : prev
    );
  };

  const updateLotAt = (
    fieldIndex: number,
    lotIndex: number,
    key:
      | "name"
      | "hectares"
      | "previous_crop_id"
      | "previous_crop_name"
      | "current_crop_id"
      | "current_crop_name"
      | "season",
    value: string
  ) => {
    const hectaresValue = key === "hectares" ? normalizeDecimalInputValue(value) : null;
    if (
      key === "hectares" &&
      (!HECTARES_INPUT_REGEX.test(value) || hectaresValue === null || hectaresValue < 0)
    ) {
      return;
    }

    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    lots: field.lots.map((lot, lotIdx) =>
                      lotIdx === lotIndex
                        ? {
                            ...lot,
                            [key]:
                              key === "hectares" ||
                              key === "previous_crop_id" ||
                              key === "current_crop_id"
                                ? key === "hectares"
                                  ? (hectaresValue ?? 0)
                                  : Number(value || 0)
                                : value,
                          }
                        : lot
                    ),
                  }
                : field
            ),
          }
        : prev
    );
  };

  // changeLotSeason updates the lot's season and, when the user advances by
  // exactly one step in the natural seasonal cycle (Verano → Otoño → Invierno
  // → Primavera → Verano), rotates the current crop into the previous-crop
  // slot. Multi-step changes (e.g. Primavera → Invierno) and reversals don't
  // auto-rotate — the user keeps full control to fix things by hand.
  const changeLotSeason = (fieldIndex: number, lotIndex: number, newSeason: string) => {
    setProjectDraft((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        fields: prev.fields.map((field, idx) =>
          idx === fieldIndex
            ? {
                ...field,
                lots: field.lots.map((lot, lotIdx) => {
                  if (lotIdx !== lotIndex) return lot;
                  const shouldRotate =
                    isSeasonOneStepForward(lot.season, newSeason) &&
                    Number(lot.current_crop_id) > 0;
                  if (shouldRotate) {
                    return {
                      ...lot,
                      season: newSeason,
                      previous_crop_id: Number(lot.current_crop_id),
                      previous_crop_name: lot.current_crop_name ?? "",
                      current_crop_id: 0,
                      current_crop_name: "",
                    };
                  }
                  return { ...lot, season: newSeason };
                }),
              }
            : field
        ),
      };
    });
  };

  const addLotAt = (fieldIndex: number) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    lots: [
                      ...field.lots,
                      {
                        id: 0,
                        name: "",
                        hectares: 0,
                        previous_crop_id: 0,
                        previous_crop_name: "",
                        current_crop_id: 0,
                        current_crop_name: "",
                        season: "",
                      },
                    ],
                  }
                : field
            ),
          }
        : prev
    );
  };

  const removeLotAt = (fieldIndex: number, lotIndex: number) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? { ...field, lots: field.lots.filter((_item, itemIdx) => itemIdx !== lotIndex) }
                : field
            ),
          }
        : prev
    );
  };

  const validateActorEntities = (draft: Project) => {
    for (const manager of draft.managers) {
      const error = validateActorIdentity("Responsables", manager, scopedManagerOptions);
      if (error) return error;
    }

    for (const investor of draft.investors) {
      const error = validateActorIdentity("Inversores", investor, scopedInvestorOptions);
      if (error) return error;
    }
    const investorsPercentageError = validatePercentageGroup("Inversores", draft.investors);
    if (investorsPercentageError) return investorsPercentageError;

    for (const investor of draft.admin_cost_investors) {
      const error = validateActorIdentity(
        "Costo administrativo",
        investor,
        scopedAdminCostInvestorOptions
      );
      if (error) return error;
    }
    const adminPercentageError = validatePercentageGroup(
      "Costo administrativo",
      draft.admin_cost_investors
    );
    if (adminPercentageError) return adminPercentageError;

    for (const [fieldIndex, field] of draft.fields.entries()) {
      for (const investor of field.investors) {
        const error = validateActorIdentity("Arrendatarios", investor, scopedTenantOptions);
        if (error) return error;
      }
      const fieldInvestorPercentageError = validatePercentageGroup(
        `Arrendatarios del campo ${field.name || fieldIndex + 1}`,
        field.investors,
        { allowEmpty: true }
      );
      if (fieldInvestorPercentageError) return fieldInvestorPercentageError;
    }

    return null;
  };

  const reloadCustomerOptions = async (preferredCustomerId?: number | null) => {
    try {
      const customersResponse = await apiClient.get<ApiResponse<CustomerPayload>>(
        "/customers?per_page=1000"
      );
      const nextCustomers = customersResponse.data?.data ?? [];
      setCustomerOptions(nextCustomers);
      if (!preferredCustomerId) return null;
      return nextCustomers.find((customer) => customer.id === preferredCustomerId) ?? null;
    } catch {
      return null;
    }
  };

  const syncSavedCustomer = (customer: CustomerData | null | undefined) => {
    if (!customer?.id) return;

    setSelectedCustomerId(customer.id);
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            customer: {
              ...prev.customer,
              id: customer.id,
              actor_id: customer.actor_id ?? prev.customer.actor_id ?? null,
              name: customer.name,
            },
          }
        : prev
    );

    if (!allSelection.customer) {
      contextSetCustomer({ id: customer.id, name: customer.name });
    }
    notifyWorkspaceDataUpdated("customer", customer.id);
  };

  const syncSavedProject = (projectId: number, project: Project) => {
    setSelectedProjectId(projectId);
    setProjectDraft(project);
    loadedProjectName.current = project.name;

    if (project.customer?.id) {
      syncSavedCustomer({
        id: project.customer.id,
        name: project.customer.name,
        ...(project.customer.actor_id ? { actor_id: project.customer.actor_id } : {}),
      });
    }

    if (!allSelection.project) {
      contextSetProject({ id: projectId, name: project.name });
      contextSetProjectId(projectId);
    }
    notifyWorkspaceDataUpdated("project", projectId);
  };

  const handleSave = async () => {
    if (!projectDraft) return;
    if (!customerOnly && selectionOnlyRelations && selectedProjectId === NEW_VALUE) {
      notify.error("Proyecto: seleccioná un proyecto existente.");
      return;
    }

    const { project: projectPayload, errors: payloadErrors } = buildProjectPayloadForSave(
      projectDraft,
      { editing: selectedProjectId !== NEW_VALUE }
    );
    const currentProjectId = isExistingId(selectedProjectId) ? selectedProjectId : null;
    const duplicateProjectNameError = customerOnly
      ? null
      : validateUniqueProjectName(projectPayload.name, projectNameScope, currentProjectId);
    const selectionErrors =
      selectionOnlyRelations && !customerOnly ? validateProjectSelectionsForSave(projectDraft) : [];
    const validationErrors = validateProjectForSave(projectPayload, { customerOnly });
    const preflightErrors = [
      ...(duplicateProjectNameError ? [duplicateProjectNameError] : []),
      ...selectionErrors,
      ...validationErrors,
      ...payloadErrors,
    ];
    if (preflightErrors.length > 0) {
      notify.error(formatValidationErrors(preflightErrors));
      return;
    }

    const customerId =
      customerOnly && isExistingId(selectedCustomerId)
        ? selectedCustomerId
        : (projectPayload.customer.id ?? null);
    const customerActorId = projectPayload.customer.actor_id ?? null;

    const customerError = validateCustomerIdentity(
      {
        id: customerId,
        actor_id: customerActorId,
        name: projectPayload.customer.name,
      },
      customerMatchOptions
    );
    if (customerError) {
      notify.error(customerError);
      return;
    }

    if (!customerOnly && selectionOnlyRelations && selectedProjectId === NEW_VALUE) {
      notify.error("Proyecto: seleccioná un proyecto existente.");
      return;
    }

    if (!customerOnly && !selectedProjectId) {
      notify.error(
        selectionOnlyRelations
          ? "Proyecto: seleccioná un proyecto existente."
          : "Proyecto: seleccioná o creá un proyecto."
      );
      return;
    }

    const actorEntityError = customerOnly ? null : validateActorEntities(projectPayload);
    if (actorEntityError) {
      notify.error(actorEntityError);
      return;
    }

    setSaving(true);
    try {
      if (customerOnly) {
        const payload = {
          name: projectPayload.customer.name,
          actor_id: customerActorId,
        };
        let savedCustomer: CustomerData | null = null;
        if (customerId) {
          await apiClient.put(`/customers/${customerId}`, payload);
          savedCustomer = {
            id: customerId,
            name: payload.name,
            ...(customerActorId ? { actor_id: customerActorId } : {}),
          };
          notify.success("Cliente guardado.");
        } else {
          const created = await apiClient.post("/customers", payload);
          savedCustomer = readSavedCustomer(created);
          notify.success("Cliente creado.");
        }
        const refreshedCustomer =
          (await reloadCustomerOptions(savedCustomer?.id ?? customerId ?? null)) ?? savedCustomer;
        syncSavedCustomer(refreshedCustomer);
        await onSaved?.();
        onClose?.();
      } else if (selectedProjectId === NEW_VALUE) {
        if (selectionOnlyRelations) {
          notify.error("Proyecto: seleccioná un proyecto existente.");
          return;
        }
        const created = await apiClient.post<{ id: number }>("/projects", projectPayload);
        const detail = await apiClient.get<ProjectDetailResponse>(
          freshProjectDetailUrl(created.id)
        );
        const refreshed = normalizeProject(detail.data);
        syncSavedProject(created.id, refreshed);
        await onSaved?.();
        notify.success("Proyecto creado.");
        onClose?.();
      } else {
        const savedProjectId = Number(selectedProjectId);
        await apiClient.put(`/projects/${savedProjectId}`, projectPayload);
        const detail = await apiClient.get<ProjectDetailResponse>(
          freshProjectDetailUrl(savedProjectId)
        );
        const refreshed = normalizeProject(detail.data);
        syncSavedProject(savedProjectId, refreshed);
        await onSaved?.();
        notify.success("Cambios guardados.");
        onClose?.();
      }
    } catch (saveError) {
      const fallback = customerOnly
        ? "No se pudo guardar el cliente."
        : "No se pudieron guardar los cambios.";
      const message = formatError(saveError, { fallback });
      const fieldMessage = parseProjectFieldErrorMessage(message);
      notify.error(fieldMessage ? `${message}\n${fieldMessage}` : message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (embedded) {
      onClose?.();
      return;
    }
    navigate(cancelPath);
  };

  return (
    <div className={embedded ? "space-y-2 pr-1" : "space-y-2"}>
      <LoadingOverlay show={(loading || saving) && Boolean(projectDraft)} />

      {loading && !projectDraft ? <FormSkeleton fields={6} /> : null}

      {projectDraft && (
        <div className="space-y-2">
          <section className="drawer-section">
            <div className="drawer-section-header">
              <h2 className="drawer-section-title">{customerOnly ? "Cliente" : "Proyecto"}</h2>
            </div>
            <div
              className={`grid grid-cols-1 gap-2.5 ${customerOnly ? "max-w-xl" : "sm:grid-cols-2 lg:grid-cols-5"}`}
            >
              <SmartEntityInput<ActorOption>
                label="Cliente / Sociedad"
                name="project_customer"
                value={projectDraft.customer.name}
                options={selectableCustomerActorOptions}
                entityLabel="Cliente / Sociedad"
                onChange={updateCustomerName}
                onSelectExisting={selectExistingCustomer}
                selectionOnly={selectionOnlyRelations}
                size="sm"
              />
              {!customerOnly && (
                <>
                  <SmartEntityInput<EntityOption>
                    label="Nombre del proyecto"
                    name="project_name"
                    value={projectDraft.name}
                    options={selectableProjectOptions}
                    entityLabel="Proyecto"
                    onChange={(value) => updateProjectValue("name", value)}
                    onSelectExisting={selectProjectOption}
                    selectionOnly={selectionOnlyRelations}
                    size="sm"
                  />
                  <SmartEntityInput<EntityOption>
                    label="Campaña"
                    name="campaign_name"
                    value={projectDraft.campaign.name}
                    options={selectableCampaignOptions}
                    entityLabel="Campaña"
                    onChange={updateCampaignName}
                    onSelectExisting={selectCampaignOption}
                    formatDisplayValue={false}
                    selectionOnly={selectionOnlyRelations}
                    size="sm"
                  />
                  <InputField
                    label="Costo planificado"
                    name="planned_cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={String(projectDraft.planned_cost ?? 0)}
                    onChange={(event) => updateProjectValue("planned_cost", event.target.value)}
                    size="sm"
                  />
                  <InputField
                    label="Costo administrativo"
                    name="admin_cost"
                    type="number"
                    min={0}
                    step="0.01"
                    value={String(projectDraft.admin_cost ?? 0)}
                    onChange={(event) => updateProjectValue("admin_cost", event.target.value)}
                    size="sm"
                  />
                </>
              )}
            </div>
          </section>

          {!customerOnly && (
            <>
              <section className="grid grid-cols-1 gap-2 lg:grid-cols-2 xl:grid-cols-3">
                <EditableList
                  title="Responsables"
                  emptyLabel="Sin responsables"
                  onAdd={addManager}
                  items={projectDraft.managers}
                  renderItem={(manager, index) => (
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <SmartEntityInput<ActorOption>
                        label={`Responsable ${index + 1}`}
                        name={`manager_${index}`}
                        value={manager.name}
                        options={scopedManagerOptions}
                        entityLabel="Responsable"
                        onChange={(value) => updateManagerName(index, value)}
                        onSelectExisting={(actor) => selectManager(index, actor)}
                        selectionOnly={selectionOnlyRelations}
                        size="sm"
                      />
                      <RemoveButton
                        label="Quitar responsable"
                        onClick={() => removeManager(index)}
                      />
                    </div>
                  )}
                />
                <EditableList
                  title="Inversores"
                  emptyLabel="Sin inversores"
                  onAdd={() => addInvestor("investors")}
                  items={projectDraft.investors}
                  renderItem={(investor, index) => (
                    <div className="grid grid-cols-[1fr_90px_auto] gap-2">
                      <SmartEntityInput<ActorOption>
                        label="Nombre"
                        name={`investor_${index}`}
                        value={investor.name}
                        options={scopedInvestorOptions}
                        entityLabel="Inversor"
                        onChange={(value) => updateInvestor("investors", index, "name", value)}
                        onSelectExisting={(actor) => selectInvestor("investors", index, actor)}
                        selectionOnly={selectionOnlyRelations}
                        size="sm"
                      />
                      <InputField
                        label="%"
                        name={`investor_percentage_${index}`}
                        type="number"
                        min={1}
                        max={100}
                        step="0.01"
                        value={String(investor.percentage ?? 0)}
                        onChange={(event) =>
                          updateInvestor("investors", index, "percentage", event.target.value)
                        }
                        size="sm"
                      />
                      <RemoveButton
                        label="Quitar inversor"
                        onClick={() => removeInvestor("investors", index)}
                      />
                    </div>
                  )}
                />
                <EditableList
                  title="Costo administrativo"
                  emptyLabel="Sin inversores"
                  onAdd={() => addInvestor("admin_cost_investors")}
                  items={projectDraft.admin_cost_investors}
                  renderItem={(investor, index) => (
                    <div className="grid grid-cols-[1fr_90px_auto] gap-2">
                      <SmartEntityInput<ActorOption>
                        label="Nombre"
                        name={`admin_investor_${index}`}
                        value={investor.name}
                        options={scopedAdminCostInvestorOptions}
                        entityLabel="Inversor"
                        onChange={(value) =>
                          updateInvestor("admin_cost_investors", index, "name", value)
                        }
                        onSelectExisting={(actor) =>
                          selectInvestor("admin_cost_investors", index, actor)
                        }
                        selectionOnly={selectionOnlyRelations}
                        size="sm"
                      />
                      <InputField
                        label="%"
                        name={`admin_investor_percentage_${index}`}
                        type="number"
                        min={1}
                        max={100}
                        step="0.01"
                        value={String(investor.percentage ?? 0)}
                        onChange={(event) =>
                          updateInvestor(
                            "admin_cost_investors",
                            index,
                            "percentage",
                            event.target.value
                          )
                        }
                        size="sm"
                      />
                      <RemoveButton
                        label="Quitar inversor administrativo"
                        onClick={() => removeInvestor("admin_cost_investors", index)}
                      />
                    </div>
                  )}
                />
              </section>

              <section className="drawer-section">
                <div className="drawer-section-header">
                  <h2 className="drawer-section-title">Campos</h2>
                  <AddButton label="Agregar Campos" onClick={addField} />
                </div>

                <div className="space-y-2">
                  {projectDraft.fields.length === 0 ? (
                    <p className="rounded-lg border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 p-3 text-sm text-slate-500 dark:text-slate-400">
                      Sin campos cargados.
                    </p>
                  ) : (
                    projectDraft.fields.map((field, fieldIndex) => (
                      <div
                        key={field.id || fieldIndex}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 p-2.5"
                      >
                        <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1fr_180px_1.2fr]">
                          <SmartEntityInput<EntityOption>
                            label="Campo"
                            name={`field_${fieldIndex}`}
                            value={field.name}
                            options={selectableFieldOptions}
                            entityLabel="Campo"
                            onChange={(value) => updateFieldName(fieldIndex, value)}
                            onSelectExisting={(fieldOption) =>
                              selectFieldOption(fieldIndex, fieldOption)
                            }
                            selectionOnly={selectionOnlyRelations}
                            size="sm"
                          />
                          <SmartEntityInput<EntityOption>
                            label="Tipo de Arriendo"
                            name={`field_lease_${fieldIndex}`}
                            value={leaseTypeName(field.lease_type_id ?? 0, field.lease_type_name)}
                            options={leaseTypeOptions}
                            entityLabel="Tipo de Arriendo"
                            onChange={(value) => updateFieldLeaseTypeName(fieldIndex, value)}
                            onSelectExisting={(leaseType) =>
                              selectLeaseTypeOption(fieldIndex, leaseType)
                            }
                            lockName
                            size="sm"
                          />
                          {leaseTypeHasPercent(field.lease_type_id) && (
                            <InputField
                              label="Porcentaje (%)"
                              name={`field_lease_percent_${fieldIndex}`}
                              type="number"
                              value={
                                field.lease_type_percent === null ||
                                field.lease_type_percent === undefined
                                  ? ""
                                  : String(field.lease_type_percent)
                              }
                              onChange={(e) => updateFieldLeasePercent(fieldIndex, e.target.value)}
                              size="sm"
                            />
                          )}
                          {leaseTypeHasFixedValue(field.lease_type_id) && (
                            <InputField
                              label="Valor (USD)"
                              name={`field_lease_value_${fieldIndex}`}
                              type="number"
                              value={
                                field.lease_type_value === null ||
                                field.lease_type_value === undefined
                                  ? ""
                                  : String(field.lease_type_value)
                              }
                              onChange={(e) => updateFieldLeaseValue(fieldIndex, e.target.value)}
                              size="sm"
                            />
                          )}
                          <div className="space-y-2">
                            {field.investors.map((investor, investorIndex) => (
                              <div key={investorIndex} className="space-y-1.5">
                                <SmartEntityInput<ActorOption>
                                  label={investorIndex === 0 ? "Arrendatario" : ""}
                                  name={`field_investor_${fieldIndex}_${investorIndex}`}
                                  value={investor.name}
                                  options={scopedTenantOptions}
                                  entityLabel="Arrendatario"
                                  onChange={(value) =>
                                    updateFieldInvestorAt(fieldIndex, investorIndex, "name", value)
                                  }
                                  onSelectExisting={(actor) =>
                                    selectFieldInvestorAt(fieldIndex, investorIndex, actor)
                                  }
                                  selectionOnly={selectionOnlyRelations}
                                  size="sm"
                                />
                                <div className="flex items-center gap-2">
                                  <InputField
                                    label="%"
                                    name={`field_investor_percentage_${fieldIndex}_${investorIndex}`}
                                    type="number"
                                    min={1}
                                    max={100}
                                    step="0.01"
                                    value={String(investor.percentage ?? 0)}
                                    onChange={(event) =>
                                      updateFieldInvestorAt(
                                        fieldIndex,
                                        investorIndex,
                                        "percentage",
                                        event.target.value
                                      )
                                    }
                                    size="xs"
                                    className="max-w-24"
                                  />
                                  <RemoveButton
                                    label="Quitar arrendatario"
                                    onClick={() => removeFieldInvestorAt(fieldIndex, investorIndex)}
                                  />
                                </div>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="text-xs font-semibold text-primary-700"
                              onClick={() => addFieldInvestorAt(fieldIndex)}
                            >
                              + Otro arrendatario
                            </button>
                          </div>
                        </div>

                        <div className="mt-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 p-2.5">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-slate-950">Lotes</h3>
                            <AddButton label="Agregar Lotes" onClick={() => addLotAt(fieldIndex)} />
                          </div>
                          <div className="space-y-2">
                            {field.lots.map((lot, lotIndex) => (
                              <div
                                key={lot.id || lotIndex}
                                className="grid grid-cols-1 gap-2 lg:grid-cols-[1fr_90px_1fr_1fr_120px_auto]"
                              >
                                <SmartEntityInput<EntityOption>
                                  label="Lote"
                                  name={`lot_${fieldIndex}_${lotIndex}`}
                                  value={lot.name}
                                  options={getSelectableLotOptions(field.id)}
                                  entityLabel="Lote"
                                  onChange={(value) => updateLotName(fieldIndex, lotIndex, value)}
                                  onSelectExisting={(lotOption) =>
                                    selectLotOption(fieldIndex, lotIndex, lotOption)
                                  }
                                  selectionOnly={selectionOnlyRelations}
                                  size="sm"
                                />
                                <InputField
                                  label="Hectáreas"
                                  name={`lot_hectares_${fieldIndex}_${lotIndex}`}
                                  type="number"
                                  min={0}
                                  step="0.001"
                                  value={String(lot.hectares ?? 0)}
                                  onChange={(event) =>
                                    updateLotAt(
                                      fieldIndex,
                                      lotIndex,
                                      "hectares",
                                      event.target.value
                                    )
                                  }
                                  size="sm"
                                />
                                <SmartEntityInput<EntityOption>
                                  label="Cultivo Anterior"
                                  name={`lot_previous_crop_${fieldIndex}_${lotIndex}`}
                                  value={lot.previous_crop_name ?? ""}
                                  options={selectableCropOptions}
                                  entityLabel="Cultivo"
                                  onChange={(value) =>
                                    updateCropName(fieldIndex, lotIndex, "previous", value)
                                  }
                                  onSelectExisting={(crop) =>
                                    selectCropOption(fieldIndex, lotIndex, "previous", crop)
                                  }
                                  lockName={!selectionOnlyRelations}
                                  selectionOnly={selectionOnlyRelations}
                                  size="sm"
                                />
                                <SmartEntityInput<EntityOption>
                                  label="Cultivo Actual"
                                  name={`lot_current_crop_${fieldIndex}_${lotIndex}`}
                                  value={lot.current_crop_name ?? ""}
                                  options={selectableCropOptions}
                                  entityLabel="Cultivo"
                                  lockName={!selectionOnlyRelations}
                                  onChange={(value) =>
                                    updateCropName(fieldIndex, lotIndex, "current", value)
                                  }
                                  onSelectExisting={(crop) =>
                                    selectCropOption(fieldIndex, lotIndex, "current", crop)
                                  }
                                  selectionOnly={selectionOnlyRelations}
                                  size="sm"
                                />
                                <SelectField
                                  label="Periodo"
                                  name={`lot_season_${fieldIndex}_${lotIndex}`}
                                  value={lot.season}
                                  onChange={(event) =>
                                    changeLotSeason(fieldIndex, lotIndex, event.target.value)
                                  }
                                  options={seasonOptions}
                                  size="sm"
                                  fullWidth
                                />
                                <RemoveButton
                                  label="Quitar lote"
                                  onClick={() => removeLotAt(fieldIndex, lotIndex)}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex justify-end pt-1">
                          <RemoveButton
                            label="Quitar campo"
                            onClick={() => removeField(fieldIndex)}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </>
          )}
          <section className="flex justify-end gap-2 pb-2">
            <Button variant="light" disabled={saving} onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              iconLeft={<Save className="h-4 w-4" />}
              disabled={!projectDraft || saving}
              onClick={handleSave}
            >
              Guardar
            </Button>
          </section>
        </div>
      )}
    </div>
  );
}
