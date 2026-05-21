import { useEffect, useMemo, useRef, useState } from "react";

import InputField from "../../../components/Input/InputField";
import useSupplies from "../../../hooks/useSupplies";
import useStock from "../../../hooks/useStock";
import useProjects from "../../../hooks/useDatabase/projects";
import useStockMovement from "../../../hooks/useStockMovement";
import { Notification } from "../../../components/feedback/Notification";
import { DrawerShell } from "../../../components/Drawer/DrawerShell";
import { EntityFormDrawer } from "../../../components/crud/EntityFormDrawer";
import SupplyItemsTable from "../../../components/crud/SupplyItemsTable";
import CreateSupplyInline from "../../../components/crud/CreateSupplyInline";
import { getUnitName } from "../../../constants/units";

const emptyItems = [
  { item: "", quantity: "" },
  { item: "", quantity: "" },
  { item: "", quantity: "" },
  { item: "", quantity: "" },
];

const STOCK_MOVEMENT_TYPE = "Stock";

export default function CreateStockItem({
  drawerOpen,
  setDrawerOpen,
  projectId,
  onStockCreated,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  projectId: number;
  onStockCreated: () => void;
}) {
  const { resultCreation, errorCreation, processingCreation, saveStockMovement } =
    useStockMovement();
  const { getProject, selectedProject, processing } = useProjects();
  const { getSupplies, supplies } = useSupplies();
  const { getStock, stock } = useStock();

  const [error, setError] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState("");
  const [investor, setInvestor] = useState<{ id: number; name: string } | null>(null);
  const [investors, setInvestors] = useState<{ id: number; name: string }[]>([]);
  const latestOnStockCreatedRef = useRef(onStockCreated);

  const [items, setItems] = useState<{ item: string; quantity: string }[]>(emptyItems);
  const [itemErrors, setItemErrors] = useState<Record<number, string>>({});

  const [openCreateSupply, setOpenCreateSupply] = useState(false);
  const [itemIndexToUpdate, setItemIndexToUpdate] = useState<number | null>(null);
  const [pendingCreatedSupplyName, setPendingCreatedSupplyName] = useState<string | null>(null);

  const clearForm = () => {
    setError(null);
    setErrorMessages([]);
    setInvestor(null);
    setItems(emptyItems);
    setOrderNumber("");
    setDate("");
    setItemErrors({});
  };

  useEffect(() => {
    setSuccessMessage(null);
    setError(null);
    setErrorMessages([]);
  }, [drawerOpen]);

  useEffect(() => {
    if (errorCreation) {
      setError(errorCreation);
      setSuccessMessage(null);
    }
  }, [errorCreation]);

  useEffect(() => {
    latestOnStockCreatedRef.current = onStockCreated;
  }, [onStockCreated]);

  useEffect(() => {
    const handleCreatedMovement = async () => {
      const createdMovements = Array.isArray(resultCreation.supply_movements)
        ? resultCreation.supply_movements
        : [];

      if (createdMovements.length === 0) {
        return;
      }

      const errors: string[] = [];
      createdMovements.forEach((movement) => {
        if (movement.error_detail !== "") {
          errors.push(movement.error_detail.replace("VALIDATION_ERROR: ", ""));
        }
      });

      if (errors.length > 0) {
        setError(errors.join("\n"));
        setSuccessMessage(null);
        return;
      }

      setSuccessMessage("Movimiento guardado correctamente");
      latestOnStockCreatedRef.current();
      clearForm();
    };

    void handleCreatedMovement();
  }, [projectId, resultCreation]);

  useEffect(() => {
    if (projectId) {
      getSupplies(projectId);
      getProject(projectId);
      getStock(projectId, "");
    }
  }, [projectId, getProject, getSupplies, getStock]);

  useEffect(() => {
    if (!selectedProject) return;
    const projectInvestors = Array.isArray(selectedProject.investors)
      ? selectedProject.investors
      : [];
    setInvestors(
      projectInvestors
        .filter((i) => i.id !== null)
        .map((i) => ({ id: i.id!, name: i.name }))
    );
  }, [selectedProject]);

  useEffect(() => {
    if (!investor && investors.length > 0) {
      setInvestor(investors[0]);
    }
  }, [investor, investors]);

  useEffect(() => {
    if (!pendingCreatedSupplyName || itemIndexToUpdate === null) return;
    const createdSupply = (Array.isArray(supplies) ? supplies : []).find(
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
    return (Array.isArray(supplies) ? supplies : []).map((s) => ({
      id: s.id,
      name: s.name,
      availableQty: Number(stockBySupply.get(s.name) || 0),
      unitName: getUnitName(s.unit_id),
    }));
  }, [supplies, stock]);

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
    setErrorMessages(errors);

    if (!orderNumber) {
      errors.push("Debe seleccionar un número de orden.");
    }

    if (!date) {
      errors.push("Debe seleccionar una fecha.");
    }

    const itemsWithAnyValue = items.filter((item) => item.item || item.quantity);

    if (itemsWithAnyValue.length === 0) {
      errors.push("Debe cargar al menos un insumo");
      setErrorMessages(errors);
      return;
    }

    const hasPartial = itemsWithAnyValue.some((item) => !item.item || !item.quantity);

    if (hasPartial) {
      errors.push("No se completaron todos los campos de los items cargados");
      setErrorMessages(errors);
      return;
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
      return;
    }

    const movementDateStr = date;
    const referenceNumber = orderNumber;

    const effectiveInvestorId = investor?.id || investors[0]?.id || 0;

    if (effectiveInvestorId === 0) {
      errors.push("No hay inversores disponibles para el proyecto.");
      setErrorMessages(errors);
      return;
    }

    saveStockMovement(projectId, {
      items: itemsWithAnyValue.map((item) => ({
        supply_id: Number(item.item),
        quantity: Number(item.quantity),
        movement_type: STOCK_MOVEMENT_TYPE,
        movement_date: new Date(movementDateStr),
        reference_number: referenceNumber,
        project_destination_id: 0,
        investor_id: effectiveInvestorId,
        provider: {
          id: 0,
          name: STOCK_MOVEMENT_TYPE,
        },
      })),
    });
  };

  return (
    <>
      <EntityFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Ingreso de Stock"
        processing={processing || processingCreation}
        onSubmit={handlePreSave}
      >
        <div className="grid grid-cols-3 gap-4">
          <InputField
            label="Tipo de ingreso"
            name="movementType"
            type="text"
            value="Stock actual"
            onChange={() => {}}
            disabled
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
                  setDate(dateParts.join("-"));
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
        </div>

        <SupplyItemsTable
          items={items.map(({ item, quantity }) => ({
            supplyId: item ? Number(item) : null,
            quantity,
          }))}
          options={availableSupplies}
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
          onAddRow={() => setItems([...items, { item: "", quantity: "" }])}
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

        {errorMessages.length > 0 && (
          <Notification variant="error" onDismiss={() => setErrorMessages([])}>
            <ul className="mt-1.5 list-disc list-inside">
              {errorMessages.map((msg, index) => (
                <li key={index}>{msg}</li>
              ))}
            </ul>
          </Notification>
        )}
        {error && error !== "" && (
          <Notification variant="error"
            message={error}
            prefix="Error!"
            onDismiss={() => setError("")}
          />
        )}
        {successMessage && successMessage !== "" && (
          <Notification variant="success"
            message={successMessage}
            onDismiss={() => setSuccessMessage("")}
          />
        )}
      </EntityFormDrawer>

      <DrawerShell
        open={openCreateSupply}
        onClose={() => {
          setOpenCreateSupply(false);
          setItemIndexToUpdate(null);
          setPendingCreatedSupplyName(null);
        }}
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
          onCancel={() => {
            setOpenCreateSupply(false);
            setItemIndexToUpdate(null);
            setPendingCreatedSupplyName(null);
          }}
        />
      </DrawerShell>
    </>
  );
}
