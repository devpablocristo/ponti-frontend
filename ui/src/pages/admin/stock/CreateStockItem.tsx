import { useEffect, useRef, useState } from "react";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import useSupplies from "../../../hooks/useSupplies";
import { Trash } from "lucide-react";
import useProjects from "../../../hooks/useDatabase/projects";
import useStockMovement from "../../../hooks/useStockMovement";
import EntityFormDrawer from "../../../components/crud/EntityFormDrawer";
import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { GetStocksResponse } from "../../../hooks/useStock/types";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

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
  const {
    resultCreation,
    errorCreation,
    processingCreation,
    saveStockMovement,
  } = useStockMovement();
  const { getProject, selectedProject, processing } = useProjects();

  const [error, setError] = useState<string | null>(null);
  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { getSupplies, supplies } = useSupplies();

  const [orderNumber, setOrderNumber] = useState("");
  const [date, setDate] = useState("");
  const [investor, setInvestor] = useState<{ id: number; name: string } | null>(
    null
  );
  const [investors, setInvestors] = useState<{ id: number; name: string }[]>(
    []
  );
  const latestOnStockCreatedRef = useRef(onStockCreated);
  const submittedItemsRef = useRef<Array<{ supply_id: number; quantity: number }>>(
    []
  );

  const [items, setItems] = useState<
    { item: string; quantity: string }[]
  >(emptyItems);

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
      if (resultCreation.supply_movements.length === 0) {
        return;
      }

      const errors: string[] = [];
      resultCreation.supply_movements.forEach((movement) => {
        if (movement.error_detail !== "") {
          errors.push(movement.error_detail.replace("VALIDATION_ERROR: ", ""));
        }
      });

      if (errors.length > 0) {
        setError(errors.join("\n"));
        setSuccessMessage(null);
        return;
      }

      try {
        await syncRealFieldStock(submittedItemsRef.current);
        setSuccessMessage("Movimiento guardado correctamente");
        latestOnStockCreatedRef.current();
        clearForm();
      } catch (syncError) {
        setError(
          extractErrorMessage(
            syncError,
            "El movimiento se guardo, pero no se pudo actualizar el stock de campo."
          )
        );
        setSuccessMessage(null);
      }
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
    setInvestors(
      selectedProject.investors
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
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );
  };

  const syncRealFieldStock = async (
    submittedItems: Array<{ supply_id: number; quantity: number }>
  ) => {
    const quantitiesBySupply = submittedItems.reduce((map, item) => {
      map.set(item.supply_id, (map.get(item.supply_id) ?? 0) + item.quantity);
      return map;
    }, new Map<number, number>());

    if (quantitiesBySupply.size === 0) {
      return;
    }

    const response = await apiClient.get<SuccessResponse<GetStocksResponse>>(
      `/stock/${projectId}?cutoff_date=`
    );

    if (!response.success) {
      throw new Error("No se pudo refrescar el stock.");
    }

    const stockBySupplyId = new Map(
      (response.data.items ?? []).map((stockItem) => [stockItem.supply_id, stockItem])
    );

    await Promise.all(
      Array.from(quantitiesBySupply.entries()).map(async ([supplyId, quantity]) => {
        const stockItem = stockBySupplyId.get(supplyId);
        if (!stockItem) return;

        await apiClient.put(`/stock/${projectId}/${stockItem.id}`, {
          real_stock_units: quantity,
          ...(stockItem.updated_at ? { updated_at: stockItem.updated_at } : {}),
        });
      })
    );
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

    const itemsWithAnyValue = items.filter(
      (item) => item.item || item.quantity
    );

    if (itemsWithAnyValue.length === 0) {
      errors.push("Debe cargar al menos un insumo");
      return;
    }

    const hasPartial = itemsWithAnyValue.some(
      (item) => !item.item || !item.quantity
    );

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

    submittedItemsRef.current = itemsWithAnyValue.map((item) => ({
      supply_id: Number(item.item),
      quantity: Number(item.quantity),
    }));

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
    <EntityFormDrawer
      open={drawerOpen}
      onClose={() => setDrawerOpen(false)}
      title="Ingreso de Stock"
      processing={processing || processingCreation}
      onSubmit={handlePreSave}
    >
      <>
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
                          options={supplies}
                          value={item.item}
                          onChange={(e) =>
                            handleItemChange(i, "item", e.target.value)
                          }
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
              {errorMessages.length > 0 && (
                <div
                  id="alert-2"
                  className="flex items-center p-4 mb-4 text-red-800 rounded-lg bg-red-50"
                  role="alert"
                >
                  <div>
                    <ul className="mt-1.5 list-disc list-inside">
                      {errorMessages.map((msg, index) => (
                        <li key={index}>{msg}</li>
                      ))}
                    </ul>
                  </div>
                  <button
                    type="button"
                    className="ms-auto -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700"
                    data-dismiss-target="#alert-2"
                    aria-label="Close"
                    onClick={() => setErrorMessages([])}
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="w-3 h-3"
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
              {error && error !== "" && (
                <div
                  className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
                  role="alert"
                >
                  <span className="font-medium">Error!</span> {error}
                  <button
                    type="button"
                    className="ms-auto -mx-1 -my-1 bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-red-400 dark:hover:bg-gray-700"
                    aria-label="Close"
                    onClick={() => setError("")}
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
              {successMessage && successMessage !== "" && (
                <div
                  className="flex items-center p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400"
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
                    className="ms-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700"
                    data-dismiss-target="#alert-3"
                    aria-label="Close"
                    onClick={() => setSuccessMessage("")}
                  >
                    <span className="sr-only">Close</span>
                    <svg
                      className="w-3 h-3"
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
      </>
    </EntityFormDrawer>
  );
}
