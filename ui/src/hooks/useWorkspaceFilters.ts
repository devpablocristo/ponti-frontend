import { useState, useEffect, useCallback, useMemo } from "react";
import { useSelection } from "../pages/login/context/useSelection";
import useCustomers from "./useCustomers";
import useProjects from "./useDatabase/projects";
import useCampaigns from "./useCampaigns";
import useFields from "./useFields";

export interface Customer {
  id: number;
  name: string;
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

export interface FilterBarFilter {
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
    () =>
      new Set(
        enabledFiltersKey
          ? (enabledFiltersKey.split("|") as FilterKey[])
          : []
      ),
    [enabledFiltersKey]
  );

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
    seasons,
  } = useSelection();

  const selectedCustomer = contextCustomer as Customer | undefined;
  const selectedProject = contextProject as Project | undefined;
  const projectId = contextProjectId;
  const selectedCampaign = contextCampaign as Campaign | undefined;
  const selectedCampaignId = selectedCampaign?.id;
  const selectedField = contextField as Field | undefined;

  const setSelectedCustomer: React.Dispatch<
    React.SetStateAction<Customer | undefined>
  > = useCallback(
    (value) => {
      if (typeof value === "function") {
        // Not supported for contextSetCustomer
        return;
      }
      contextSetCustomer(value);
    },
    [contextSetCustomer]
  );

  const setSelectedProject: React.Dispatch<
    React.SetStateAction<Project | undefined>
  > = useCallback(
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

  const setSelectedField: React.Dispatch<
    React.SetStateAction<Field | undefined>
  > = useCallback(
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
  const normalizedProjectId =
    typeof projectId === "number" && projectId > 0 ? projectId : undefined;
  const normalizedSelectedField =
    selectedField && typeof selectedField.id === "number" && selectedField.id > 0
      ? selectedField
      : undefined;
  const workspaceReady = Boolean(
    selectedCustomer &&
      selectedCustomer.id > 0 &&
      normalizedSelectedProject &&
      normalizedSelectedProject.id > 0 &&
      selectedCampaignId &&
      selectedCampaignId > 0
  );

  const [queryCustomer, setQueryCustomer] = useState<string>("Todos los clientes");
  const [queryProject, setQueryProject] = useState<string>("Todos los proyectos");
  const [queryCampaign, setQueryCampaign] = useState<string>("Todas las campañas");
  const [queryField, setQueryField] = useState<string>("Todos los campos");

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
    if (selectedCustomer) {
      setQueryCustomer(selectedCustomer.name);
    } else {
      setQueryCustomer("Todos los clientes");
    }
  }, [selectedCustomer]);

  useEffect(() => {
    if (selectedProject) {
      setQueryProject(selectedProject.name);
    } else {
      setQueryProject("Todos los proyectos");
    }
  }, [selectedProject]);

  useEffect(() => {
    if (selectedCampaign) {
      setQueryCampaign(selectedCampaign.name);
    } else {
      setQueryCampaign("Todas las campañas");
    }
  }, [selectedCampaign]);

  useEffect(() => {
    if (normalizedSelectedField) {
      setQueryField(normalizedSelectedField.name);
    } else {
      setQueryField("Todos los campos");
    }
  }, [normalizedSelectedField]);

  const filters: FilterBarFilter[] = [];

  useEffect(() => {
    if (enabledFilterSet.has("customer")) {
      //TODO: limit=1000, implement pagination
      getCustomers("limit=1000");
    }
  }, [enabledFilterSet, getCustomers]);

  const handleSetCustomer = useCallback(
    (customer: Customer | undefined) => {
      setSelectedCustomer(customer);
    },
    [setSelectedCustomer]
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
    });
  }

  useEffect(() => {
    if (enabledFilterSet.has("project")) {
      if (selectedCustomer && selectedCustomer.id !== 0) {
        getProjectsDropdown(selectedCustomer.id);
      } else {
        getProjects("per_page=1000");
      }
    }
  }, [enabledFilterSet, getProjects, getProjectsDropdown, selectedCustomer]);

  const handleSetProject = useCallback(
    (project: Project | undefined) => {
      setSelectedProject(project);
      contextSetProjectId(project?.id);
    },
    [contextSetProjectId, setSelectedProject]
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
    });
  }

  useEffect(() => {
    if (!enabledFilterSet.has("campaign")) return;

    const params = new URLSearchParams();
    if (selectedCustomer && selectedCustomer.id !== 0) {
      params.set("customer_id", String(selectedCustomer.id));
    }
    if (selectedProject && selectedProject.id !== 0) {
      params.set("project_name", selectedProject.name);
    }
    params.set("limit", "1000");
    getCampaigns(params.toString());
  }, [enabledFilterSet, selectedCustomer, selectedProject, getCampaigns]);

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
        setSelectedCampaign(data as Campaign | undefined);
      },
      disabled: loadingCampaigns,
      loading: loadingCampaigns,
      error: loadingCampaignsError,
      emptyMessage: "Sin campañas",
      allLabel: "Todas las campañas",
    });
  }

  useEffect(() => {
    if (!enabledFilterSet.has("field")) return;

    if (normalizedProjectId) {
      getFields(`project_id=${normalizedProjectId}`);
      return;
    }

    getFields("per_page=1000");
  }, [enabledFilterSet, getFields, normalizedProjectId]);

  if (enabledFilterSet.has("field")) {
    filters.push({
      type: "search",
      name: "campo",
      label: "Campo",
      placeholder: "Buscar",
      options: Array.isArray(fields) ? fields : [],
      total: totalFields,
      value: queryField,
      onChange: setQueryField,
      setData: (data: unknown) => {
        setSelectedField(data as Field | undefined);
      },
      disabled: loadingFields,
      loading: loadingFields,
      error: loadingFieldsError,
      emptyMessage: "Sin campos",
      allLabel: "Todos los campos",
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
