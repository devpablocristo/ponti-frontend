import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Save, Trash2 } from "lucide-react";

import { apiClient } from "@/api/client";
import Button from "../../../../components/Button/Button";
import InputField from "../../../../components/Input/InputField";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { SuccessBanner } from "../../../../components/feedback/SuccessBanner";
import type { CustomerData, CustomerPayload } from "../../../../hooks/useCustomers/types";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
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

type ProjectListResponse = {
  data?: ProjectListItem[];
  items?: ProjectListItem[];
};

type ProjectDetailResponse = ApiResponse<Project>;
type SelectionValue = number | "" | "new";

const NEW_VALUE = "new";

function isExistingId(value: SelectionValue): value is number {
  return typeof value === "number" && value > 0;
}

function createEmptyProject(customer?: CustomerData | null): Project {
  return {
    name: "",
    customer: {
      id: customer?.id ?? null,
      name: customer?.name ?? "",
    },
    campaign: {
      id: null,
      name: "",
    },
    managers: [],
    investors: [],
    admin_cost_investors: [],
    admin_cost: 0,
    planned_cost: 0,
    fields: [],
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

export default function CustomerEditor() {
  const navigate = useNavigate();
  const { id } = useParams();
  const initialCustomerId = Number(id) || NEW_VALUE;
  const { projectId: contextProjectId } = useSelection();

  const [customerOptions, setCustomerOptions] = useState<CustomerData[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<SelectionValue>(initialCustomerId);
  const [selectedProjectId, setSelectedProjectId] = useState<SelectionValue>(
    initialCustomerId === NEW_VALUE ? NEW_VALUE : "",
  );
  const [projectDraft, setProjectDraft] = useState<Project | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const customersResponse = await apiClient.get<ApiResponse<CustomerPayload>>(
          "/customers?limit=1000",
        );
        if (!cancelled) {
          setCustomerOptions(customersResponse.data?.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setError("No se pudieron cargar los clientes.");
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
  }, []);

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
      if (selectedCustomerId === NEW_VALUE) {
        setSelectedProjectId(NEW_VALUE);
        setProjectDraft(createEmptyProject(null));
        return;
      }

      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const url = isExistingId(selectedCustomerId)
          ? `/projects/customers/${selectedCustomerId}?page=1&per_page=1000`
          : "/projects?page=1&per_page=1000";
        const projectsResponse =
          await apiClient.get<ApiResponse<ProjectListResponse>>(url);
        const projects =
          projectsResponse.data?.data ?? projectsResponse.data?.items ?? [];

        const detailsEntries = await Promise.all(
          projects.map(async (project) => {
            const detail = await apiClient.get<ProjectDetailResponse>(`/projects/${project.id}`);
            return [project.id, normalizeProject(detail.data)] as const;
          }),
        );

        if (cancelled) return;

        const details = Object.fromEntries(detailsEntries);
        const preferredProject =
          (contextProjectId
            ? projects.find((project) => project.id === contextProjectId)
            : undefined) ?? projects[0];
        const preferredDetail = preferredProject
          ? details[preferredProject.id]
          : createEmptyProject(
              customerOptions.find((customer) => customer.id === selectedCustomerId) ?? null,
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
  }, [contextProjectId, customerOptions, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () =>
      isExistingId(selectedCustomerId)
        ? customerOptions.find((customer) => customer.id === selectedCustomerId) ?? null
        : null,
    [customerOptions, selectedCustomerId],
  );

  const updateProjectValue = (
    key: "name" | "admin_cost" | "planned_cost",
    value: string,
  ) => {
    setProjectDraft((prev) => {
      if (!prev) return prev;
      if (key === "name") return { ...prev, name: value };
      return { ...prev, [key]: value === "" ? 0 : Number(value) };
    });
  };

  const updateCustomerName = (value: string) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            customer: { ...prev.customer, id: selectedCustomer?.id ?? null, name: value },
          }
        : prev,
    );
  };

  const updateManagerName = (index: number, value: string) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            managers: prev.managers.map((manager, idx) =>
              idx === index ? { ...manager, name: value } : manager,
            ),
          }
        : prev,
    );
  };

  const addManager = () => {
    setProjectDraft((prev) =>
      prev ? { ...prev, managers: [...prev.managers, { id: 0, name: "" }] } : prev,
    );
  };

  const removeManager = (index: number) => {
    setProjectDraft((prev) =>
      prev
        ? { ...prev, managers: prev.managers.filter((_item, idx) => idx !== index) }
        : prev,
    );
  };

  const updateInvestor = (
    group: "investors" | "admin_cost_investors",
    index: number,
    key: "name" | "percentage",
    value: string,
  ) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            [group]: prev[group].map((investor, idx) =>
              idx === index
                ? {
                    ...investor,
                    [key]: key === "percentage" ? Number(value || 0) : value,
                  }
                : investor,
            ),
          }
        : prev,
    );
  };

  const addInvestor = (group: "investors" | "admin_cost_investors") => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            [group]: [...prev[group], { id: 0, name: "", percentage: 0 }],
          }
        : prev,
    );
  };

  const removeInvestor = (group: "investors" | "admin_cost_investors", index: number) => {
    setProjectDraft((prev) =>
      prev
        ? {
            ...prev,
            [group]: prev[group].filter((_item, idx) => idx !== index),
          }
        : prev,
    );
  };

  const updateFieldAt = (
    fieldIndex: number,
    key: "name" | "lease_type_id" | "lease_type_percent" | "lease_type_value",
    value: string,
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
                : field,
            ),
          }
        : prev,
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
        : prev,
    );
  };

  const updateFieldInvestorAt = (
    fieldIndex: number,
    investorIndex: number,
    key: "name" | "percentage",
    value: string,
  ) => {
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
                            [key]: key === "percentage" ? Number(value || 0) : value,
                          }
                        : investor,
                    ),
                  }
                : field,
            ),
          }
        : prev,
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
                    investors: [...field.investors, { id: 0, name: "", percentage: 0 }],
                  }
                : field,
            ),
          }
        : prev,
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
                : field,
            ),
          }
        : prev,
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
    value: string,
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
                        : lot,
                    ),
                  }
                : field,
            ),
          }
        : prev,
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
                : field,
            ),
          }
        : prev,
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
                : field,
            ),
          }
        : prev,
    );
  };

  const handleSave = async () => {
    if (!selectedProjectId || !projectDraft) return;
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      if (selectedProjectId === NEW_VALUE) {
        await apiClient.post("/projects", projectDraft);
        setSuccess("Proyecto creado.");
      } else {
        await apiClient.put(`/projects/${selectedProjectId}`, projectDraft);
        setSuccess("Cambios guardados.");
      }
    } catch {
      setError("No se pudieron guardar los cambios.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    navigate("/admin/database/customers/list");
  };

  return (
    <div className="space-y-2">
      <LoadingOverlay show={loading || saving} />
        {error && <ErrorBanner message={error} onDismiss={() => setError(null)} />}
        {success && <SuccessBanner message={success} onDismiss={() => setSuccess(null)} />}

        {projectDraft && (
          <div className="space-y-2">
            <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <h2 className="mb-2 text-xl font-medium tracking-normal text-slate-950">
                Proyecto
              </h2>
              <div className="grid grid-cols-1 gap-2.5 md:grid-cols-5">
                <InputField
                  label="Cliente / Sociedad"
                  name="project_customer"
                  value={projectDraft.customer.name}
                  onChange={(event) => updateCustomerName(event.target.value)}
                  size="sm"
                />
                <InputField
                  label="Nombre del proyecto"
                  name="project_name"
                  value={projectDraft.name}
                  onChange={(event) => updateProjectValue("name", event.target.value)}
                  size="sm"
                />
                <InputField
                  label="Campaña"
                  name="campaign_name"
                  value={projectDraft.campaign.name}
                  onChange={(event) => {
                    setProjectDraft((prev) =>
                      prev
                        ? {
                            ...prev,
                            campaign: { ...prev.campaign, name: event.target.value },
                          }
                        : prev,
                    );
                  }}
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
              </div>
            </section>

            <section className="grid grid-cols-1 gap-2 xl:grid-cols-3">
              <EditableList
                title="Responsables"
                emptyLabel="Sin responsables"
                onAdd={addManager}
                items={projectDraft.managers}
                renderItem={(manager, index) => (
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <InputField
                      label={`Responsable ${index + 1}`}
                      name={`manager_${index}`}
                      value={manager.name}
                      onChange={(event) => updateManagerName(index, event.target.value)}
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
                    <InputField
                      label="Nombre"
                      name={`investor_${index}`}
                      value={investor.name}
                      onChange={(event) => updateInvestor("investors", index, "name", event.target.value)}
                      size="sm"
                    />
                    <InputField
                      label="%"
                      name={`investor_percentage_${index}`}
                      type="number"
                      value={String(investor.percentage ?? 0)}
                      onChange={(event) => updateInvestor("investors", index, "percentage", event.target.value)}
                      size="sm"
                    />
                    <RemoveButton label="Quitar inversor" onClick={() => removeInvestor("investors", index)} />
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
                    <InputField
                      label="Nombre"
                      name={`admin_investor_${index}`}
                      value={investor.name}
                      onChange={(event) => updateInvestor("admin_cost_investors", index, "name", event.target.value)}
                      size="sm"
                    />
                    <InputField
                      label="%"
                      name={`admin_investor_percentage_${index}`}
                      type="number"
                      value={String(investor.percentage ?? 0)}
                      onChange={(event) => updateInvestor("admin_cost_investors", index, "percentage", event.target.value)}
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

            <section className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-xl font-medium tracking-normal text-slate-950">
                  Campos
                </h2>
                <AddButton label="Agregar campo" onClick={addField} />
              </div>

              <div className="space-y-2">
                {projectDraft.fields.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
                    Sin campos cargados.
                  </p>
                ) : (
                  projectDraft.fields.map((field, fieldIndex) => (
                    <div key={field.id || fieldIndex} className="rounded-lg border border-slate-200 bg-slate-50 p-2.5">
                      <div className="grid grid-cols-1 gap-2.5 lg:grid-cols-[1fr_180px_1.2fr]">
                        <InputField
                          label="Campo"
                          name={`field_${fieldIndex}`}
                          value={field.name}
                          onChange={(event) => updateFieldAt(fieldIndex, "name", event.target.value)}
                          size="sm"
                        />
                        <InputField
                          label="Tipo de Arriendo"
                          name={`field_lease_${fieldIndex}`}
                          type="number"
                          value={String(field.lease_type_id ?? 0)}
                          onChange={(event) => updateFieldAt(fieldIndex, "lease_type_id", event.target.value)}
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
                                <div key={investorIndex} className="grid grid-cols-[1fr_80px_auto] gap-2">
                                  <InputField
                                    label=""
                                    name={`field_investor_${fieldIndex}_${investorIndex}`}
                                    value={investor.name}
                                    onChange={(event) =>
                                      updateFieldInvestorAt(fieldIndex, investorIndex, "name", event.target.value)
                                    }
                                    size="sm"
                                  />
                                  <InputField
                                    label=""
                                    name={`field_investor_percentage_${fieldIndex}_${investorIndex}`}
                                    type="number"
                                    value={String(investor.percentage ?? 0)}
                                    onChange={(event) =>
                                      updateFieldInvestorAt(fieldIndex, investorIndex, "percentage", event.target.value)
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
                              <InputField
                                label="Lote"
                                name={`lot_${fieldIndex}_${lotIndex}`}
                                value={lot.name}
                                onChange={(event) => updateLotAt(fieldIndex, lotIndex, "name", event.target.value)}
                                size="sm"
                              />
                              <InputField
                                label="Hectáreas"
                                name={`lot_hectares_${fieldIndex}_${lotIndex}`}
                                type="number"
                                value={String(lot.hectares ?? 0)}
                                onChange={(event) => updateLotAt(fieldIndex, lotIndex, "hectares", event.target.value)}
                                size="sm"
                              />
                              <InputField
                                label="Cultivo Anterior"
                                name={`lot_previous_crop_${fieldIndex}_${lotIndex}`}
                                value={lot.previous_crop_name ?? ""}
                                onChange={(event) => updateLotAt(fieldIndex, lotIndex, "previous_crop_name", event.target.value)}
                                size="sm"
                              />
                              <InputField
                                label="Cultivo Actual"
                                name={`lot_current_crop_${fieldIndex}_${lotIndex}`}
                                value={lot.current_crop_name ?? ""}
                                onChange={(event) => updateLotAt(fieldIndex, lotIndex, "current_crop_name", event.target.value)}
                                size="sm"
                              />
                              <InputField
                                label="Periodo"
                                name={`lot_season_${fieldIndex}_${lotIndex}`}
                                value={lot.season}
                                onChange={(event) => updateLotAt(fieldIndex, lotIndex, "season", event.target.value)}
                                size="sm"
                              />
                              <RemoveButton label="Quitar lote" onClick={() => removeLotAt(fieldIndex, lotIndex)} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
            <section className="flex justify-end gap-2 pb-2">
              <Button
                variant="light"
                disabled={saving}
                onClick={handleCancel}
              >
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

function EditableList<T>({
  title,
  emptyLabel,
  items,
  onAdd,
  renderItem,
}: EditableListProps<T>) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-base font-medium text-slate-950">
          {title}
        </h3>
        <AddButton label={`Agregar ${title}`} onClick={onAdd} />
      </div>
      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white p-2.5 text-sm text-slate-500">
            {emptyLabel}
          </p>
        ) : (
          items.map((item, index) => (
            <div key={index}>{renderItem(item, index)}</div>
          ))
        )}
      </div>
    </div>
  );
}

function AddButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-primary-700"
      onClick={onClick}
    >
      <Plus className="h-3.5 w-3.5" />
      Agregar
      <span className="sr-only">{label}</span>
    </button>
  );
}

function RemoveButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className="mt-[22px] inline-flex h-9 w-9 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:bg-rose-50 hover:text-rose-700"
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <Trash2 className="h-4 w-4" />
    </button>
  );
}
