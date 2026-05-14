import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Save, Trash2 } from "lucide-react";

import { apiClient } from "@/api/client";
import Button from "../../../../components/Button/Button";
import { IconActionButton } from "../../../../components/Button/IconActionButton";
import InputField from "../../../../components/Input/InputField";
import SmartEntityInput from "../../../../components/SmartEntityInput/SmartEntityInput";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { SuccessBanner } from "../../../../components/feedback/SuccessBanner";
import type { CustomerData, CustomerPayload } from "../../../../hooks/useCustomers/types";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
import { findEntityMatches, normalizeEntityName } from "../../../../lib/entityNameMatcher";
import { useSelection } from "../../../login/context/useSelection";

type ApiResponse<T> = {
  success: boolean;
  data: T;
};

type ProjectListItem = {
  id: number;
  name: string;
  customer?: string;
  campaign?: string;
};
type EntityOption = {
  id: number;
  name: string;
};
type CampaignPayload = {
  data: EntityOption[];
  total: number;
};
type FieldPayload = {
  data: Array<EntityOption & { project_id?: number }>;
  total: number;
};
type CropPayload = EntityOption[];
type LotListPayload = {
  data?: Array<{
    id: number;
    lot_name?: string;
    name?: string;
    field_id?: number;
  }>;
  items?: Array<{
    id: number;
    lot_name?: string;
    name?: string;
    field_id?: number;
  }>;
};

type ProjectListResponse = {
  data?: ProjectListItem[];
  items?: ProjectListItem[];
};

type ProjectDetailResponse = ApiResponse<Project>;
type SelectionValue = number | "" | "new";
type ActorOption = {
  id: number | string;
  name: string;
  roles?: string[];
  customer_id?: number | null;
};
type ActorPayload = {
  data: Array<{
    id: number;
    display_name: string;
    roles?: string[];
  }>;
  total: number;
};

const NEW_VALUE = "new";

function isExistingId(value: SelectionValue): value is number {
  return typeof value === "number" && value > 0;
}

function numericActorId(actor: ActorOption): number | null {
  return typeof actor.id === "number" ? actor.id : null;
}

function createEmptyProject(customer?: CustomerData | null): Project {
  return {
    name: "",
    customer: {
      id: customer?.id ?? null,
      actor_id: customer?.actor_id ?? null,
      name: customer?.name ?? "",
    },
    campaign: {
      id: null,
      name: "",
    },
    managers: [{ id: 0, name: "" }],
    investors: [{ id: 0, name: "", percentage: 0 }],
    admin_cost_investors: [{ id: 0, name: "", percentage: 0 }],
    admin_cost: 0,
    planned_cost: 0,
    fields: [
      {
        id: -Date.now(),
        name: "",
        lease_type_id: 0,
        lease_type_percent: "",
        lease_type_value: "",
        investors: [],
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
      },
    ],
    updated_at: undefined,
  };
}

function normalizeProject(project: Project): Project {
  return {
    ...project,
    customer: project.customer ?? { id: null, name: "" },
    campaign: project.campaign ?? { id: null, name: "" },
    managers: Array.isArray(project.managers) ? project.managers : [],
    investors: Array.isArray(project.investors) ? project.investors : [],
    admin_cost_investors: Array.isArray(project.admin_cost_investors)
      ? project.admin_cost_investors
      : [],
    fields: Array.isArray(project.fields)
      ? project.fields.map((field) => ({
          ...field,
          investors: Array.isArray(field.investors) ? field.investors : [],
          lots: Array.isArray(field.lots) ? field.lots : [],
        }))
      : [],
  };
}

type CustomerEditorProps = {
  embedded?: boolean;
  mode?: "customerOnly" | "project";
  customerId?: number | null;
  initialProjectId?: number | null;
  onClose?: () => void;
};

