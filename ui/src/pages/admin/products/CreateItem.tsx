import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import useSupplies from "../../../hooks/useSupplies";
import useStock from "../../../hooks/useStock";
import { LoaderCircle, Trash } from "lucide-react";
import useProjects from "../../../hooks/useDatabase/projects";
import { Entity } from "../../../hooks/useDatabase/options/types";
import useProviders from "../../../hooks/useProviders";
import useSupplyMovements from "../../../hooks/useSupplyMovement";
import { SupplyMovementRequest } from "../../../hooks/useSupplyMovement/types";
import SupplyDropdown from "../../../components/Dropdown/SupplyDropdown";
import { DEFAULT_ITEM_ROW_COUNT, replaceSupplyIdsWithNames } from "../utils";
import Drawer from "../../../components/Drawer/Drawer";
import {
  Campaign,
  Customer,
  Project,
} from "../../../hooks/useWorkspaceFilters";
import useCampaigns from "../../../hooks/useCampaigns";
import { getUnitName, units } from "../../../constants/units";
import useCategories from "../../../hooks/useCategories";

const emptyItems = Array.from({ length: DEFAULT_ITEM_ROW_COUNT }, () => ({
  item: "",
  quantity: "",
}));

const typeOptions = [
  { id: 1, name: "Stock" },
  { id: 2, name: "Movimiento interno" },
  { id: 3, name: "Remito oficial" },
];

