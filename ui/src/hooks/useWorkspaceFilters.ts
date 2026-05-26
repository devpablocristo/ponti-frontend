import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelection } from "../pages/login/context/useSelection";
import useCustomers from "./useCustomers";
import useProjects from "./useDatabase/projects";
import useCampaigns from "./useCampaigns";
import useFields from "./useFields";
import { useTenant } from "../pages/login/context/useTenant";

export interface Customer {
  id: number;
  name: string;
  actor_id?: number;
}

export interface Project {
  id: number;
  name: string;
}

export interface Campaign {
  id: number;
  name: string;
  project_id: number;
}

export interface Field {
  id: number;
  name: string;
  project_id: number;
}

interface FilterBarFilter {
  type: "search" | "select";
  name: string;
  label: string;
  placeholder: string;
  ref?: string;
  total?: number;
  options: Array<{ id: number; name: string }>;
  value: string | number | null;
  onChange: (value: string) => void;
  setData: (data: unknown) => void;
  disabled?: boolean;
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
  allowAll?: boolean;
  allLabel?: string;
  preserveAllSelection?: boolean;
}

export interface UseWorkspaceFiltersReturn {
  customers: Customer[];
  projectsDropdown: Project[];
  campaigns: Campaign[];
  fields: Field[];
  projectPageInfo: unknown; // Replace 'unknown' with your actual PageInfo type from useProjects
  selectedCustomer: Customer | undefined;
  selectedProject: Project | undefined;
  projectId: number | null;
  selectedCampaignId: number | undefined; // Or Campaign object if you prefer
  selectedField: Field | undefined;
  hasWorkspaceSelection: boolean;
  workspaceReady: boolean;
  seasons: { name: string; id: number }[];
  filters: FilterBarFilter[];
  errors: {
    customers: string | null;
    projects: string | null;
    campaigns: string | null;
    fields: string | null;
  };
  loading: {
    customers: boolean;
    projects: boolean;
    campaigns: boolean;
    fields: boolean;
  };
}

type FilterKey = "customer" | "project" | "campaign" | "field";

