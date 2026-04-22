import { useEffect, useRef, useState } from "react";
import { LoaderCircle, Trash } from "lucide-react";

import Button from "../../../components/Button/Button";
import Drawer from "../../../components/Drawer/Drawer";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import useProjects from "../../../hooks/useDatabase/projects";
import useStockCount from "../../../hooks/useStockCount";
import useSupplies from "../../../hooks/useSupplies";

const emptyItems = [
  { item: "", quantity: "" },
  { item: "", quantity: "" },
  { item: "", quantity: "" },
  { item: "", quantity: "" },
];

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
  const { createStockCounts, errorCreation, processingCreation, resultCreation } =
    useStockCount();
  const { getProject, selectedProject, processing } = useProjects();
  const { getSupplies, supplies } = useSupplies();

  const [errorMessages, setErrorMessages] = useState<string[]>([]);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [date, setDate] = useState("");
  const [items, setItems] = useState<{ item: string; quantity: string }[]>(emptyItems);

  const latestOnStockCreatedRef = useRef(onStockCreated);

  const clearForm = () => {
    setErrorMessages([]);
    setItems(emptyItems);
    setNote("");
    setDate("");
  };

  useEffect(() => {
    latestOnStockCreatedRef.current = onStockCreated;
  }, [onStockCreated]);

  useEffect(() => {
    setSuccessMessage(null);
    setErrorMessages([]);
  }, [drawerOpen]);

  useEffect(() => {
    if (projectId) {
      getSupplies(projectId);
      getProject(projectId);
    }
  }, [projectId, getProject, getSupplies]);

  useEffect(() => {
    if (errorCreation) {
      setErrorMessages([errorCreation]);
      setSuccessMessage(null);
    }
  }, [errorCreation]);

  useEffect(() => {
    if (resultCreation.length === 0) {
      return;
    }

    const errors = resultCreation
      .filter((item) => !item.is_saved && item.error_detail)
      .map((item) => item.error_detail);

    if (errors.length > 0) {
      setErrorMessages(errors);
      setSuccessMessage(null);
      return;
    }

    setSuccessMessage("Conteos físicos registrados correctamente");
    latestOnStockCreatedRef.current();
    clearForm();
  }, [resultCreation]);

  const handleItemChange = (index: number, field: string, value: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const addRow = () => {
    setItems((prev) => [...prev, { item: "", quantity: "" }]);
  };

  const handleSubmit = async () => {
    const errors: string[] = [];
    const itemsWithAnyValue = items.filter((item) => item.item || item.quantity);

    if (!date) {
      errors.push("Debe seleccionar una fecha.");
    }

    if (itemsWithAnyValue.length === 0) {
      errors.push("Debe cargar al menos un insumo.");
    }

    if (
      itemsWithAnyValue.some((item) => !item.item || item.quantity === "" || Number(item.quantity) < 0)
    ) {
      errors.push("Todos los conteos deben tener insumo y cantidad válida.");
    }

    if (errors.length > 0) {
      setErrorMessages(errors);
      return;
    }

    await createStockCounts(
      projectId,
      itemsWithAnyValue.map((item) => ({
        supply_id: Number(item.item),
        counted_units: Number(item.quantity),
        counted_at: new Date(date),
        note: note || undefined,
      }))
    );
  };

  return (
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-2">Registrar conteo físico</h2>
        {processing || processingCreation ? (
          <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            <form className="space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <InputField
                  label="Fecha del conteo"
                  name="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  size="sm"
                />
                <InputField
                  label="Nota"
                  placeholder="Referencia opcional"
                  name="note"
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  size="sm"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
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

              <div className="space-y-3">
                {items.map((item, index) => (
                  <div key={index} className="grid grid-cols-[2fr_1fr_auto] gap-3 items-end">
                    <SelectField
                      label={index === 0 ? "Insumo" : ""}
                      name={`item-${index}`}
                      value={item.item}
                      size="sm"
                      onChange={(e) => handleItemChange(index, "item", e.target.value)}
                      options={supplies.map((supply) => ({
                        id: supply.id,
                        name: supply.name,
                      }))}
                    />
                    <InputField
                      label={index === 0 ? "Conteo físico" : ""}
                      name={`quantity-${index}`}
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      size="sm"
                    />
                    <button
                      type="button"
                      className="mb-1 p-2 rounded-md hover:bg-gray-100 text-gray-500"
                      onClick={() => removeItem(index)}
                      aria-label="Eliminar fila"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <Button
                type="button"
                onClick={addRow}
                className="mt-2"
              >
                + Agregar fila
              </Button>

              {errorMessages.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 space-y-1">
                  {errorMessages.map((message, index) => (
                    <p key={index}>{message}</p>
                  ))}
                </div>
              )}

              {successMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                  {successMessage}
                </div>
              )}
            </form>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setDrawerOpen(false)}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
              >
                Guardar conteos
              </Button>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