export default function CustomerEditor({
  embedded = false,
  mode = "project",
  customerId,
  initialProjectId,
  onClose,
}: CustomerEditorProps = {}) {
  const navigate = useNavigate();
  const { id } = useParams();
  const initialCustomerId = customerId ?? (Number(id) || NEW_VALUE);
  const { projectId: contextProjectId } = useSelection();
  const preferredInitialProjectId = initialProjectId ?? contextProjectId ?? null;
  const customerOnly = mode === "customerOnly";

  const [customerOptions, setCustomerOptions] = useState<CustomerData[]>([]);
  const [actorOptions, setActorOptions] = useState<ActorOption[]>([]);
  const [projectOptions, setProjectOptions] = useState<EntityOption[]>([]);
  const [campaignOptions, setCampaignOptions] = useState<EntityOption[]>([]);
  const [fieldOptions, setFieldOptions] = useState<EntityOption[]>([]);
  const [lotOptions, setLotOptions] = useState<EntityOption[]>([]);
  const [cropOptions, setCropOptions] = useState<EntityOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<SelectionValue>(initialCustomerId);
  const [selectedProjectId, setSelectedProjectId] = useState<SelectionValue>(
    initialCustomerId === NEW_VALUE ? NEW_VALUE : ""
  );
  const [projectDraft, setProjectDraft] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmedCustomerCreateName, setConfirmedCustomerCreateName] = useState<string | null>(
    null
  );
  const [confirmedEntityCreates, setConfirmedEntityCreates] = useState<Set<string>>(
    () => new Set()
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      const loadCustomers = async () => {
        try {
          const customersResponse =
            await apiClient.get<ApiResponse<CustomerPayload>>("/customers?limit=1000");
          if (!cancelled) {
            setCustomerOptions(customersResponse.data?.data ?? []);
          }
        } catch {
          if (!cancelled) {
            setError("No se pudieron cargar los clientes.");
          }
        }
      };

      const loadActors = async () => {
        try {
          const actorsResponse =
            await apiClient.get<ApiResponse<ActorPayload>>("/actors?page=1&per_page=1000");
          if (!cancelled) {
            setActorOptions(
              (actorsResponse.data?.data ?? []).map((actor) => ({
                id: actor.id,
                name: actor.display_name,
                roles: actor.roles ?? [],
              }))
            );
          }
        } catch {
          if (!cancelled) {
            setActorOptions([]);
            setError("No se pudieron cargar los actores.");
          }
        }
      };

      const loadReferenceLists = async () => {
        const [campaignsResult, fieldsResult, cropsResult, lotsResult] = await Promise.allSettled([
          apiClient.get<ApiResponse<CampaignPayload>>("/campaigns?limit=1000"),
          apiClient.get<ApiResponse<FieldPayload>>("/fields?limit=1000"),
          apiClient.get<ApiResponse<CropPayload>>("/crops"),
          apiClient.get<ApiResponse<LotListPayload>>("/lots?limit=1000"),
        ]);

        if (cancelled) return;

        if (campaignsResult.status === "fulfilled") {
          setCampaignOptions(campaignsResult.value.data?.data ?? []);
        }
        if (fieldsResult.status === "fulfilled") {
          setFieldOptions(fieldsResult.value.data?.data ?? []);
        }
        if (cropsResult.status === "fulfilled") {
          setCropOptions(cropsResult.value.data ?? []);
        }
        if (lotsResult.status === "fulfilled") {
          const lots = lotsResult.value.data?.data ?? lotsResult.value.data?.items ?? [];
          setLotOptions(
            lots
              .map((lot) => ({
                id: lot.id,
                name: lot.lot_name ?? lot.name ?? "",
              }))
              .filter((lot) => lot.name.trim())
          );
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
  }, [customerOnly]);

  useEffect(() => {
    setSelectedCustomerId(initialCustomerId);
    if (initialCustomerId === NEW_VALUE) {
      setSelectedProjectId(NEW_VALUE);
      setProjectDraft(createEmptyProject(null));
    }
  }, [initialCustomerId]);

  useEffect(() => {
    let cancelled = false;

    const loadProjects = async () => {
      if (customerOnly) {
        setSelectedProjectId("");
        setProjectOptions([]);
        setProjectDraft(
          createEmptyProject(
            isExistingId(selectedCustomerId)
              ? customerOptions.find((customer) => customer.id === selectedCustomerId) ?? null
              : null
          )
        );
        return;
      }

      if (selectedCustomerId === NEW_VALUE) {
        setSelectedProjectId(NEW_VALUE);
        setProjectDraft(createEmptyProject(null));
        setProjectOptions([]);
        return;
      }

      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const url = isExistingId(selectedCustomerId)
          ? `/projects/customers/${selectedCustomerId}?page=1&per_page=1000`
          : "/projects?page=1&per_page=1000";
        const projectsResponse = await apiClient.get<ApiResponse<ProjectListResponse>>(url);
        const projects = projectsResponse.data?.data ?? projectsResponse.data?.items ?? [];
        setProjectOptions(projects.map((project) => ({ id: project.id, name: project.name })));

        const detailsEntries = await Promise.all(
          projects.map(async (project) => {
            const detail = await apiClient.get<ProjectDetailResponse>(`/projects/${project.id}`);
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
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar los proyectos.");
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
  }, [customerOnly, customerOptions, preferredInitialProjectId, selectedCustomerId]);

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

  const customerMatchOptions = useMemo(
    () => customerActorOptions,
    [customerActorOptions]
  );

  const customerNameMatch = useMemo(
    () => findEntityMatches(projectDraft?.customer.name ?? "", customerMatchOptions),
    [customerMatchOptions, projectDraft?.customer.name]
  );

  const customerCreateConfirmed =
    confirmedCustomerCreateName !== null &&
    confirmedCustomerCreateName === customerNameMatch.normalizedInput;

  const managerOptions = useMemo(
    () => {
      const filtered = actorOptions.filter(
        (actor) => !actor.roles?.length || actor.roles.includes("responsable")
      );
      return filtered.length > 0 ? filtered : actorOptions;
    },
    [actorOptions]
  );

  const investorOptions = useMemo(
    () => {
      const filtered = actorOptions.filter(
        (actor) => !actor.roles?.length || actor.roles.includes("inversor")
      );
      return filtered.length > 0 ? filtered : actorOptions;
    },
    [actorOptions]
  );

  const tenantOptions = useMemo(
    () => {
      const filtered = actorOptions.filter(
        (actor) => !actor.roles?.length || actor.roles.includes("arrendatario")
      );
      return filtered.length > 0 ? filtered : actorOptions;
    },
    [actorOptions]
  );

  const entityCreateKey = (scope: string, value: string) =>
    `${scope}:${normalizeEntityName(value)}`;

  const isEntityCreateConfirmed = (scope: string, value: string) =>
    confirmedEntityCreates.has(entityCreateKey(scope, value));

  const confirmEntityCreate = (scope: string, value: string) => {
    setConfirmedEntityCreates((prev) => {
      const next = new Set(prev);
      next.add(entityCreateKey(scope, value));
      return next;
    });
  };

  const clearEntityCreateConfirmation = (scope: string, previousValue: string) => {
    setConfirmedEntityCreates((prev) => {
      const key = entityCreateKey(scope, previousValue);
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  };

  const updateProjectValue = (key: "name" | "admin_cost" | "planned_cost", value: string) => {
    setProjectDraft((prev) => {
      if (!prev) return prev;
      if (key === "name") return { ...prev, name: value };
      return { ...prev, [key]: value === "" ? 0 : Number(value) };
    });
  };

  const updateCustomerName = (value: string) => {
    setConfirmedCustomerCreateName(null);
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            customer: {
              ...prev.customer,
              id: null,
              actor_id: null,
              name: value,
            },
          }
        : prev
    );
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
    setConfirmedCustomerCreateName(null);
    const actorId = typeof actor.id === "number" ? actor.id : null;
    const linkedCustomer =
      (actor.customer_id
        ? customerOptions.find((customer) => customer.id === actor.customer_id)
        : null) ??
      (actorId ? customerByActorId.get(actorId) : null) ??
      null;
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            customer: {
              ...prev.customer,
              id: linkedCustomer?.id ?? null,
              actor_id: actorId,
              name: linkedCustomer?.name ?? actor.name,
            },
          }
        : prev
    );
    if (linkedCustomer) {
      void loadProjectOptionsForCustomer(linkedCustomer.id);
    } else {
      setProjectOptions([]);
    }
  };

  const confirmCustomerCreate = (value: string) => {
    setConfirmedCustomerCreateName(normalizeEntityName(value));
  };

  const selectProjectOption = async (project: EntityOption) => {
    setSelectedProjectId(project.id);
    setLoading(true);
    setError(null);
    try {
      const detail = await apiClient.get<ProjectDetailResponse>(`/projects/${project.id}`);
      setProjectDraft(normalizeProject(detail.data));
    } catch {
      setProjectDraft((prev) => (prev ? { ...prev, name: project.name } : prev));
      setError("No se pudo cargar el proyecto seleccionado.");
    } finally {
      setLoading(false);
    }
  };

  const confirmProjectCreate = (value: string) => {
    confirmEntityCreate("project", value);
  };

  const updateCampaignName = (value: string) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            campaign: { ...prev.campaign, id: null, name: value },
          }
        : prev
    );
    clearEntityCreateConfirmation("campaign", projectDraft?.campaign.name ?? "");
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

  const updateFieldName = (fieldIndex: number, value: string) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex ? { ...field, id: field.id > 0 ? 0 : field.id, name: value } : field
            ),
          }
        : prev
    );
    clearEntityCreateConfirmation(
      `field:${fieldIndex}`,
      projectDraft?.fields[fieldIndex]?.name ?? ""
    );
  };

  const selectFieldOption = (fieldIndex: number, fieldOption: EntityOption) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? { ...field, id: fieldOption.id, name: fieldOption.name }
                : field
            ),
          }
        : prev
    );
  };

  const updateLotName = (fieldIndex: number, lotIndex: number, value: string) => {
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
                        ? { ...lot, id: lot.id > 0 ? 0 : lot.id, name: value }
                        : lot
                    ),
                  }
                : field
            ),
          }
        : prev
    );
    clearEntityCreateConfirmation(
      `lot:${fieldIndex}:${lotIndex}`,
      projectDraft?.fields[fieldIndex]?.lots[lotIndex]?.name ?? ""
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
    value: string
  ) => {
    const idKey = kind === "previous" ? "previous_crop_id" : "current_crop_id";
    const nameKey = kind === "previous" ? "previous_crop_name" : "current_crop_name";
    updateLotAt(fieldIndex, lotIndex, idKey, "0");
    updateLotAt(fieldIndex, lotIndex, nameKey, value);
    clearEntityCreateConfirmation(
      `crop:${kind}:${fieldIndex}:${lotIndex}`,
      projectDraft?.fields[fieldIndex]?.lots[lotIndex]?.[nameKey] ?? ""
    );
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

  const updateManagerName = (index: number, value: string) => {
    const scope = `manager:${index}`;
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
    clearEntityCreateConfirmation(scope, projectDraft?.managers[index]?.name ?? "");
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
    value: string
  ) => {
    const scope = `${group}:${index}`;
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            [group]: prev[group].map((investor, idx) =>
              idx === index
                ? {
                    ...investor,
                    id: key === "name" ? 0 : investor.id,
                    actor_id: key === "name" ? null : investor.actor_id,
                    [key]: key === "percentage" ? Number(value || 0) : value,
                  }
                : investor
            ),
          }
        : prev
    );
    if (key === "name") {
      clearEntityCreateConfirmation(scope, projectDraft?.[group][index]?.name ?? "");
    }
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

  const updateFieldAt = (
    fieldIndex: number,
    key: "name" | "lease_type_id" | "lease_type_percent" | "lease_type_value",
    value: string
  ) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: prev.fields.map((field, idx) =>
              idx === fieldIndex
                ? {
                    ...field,
                    [key]: key === "name" ? value : value === "" ? "" : Number(value),
                  }
                : field
            ),
          }
        : prev
    );
  };

  const addField = () => {
    const newFieldId = -Date.now();
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            fields: [
              ...prev.fields,
              {
                id: newFieldId,
                name: "",
                lease_type_id: 0,
                lease_type_percent: "",
                lease_type_value: "",
                investors: [],
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
              },
            ],
          }
        : prev
    );
  };

  const updateFieldInvestorAt = (
    fieldIndex: number,
    investorIndex: number,
    key: "name" | "percentage",
    value: string
  ) => {
    const scope = `field-investor:${fieldIndex}:${investorIndex}`;
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
                        ? {
                            ...investor,
                            id: key === "name" ? 0 : investor.id,
                            actor_id: key === "name" ? null : investor.actor_id,
                            [key]: key === "percentage" ? Number(value || 0) : value,
                          }
                        : investor
                    ),
                  }
                : field
            ),
          }
        : prev
    );
    if (key === "name") {
      clearEntityCreateConfirmation(
        scope,
        projectDraft?.fields[fieldIndex]?.investors[investorIndex]?.name ?? ""
      );
    }
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
                    investors: [
                      ...field.investors,
                      { id: 0, actor_id: null, name: "", percentage: 0 },
                    ],
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
                    investors: field.investors.filter((_item, invIdx) => invIdx !== investorIndex),
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
                                ? Number(value || 0)
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

	  const validateActorEntity = (
	    scope: string,
	    label: string,
	    entity: { id: number | null; actor_id?: number | null; name: string },
	    options: ActorOption[]
	  ) => {
	    const name = entity.name.trim();
	    if (!name || entity.id || entity.actor_id) return null;

    const match = findEntityMatches(name, options);
    if (match.exactMatch) {
      return `Ya existe "${match.exactMatch.name}" en ${label}. Seleccionalo desde la lista.`;
    }

    if (match.requiresConfirmation && !isEntityCreateConfirmed(scope, name)) {
      return `Hay registros parecidos en ${label}. Tocá "Nuevo" para confirmar el alta.`;
    }

    return null;
  };

  const validateActorEntities = () => {
    if (!projectDraft) return null;

    for (const [index, manager] of projectDraft.managers.entries()) {
      const error = validateActorEntity(
        `manager:${index}`,
        "Responsables",
        manager,
        managerOptions
      );
      if (error) return error;
    }

    for (const [index, investor] of projectDraft.investors.entries()) {
      const error = validateActorEntity(
        `investors:${index}`,
        "Inversores",
        investor,
        investorOptions
      );
      if (error) return error;
    }

    for (const [index, investor] of projectDraft.admin_cost_investors.entries()) {
      const error = validateActorEntity(
        `admin_cost_investors:${index}`,
        "Costo administrativo",
        investor,
        investorOptions
      );
      if (error) return error;
    }

    for (const [fieldIndex, field] of projectDraft.fields.entries()) {
      for (const [investorIndex, investor] of field.investors.entries()) {
        const error = validateActorEntity(
          `field-investor:${fieldIndex}:${investorIndex}`,
          "Arrendatarios",
          investor,
          tenantOptions
        );
        if (error) return error;
      }
    }

    return null;
  };

  const handleSave = async () => {
    if (!projectDraft) return;
    const customerId =
      customerOnly && isExistingId(selectedCustomerId)
        ? selectedCustomerId
        : projectDraft.customer.id ?? null;
    const customerActorId = projectDraft.customer.actor_id ?? null;
    const match = findEntityMatches(projectDraft.customer.name, customerMatchOptions);

    if (!customerId && !customerActorId && match.exactMatch) {
      setSuccess(null);
      setError(
        `Ya existe el actor "${match.exactMatch.name}". Seleccionalo desde la lista para evitar duplicados.`
      );
      return;
    }

    if (
      !customerId &&
      !customerActorId &&
      match.requiresConfirmation &&
      confirmedCustomerCreateName !== match.normalizedInput
    ) {
      setSuccess(null);
      setError(
        "Hay clientes parecidos. Confirmá que querés crear uno nuevo antes de guardar."
      );
      return;
    }

    if (!customerOnly && !selectedProjectId) return;

    const actorEntityError = customerOnly ? null : validateActorEntities();
    if (actorEntityError) {
      setSuccess(null);
      setError(actorEntityError);
      return;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (customerOnly) {
        const payload = {
          name: projectDraft.customer.name,
          actor_id: customerActorId,
        };
        if (customerId) {
          await apiClient.put(`/customers/${customerId}`, payload);
          setSuccess("Cliente guardado.");
        } else {
          await apiClient.post("/customers", payload);
          setSuccess("Cliente creado.");
        }
      } else if (selectedProjectId === NEW_VALUE) {
        await apiClient.post("/projects", projectDraft);
        setSuccess("Proyecto creado.");
      } else {
        await apiClient.put(`/projects/${selectedProjectId}`, projectDraft);
        setSuccess("Cambios guardados.");
      }
    } catch {
      setError(customerOnly ? "No se pudo guardar el cliente." : "No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (embedded) {
      onClose?.();
      return;
    }
    navigate("/admin/database/customers/list");
  };

  return (
    <div className={embedded ? "space-y-2 pr-1" : "space-y-2"}>
      <LoadingOverlay show={loading || saving} />
      {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
      {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

      {projectDraft && (
        <div className="space-y-2">
          <section className="drawer-section">
            <div className="drawer-section-header">
              <h2 className="drawer-section-title">{customerOnly ? "Cliente" : "Proyecto"}</h2>
            </div>
            <div className={`grid grid-cols-1 gap-2.5 ${customerOnly ? "max-w-xl" : "md:grid-cols-5"}`}>
              <SmartEntityInput<ActorOption>
                label="Cliente / Sociedad"
                name="project_customer"
                value={projectDraft.customer.name}
                options={customerActorOptions}
                entityLabel="Cliente / Sociedad"
                onChange={updateCustomerName}
                onSelectExisting={selectExistingCustomer}
                selectedOptionId={projectDraft.customer.actor_id ?? null}
                createConfirmed={customerCreateConfirmed}
                onConfirmCreate={confirmCustomerCreate}
                size="sm"
              />
              {!customerOnly && (
                <>
                  <SmartEntityInput<EntityOption>
                    label="Nombre del proyecto"
                    name="project_name"
                    value={projectDraft.name}
                    options={projectOptions}
                    entityLabel="Proyecto"
                    onChange={(value) => updateProjectValue("name", value)}
                    onSelectExisting={selectProjectOption}
                    selectedOptionId={selectedProjectId === NEW_VALUE ? null : selectedProjectId}
                    createConfirmed={isEntityCreateConfirmed("project", projectDraft.name)}
                    onConfirmCreate={confirmProjectCreate}
                    size="sm"
                  />
                  <SmartEntityInput<EntityOption>
                    label="Campaña"
                    name="campaign_name"
                    value={projectDraft.campaign.name}
                    options={campaignOptions}
                    entityLabel="Campaña"
                    onChange={updateCampaignName}
                    onSelectExisting={selectCampaignOption}
                    selectedOptionId={projectDraft.campaign.id}
                    createConfirmed={isEntityCreateConfirmed("campaign", projectDraft.campaign.name)}
                    onConfirmCreate={(value) => confirmEntityCreate("campaign", value)}
                    size="sm"
                  />
                  <InputField
                    label="Costo planificado"
                    name="planned_cost"
                    type="number"
                    value={String(projectDraft.planned_cost ?? 0)}
                    onChange={(event) => updateProjectValue("planned_cost", event.target.value)}
                    size="sm"
                  />
                  <InputField
                    label="Costo administrativo"
                    name="admin_cost"
                    type="number"
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
          <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
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
                    options={managerOptions}
                    entityLabel="Responsable"
	                    onChange={(value) => updateManagerName(index, value)}
	                    onSelectExisting={(actor) => selectManager(index, actor)}
	                    selectedOptionId={manager.actor_id ?? null}
                    createConfirmed={isEntityCreateConfirmed(`manager:${index}`, manager.name)}
                    onConfirmCreate={(value) => confirmEntityCreate(`manager:${index}`, value)}
                    size="sm"
                  />
                  <RemoveButton label="Quitar responsable" onClick={() => removeManager(index)} />
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
                    options={investorOptions}
                    entityLabel="Inversor"
	                    onChange={(value) => updateInvestor("investors", index, "name", value)}
	                    onSelectExisting={(actor) => selectInvestor("investors", index, actor)}
	                    selectedOptionId={investor.actor_id ?? null}
                    createConfirmed={isEntityCreateConfirmed(`investors:${index}`, investor.name)}
                    onConfirmCreate={(value) => confirmEntityCreate(`investors:${index}`, value)}
                    size="sm"
                  />
                  <InputField
                    label="%"
                    name={`investor_percentage_${index}`}
                    type="number"
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
                    options={investorOptions}
                    entityLabel="Inversor"
                    onChange={(value) =>
                      updateInvestor("admin_cost_investors", index, "name", value)
                    }
	                    onSelectExisting={(actor) =>
	                      selectInvestor("admin_cost_investors", index, actor)
	                    }
	                    selectedOptionId={investor.actor_id ?? null}
                    createConfirmed={isEntityCreateConfirmed(
                      `admin_cost_investors:${index}`,
                      investor.name
                    )}
                    onConfirmCreate={(value) =>
                      confirmEntityCreate(`admin_cost_investors:${index}`, value)
                    }
                    size="sm"
                  />
                  <InputField
                    label="%"
                    name={`admin_investor_percentage_${index}`}
                    type="number"
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
              <AddButton label="Agregar campo" onClick={addField} />
            </div>

            <div className="space-y-2">
              {projectDraft.fields.length === 0 ? (
                <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                  Sin campos cargados.
                </p>
              ) : (
                projectDraft.fields.map((field, fieldIndex) => (
                  <div
                    key={field.id || fieldIndex}
                    className="rounded-lg border border-slate-200 bg-slate-50 p-2.5"
                  >
                    <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1fr_180px_1.2fr]">
                      <SmartEntityInput<EntityOption>
                        label="Campo"
                        name={`field_${fieldIndex}`}
                        value={field.name}
                        options={fieldOptions}
                        entityLabel="Campo"
                        onChange={(value) => updateFieldName(fieldIndex, value)}
                        onSelectExisting={(fieldOption) =>
                          selectFieldOption(fieldIndex, fieldOption)
                        }
                        selectedOptionId={field.id > 0 ? field.id : null}
                        createConfirmed={isEntityCreateConfirmed(
                          `field:${fieldIndex}`,
                          field.name
                        )}
                        onConfirmCreate={(value) =>
                          confirmEntityCreate(`field:${fieldIndex}`, value)
                        }
                        size="sm"
                      />
                      <InputField
                        label="Tipo de Arriendo"
                        name={`field_lease_${fieldIndex}`}
                        type="number"
                        value={String(field.lease_type_id ?? 0)}
                        onChange={(event) =>
                          updateFieldAt(fieldIndex, "lease_type_id", event.target.value)
                        }
                        size="sm"
                      />
                      <div>
                        <div className="mb-1.5 flex items-center justify-between">
                          <span className="text-xs font-medium text-slate-600">Arrendatario</span>
                          <button
                            type="button"
                            className="text-xs font-semibold text-primary-700"
                            onClick={() => addFieldInvestorAt(fieldIndex)}
                          >
                            + Agregar
                          </button>
                        </div>
                        <div className="space-y-2">
                          {field.investors.length === 0 ? (
                            <div className="rounded-md border border-dashed border-slate-300 bg-white px-3 py-2 text-sm text-slate-500">
                              Sin arrendatarios
                            </div>
                          ) : (
                            field.investors.map((investor, investorIndex) => (
                              <div
                                key={investorIndex}
                                className="grid grid-cols-[1fr_80px_auto] gap-2"
                              >
                                <SmartEntityInput<ActorOption>
                                  label=""
                                  name={`field_investor_${fieldIndex}_${investorIndex}`}
                                  value={investor.name}
                                  options={tenantOptions}
                                  entityLabel="Arrendatario"
                                  onChange={(value) =>
                                    updateFieldInvestorAt(
                                      fieldIndex,
                                      investorIndex,
                                      "name",
                                      value
                                    )
                                  }
                                  onSelectExisting={(actor) =>
                                    selectFieldInvestorAt(fieldIndex, investorIndex, actor)
                                  }
                                  selectedOptionId={investor.actor_id ?? null}
                                  createConfirmed={isEntityCreateConfirmed(
                                    `field-investor:${fieldIndex}:${investorIndex}`,
                                    investor.name
                                  )}
                                  onConfirmCreate={(value) =>
                                    confirmEntityCreate(
                                      `field-investor:${fieldIndex}:${investorIndex}`,
                                      value
                                    )
                                  }
                                  size="sm"
                                />
                                <InputField
                                  label=""
                                  name={`field_investor_percentage_${fieldIndex}_${investorIndex}`}
                                  type="number"
                                  value={String(investor.percentage ?? 0)}
                                  onChange={(event) =>
                                    updateFieldInvestorAt(
                                      fieldIndex,
                                      investorIndex,
                                      "percentage",
                                      event.target.value
                                    )
                                  }
                                  size="sm"
                                />
                                <RemoveButton
                                  label="Quitar arrendatario"
                                  onClick={() => removeFieldInvestorAt(fieldIndex, investorIndex)}
                                />
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="mt-2 rounded-lg border border-slate-200 bg-white p-2.5">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <h3 className="text-sm font-semibold text-slate-950">Lotes</h3>
                        <AddButton label="Agregar lote" onClick={() => addLotAt(fieldIndex)} />
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
                              options={lotOptions}
                              entityLabel="Lote"
                              onChange={(value) => updateLotName(fieldIndex, lotIndex, value)}
                              onSelectExisting={(lotOption) =>
                                selectLotOption(fieldIndex, lotIndex, lotOption)
                              }
                              selectedOptionId={lot.id > 0 ? lot.id : null}
                              createConfirmed={isEntityCreateConfirmed(
                                `lot:${fieldIndex}:${lotIndex}`,
                                lot.name
                              )}
                              onConfirmCreate={(value) =>
                                confirmEntityCreate(`lot:${fieldIndex}:${lotIndex}`, value)
                              }
                              size="sm"
                            />
                            <InputField
                              label="Hectáreas"
                              name={`lot_hectares_${fieldIndex}_${lotIndex}`}
                              type="number"
                              value={String(lot.hectares ?? 0)}
                              onChange={(event) =>
                                updateLotAt(fieldIndex, lotIndex, "hectares", event.target.value)
                              }
                              size="sm"
                            />
                            <SmartEntityInput<EntityOption>
                              label="Cultivo Anterior"
                              name={`lot_previous_crop_${fieldIndex}_${lotIndex}`}
                              value={lot.previous_crop_name ?? ""}
                              options={cropOptions}
                              entityLabel="Cultivo"
                              onChange={(value) =>
                                updateCropName(fieldIndex, lotIndex, "previous", value)
                              }
                              onSelectExisting={(crop) =>
                                selectCropOption(fieldIndex, lotIndex, "previous", crop)
                              }
                              selectedOptionId={lot.previous_crop_id || null}
                              createConfirmed={isEntityCreateConfirmed(
                                `crop:previous:${fieldIndex}:${lotIndex}`,
                                lot.previous_crop_name ?? ""
                              )}
                              onConfirmCreate={(value) =>
                                confirmEntityCreate(
                                  `crop:previous:${fieldIndex}:${lotIndex}`,
                                  value
                                )
                              }
                              size="sm"
                            />
                            <SmartEntityInput<EntityOption>
                              label="Cultivo Actual"
                              name={`lot_current_crop_${fieldIndex}_${lotIndex}`}
                              value={lot.current_crop_name ?? ""}
                              options={cropOptions}
                              entityLabel="Cultivo"
                              onChange={(value) =>
                                updateCropName(fieldIndex, lotIndex, "current", value)
                              }
                              onSelectExisting={(crop) =>
                                selectCropOption(fieldIndex, lotIndex, "current", crop)
                              }
                              selectedOptionId={lot.current_crop_id || null}
                              createConfirmed={isEntityCreateConfirmed(
                                `crop:current:${fieldIndex}:${lotIndex}`,
                                lot.current_crop_name ?? ""
                              )}
                              onConfirmCreate={(value) =>
                                confirmEntityCreate(
                                  `crop:current:${fieldIndex}:${lotIndex}`,
                                  value
                                )
                              }
                              size="sm"
                            />
                            <InputField
                              label="Periodo"
                              name={`lot_season_${fieldIndex}_${lotIndex}`}
                              value={lot.season}
                              onChange={(event) =>
                                updateLotAt(fieldIndex, lotIndex, "season", event.target.value)
                              }
                              size="sm"
                            />
                            <RemoveButton
                              label="Quitar lote"
                              onClick={() => removeLotAt(fieldIndex, lotIndex)}
                            />
                          </div>
                        ))}
                      </div>
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

type EditableListProps<T> = {
  title: string;
  emptyLabel: string;
  items: T[];
  onAdd: () => void;
  renderItem: (item: T, index: number) => ReactNode;
};

function EditableList<T>({ title, emptyLabel, items, onAdd, renderItem }: EditableListProps<T>) {
  return (
    <div className="drawer-section">
      <div className="drawer-section-header">
        <h3 className="drawer-section-title">{title}</h3>
        <AddButton label={`Agregar ${title}`} onClick={onAdd} />
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-2.5 text-sm text-slate-500">
            {emptyLabel}
          </p>
        ) : (
          items.map((item, index) => <div key={index}>{renderItem(item, index)}</div>)
        )}
      </div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <Button variant="light" size="xs" iconLeft={<Plus className="h-3.5 w-3.5" />} onClick={onClick}>
      Agregar
      <span className="sr-only">{label}</span>
    </Button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <IconActionButton
      label={label}
      icon={<Trash2 className="h-4 w-4" />}
      tone="danger"
      className="mt-[22px]"
      onClick={onClick}
      title={label}
    />
  );
}