export default function CreateItem({
  drawerOpen,
  setDrawerOpen,
  projectId,
  customers,
  onProductCreated,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  projectId: number;
  customers: Customer[];
  onProductCreated: () => void;
}) {
  const {
    resultCreation,
    errorCreation,
    errorCreationPayload,
    processingCreation,
    saveSupplyMovement,
  } = useSupplyMovements();
  const { getProject, selectedProject, processing } = useProjects();
  const { getProviders, providers } = useProviders();

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [selectedProjectDestination, setSelectedProjectDestination] = useState<
    number | null
  >(null);

  const { getSupplies, supplies } = useSupplies();
  const { getStock, stock } = useStock();
  const { projectsDropdown, getProjectsDropdown } = useProjects();
  const { campaigns, getCampaigns } = useCampaigns();

  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState("");
  const [investor, setInvestor] = useState<{ id: number; name: string } | null>(
    null
  );
  const [investors, setInvestors] = useState<{ id: number; name: string }[]>(
    []
  );

  const [queryProvider, setQueryProvider] = useState("");
  const [provider, setProvider] = useState<Entity>();

  const [type, setType] = useState<{ id: number; name: string } | null>(null);

  const [items, setItems] = useState<
    {
      item: string;
      quantity: string;
    }[]
  >(emptyItems);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});
  const [lastSubmittedRowIndexes, setLastSubmittedRowIndexes] = useState<number[]>(
    []
  );
  const [openCreateSupply, setOpenCreateSupply] = useState(false);
  const [itemIndexToUpdate, setItemIndexToUpdate] = useState<number | null>(null);
  const [pendingCreatedSupplyName, setPendingCreatedSupplyName] = useState<string | null>(
    null
  );
  const latestItemsRef = useRef(items);
  const latestSuppliesRef = useRef(supplies);
  const latestProjectIdRef = useRef(projectId);
  const latestOnProductCreatedRef = useRef(onProductCreated);
  const latestGetStockRef = useRef(getStock);

  const clearForm = () => {
    setError(null);
    setItemErrors({});
    setLastSubmittedRowIndexes([]);
    setProvider(undefined);
    setQueryProvider("");
    setInvestor(null);
    setItems(emptyItems);
    setOrderNumber("");
    setDate("");
    setType(null);
    setSelectedProjectDestination(null);
  };

  function CreateSupplyInline({
    projectId,
    onCreated,
    onCancel,
  }: {
    projectId: number | null;
    onCreated: (createdName: string) => void;
    onCancel: () => void;
  }) {
    const { saveSupplies, result, error } = useSupplies();
    const { categories, types, getCategories, getTypes } = useCategories();
    const [saving, setSaving] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);

    const [name, setName] = useState("");
    const [unit, setUnit] = useState("");
    const [price, setPrice] = useState("");
    const [category, setCategory] = useState("");
    const [type, setType] = useState("");

    const normalizedName = name.trim().replace(/\s+/g, " ").toUpperCase();

    useEffect(() => {
      getCategories("");
      getTypes();
    }, [getCategories, getTypes]);

    useEffect(() => {
      if (!result) return;
      setSaving(false);
      setSuccess("Insumo creado correctamente");
    }, [result]);

    useEffect(() => {
      if (error) setSaving(false);
    }, [error]);

    return (
      <div className="space-y-4">
        {success && (
          <div className="p-3 rounded bg-green-50 text-green-700 text-sm flex items-center justify-between">
            <span>{success}</span>
            <Button
              size="xs"
              variant="primary"
              onClick={() => {
                setSuccess(null);
                onCreated(normalizedName);
              }}
            >
              OK
            </Button>
          </div>
        )}

        {!success && (
          <>
            {error && (
              <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
                {error}
              </div>
            )}

            <InputField
              label="Nombre del insumo"
              name="suplyName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              size="sm"
            />

            <SelectField
              label="Unidad"
              name="unit"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={units}
              size="sm"
            />

            <InputField
              label="Precio"
              name="supplyPrice"
              value={price}
              onChange={(e) => {
                const value = e.target.value.replace(/,/g, ".");
                if (/^\d*\.?\d{0,2}$/.test(value)) setPrice(value);
              }}
              size="sm"
            />

            <SelectField
              label="Rubro"
              name="category"
              value={category}
              onChange={(e) => {
                const selectedCategory = categories.find(
                  (c: { id: number; type_id?: number }) =>
                    c.id === Number(e.target.value)
                );
                setCategory(e.target.value);
                setType(selectedCategory?.type_id?.toString() || "");
              }}
              options={categories}
              size="sm"
            />

            <SelectField
              label="Tipo / Clase"
              name="type"
              value={type}
              options={types}
              disabled
              onChange={() => {}}
              size="sm"
            />

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="primary" onClick={onCancel} disabled={saving}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                disabled={saving}
                onClick={() => {
                  if (!projectId || !name || !unit || !price || !category || !type) {
                    return;
                  }
                  setSaving(true);
                  saveSupplies(
                    [
                      {
                        name: normalizedName,
                        unit: Number(unit),
                        price: Number(price),
                        category: Number(category),
                        type: Number(type),
                        is_partial_price: false,
                      },
                    ],
                    projectId
                  );
                }}
              >
                {saving ? "Guardando..." : "Guardar insumo"}
              </Button>
            </div>
          </>
        )}
      </div>
    );
  }

  useEffect(() => {
    setSuccessMessage(null);
    setError(null);
    setItemErrors({});
  }, [drawerOpen]);

  useEffect(() => {
    getProviders("");
  }, [getProviders]);

  useEffect(() => {
    if (!customer) return;
    getProjectsDropdown(customer.id);
  }, [customer, getProjectsDropdown]);

  useEffect(() => {
    if (customer && project) {
      getCampaigns(
        `customer_id=${customer.id}&project_name=${project.name}&limit=100`
      );
    }
  }, [customer, project, getCampaigns]);

  useEffect(() => {
    if (errorCreation) {
      const message =
        typeof errorCreationPayload?.error?.details === "string" &&
        errorCreationPayload.error.details.trim() !== ""
          ? errorCreationPayload.error.details
          : errorCreation ?? "";
      setError(replaceSupplyIdsWithNames(message, supplies));
      setSuccessMessage(null);
    }
  }, [errorCreation, errorCreationPayload, supplies]);

  useEffect(() => {
    latestItemsRef.current = items;
    latestSuppliesRef.current = supplies;
    latestProjectIdRef.current = projectId;
    latestOnProductCreatedRef.current = onProductCreated;
    latestGetStockRef.current = getStock;
  }, [items, supplies, projectId, onProductCreated, getStock]);

  useEffect(() => {
    if (lastSubmittedRowIndexes.length === 0) return;

    if (resultCreation.supply_movements.length > 0) {
      const errors: string[] = [];
      const nextItemErrors: Record<number, string> = {};
      resultCreation.supply_movements.forEach((movement, responseIndex) => {
        if (movement.error_detail !== "") {
          const uiRowIndex = lastSubmittedRowIndexes[responseIndex] ?? responseIndex;
          const selectedSupplyId = Number(latestItemsRef.current[uiRowIndex]?.item || 0);
          const selectedSupplyName =
            latestSuppliesRef.current.find((s) => s.id === selectedSupplyId)?.name ||
            `fila ${uiRowIndex + 1}`;
          const detail = movement.error_detail.replace("VALIDATION_ERROR: ", "");
          const message = `${selectedSupplyName}: ${detail}`;
          errors.push(message);
          nextItemErrors[uiRowIndex] = detail;
        }
      });

      if (errors.length > 0) {
        setError(errors.join("\n"));
        setItemErrors(nextItemErrors);
        setSuccessMessage(null);
        return;
      }

      setItemErrors({});
      setSuccessMessage("Movimiento guardado correctamente");
      latestOnProductCreatedRef.current();
      clearForm();
      if (latestProjectIdRef.current) {
        latestGetStockRef.current(latestProjectIdRef.current, "");
      }
    }
  }, [resultCreation, lastSubmittedRowIndexes]);

  useEffect(() => {
    if (projectId) {
      getSupplies(projectId);
      getProject(projectId);
      getStock(projectId, "");
    }
  }, [projectId, getProject, getStock, getSupplies]);

  useEffect(() => {
    if (!pendingCreatedSupplyName || itemIndexToUpdate === null) return;
    const createdSupply = supplies.find(
      (s) => s.name.trim().toUpperCase() === pendingCreatedSupplyName
    );
    if (!createdSupply) return;

    handleItemChange(itemIndexToUpdate, "item", String(createdSupply.id));
    setPendingCreatedSupplyName(null);
    setItemIndexToUpdate(null);
  }, [supplies, pendingCreatedSupplyName, itemIndexToUpdate]);

  const availableSupplies = useMemo(() => {
    const stockBySupply = new Map<string, number>();
    for (const s of stock || []) {
      const current = stockBySupply.get(s.supply_name) || 0;
      stockBySupply.set(s.supply_name, current + Number(s.stock_units));
    }

    // Movimiento interno: solo insumos con stock > 0
    // Remito oficial / Stock: todos los insumos del catálogo
    const isInternalTransfer = type?.id === 2;

    return supplies
      .filter((s) => !isInternalTransfer || Number(stockBySupply.get(s.name) || 0) > 0)
      .map((s) => ({
        id: s.id,
        name: s.name,
        qty: Number(stockBySupply.get(s.name) || 0),
        unit: getUnitName(s.unit_id),
      }));
  }, [supplies, stock, type]);

  useEffect(() => {
    if (!selectedProject) return;
    setInvestors(
      selectedProject.investors
        .filter((i) => i.id !== null)
        .map((i) => ({ id: i.id!, name: i.name }))
    );
  }, [selectedProject]);

  const handleItemChange = (i: number, field: string, value: string) => {
    setItemErrors((prev) => {
      if (!(i in prev)) return prev;
      const clone = { ...prev };
      delete clone[i];
      return clone;
    });
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );
  };

  const handlePreSave = () => {
    const errors: string[] = [];
    setError(null);

    const effectiveProvider =
      provider ?? (queryProvider.trim() ? { id: 0, name: queryProvider.trim() } : undefined);

    if (!effectiveProvider) {
      errors.push("Debe seleccionar o ingresar un proveedor.");
    }

    if (!investor) {
      errors.push("Debe seleccionar un inversor.");
    }

    if (!orderNumber) {
      errors.push("Debe seleccionar un número de orden.");
    }

    if (!date) {
      errors.push("Debe seleccionar una fecha.");
    }

    if (!type) {
      errors.push("Debe seleccionar un tipo.");
    }

    if (type && type.id === 2 && !selectedProjectDestination) {
      errors.push("Debe seleccionar un proyecto destino.");
    }

    const itemsWithAnyValue = items
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => item.item || item.quantity);

    if (itemsWithAnyValue.length === 0) {
      errors.push("Debe cargar al menos un insumo");
      return;
    }

    const hasPartial = itemsWithAnyValue.some(
      ({ item }) => !item.item || !item.quantity
    );

    if (hasPartial) {
      errors.push("No se completaron todos los campos de los items cargados");
      return;
    }

    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    setLastSubmittedRowIndexes(itemsWithAnyValue.map(({ index }) => index));
    setItemErrors({});
    const payload: SupplyMovementRequest = {
      mode: "strict",
      items: itemsWithAnyValue.map(({ item }) => ({
        supply_id: Number(item.item),
        quantity: Number(item.quantity),
        movement_type: type?.name || "",
        movement_date: new Date(date),
        reference_number: orderNumber,
        project_destination_id: selectedProjectDestination || 0,
        investor_id: investor?.id || 0,
        provider: {
          id: effectiveProvider?.id || 0,
          name: effectiveProvider?.name || "",
        },
      })),
    };

    saveSupplyMovement(projectId, payload);
  };

  return (
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-2">Ingreso de Insumo</h2>
        {processing || processingCreation ? (
          <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            <form className="space-y-4 flex-1">
              <div className="grid grid-cols-3 gap-4">
                <SelectField
                  label="Tipo de ingreso"
                  name="type"
                  options={typeOptions}
                  value={type?.id?.toString() || ""}
                  onChange={(e) => {
                    const selectedType = typeOptions.find(
                      (type) => type.id === Number(e.target.value)
                    );
                    if (selectedType) {
                      setType(selectedType);
                    }
                  }}
                  disabled={processing}
                  size="sm"
                />
                <InputField
                  label="Fecha"
                  name="date"
                  type="date"
                  value={date || ""}
                  onChange={(e) => {
                    const inputValue = e.target.value;
                    if (inputValue) {
                      const dateParts = inputValue.split("-");
                      if (dateParts[0] && dateParts[0].length > 4) {
                        dateParts[0] = dateParts[0].slice(0, 4);
                        const formattedDate = dateParts.join("-");
                        setDate(formattedDate);
                      } else {
                        setDate(inputValue);
                      }
                    } else {
                      setDate("");
                    }
                  }}
                  size="sm"
                />
                <InputField
                  label="Numero / Nombre"
                  placeholder="Numero / Nombre"
                  name="nroName"
                  type="text"
                  value={orderNumber || ""}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  size="sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <InputField
                  label="Proyecto"
                  name="project"
                  type="text"
                  value={selectedProject?.name || ""}
                  onChange={() => {}}
                  disabled
                  size="sm"
                />

                <div className="space-y-2">
                  <SelectField
                    label="Proveedor existente"
                    placeholder="Seleccionar proveedor"
                    name="provider"
                    options={providers || []}
                    value={provider?.id?.toString() || ""}
                    onChange={(e) => {
                      const selectedProvider = providers?.find(
                        (p) => p.id === Number(e.target.value)
                      );
                      setProvider(selectedProvider);
                      setQueryProvider(selectedProvider?.name || "");
                    }}
                    size="sm"
                  />
                  <InputField
                    label="O escribir proveedor nuevo"
                    placeholder="Nombre del proveedor"
                    name="providerName"
                    type="text"
                    value={queryProvider}
                    onChange={(e) => {
                      setQueryProvider(e.target.value);
                      setProvider(undefined);
                    }}
                    size="sm"
                  />
                </div>
                <SelectField
                  label="Inversor"
                  placeholder="Selecciona el inversor"
                  name="investor"
                  options={investors}
                  value={investor?.id?.toString() || ""}
                  onChange={(e) => {
                    const selectedInvestor = investors.find(
                      (i) => i.id === Number(e.target.value)
                    );
                    if (selectedInvestor) {
                      setInvestor(selectedInvestor);
                    }
                  }}
                  size="sm"
                />
              </div>

              {type?.id === 2 && (
                <div className="grid grid-cols-3 gap-4">
                  <SelectField
                    label="Cliente destino"
                    name="customer"
                    options={customers}
                    value={customer?.id?.toString() || ""}
                    onChange={(e) => {
                      const selectedCustomer = customers.find(
                        (customer) => customer.id === Number(e.target.value)
                      );
                      if (selectedCustomer) {
                        setCustomer(selectedCustomer);
                      }
                    }}
                    size="sm"
                  />
                  <SelectField
                    label="Proyecto destino"
                    name="projectDestination"
                    options={projectsDropdown}
                    value={project?.id?.toString() || ""}
                    onChange={(e) => {
                      const selectedProject = projectsDropdown.find(
                        (project) => project.id === Number(e.target.value)
                      );
                      if (selectedProject) {
                        setProject(selectedProject);
                      }
                    }}
                    disabled={processing || !customers}
                    size="sm"
                  />
                  <SelectField
                    label="Campaña"
                    name="campaign"
                    options={campaigns}
                    value={campaign?.id?.toString() || ""}
                    onChange={(e) => {
                      const selectedCampaign = campaigns.find(
                        (campaign) => campaign.id === Number(e.target.value)
                      );
                      if (selectedCampaign) {
                        setCampaign(selectedCampaign);
                        setSelectedProjectDestination(
                          selectedCampaign.project_id
                        );
                      }
                    }}
                    size="sm"
                  />
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div></div>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => {
                      setItemIndexToUpdate(null);
                      setOpenCreateSupply(true);
                    }}
                    className="max-w-fit"
                  >
                    + Crear nuevo insumo
                  </Button>
                </div>
                <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1.5fr] gap-4 mb-2">
                  <span className="font-sm text-gray-900">Insumo</span>
                  <span className="font-sm text-gray-900">Cantidad</span>
                  <div></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1.5fr] gap-4">
                  {items.map((item, i) => (
                    <div
                      key={i}
                      className="sm:contents border sm:border-0 p-4 sm:p-0 rounded-md sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none"
                    >
                      <div className="sm:col-span-1">
                        <SupplyDropdown
                          options={availableSupplies.map((s) => ({
                            id: s.id,
                            name: s.name,
                            badge: s.qty > 0 ? <>{s.qty.toFixed(2)} {s.unit}</> : undefined,
                          }))}
                          value={item.item ? Number(item.item) : null}
                          onSelect={(option) => handleItemChange(i, "item", String(option.id))}
                          onCreateNew={() => {
                            setItemIndexToUpdate(i);
                            setOpenCreateSupply(true);
                          }}
                          hasError={!!itemErrors[i]}
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <InputField
                          label=""
                          placeholder="Lt/Kg/Bolsas"
                          name={`quantity${i}`}
                          type="text"
                          value={item.quantity}
                          inputClassName={
                            itemErrors[i]
                              ? "border-red-500 focus:border-red-500 focus:ring-red-500"
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value.replace(/,/g, ".");
                            if (/^\d*\.?\d{0,3}$/.test(value)) {
                              handleItemChange(i, "quantity", value);
                            }
                          }}
                          size="sm"
                        />
                        {itemErrors[i] && (
                          <p className="mt-1 text-xs text-red-600">{itemErrors[i]}</p>
                        )}
                      </div>
                      <div>
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => {
                            const newItems = [...items];
                            newItems.splice(i, 1);
                            setItems(newItems);
                          }}
                          className="text-blue-500 hover:underline max-w-fit"
                        >
                          <Trash size={12} />
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      setItems([...items, { item: "", quantity: "" }]);
                    }}
                    className="max-w-fit"
                  >
                    Agregar insumo +
                  </Button>
                </div>
              </div>
              {error && (
                <div
                  className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50"
                  role="alert"
                >
                  <span className="font-medium">Error:</span> {error}
                </div>
              )}
              {successMessage && successMessage !== "" && (
                <div
                  className="relative flex items-center p-4 pr-12 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400"
                  role="alert"
                >
                  <svg
                    className="shrink-0 inline w-4 h-4 me-3"
                    aria-hidden="true"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
                  </svg>
                  <span className="sr-only">Info</span>
                  <div>
                    <span className="font-medium">{successMessage}</span>
                  </div>
                  <button
                    type="button"
                    className="absolute top-2 right-2 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-2 hover:bg-green-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700"
                    data-dismiss-target="#alert-3"
                    aria-label="Close"
                    onClick={() => setSuccessMessage("")}
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="w-2 h-2"
                      aria-hidden="true"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 14 14"
                    >
                      <path
                        stroke="currentColor"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                      />
                    </svg>
                  </button>
                </div>
              )}
            </form>
            <div className="flex justify-end gap-2 mt-auto pt-6 pb-2 bg-white">
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  className="text-base font-medium"
                  onClick={() => setDrawerOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  variant="primary"
                  className="text-base font-medium"
                  onClick={handlePreSave}
                  disabled={processing || processingCreation}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
      <Drawer open={openCreateSupply} onClose={() => setOpenCreateSupply(false)}>
        <div className="flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-4">Crear nuevo insumo</h2>
          <CreateSupplyInline
            projectId={projectId}
            onCreated={async (createdName) => {
              setPendingCreatedSupplyName(createdName);
              setOpenCreateSupply(false);
              if (projectId) {
                await getSupplies(projectId);
                await getStock(projectId, "");
              }
            }}
            onCancel={() => setOpenCreateSupply(false)}
          />
        </div>
      </Drawer>
    </Drawer>
  );
}