export const useWorkspaceFilters = (
  enabledFilters: FilterKey[] = ["customer", "project", "campaign", "field"]
): UseWorkspaceFiltersReturn => {
  const enabledFiltersKey = Array.from(
    new Set<FilterKey>(["customer", "project", "campaign", ...enabledFilters])
  ).join("|");
  const enabledFilterSet = useMemo(
    () => new Set(enabledFiltersKey ? (enabledFiltersKey.split("|") as FilterKey[]) : []),
    [enabledFiltersKey]
  );
  const { tenantId, loading: tenantLoading } = useTenant();
  const tenantReady = Boolean(tenantId) && !tenantLoading;

  const {
    customer: contextCustomer,
    setCustomer: contextSetCustomer,
    project: contextProject,
    setProject: contextSetProject,
    projectId: contextProjectId,
    setProjectId: contextSetProjectId,
    campaign: contextCampaign,
    setCampaign: contextSetCampaign,
    field: contextField,
    setField: contextSetField,
    allSelection,
    setAllSelection,
    seasons,
  } = useSelection();

  const selectedCustomer = contextCustomer as Customer | undefined;
  const selectedProject = contextProject as Project | undefined;
  const projectId = contextProjectId;
  const selectedCampaign = contextCampaign as Campaign | undefined;
  const selectedCampaignId = selectedCampaign?.id;
  const selectedField = contextField as Field | undefined;
  const allCustomersSelected = allSelection.customer;
  const allProjectsSelected = allSelection.project;
  const allCampaignsSelected = allSelection.campaign;
  const allFieldsSelected = allSelection.field;
  const updateAllSelection = useCallback(
    (patch: Partial<typeof allSelection>) => {
      setAllSelection((current) => ({ ...current, ...patch }));
    },
    [setAllSelection]
  );

  const setSelectedCustomer: React.Dispatch<React.SetStateAction<Customer | undefined>> =
    useCallback(
      (value) => {
        if (typeof value === "function") {
          // Not supported for contextSetCustomer
          return;
        }
        contextSetCustomer(value);
      },
      [contextSetCustomer]
    );

  const setSelectedProject: React.Dispatch<React.SetStateAction<Project | undefined>> = useCallback(
    (value) => {
      if (typeof value === "function") {
        return;
      }
      contextSetProject(value);
      contextSetProjectId(value?.id);
    },
    [contextSetProject, contextSetProjectId]
  );

  const setSelectedCampaign = useCallback(
    (campaign: Campaign | undefined) => {
      if (!campaign || campaign.id === 0) {
        contextSetCampaign(undefined);
        return;
      }

      contextSetCampaign(campaign);
    },
    [contextSetCampaign]
  );

  const setSelectedField: React.Dispatch<React.SetStateAction<Field | undefined>> = useCallback(
    (value) => {
      if (typeof value === "function") {
        return;
      }
      if (value?.id === 0) {
        contextSetField(undefined);
        return;
      }
      contextSetField(value);
    },
    [contextSetField]
  );

  const normalizedSelectedProject =
    selectedProject && typeof selectedProject.id === "number" && selectedProject.id > 0
      ? selectedProject
      : undefined;
  const selectedProjectId =
    typeof projectId === "number" && projectId > 0 ? projectId : undefined;
  const normalizedProjectId = selectedProjectId;
  const normalizedSelectedField =
    selectedField && typeof selectedField.id === "number" && selectedField.id > 0
      ? selectedField
      : undefined;
  const campaignRequiresProject = enabledFilterSet.has("project");
  const projectScopeSelected =
    Boolean(normalizedSelectedProject) || allProjectsSelected || allCustomersSelected;
  const campaignScopeSelected =
    Boolean(selectedCampaignId && selectedCampaignId > 0) ||
    allCampaignsSelected ||
    projectScopeSelected;
  const campaignEnabled = !campaignRequiresProject || projectScopeSelected;
  const fieldEnabled = campaignScopeSelected;
  const workspaceReady = Boolean(
    selectedCustomer &&
    selectedCustomer.id > 0 &&
    normalizedSelectedProject &&
    normalizedSelectedProject.id > 0 &&
    selectedCampaignId &&
    selectedCampaignId > 0
  );
  const hasWorkspaceSelection = Boolean(
    allCustomersSelected ||
    allProjectsSelected ||
    allCampaignsSelected ||
    allFieldsSelected ||
    (selectedCustomer && selectedCustomer.id > 0) ||
    normalizedSelectedProject ||
    normalizedProjectId ||
    (selectedCampaignId && selectedCampaignId > 0) ||
    normalizedSelectedField
  );

  const [queryCustomer, setQueryCustomer] = useState<string>("");
  const [queryProject, setQueryProject] = useState<string>("");
  const [queryCampaign, setQueryCampaign] = useState<string>("");
  const [queryField, setQueryField] = useState<string>("");
  const [refreshVersion, setRefreshVersion] = useState(0);

  const {
    customers,
    getCustomers,
    total: totalCustomers,
    processing: loadingCustomers,
    error: loadingCustomersError,
  } = useCustomers();

  const {
    projects,
    getProjects,
    projectsDropdown,
    getProjectsDropdown,
    projectsDropdownPagination: projectPageInfo,
    processingDropdown: loadingProjects,
    error: loadingProjectsError,
  } = useProjects();

  const {
    campaigns,
    getCampaigns,
    total: totalCampaigns,
    processing: loadingCampaigns,
    error: loadingCampaignsError,
  } = useCampaigns();

  const {
    fields,
    getFields,
    total: totalFields,
    processing: loadingFields,
    error: loadingFieldsError,
  } = useFields();

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    const handleWorkspaceDataUpdated = () => {
      setRefreshVersion((current) => current + 1);
    };

    window.addEventListener("ponti:workspace-data-updated", handleWorkspaceDataUpdated);
    return () => {
      window.removeEventListener("ponti:workspace-data-updated", handleWorkspaceDataUpdated);
    };
  }, []);

  useEffect(() => {
    if (allCustomersSelected) {
      setQueryCustomer("Todos los clientes");
    } else if (selectedCustomer) {
      setQueryCustomer(selectedCustomer.name);
    } else {
      setQueryCustomer("");
    }
  }, [allCustomersSelected, selectedCustomer]);

  useEffect(() => {
    if (allProjectsSelected) {
      setQueryProject("Todos los proyectos");
    } else if (selectedProject) {
      setQueryProject(selectedProject.name);
    } else {
      setQueryProject("");
    }
  }, [allProjectsSelected, selectedProject]);

  useEffect(() => {
    if (allCampaignsSelected) {
      setQueryCampaign("Todas las campañas");
    } else if (selectedCampaign) {
      setQueryCampaign(selectedCampaign.name);
    } else {
      setQueryCampaign("");
    }
  }, [allCampaignsSelected, selectedCampaign]);

  useEffect(() => {
    if (allFieldsSelected) {
      setQueryField("Todos los campos");
    } else if (normalizedSelectedField) {
      setQueryField(normalizedSelectedField.name);
    } else {
      setQueryField("");
    }
  }, [allFieldsSelected, normalizedSelectedField]);

  const filters: FilterBarFilter[] = [];

  useEffect(() => {
    if (!tenantReady) return;
    if (enabledFilterSet.has("customer")) {
      getCustomers("per_page=1000");
    }
  }, [enabledFilterSet, getCustomers, refreshVersion, tenantId, tenantReady]);

  const handleSetCustomer = useCallback(
    (customer: Customer | undefined) => {
      if (customer?.id === 0) {
        setAllSelection({
          customer: true,
          project: false,
          campaign: false,
          field: false,
        });
        setSelectedCustomer(undefined);
        setSelectedProject(undefined);
        setSelectedCampaign(undefined);
        setSelectedField(undefined);
        setQueryProject("");
        setQueryCampaign("");
        setQueryField("");
        return;
      }

      if (!customer) {
        setAllSelection({
          customer: false,
          project: false,
          campaign: false,
          field: false,
        });
        setSelectedCustomer(undefined);
        setSelectedProject(undefined);
        setSelectedCampaign(undefined);
        setSelectedField(undefined);
        setQueryProject("");
        setQueryCampaign("");
        setQueryField("");
        return;
      }

      updateAllSelection({ customer: false });
      const nextCustomerId = customer && customer.id > 0 ? customer.id : undefined;
      const currentCustomerId =
        selectedCustomer && selectedCustomer.id > 0 ? selectedCustomer.id : undefined;
      const customerChanged = nextCustomerId !== currentCustomerId;

      setSelectedCustomer(customer);

      if (customerChanged) {
        setSelectedProject(undefined);
        setSelectedCampaign(undefined);
        setSelectedField(undefined);
        updateAllSelection({ project: false, campaign: false, field: false });
        setQueryProject("");
        setQueryCampaign("");
        setQueryField("");
      }
    },
    [
      selectedCustomer,
      setAllSelection,
      setSelectedCampaign,
      setSelectedCustomer,
      setSelectedField,
      setSelectedProject,
      updateAllSelection,
    ]
  );

  const handleSetCustomerUnknown = useCallback(
    (data: unknown) => {
      handleSetCustomer(data as Customer | undefined);
    },
    [handleSetCustomer]
  );

  if (enabledFilterSet.has("customer")) {
    filters.push({
      type: "search",
      name: "cliente",
      ref: "client",
      label: "Cliente",
      placeholder: "Buscar",
      options: customers || [],
      total: totalCustomers,
      value: queryCustomer,
      onChange: setQueryCustomer,
      setData: handleSetCustomerUnknown,
      disabled: loadingCustomers,
      loading: loadingCustomers,
      error: loadingCustomersError,
      emptyMessage: "Sin clientes",
      allLabel: "Todos los clientes",
      preserveAllSelection: true,
    });
  }

  useEffect(() => {
    if (!tenantReady) return;
    if (enabledFilterSet.has("project")) {
      if (!allCustomersSelected && selectedCustomer && selectedCustomer.id !== 0) {
        getProjectsDropdown(selectedCustomer.id);
      } else {
        getProjects("per_page=1000");
      }
    }
  }, [
    allCustomersSelected,
    enabledFilterSet,
    getProjects,
    getProjectsDropdown,
    refreshVersion,
    selectedCustomer,
    tenantId,
    tenantReady,
  ]);

  const handleSetProject = useCallback(
    (project: Project | undefined) => {
      if (project?.id === 0) {
        updateAllSelection({ project: true, campaign: false, field: false });
        setSelectedProject(undefined);
        contextSetProjectId(undefined);
        setSelectedCampaign(undefined);
        setSelectedField(undefined);
        setQueryCampaign("");
        setQueryField("");
        return;
      }

      if (!project) {
        updateAllSelection({ project: false, campaign: false, field: false });
        setSelectedProject(undefined);
        contextSetProjectId(undefined);
        setSelectedCampaign(undefined);
        setSelectedField(undefined);
        setQueryCampaign("");
        setQueryField("");
        return;
      }

      updateAllSelection({ project: false });
      const nextProjectId = project && project.id > 0 ? project.id : undefined;
      const currentProjectId =
        normalizedSelectedProject && normalizedSelectedProject.id > 0
          ? normalizedSelectedProject.id
          : undefined;
      const projectChanged = nextProjectId !== currentProjectId;

      setSelectedProject(project);
      contextSetProjectId(nextProjectId);

      if (projectChanged) {
        setSelectedCampaign(undefined);
        setSelectedField(undefined);
        updateAllSelection({ campaign: false, field: false });
        setQueryCampaign("");
        setQueryField("");
      }
    },
    [
      contextSetProjectId,
      normalizedSelectedProject,
      setSelectedCampaign,
      setSelectedField,
      setSelectedProject,
      updateAllSelection,
    ]
  );

  const handleSetProjectUnknown = useCallback(
    (data: unknown) => {
      handleSetProject(data as Project | undefined);
    },
    [handleSetProject]
  );

  if (enabledFilterSet.has("project")) {
    const projectOptions = selectedCustomer
      ? projectsDropdown || []
      : (projects || []).map((project) => ({
          id: project.id,
          name: project.name,
        }));

    filters.push({
      type: "search",
      name: "proyecto",
      ref: "project",
      label: "Proyecto",
      placeholder: "Buscar",
      options: projectOptions,
      total: projectPageInfo?.total || 0,
      value: queryProject,
      onChange: setQueryProject,
      setData: handleSetProjectUnknown,
      disabled: loadingProjects,
      loading: loadingProjects,
      error: loadingProjectsError,
      emptyMessage: "Sin proyectos",
      allLabel: "Todos los proyectos",
      preserveAllSelection: true,
    });
  }

  useEffect(() => {
    if (!tenantReady) return;
    if (!enabledFilterSet.has("campaign")) return;
    if (!campaignEnabled) {
      setSelectedCampaign(undefined);
      setQueryCampaign("");
      return;
    }

    const params = new URLSearchParams();
    if (!allCustomersSelected && selectedCustomer && selectedCustomer.id !== 0) {
      params.set("customer_id", String(selectedCustomer.id));
    }
    if (!allProjectsSelected && selectedProject && selectedProject.id !== 0) {
      params.set("project_name", selectedProject.name);
    }
    params.set("limit", "1000");
    getCampaigns(params.toString());
  }, [
    campaignEnabled,
    enabledFilterSet,
    getCampaigns,
    allCustomersSelected,
    allProjectsSelected,
    refreshVersion,
    selectedCustomer,
    selectedProject,
    setSelectedCampaign,
    tenantId,
    tenantReady,
  ]);

  if (enabledFilterSet.has("campaign")) {
    filters.push({
      type: "search",
      name: "campaña",
      label: "Campaña",
      placeholder: "Buscar",
      options: campaigns || [],
      total: totalCampaigns,
      value: queryCampaign,
      onChange: setQueryCampaign,
      setData: (data: unknown) => {
        const campaign = data as Campaign | undefined;
        if (campaign?.id === 0) {
          updateAllSelection({ campaign: true, field: false });
          setSelectedCampaign(undefined);
          contextSetProjectId(normalizedSelectedProject?.id);
          setSelectedField(undefined);
          setQueryField("");
          return;
        }

        if (!campaign) {
          updateAllSelection({ campaign: false, field: false });
          setSelectedCampaign(undefined);
          contextSetProjectId(normalizedSelectedProject?.id);
          setSelectedField(undefined);
          setQueryField("");
          return;
        }

        updateAllSelection({ campaign: false });
        const nextCampaignId = campaign && campaign.id > 0 ? campaign.id : undefined;
        const currentCampaignId =
          selectedCampaign && selectedCampaign.id > 0 ? selectedCampaign.id : undefined;
        const campaignChanged = nextCampaignId !== currentCampaignId;

        setSelectedCampaign(campaign);
        contextSetProjectId(normalizedSelectedProject?.id);

        if (campaignChanged) {
          setSelectedField(undefined);
          updateAllSelection({ field: false });
          setQueryField("");
        }
      },
      disabled: loadingCampaigns || !campaignEnabled,
      loading: loadingCampaigns,
      error: loadingCampaignsError,
      emptyMessage: campaignEnabled ? "Sin campañas" : "Seleccioná un proyecto",
      allLabel: "Todas las campañas",
      preserveAllSelection: true,
    });
  }

  useEffect(() => {
    if (!tenantReady) return;
    if (!enabledFilterSet.has("field")) return;

    if (fieldEnabled && normalizedProjectId) {
      getFields(`project_id=${normalizedProjectId}`);
      return;
    }

    if (fieldEnabled) {
      getFields("per_page=1000");
    }
  }, [
    enabledFilterSet,
    fieldEnabled,
    getFields,
    normalizedProjectId,
    refreshVersion,
    tenantId,
    tenantReady,
  ]);

  useEffect(() => {
    if (!normalizedSelectedField || loadingFields) return;

    if (!fieldEnabled) {
      setSelectedField(undefined);
      setQueryField("");
      return;
    }

    if (Array.isArray(fields) && fields.length > 0) {
      const fieldStillBelongsToProject = fields.some(
        (field) => field.id === normalizedSelectedField.id
      );
      if (!fieldStillBelongsToProject) {
        setSelectedField(undefined);
        setQueryField("");
      }
    }
  }, [
    fields,
    loadingFields,
    fieldEnabled,
    normalizedProjectId,
    normalizedSelectedField,
    setSelectedField,
  ]);

  if (enabledFilterSet.has("field")) {
    filters.push({
      type: "search",
      name: "campo",
      label: "Campo",
      placeholder: "Buscar",
      options: fieldEnabled && Array.isArray(fields) ? fields : [],
      total: totalFields,
      value: queryField,
      onChange: setQueryField,
      setData: (data: unknown) => {
        const field = data as Field | undefined;
        if (field?.id === 0) {
          updateAllSelection({ field: true });
          setSelectedField(undefined);
          return;
        }
        if (!field) {
          updateAllSelection({ field: false });
          setSelectedField(undefined);
          return;
        }
        updateAllSelection({ field: false });
        setSelectedField(field);
      },
      disabled: loadingFields || !fieldEnabled,
      loading: loadingFields,
      error: loadingFieldsError,
      emptyMessage: fieldEnabled ? "Sin campos" : "Seleccioná una campaña",
      allLabel: "Todos los campos",
      preserveAllSelection: true,
    });
  }

  return {
    customers: customers || [],
    campaigns: campaigns || [],
    projectsDropdown: projectsDropdown || [],
    fields: (fields as Field[]) || [],
    projectPageInfo: projectPageInfo,
    selectedCustomer,
    selectedProject: normalizedSelectedProject,
    projectId: normalizedProjectId ?? null,
    selectedCampaignId,
    selectedField: normalizedSelectedField,
    hasWorkspaceSelection,
    workspaceReady,
    filters,
    seasons,
    loading: {
      customers: loadingCustomers,
      projects: loadingProjects,
      campaigns: loadingCampaigns,
      fields: loadingFields,
    },
    errors: {
      customers: loadingCustomersError,
      campaigns: loadingCampaignsError,
      projects: loadingProjectsError,
      fields: loadingFieldsError,
    },
  };
};
