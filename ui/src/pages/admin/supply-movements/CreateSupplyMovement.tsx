import { useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import useSupplies from "../../../hooks/useSupplies";
import useStock from "../../../hooks/useStock";
import { Plus } from "lucide-react";
import useProjects from "../../../hooks/useDatabase/projects";
import { Entity } from "../../../hooks/useDatabase/options/types";
import useProviders from "../../../hooks/useProviders";
import useSupplyMovements from "../../../hooks/useSupplyMovements";
import {
  SupplyMovement,
  SupplyMovementRequest,
  UpdateSupplyMovementRequest,
} from "../../../hooks/useSupplyMovements/types";

import { DEFAULT_ITEM_ROW_COUNT, replaceSupplyIdsWithNames } from "../utils";
import { DrawerShell } from "../../../components/Drawer/DrawerShell";
import { EntityFormDrawer } from "../../../components/crud/EntityFormDrawer";
import SupplyItemsTable from "../../../components/crud/SupplyItemsTable";
import CreateSupplyInline from "../../../components/crud/CreateSupplyInline";
import { notify } from "@/lib/notify";
import { filterActive } from "@/lib/lifecycle/filterActive";
import { Campaign, Customer, Project } from "../../../hooks/useWorkspaceFilters";
import useCampaigns from "../../../hooks/useCampaigns";
import { getUnitName } from "../../../constants/units";

const emptyItems = Array.from({ length: DEFAULT_ITEM_ROW_COUNT }, () => ({
  item: "",
  quantity: "",
}));

const typeOptions = [
  { id: 1, name: "Stock inicial" },
  { id: 2, name: "Movimiento interno" },
  { id: 3, name: "Remito oficial" },
  { id: 4, name: "Devolución" },
];

const getMovementTypeValue = (typeId?: number | null) => {
  if (typeId === 1) return "Stock";
  return typeOptions.find((option) => option.id === typeId)?.name || "";
};

const getTypeOptionFromEntryType = (entryType?: string | null) => {
  if (entryType === "Stock") {
    return typeOptions.find((option) => option.id === 1) || null;
  }

  return typeOptions.find((option) => option.name === entryType) || null;
};

const formatAvailableQty = (value: number) => value.toFixed(2).replace(/\.?0+$/, "");

const DEVOLUTION_TYPE_ID = 4;

export default function CreateSupplyMovement({
  drawerOpen,
  setDrawerOpen,
  projectId,
  customers,
  onProductCreated,
  editingMovement,
  onEditSaved,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  projectId: number;
  customers: Customer[];
  onProductCreated: () => void;
  editingMovement: SupplyMovement | null;
  onEditSaved: () => void;
}) {
  const {
    resultCreation,
    errorCreation,
    errorCreationPayload,
    processingCreation,
    saveSupplyMovement,
    updateSupplyMovement,
  } = useSupplyMovements();
  const { getProject, selectedProject, processing } = useProjects();
  const { getProviders, providers } = useProviders();
  const isEditing = !!editingMovement;

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  useEffect(() => {
    if (successMessage) notify.success(successMessage);
  }, [successMessage]);

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [project, setProject] = useState<Project | null>(null);

  const [selectedProjectDestination, setSelectedProjectDestination] = useState<number | null>(null);

  const { getSupplies, supplies } = useSupplies();
  const { getStock, stock } = useStock();
  const { projectsDropdown, getProjectsDropdown } = useProjects();
  const { campaigns, getCampaigns } = useCampaigns();

  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState("");
  const [investor, setInvestor] = useState<{ id: number; name: string } | null>(null);
  const [investors, setInvestors] = useState<{ id: number; name: string }[]>([]);

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
  const [lastSubmittedRowIndexes, setLastSubmittedRowIndexes] = useState<number[]>([]);
  const [openCreateSupply, setOpenCreateSupply] = useState(false);
  const [itemIndexToUpdate, setItemIndexToUpdate] = useState<number | null>(null);
  const [pendingCreatedSupplyName, setPendingCreatedSupplyName] = useState<string | null>(null);
  const latestItemsRef = useRef(items);
  const latestSuppliesRef = useRef(supplies);
  const latestProjectIdRef = useRef(projectId);
  const latestOnProductCreatedRef = useRef(onProductCreated);
  const latestGetStockRef = useRef(getStock);
  const latestGetProvidersRef = useRef(getProviders);

  const clearForm = () => {
    setError(null);
    setItemErrors({});
    setLastSubmittedRowIndexes([]);
    setProvider(undefined);
    setQueryProvider("");
    setInvestor(null);
    setCustomer(null);
    setProject(null);
    setCampaign(null);
    setItems(emptyItems);
    setOrderNumber("");
    setDate("");
    setType(null);
    setSelectedProjectDestination(null);
  };

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
      getCampaigns(`customer_id=${customer.id}&project_name=${project.name}&limit=100`);
    }
  }, [customer, project, getCampaigns]);

  useEffect(() => {
    if (errorCreation) {
      const message =
        typeof errorCreationPayload?.error?.details === "string" &&
        errorCreationPayload.error.details.trim() !== ""
          ? errorCreationPayload.error.details
          : (errorCreation ?? "");
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
    latestGetProvidersRef.current = getProviders;
  }, [items, supplies, projectId, onProductCreated, getStock, getProviders]);

  useEffect(() => {
    if (lastSubmittedRowIndexes.length === 0) return;
    if (resultCreation.supply_movements.length === 0) return;

    const expectedCount = lastSubmittedRowIndexes.length;
    const successfulMovements = resultCreation.supply_movements.filter(
      (movement) => movement.is_saved
    );
    const allSaved =
      resultCreation.supply_movements.length === expectedCount &&
      successfulMovements.length === expectedCount;

    const errors: string[] = [];
    const nextItemErrors: Record<number, string> = {};

    resultCreation.supply_movements.forEach((movement, responseIndex) => {
      if (movement.error_detail !== "") {
        const uiRowIndex = lastSubmittedRowIndexes[responseIndex] ?? responseIndex;
        const detail = movement.error_detail.replace("VALIDATION_ERROR: ", "");
        const detailWithNames = replaceSupplyIdsWithNames(detail, latestSuppliesRef.current);
        errors.push(detailWithNames);
        nextItemErrors[uiRowIndex] = detailWithNames;
      }
    });

    if (errors.length > 0 || !allSaved) {
      const fallbackMessage =
        errors.length > 0
          ? errors.join("\n")
          : "No se pudo guardar el movimiento. Revisá que no haya insumos duplicados u otros errores de validación.";

      setError(replaceSupplyIdsWithNames(fallbackMessage, latestSuppliesRef.current));
      setItemErrors(nextItemErrors);
      setSuccessMessage(null);

      if (successfulMovements.length > 0) {
        latestOnProductCreatedRef.current();
        if (latestProjectIdRef.current) {
          latestGetStockRef.current(latestProjectIdRef.current, "");
        }
        latestGetProvidersRef.current("");
      }

      return;
    }

    setError(null);
    setItemErrors({});
    setSuccessMessage("Movimiento guardado correctamente");
    latestOnProductCreatedRef.current();
    clearForm();

    if (latestProjectIdRef.current) {
      latestGetStockRef.current(latestProjectIdRef.current, "");
    }
    latestGetProvidersRef.current("");
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

    const requiresAvailableStock = type?.id === 2 || type?.id === DEVOLUTION_TYPE_ID;

    return supplies
      .filter((s) => !requiresAvailableStock || Number(stockBySupply.get(s.name) || 0) > 0)
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

  useEffect(() => {
    if (!drawerOpen) return;
    if (editingMovement) return;

    clearForm();
  }, [drawerOpen, editingMovement]);

  useEffect(() => {
    if (!drawerOpen || !editingMovement) return;

    setError(null);
    setSuccessMessage(null);
    setItemErrors({});

    const matchedType = getTypeOptionFromEntryType(editingMovement.entry_type);
    setType(matchedType);

    const isInternalMovement = matchedType?.id === 2;

    setCustomer(null);
    setProject(null);
    setCampaign(null);
    setSelectedProjectDestination(null);

    if (isInternalMovement) {
      if (editingMovement.destination_project_id) {
        setSelectedProjectDestination(editingMovement.destination_project_id);
      }

      if (editingMovement.destination_customer_name) {
        const matchedCustomer = customers.find(
          (c) => c.name === editingMovement.destination_customer_name
        );
        if (matchedCustomer) setCustomer(matchedCustomer);
      }
    }

    setOrderNumber(editingMovement.reference_number || "");
    setDate(String(editingMovement.entry_date || "").slice(0, 10));

    const matchedProvider = (providers || []).find((p) => p.name === editingMovement.provider_name);
    setProvider(matchedProvider);
    setQueryProvider(editingMovement.provider_name || "");

    const matchedInvestor = investors.find((i) => i.name === editingMovement.investor_name);
    setInvestor(matchedInvestor || null);

    const matchedSupply = supplies.find((s) => s.name === editingMovement.supply_name);

    const firstItem = {
      item: matchedSupply ? String(matchedSupply.id) : "",
      quantity: String(editingMovement.quantity ?? "")
        .replace(/[^\d.,]/g, "")
        .replace(",", "."),
    };

    const nextItems = Array.from({ length: DEFAULT_ITEM_ROW_COUNT }, () => ({
      item: "",
      quantity: "",
    }));
    nextItems[0] = firstItem;
    setItems(nextItems);
  }, [drawerOpen, editingMovement, providers, investors, supplies, customers]);

  useEffect(() => {
    if (!drawerOpen || !editingMovement) return;
    if (editingMovement.entry_type !== "Movimiento interno") return;

    if (!project) {
      const matchedProject = projectsDropdown.find((p) => {
        if (
          editingMovement.destination_project_id &&
          p.id === editingMovement.destination_project_id
        ) {
          return true;
        }
        return (
          !!editingMovement.destination_project_name &&
          p.name === editingMovement.destination_project_name
        );
      });

      if (matchedProject) setProject(matchedProject);
    }

    if (!campaign && editingMovement.destination_campaign_name) {
      const matchedCampaign = campaigns.find((c) => {
        const sameName = c.name === editingMovement.destination_campaign_name;
        const sameProject = editingMovement.destination_project_id
          ? c.project_id === editingMovement.destination_project_id
          : true;
        return sameName && sameProject;
      });

      if (matchedCampaign) {
        setCampaign(matchedCampaign);
        setSelectedProjectDestination(matchedCampaign.project_id);
      }
    }
  }, [drawerOpen, editingMovement, projectsDropdown, campaigns, project, campaign]);

  const handleItemChange = (i: number, field: string, value: string) => {
    setItemErrors((prev) => {
      if (!(i in prev)) return prev;
      const clone = { ...prev };
      delete clone[i];
      return clone;
    });
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
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

    if (isEditing && itemsWithAnyValue.length !== 1) {
      setError("En edición debe haber exactamente un insumo cargado.");
      return;
    }
    if (itemsWithAnyValue.length === 0) {
      errors.push("Debe cargar al menos un insumo");
      return;
    }

    const hasPartial = itemsWithAnyValue.some(({ item }) => !item.item || !item.quantity);

    if (hasPartial) {
      errors.push("No se completaron todos los campos de los items cargados");
      return;
    }

    itemsWithAnyValue.forEach(({ item, index }) => {
      const requestedQty = Number(item.quantity);
      if (!Number.isFinite(requestedQty) || requestedQty <= 0) {
        errors.push(`La cantidad de la fila ${index + 1} debe ser mayor a 0.`);
      }
    });

    if (type?.id === DEVOLUTION_TYPE_ID) {
      const stockBySupply = new Map<string, number>();
      const seenSupplyIds = new Set<number>();

      for (const s of stock || []) {
        const current = stockBySupply.get(s.supply_name) || 0;
        stockBySupply.set(s.supply_name, current + Number(s.stock_units));
      }

      itemsWithAnyValue.forEach(({ item }) => {
        const supplyId = Number(item.item);
        const selectedSupply = supplies.find((s) => s.id === supplyId);
        const requestedQty = Number(item.quantity) || 0;
        const availableQty = selectedSupply
          ? Number(stockBySupply.get(selectedSupply.name) || 0)
          : 0;

        if (seenSupplyIds.has(supplyId)) {
          const remitoLabel = orderNumber.trim()
            ? `El remito de devolución ${orderNumber.trim()}`
            : "Este remito de devolución";
          errors.push(
            `${remitoLabel} ya contiene el insumo ${selectedSupply?.name || "seleccionado"} dentro del request.`
          );
          return;
        }

        seenSupplyIds.add(supplyId);

        if (requestedQty > availableQty) {
          errors.push(
            `La devolución de ${selectedSupply?.name || "insumo"} no puede superar el stock disponible (${formatAvailableQty(availableQty)} ${selectedSupply ? getUnitName(selectedSupply.unit_id) : ""}).`
          );
        }
      });
    }

    if (errors.length > 0) {
      setError(errors.join("\n"));
      return;
    }

    setLastSubmittedRowIndexes(itemsWithAnyValue.map(({ index }) => index));
    setItemErrors({});

    if (isEditing && editingMovement?.id) {
      const editItem = itemsWithAnyValue[0].item;
      const payload: UpdateSupplyMovementRequest = {
        supply_id: Number(editItem.item),
        quantity: Number(editItem.quantity),
        movement_type: getMovementTypeValue(type?.id),
        movement_date: new Date(date),
        reference_number: orderNumber,
        project_destination_id: selectedProjectDestination || 0,
        investor_id: investor?.id || 0,
        provider: {
          id: effectiveProvider?.id || 0,
          name: effectiveProvider?.name || "",
        },
      };

      updateSupplyMovement(editingMovement.id, projectId, payload).then((ok) => {
        if (!ok) return;
        clearForm();
        setDrawerOpen(false);
        onEditSaved();
      });

      return;
    }

    const payload: SupplyMovementRequest = {
      mode: "strict",
      items: itemsWithAnyValue.map(({ item }) => ({
        supply_id: Number(item.item),
        quantity: Number(item.quantity),
        movement_type: getMovementTypeValue(type?.id),
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
    <>
      <EntityFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={isEditing ? "Editar Insumo" : "Ingreso de Insumo"}
        processing={processing || processingCreation}
        onSubmit={handlePreSave}
        submitLabel={isEditing ? "Guardar cambios" : "Guardar"}
      >
        <>
          <section className="drawer-section">
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
                  options={filterActive(providers)}
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
                  const selectedInvestor = investors.find((i) => i.id === Number(e.target.value));
                  if (selectedInvestor) {
                    setInvestor(selectedInvestor);
                  }
                }}
                size="sm"
              />
            </div>
          </section>

          {type?.id === 2 && (
            <section className="drawer-section grid grid-cols-3 gap-4">
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
                options={filterActive(campaigns)}
                value={campaign?.id?.toString() || ""}
                onChange={(e) => {
                  const selectedCampaign = campaigns.find(
                    (campaign) => campaign.id === Number(e.target.value)
                  );
                  if (selectedCampaign) {
                    setCampaign(selectedCampaign);
                    setSelectedProjectDestination(selectedCampaign.project_id);
                  }
                }}
                size="sm"
              />
            </section>
          )}
          <section className="drawer-section">
            <div className="drawer-section-header">
              <span className="drawer-section-title">Insumos</span>
              <Button
                variant="light"
                size="xs"
                iconLeft={<Plus className="h-3.5 w-3.5" />}
                onClick={() => {
                  setItemIndexToUpdate(null);
                  setOpenCreateSupply(true);
                }}
              >
                Crear Nuevo Insumo
              </Button>
            </div>
            <SupplyItemsTable
              items={items.map(({ item, quantity }) => ({
                supplyId: item ? Number(item) : null,
                quantity,
              }))}
              options={availableSupplies.map((s) => ({
                id: s.id,
                name: s.name,
                availableQty: s.qty,
                unitName: s.unit,
              }))}
              itemErrors={itemErrors}
              onItemChange={(rowIndex, field, value) => {
                if (field === "supplyId") {
                  handleItemChange(
                    rowIndex,
                    "item",
                    value === null ? "" : String(value),
                  );
                } else if (field === "quantity") {
                  handleItemChange(rowIndex, "quantity", String(value));
                }
              }}
              onAddRow={
                isEditing
                  ? undefined
                  : () => setItems([...items, { item: "", quantity: "" }])
              }
              onRemoveRow={(rowIndex) => {
                const newItems = [...items];
                newItems.splice(rowIndex, 1);
                setItems(newItems);
              }}
              onRequestCreateSupply={(rowIndex) => {
                setItemIndexToUpdate(rowIndex);
                setOpenCreateSupply(true);
              }}
            />
          </section>
        </>
      </EntityFormDrawer>
      <DrawerShell
        open={openCreateSupply}
        onClose={() => setOpenCreateSupply(false)}
        title="Crear Nuevo Insumo"
      >
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
      </DrawerShell>
    </>
  );
}
