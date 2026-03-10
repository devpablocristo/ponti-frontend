import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";

import { AuthProvider } from "./context/AuthProvider";
import { useAuth } from "./context/useAuth";
import { Entity } from "../../hooks/useDatabase/options/types";
import useCustomers from "../../hooks/useCustomers";
import Cover from "./Cover";
import useCampaigns from "../../hooks/useCampaigns";
import Search from "../../components/Input/Search";
import useProjects from "../../hooks/useDatabase/projects";
import { ProjectDropdown } from "../../hooks/useDatabase/projects/types";
import { useClickOutside } from "./useClickOutside";
import { SelectionProvider } from "./context/SelectionContext";
import { useSelection } from "./context/useSelection";

function WorkspaceSelector() {
  const navigate = useNavigate();
  const auth = useAuth();

  useEffect(() => {
    if (!auth?.loading && !auth?.isAuthenticated) {
      navigate("/login");
    }
  }, [auth?.isAuthenticated, auth?.loading, navigate]);

  const {
    getCustomers,
    customers,
    total,
    processing,
    error: customerError,
  } = useCustomers();

  const {
    getProjectsDropdown,
    projectsDropdown,
    processing: processingProjects,
    error: projectError,
  } = useProjects();

  const {
    getCampaigns,
    campaigns,
    total: totalCampaings,
    processing: processingCampaigns,
    error: campaignError,
  } = useCampaigns();

  const { customer, setCustomer, project, setProject, campaign, setCampaign } =
    useSelection();

  const [isEntering, _] = useState(false);

  const [queryCustomer, setQueryCustomer] = useState<string>("");
  const [queryProject, setQueryProject] = useState<string>("");
  const [queryCampaign, setQueryCampaign] = useState<string>("");

  const [suggestions, setSuggestions] = useState<Entity[]>([]);
  const [showCustomerSuggestions, setShowCustomerSuggestions] =
    useState<boolean>(false);

  const [projectSuggestions, setProjectSuggestions] = useState<
    ProjectDropdown[]
  >([]);
  const [showProjectSuggestions, setShowProjectSuggestions] =
    useState<boolean>(false);

  const [campaignSuggestions, setCampaignSuggestions] = useState<Entity[]>([]);
  const [showCampaignSuggestions, setShowCampaignSuggestions] =
    useState<boolean>(false);

  const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(0);
  const [highlightedProjectIndex, setHighlightedProjectIndex] = useState(0);
  const [highlightedCampaignIndex, setHighlightedCampaignIndex] = useState(0);

  useEffect(() => {
    setCustomer(customer);
    setQueryCustomer(customer?.name || "");
    setProject(project);
    setQueryProject(project?.name || "");
    setCampaign(campaign);
    setQueryCampaign(campaign?.name || "");
  }, [campaign, customer, project, setCampaign, setCustomer, setProject]);

  useEffect(() => {
    getCustomers("limit=1000");
  }, [getCustomers]);

  useEffect(() => {
    setSuggestions(customers);
  }, [customers]);

  useEffect(() => {
    if (!customer) return;
    getProjectsDropdown(customer.id);
  }, [customer, getProjectsDropdown]);

  useEffect(() => {
    setProjectSuggestions(projectsDropdown);
  }, [projectsDropdown]);

  useEffect(() => {
    if (!customer || !project) return;
    getCampaigns(
      `customer_id=${customer.id}&project_name=${project.name}&limit=100`
    );
  }, [customer, project, getCampaigns]);

  useEffect(() => {
    setCampaignSuggestions(campaigns);
  }, [campaigns]);

  const customerRef = useRef<HTMLDivElement>(null);
  const projectRef = useRef<HTMLDivElement>(null);
  const campaignRef = useRef<HTMLDivElement>(null);

  useClickOutside(customerRef, () => setShowCustomerSuggestions(false));
  useClickOutside(projectRef, () => setShowProjectSuggestions(false));
  useClickOutside(campaignRef, () => setShowCampaignSuggestions(false));

  const handleCampaignChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.toLowerCase();
    setQueryCampaign(value);
    setCampaign(undefined);

    if (totalCampaings <= 100 && campaigns.length > 0) {
      const filtered =
        value.trim() === ""
          ? campaigns
          : campaigns.filter((campaign) =>
              campaign.name.toLowerCase().includes(value.toLowerCase())
            );

      setCampaignSuggestions(filtered);
    } else {
      await getCampaigns("name=" + value);
    }

    setShowCampaignSuggestions(true);
    setHighlightedCampaignIndex(0);
  };

  const handleCustomerChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.toLowerCase();
    setQueryCustomer(value);
    setCustomer(undefined);

    if (total <= 100 && customers.length > 0) {
      const filtered =
        value.trim() === ""
          ? customers
          : customers.filter((client) =>
              client.name.toLowerCase().includes(value.toLowerCase())
            );

      setSuggestions(filtered);
    } else {
      await getCustomers("name=" + value);
    }
    setShowCustomerSuggestions(true);
    setHighlightedCustomerIndex(0);
  };

  const handleProjectChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = e.target.value.toLowerCase();
    setQueryProject(value);
    setProject(undefined);

    if (total <= 100 && projectsDropdown.length > 0) {
      const filtered =
        value.trim() === ""
          ? projectsDropdown
          : projectsDropdown.filter((project) =>
              project.name.toLowerCase().includes(value.toLowerCase())
            );

      setProjectSuggestions(filtered);
    } else {
      await getProjectsDropdown(customer.id);
    }
    setShowProjectSuggestions(true);
    setHighlightedProjectIndex(0);
  };

  const handleCustomerSuggestionClick = (customer: Entity) => {
    setQueryCustomer(customer.name);
    setCustomer(customer);
    setProject(undefined);
    setCampaign(undefined);
    setShowCustomerSuggestions(false);
  };

  const handleProjectSuggestionClick = (project: ProjectDropdown) => {
    setQueryProject(project.name);
    setProject({ id: project.id, name: project.name });
    setCampaign(undefined);
    setShowProjectSuggestions(false);
  };

  const handleCampaignSuggestionClick = (campaign: Entity) => {
    setQueryCampaign(campaign.name);
    setCampaign(campaign);
    setShowCampaignSuggestions(false);
  };

  const createHandleKeyDown =
    <T,>(
      suggestions: T[],
      highlightedIndex: number,
      setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>,
      onSelect: (item: T) => void
    ) =>
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (suggestions.length === 0) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        onSelect(suggestions[highlightedIndex]);
      }
    };

  const handleSelection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (customer) setCustomer(customer);
    if (project) setProject(project);
    if (campaign) setCampaign(campaign);

    navigate("/admin/dashboard");
  };

  return (
    <div className="flex flex-col md:flex-row h-screen">
      <Cover />
      <div className="w-full md:w-2/5 flex-1 flex items-center justify-center bg-slate-50 p-6">
        <div className="w-full max-w-sm">
          <h2 className="text-3xl font-bold text-slate-800 mb-2 font-display tracking-tight">
            Hola {auth.user?.Username}!
          </h2>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Para comenzar debes elegir un cliente, proyecto y campaña.
          </p>
          <div className="w-full max-w-sm animate-fade-in-up">
            {customerError ||
              projectError ||
              (campaignError && (
                <div
                  className="p-4 mb-4 text-sm text-red-700 rounded-xl bg-red-50 border border-red-100"
                  role="alert"
                >
                  <span className="font-medium">Error!</span> {customerError}{" "}
                  {projectError} {campaignError}
                </div>
              ))}
            <form className="space-y-4" onSubmit={handleSelection}>
              <div ref={customerRef} className="relative">
                <Search
                  label="Cliente"
                  placeholder="Ingrese nombre"
                  name="client"
                  value={queryCustomer}
                  onClick={() => {
                    if (!showCustomerSuggestions) {
                      setShowCustomerSuggestions(true);
                    }
                  }}
                  onChange={handleCustomerChange}
                  onFocus={() => setShowCustomerSuggestions(true)}
                  onKeyDown={createHandleKeyDown(
                    suggestions,
                    highlightedCustomerIndex,
                    setHighlightedCustomerIndex,
                    handleCustomerSuggestionClick
                  )}
                  className={"w-full"}
                  fullWidth
                  disabled={processing}
                />
                {suggestions.length === 0 && (
                  <div className="px-4 py-3 text-sm text-red-600">
                    No hay clientes activos para operar. Presione el siguientebotón para agregar un nuevo cliente.
                    <button
                      type="button"
                      onClick={() => navigate("/admin/database/customers")}
                      className="mt-2 text-white font-semibold text-sm w-full rounded-xl px-6 py-3 transition-all duration-200 bg-custom-btn hover:bg-custom-btn/85 active:scale-[0.98]"
                    >
                    Crear nuevo cliente
                  </button>
                  </div>
                )}
                {showCustomerSuggestions && (
                  <div className="flex justify-between items-center">
                    <ul className="absolute top-full mb-1 w-full bg-white border border-slate-200 rounded-xl z-10 max-h-[200px] overflow-y-auto" style={{ boxShadow: 'var(--shadow-lg)' }}>
                      {suggestions.length > 0 &&
                        suggestions.map((customer, index) => (
                          <li
                            key={index}
                            onClick={() =>
                              handleCustomerSuggestionClick(customer)
                            }
                            className={`px-3.5 py-2.5 cursor-pointer text-sm transition-colors duration-150 ${
                              index === highlightedCustomerIndex
                                ? "bg-primary-50 text-primary-700 font-medium"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            {customer.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
              {suggestions.length > 0 && ( <>
              <div ref={projectRef} className="relative">
                <Search
                  label="Proyecto"
                  placeholder="Seleccione proyecto"
                  name="project"
                  disabled={!customer || processingProjects}
                  value={queryProject}
                  onClick={() => {
                    if (!showProjectSuggestions) {
                      setShowProjectSuggestions(true);
                    }
                  }}
                  onChange={handleProjectChange}
                  onFocus={() => setShowProjectSuggestions(true)}
                  onKeyDown={createHandleKeyDown(
                    projectSuggestions,
                    highlightedProjectIndex,
                    setHighlightedProjectIndex,
                    handleProjectSuggestionClick
                  )}
                  className={"w-full"}
                  fullWidth
                />
                {showProjectSuggestions && (
                  <div className="flex justify-between items-center">
                    <ul className="absolute top-full mb-1 w-full bg-white border border-slate-200 rounded-xl z-10 max-h-[200px] overflow-y-auto" style={{ boxShadow: 'var(--shadow-lg)' }}>
                      {projectSuggestions.length > 0 &&
                        projectSuggestions.map((project, index) => (
                          <li
                            key={index}
                            onClick={() =>
                              handleProjectSuggestionClick(project)
                            }
                            className={`px-3.5 py-2.5 cursor-pointer text-sm transition-colors duration-150 ${
                              index === highlightedProjectIndex
                                ? "bg-primary-50 text-primary-700 font-medium"
                                : "hover:bg-slate-50"
                            }`}
                          >
                            {project.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
                {customer &&
                  !processingProjects &&
                  projectsDropdown.length === 0 && (
                    <div className="px-4 py-3 text-sm text-red-600">
                      No hay proyectos disponibles.
                    </div>
                  )}
              </div>
              <div ref={campaignRef} className="relative">
                <Search
                  label="Campaña"
                  placeholder="Seleccione campaña"
                  name="campaing"
                  disabled={!customer || !project || processingCampaigns}
                  value={queryCampaign}
                  onClick={() => {
                    if (!showCampaignSuggestions) {
                      setShowCampaignSuggestions(true);
                    }
                  }}
                  onChange={handleCampaignChange}
                  onFocus={() => setShowCampaignSuggestions(true)}
                  onKeyDown={createHandleKeyDown(
                    campaignSuggestions,
                    highlightedCampaignIndex,
                    setHighlightedCampaignIndex,
                    handleCampaignSuggestionClick
                  )}
                  className={"w-full"}
                  fullWidth
                />
                {showCampaignSuggestions && (
                  <div className="flex justify-between items-center">
                    <ul className="absolute top-full left-0 w-full bg-white border border-slate-200 rounded-xl z-10 max-h-[200px] overflow-y-auto" style={{ boxShadow: 'var(--shadow-lg)' }}>
                      {campaigns.length > 0 &&
                        campaignSuggestions.map((campaign, index) => (
                          <li
                            key={index}
                            onClick={() =>
                              handleCampaignSuggestionClick(campaign)
                            }
                            className="px-3.5 py-2.5 cursor-pointer text-sm transition-colors duration-150 hover:bg-slate-50"
                          >
                            {campaign.name}
                          </li>
                        ))}
                    </ul>
                  </div>
                )}
              </div>
              <button
                type="submit"
                disabled={!project || !campaign || !customer || isEntering}
                className={`text-white font-semibold text-sm w-full rounded-xl px-6 py-3 transition-all duration-200
                  ${
                    !project || !campaign || !customer || isEntering
                      ? "bg-slate-300 cursor-not-allowed"
                      : "bg-custom-btn hover:bg-custom-btn/85 active:scale-[0.98] cursor-pointer"
                  }`}
              >
                {isEntering ? (
                  <>
                    <svg
                      className="w-4 h-4 animate-spinner"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="opacity-25"
                      />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        className="opacity-75"
                      />
                    </svg>
                    Ingresando...{" "}
                  </>
                ) : (
                  "Ingresar"
                )}
              </button>
              </>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

const WorkspaceSelectorPage = () => (
  <AuthProvider>
    <SelectionProvider>
      <WorkspaceSelector />
    </SelectionProvider>
  </AuthProvider>
);

export default WorkspaceSelectorPage;
