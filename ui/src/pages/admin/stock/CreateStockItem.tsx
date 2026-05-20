import { useEffect, useRef, useState } from "react";
import AppButton from "../../../components/Button/Button";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import useSupplies from "../../../hooks/useSupplies";
import { Plus, Trash } from "lucide-react";

import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../components/feedback/SuccessBanner";
import useProjects from "../../../hooks/useDatabase/projects";
import useStockMovement from "../../../hooks/useStockMovement";
import { IconActionButton } from "../../../components/Button/IconActionButton";
import { DrawerFormActions } from "../../../components/Drawer/DrawerFormActions";
import { DrawerShell } from "../../../components/Drawer/DrawerShell";

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

  const [error, setError] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { getSupplies, supplies } = useSupplies();

  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState("");
  const [investor, setInvestor] = useState<{ id: number; name: string } | null>(null);
  const [investors, setInvestors] = useState<{ id: number; name: string }[]>([]);
  const latestOnStockCreatedRef = useRef(onStockCreated);

  const [items, setItems] = useState<{ item: string; quantity: string }[]>(emptyItems);

  const clearForm = () => {
    setError(null);
    setErrorMessages([]);
    setInvestor(null);
    setItems(emptyItems);
    setOrderNumber("");
    setDate("");
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
    }
  }, [projectId, getProject, getSupplies]);

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

  const handleItemChange = (i: number, field: string, value: string) => {
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
      return;
    }

    const hasPartial = itemsWithAnyValue.some((item) => !item.item || !item.quantity);

    if (hasPartial) {
      errors.push("No se completaron todos los campos de los items cargados");
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
    <DrawerShell
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      title="Ingreso de Stock"
      bodyClassName="drawer-body-relative"
      footer={
        processing || processingCreation ? undefined : (
          <DrawerFormActions
            cancelLabel="Cancelar"
            submitLabel="Guardar"
            onCancel={() => setDrawerOpen(false)}
            onSubmit={handlePreSave}
            disabled={processing || processingCreation}
          />
        )
      }
    >
      {processing || processingCreation ? (
        <LoadingOverlay />
      ) : (
        <>
          <form className="space-y-4 flex-1">
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
            <div>
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
                      <SelectField
                        label=""
                        name={`item-${i}`}
                        options={Array.isArray(supplies) ? supplies : []}
                        value={item.item}
                        onChange={(e) => handleItemChange(i, "item", e.target.value)}
                        size="sm"
                      />
                    </div>
                    <div className="sm:col-span-1">
                      <InputField
                        label=""
                        placeholder="Lt/Kg/Bolsas"
                        name={`quantity${i}`}
                        type="text"
                        value={item.quantity}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, ".");
                          if (/^\d*\.?\d{0,3}$/.test(value)) {
                            handleItemChange(i, "quantity", value);
                          }
                        }}
                        size="sm"
                      />
                    </div>
                    <div>
                      <IconActionButton
                        label="Eliminar insumo"
                        icon={<Trash size={14} />}
                        tone="danger"
                        onClick={() => {
                          const newItems = [...items];
                          newItems.splice(i, 1);
                          setItems(newItems);
                        }}
                      />
                    </div>
                  </div>
                ))}
                <AppButton
                  variant="secondary"
                  size="sm"
                  iconLeft={<Plus className="h-4 w-4" />}
                  onClick={() => {
                    setItems([...items, { item: "", quantity: "" }]);
                  }}
                  className="max-w-fit"
                >
                  Agregar Insumo
                </AppButton>
              </div>
            </div>
            {errorMessages.length > 0 && (
              <ErrorBanner onDismiss={() => setErrorMessages([])}>
                <ul className="mt-1.5 list-disc list-inside">
                  {errorMessages.map((msg, index) => (
                    <li key={index}>{msg}</li>
                  ))}
                </ul>
              </ErrorBanner>
            )}
            {error && error !== "" && (
              <ErrorBanner
                message={error}
                variant="alert"
                prefix="Error!"
                onDismiss={() => setError("")}
              />
            )}
            {successMessage && successMessage !== "" && (
              <SuccessBanner
                message={successMessage}
                variant="alert"
                onDismiss={() => setSuccessMessage("")}
              />
            )}
          </form>
        </>
      )}
    </DrawerShell>
  );
}
