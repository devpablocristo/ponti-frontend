import { useEffect, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import { Field } from "../../../hooks/useWorkspaceFilters";
import useLabors from "../../../hooks/useLabors";
import { LaborInfo } from "../../../hooks/useLabors/types";
import useWorkOrders from "../../../hooks/useWorkOrders";
import { ChevronDown, LoaderCircle } from "lucide-react";
import useProjects from "../../../hooks/useDatabase/projects";
import { Plot } from "../../../hooks/useDatabase/projects/types";
import { WorkorderData } from "../../../hooks/useWorkOrders/types";
import useSupplies from "../../../hooks/useSupplies";
import useCategories from "../../../hooks/useCategories";
import { units } from "../../../constants/units";
import { apiClient } from "@/api/client";
import { extractErrorMessage } from "@/api/hooks/useApiCall";

type WorkOrderItem = {
  itemId: number | null;
  totalUsed: string;
  dose: string;
};

type InvestorSplit = {
  investorId: number | null;
  percentage: string;
};

const emptyItems: WorkOrderItem[] = Array.from({ length: 7 }, () => ({
  itemId: null,
  totalUsed: "",
  dose: "",
}));

function Drawer({
  open,
  onClose,
  children,
}: {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex">
      {/* Fondo oscuro para cerrar */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
        onClick={onClose}
      />
      {/* Drawer */}
      <div className="ml-auto h-full w-full max-w-3xl bg-white shadow-xl p-6 overflow-y-auto relative animate-slide-in-right">
        <button
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
          onClick={onClose}
          aria-label="Cerrar"
        >
          <svg
            width="24"
            height="24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
        {children}
      </div>
      <style>{`
        @keyframes slide-in-right {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        .animate-slide-in-right {
          animation: slide-in-right 0.25s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>
    </div>
  );
}

export default function CreateOrder({
  drawerOpen,
  setDrawerOpen,
  orderToDuplicate,
  projectId,
  selectedField,
  onOrderCreated,
}: {
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  orderToDuplicate: WorkorderData | null;
  projectId: number | null;
  selectedField: Field | undefined;
  onOrderCreated: () => void;
}) {
  const { saveOrder, resultCreation, errorCreation, processingCreation } =
    useWorkOrders();
  const { getProject, selectedProject, processing } = useProjects();

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [field, setField] = useState<Field | null>(null);
  const [lots, setLots] = useState<Plot[]>([]);
  const { getSupplies, supplies } = useSupplies();
  const { getLabors, labors } = useLabors();
  const [lot, setLot] = useState<Plot | null>(null);
  const [labor, setLabor] = useState<LaborInfo | null>(null);
  const [contractor, setContractor] = useState("");
  const [observations, setObservations] = useState("");
  const [orderNumber, setOrderNumber] = useState("");
  const [surface, setSurface] = useState("");
  const [date, setDate] = useState("");
  const [openCreateSupply, setOpenCreateSupply] = useState(false);
  const [itemIndexToUpdate, setItemIndexToUpdate] = useState<number | null>(null);
  const [pendingCreatedSupplyName, setPendingCreatedSupplyName] = useState<string | null>(
    null
  );
  const [openSupplyDropdown, setOpenSupplyDropdown] = useState<number | null>(null);
  const [supplySearch, setSupplySearch] = useState<Record<number, string>>({});
  const [highlightedSupplyIndex, setHighlightedSupplyIndex] = useState<
    Record<number, number>
  >({});
  const supplyListRefs = useRef<Record<number, HTMLUListElement | null>>({});
  const [investor, setInvestor] = useState<{ id: number; name: string } | null>(
    null
  );
  const [splitByInvestor, setSplitByInvestor] = useState(false);
  const [investorSplits, setInvestorSplits] = useState<InvestorSplit[]>([
    { investorId: null, percentage: "100" },
  ]);
  const [processingSplit, setProcessingSplit] = useState(false);
  const [investors, setInvestors] = useState<{ id: number; name: string }[]>(
    []
  );

  const [items, setItems] = useState<WorkOrderItem[]>(() =>
    emptyItems.map((item) => ({ ...item }))
  );



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
    const [isPartialPrice, setIsPartialPrice] = useState(false);
    const [category, setCategory] = useState("");
    const [type, setType] = useState("");

    // Forzar mayúsculas en el nombre
    const normalizedName = name.trim().replace(/\s+/g, " ").toUpperCase();
    useEffect(() => {
      getCategories("");
      getTypes();
    }, []);

    useEffect(() => {
      if (!result) return;

      setSaving(false);
      setSuccess("Insumo creado correctamente");
    }, [result]);

    useEffect(() => {
      if (error) {
        setSaving(false);
      }
    }, [error]);

    return (
      <div className="space-y-4">
        {success && (
          <div className="p-3 rounded bg-green-50 text-green-700 text-sm flex items-center justify-between">
            <span>{success}</span>
            <Button size="xs" variant="primary" onClick={() => {
              setSuccess(null);
              onCreated(normalizedName);
            }}>OK</Button>
          </div>
        )}

        {!success && <>
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
              let value = e.target.value.replace(/,/g, ".");
              if (/^\d*\.?\d{0,2}$/.test(value)) {
                setPrice(value);
              }
            }}
            size="sm"
          />

          <label className="inline-flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={isPartialPrice}
              onChange={(e) => setIsPartialPrice(e.target.checked)}
            />
            Precio parcial
          </label>

          <SelectField
            label="Rubro"
            name="category"
            value={category}
            onChange={(e) => {
              const selectedCategory = categories.find(
                (c: { id: number; type_id?: number }) => c.id === Number(e.target.value)
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
            onChange={() => { }}
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
                setSuccess(null);
                saveSupplies(
                  [
                    {
                      name: normalizedName,
                      unit: Number(unit),
                      price: Number(price),
                      category: Number(category),
                      type: Number(type),
                      is_partial_price: isPartialPrice,
                    },
                  ],
                  projectId
                );
              }}
            >
              {saving ? "Guardando..." : "Guardar insumo"}
            </Button>
          </div>
        </>}
      </div>
    );
  }

  const clearForm = () => {
    setItems(emptyItems.map((item) => ({ ...item })));
    setOpenSupplyDropdown(null);
    setSupplySearch({});
    setOpenCreateSupply(false);
    setItemIndexToUpdate(null);
    setPendingCreatedSupplyName(null);
    setField(null);
    setLot(null);
    setOrderNumber("");
    setSurface("");
    setDate("");
    setInvestor(null);
    setSplitByInvestor(false);
    setInvestorSplits([{ investorId: null, percentage: "100" }]);
    setLabor(null);
    setContractor("");
    setObservations("");
    setError(null);
  };

  useEffect(() => {
    if (errorCreation) {
      setError(errorCreation);
      setSuccessMessage(null);
    }
  }, [errorCreation]);

  useEffect(() => {
    if (resultCreation) {
      setSuccessMessage(resultCreation);
      onOrderCreated();
      clearForm();
    }
  }, [resultCreation]);

  useEffect(() => {
    if (projectId) {
      getSupplies(projectId);
      getLabors(projectId);
      getProject(projectId);
    }
  }, [projectId]);

  useEffect(() => {
    if (!pendingCreatedSupplyName) return;
    if (itemIndexToUpdate === null) {
      setPendingCreatedSupplyName(null);
      return;
    }
    const createdSupply = supplies.find(
      (s) => s.name.trim().toUpperCase() === pendingCreatedSupplyName
    );
    if (!createdSupply) return;

    handleItemChange(itemIndexToUpdate, "itemId", createdSupply.id);
    setPendingCreatedSupplyName(null);
    setItemIndexToUpdate(null);
  }, [supplies, pendingCreatedSupplyName, itemIndexToUpdate]);

  useEffect(() => {
    if (openSupplyDropdown === null) return;

    const handlePointerDown = (event: MouseEvent) => {
      const row = document.querySelector(
        `[data-supply-row="${openSupplyDropdown}"]`
      );
      const target = event.target as Node;
      if (row && !row.contains(target)) {
        setOpenSupplyDropdown(null);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [openSupplyDropdown]);

  useEffect(() => {
    if (!selectedProject) return;
    setInvestors(
      selectedProject.investors
        .filter((i) => i.id !== null)
        .map((i) => ({ id: i.id!, name: i.name }))
    );

    if (!selectedField) {
      setLots([]);
      return;
    }
    const foundField = selectedProject.fields.find(
      (f) => String(f.id) === String(selectedField.id)
    );

    if (foundField) {
      setField({
        id: foundField.id,
        name: foundField.name,
        project_id: projectId || 0,
      });
      setLots(foundField.lots);
    } else {
      setLots([]);
    }
  }, [selectedProject]);

  useEffect(() => {
    if (
      orderToDuplicate &&
      investors.length > 0 &&
      labors.length > 0 &&
      selectedProject
    ) {
      setSurface(orderToDuplicate.effective_area.toString());

      const isoDate = orderToDuplicate.date;
      const formattedDate = isoDate.split("T")[0];
      setDate(formattedDate);

      const apiSplits = orderToDuplicate.investor_splits ?? [];
      if (apiSplits.length > 1) {
        setSplitByInvestor(true);
        setInvestorSplits(
          apiSplits.map((s) => ({
            investorId: s.investor_id,
            percentage: String(s.percentage),
          }))
        );
        const firstInvestor = investors.find((i) => i.id === apiSplits[0].investor_id);
        setInvestor(firstInvestor || null);
      } else {
        const investorObj = investors.find((i) => i.id === orderToDuplicate.investor_id);
        setInvestor(investorObj || null);
        setSplitByInvestor(false);
        setInvestorSplits([{ investorId: orderToDuplicate.investor_id, percentage: "100" }]);
      }

      const laborObj = labors.find((l) => l.id === orderToDuplicate.labor_id);
      setLabor(laborObj || null);

      if (orderToDuplicate.field_id) {
        const foundField = selectedProject.fields.find(
          (f) => String(f.id) === String(orderToDuplicate.field_id)
        );
        if (foundField) {
          setField({
            id: foundField.id,
            name: foundField.name,
            project_id: projectId || 0,
          });
          setLots(foundField.lots);
        }
      }

      setContractor(orderToDuplicate.contractor);
      setObservations(orderToDuplicate.observations);

      let loadedItems: WorkOrderItem[] = orderToDuplicate.items.map((item) => ({
        itemId: item.supply_id,
        totalUsed: item.total_used.toString(),
        dose: item.final_dose.toString(),
      }));

      while (loadedItems.length < 7) {
        loadedItems.push({ itemId: null, totalUsed: "", dose: "" });
      }

      setItems(loadedItems);
    }
  }, [orderToDuplicate, investors, labors, lots]);

  const getValidInvestorSplits = () => {
    const validSplits = investorSplits
      .filter((s) => s.investorId !== null && s.percentage !== "")
      .map((s) => ({
        investorId: s.investorId as number,
        percentage: Number(s.percentage),
      }))
      .filter((s) => Number.isFinite(s.percentage) && s.percentage > 0);

    if (validSplits.length === 0) {
      return { error: "Debe ingresar al menos un inversor con porcentaje.", splits: [] as { investorId: number; percentage: number }[] };
    }

    const unique = new Set(validSplits.map((s) => s.investorId));
    if (unique.size !== validSplits.length) {
      return { error: "No se puede repetir el mismo inversor en la división.", splits: [] as { investorId: number; percentage: number }[] };
    }

    const totalPct = validSplits.reduce((acc, s) => acc + s.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.001) {
      return { error: "La suma de porcentajes debe ser 100%.", splits: [] as { investorId: number; percentage: number }[] };
    }

    return { error: null, splits: validSplits };
  };

  useEffect(() => {
    if (orderToDuplicate === null) {
      setSuccessMessage(null);
      clearForm();
    }
  }, [drawerOpen, orderToDuplicate]);

  useEffect(() => {
    if (surface && surface !== "" && surface !== "0") {
      items.forEach((item, i) => {
        if (item.totalUsed && item.totalUsed !== "") {
          handleItemChange(
            i,
            "dose",
            (Number(item.totalUsed) / Number(surface)).toFixed(3).replace(/\.?0+$/, "")
          );
        }
      });
    }
  }, [surface]);

  const handleItemChange = <K extends keyof WorkOrderItem>(
    i: number,
    field: K,
    value: WorkOrderItem[K]
  ) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );
  };

  const scrollHighlightedSupplyIntoView = (rowIndex: number, optionIndex: number) => {
    requestAnimationFrame(() => {
      const list = supplyListRefs.current[rowIndex];
      if (!list) return;
      const option = list.querySelector<HTMLLIElement>(
        `[data-supply-option-index="${optionIndex}"]`
      );
      option?.scrollIntoView({ block: "nearest" });
    });
  };

  const handleSaveOrder = () => {
    setError(null);
    setSuccessMessage(null);
    if (
      !projectId ||
      !field ||
      !lot ||
      !labor ||
      !contractor ||
      (!splitByInvestor && !investor) ||
      !surface ||
      !orderNumber ||
      !date ||
      processing
    ) {
      setError("Campos obligatorios incompletos");
      return;
    }

    const itemsWithAnyValue = items.filter(
      (item) => item.itemId !== null || item.totalUsed || item.dose
    );

    const hasPartial = itemsWithAnyValue.some(
      (item) => item.itemId === null || !item.totalUsed || !item.dose
    );

    if (hasPartial) {
      setError("No se completaron todos los campos de los items cargados");
      return;
    }

    const completedItems = itemsWithAnyValue.filter(
      (item): item is WorkOrderItem & { itemId: number } => item.itemId !== null
    );
    const baseItems = completedItems.map((item) => ({
      supply_id: item.itemId,
      total_used: Number(item.totalUsed),
      final_dose: Number(item.dose),
    }));

    const baseOrder = {
      number: orderNumber,
      date,
      project_id: projectId,
      field_id: field.id,
      lot_id: lot.id,
      crop_id: lot.current_crop_id,
      labor_id: labor.id,
      contractor,
      effective_area: Number(surface),
      items: baseItems,
      observations,
    };

    if (!splitByInvestor) {
      saveOrder({
        ...baseOrder,
        investor_id: investor!.id,
      });
      return;
    }

    const { error: splitError, splits } = getValidInvestorSplits();
    if (splitError) {
      setError(splitError);
      return;
    }

    if (splits.length === 1) {
      saveOrder({
        ...baseOrder,
        investor_id: splits[0].investorId,
      });
      return;
    }

    (async () => {
      try {
        setProcessingSplit(true);
        // Importante: NO duplicar órdenes. Persistimos 1 workorder y guardamos la división
        // como metadata (investor_splits) para repartir el "aporte" en reportes/cálculos.
        await apiClient.post("/work-orders", {
          ...baseOrder,
          investor_id: splits[0].investorId,
          investor_splits: splits.map((s) => ({
            investor_id: s.investorId,
            percentage: s.percentage,
          })),
        });

        setSuccessMessage("Se creó la orden con división por inversor.");
        onOrderCreated();
        clearForm();
      } catch (err) {
        setError(extractErrorMessage(err, "Error al crear la orden con división por inversor."));
      } finally {
        setProcessingSplit(false);
      }
    })();
  };

  return (
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-2">
          Nueva Orden de Trabajo:{" "}
          <span className="text-gray-700">{selectedProject?.name}</span>
        </h2>
        {processing || processingCreation || processingSplit ? (
          <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : (
          <>
            <form className="space-y-4 flex-1">
              <div className="grid grid-cols-4 gap-4">
                <InputField
                  label="Nro. Orden"
                  placeholder="000-001"
                  name="order"
                  type="text"
                  value={orderNumber || ""}
                  onChange={(e) => setOrderNumber(e.target.value)}
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
              </div>

              <div className="grid grid-cols-3 gap-4">
                <SelectField
                  label="Campo"
                  name="field"
                  options={
                    selectedProject
                      ? selectedProject.fields.map((field) => ({
                        id: field.id,
                        name: field.name,
                      }))
                      : []
                  }
                  value={field?.id?.toString() || ""}
                  onChange={(e) => {
                    const selectedField = selectedProject?.fields.find(
                      (f) => f.id === Number(e.target.value)
                    );
                    if (selectedField) {
                      setField({
                        id: selectedField.id,
                        name: selectedField.name,
                        project_id: projectId || 0,
                      });
                      setLots(selectedField.lots);
                    }
                  }}
                  disabled={!projectId || processing}
                  size="sm"
                />
                <SelectField
                  label="Lote"
                  name="lot"
                  options={lots.map((lot) => ({
                    id: lot.id,
                    name: lot.name,
                  }))}
                  value={lot?.id?.toString() || ""}
                  onChange={(e) => {
                    const selectedLot = lots.find(
                      (l) => l.id === Number(e.target.value)
                    );
                    if (selectedLot) {
                      setLot(selectedLot);
                    }
                  }}
                  disabled={!projectId || !field || processing}
                  size="sm"
                />

                <div>
                  <InputField
                    label="Cultivo Actual"
                    placeholder="Selecciona el lote"
                    name="crop"
                    type="text"
                    value={lot?.current_crop_name || ""}
                    onChange={() => { }}
                    disabled
                    size="sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <SelectField
                    label="Labor"
                    placeholder="Selecciona el labor"
                    name="labor"
                    options={labors}
                    value={labor?.id?.toString() || ""}
                    onChange={(e) => {
                      const selectedLabor = labors.find(
                        (l) => l.id === Number(e.target.value)
                      );
                      if (selectedLabor) {
                        setLabor(selectedLabor);
                        setContractor(selectedLabor.contractor_name);
                      }
                    }}
                    size="sm"
                  />
                </div>
                <div>
                  <InputField
                    label="Superficie realizada"
                    placeholder="Ingresar superficie"
                    name="surface"
                    type="text"
                    value={surface}
                    onChange={(e) => {
                      let value = e.target.value.replace(/,/g, ".");
                      if (/^\d*\.?\d{0,2}$/.test(value)) {
                        setSurface(value);
                      }
                    }}
                    size="sm"
                  />
                </div>
                <InputField
                  label="Contratista"
                  placeholder="Selecciona el labor"
                  name="contractor"
                  type="text"
                  value={contractor}
                  disabled
                  onChange={() => { }}
                  size="sm"
                />
              </div>

              <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700">Inversor del labor</span>
                  <label className="inline-flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      checked={splitByInvestor}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setSplitByInvestor(checked);
                        if (!checked && investorSplits[0]?.investorId) {
                          const selectedInvestor = investors.find(
                            (i) => i.id === investorSplits[0].investorId
                          );
                          setInvestor(selectedInvestor || null);
                        }
                      }}
                    />
                    Dividir aporte
                  </label>
                </div>
                {!splitByInvestor ? (
                  <div className="max-w-sm">
                    <SelectField
                      label=""
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
                ) : (
                  <div className="space-y-3">
                    {investorSplits.map((split, idx) => (
                      <div key={idx} className="grid grid-cols-[1fr_120px_auto] gap-3 items-center">
                        <SelectField
                          label=""
                          name={`split-investor-${idx}`}
                          options={investors}
                          value={split.investorId?.toString() || ""}
                          onChange={(e) => {
                            const value = e.target.value ? Number(e.target.value) : null;
                            setInvestorSplits((prev) =>
                              prev.map((row, i) =>
                                i === idx ? { ...row, investorId: value } : row
                              )
                            );
                          }}
                          size="sm"
                        />
                        <InputField
                          label=""
                          name={`split-pct-${idx}`}
                          type="text"
                          value={split.percentage}
                          onChange={(e) => {
                            const value = e.target.value.replace(",", ".");
                            if (/^\d*\.?\d{0,2}$/.test(value)) {
                              setInvestorSplits((prev) =>
                                prev.map((row, i) =>
                                  i === idx ? { ...row, percentage: value } : row
                                )
                              );
                            }
                          }}
                          placeholder="%"
                          size="sm"
                        />
                        <Button
                          variant="primary"
                          size="xs"
                          onClick={() => {
                            setInvestorSplits((prev) =>
                              prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx)
                            );
                          }}
                        >
                          Quitar
                        </Button>
                      </div>
                    ))}
                    <div className="flex justify-between items-center pt-1">
                      <Button
                        variant="primary"
                        size="xs"
                        onClick={() =>
                          setInvestorSplits((prev) => [
                            ...prev,
                            { investorId: null, percentage: "" },
                          ])
                        }
                      >
                        + Inversor
                      </Button>
                      {(() => {
                        const total = investorSplits.reduce(
                          (acc, s) => acc + (Number(s.percentage) || 0),
                          0
                        );
                        return (
                          <span className={`text-sm font-medium ${total === 100 ? "text-green-600" : "text-red-600"}`}>
                            Total: {total}%
                            {total !== 100 && <span className="ml-1 text-xs">(debe ser 100%)</span>}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>

              {/* Tabla de insumos */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-900">
                    Carga de insumos
                  </span>
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => {
                      setItemIndexToUpdate(null);
                      setOpenCreateSupply(true);
                    }}
                    className="max-w-fit"
                  >
                    + Crear Nuevo Insumo
                  </Button>
                </div>
                <div className="hidden sm:grid grid-cols-[1.5fr_1fr_1fr_0.5fr] gap-4 mb-2">
                  <span className="font-sm text-gray-900">Insumo</span>
                  <span className="font-sm text-gray-900">Total utilizado</span>
                  <span className="font-sm text-gray-900">Dosis final</span>
                  <div></div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[1.5fr_1fr_1fr_0.5fr] gap-4">
                  {items.map((item, i) => {
                    const filteredSupplies = supplies.filter(
                      (s) =>
                        !supplySearch[i] ||
                        s.name.toLowerCase().includes(supplySearch[i].toLowerCase())
                    );
                    const highlightedIndex = highlightedSupplyIndex[i] ?? 0;

                    return (
                    <div
                      key={i}
                      className="sm:contents border sm:border-0 p-4 sm:p-0 rounded-md sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none"
                    >
                      <div className="sm:col-span-1 relative" data-supply-row={i}>
                        <div
                          role="button"
                          tabIndex={0}
                          aria-haspopup="listbox"
                          aria-expanded={openSupplyDropdown === i}
                          className="input-base cursor-pointer text-sm py-2 px-3.5 flex items-center justify-between"
                          onClick={() => {
                            const nextOpen = openSupplyDropdown === i ? null : i;
                            setOpenSupplyDropdown(nextOpen);
                            if (nextOpen !== null) {
                              setHighlightedSupplyIndex((prev) => ({ ...prev, [i]: 0 }));
                            }
                          }}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              const nextOpen = openSupplyDropdown === i ? null : i;
                              setOpenSupplyDropdown(nextOpen);
                              if (nextOpen !== null) {
                                setHighlightedSupplyIndex((prev) => ({ ...prev, [i]: 0 }));
                              }
                            }
                            if (e.key === "Escape" && openSupplyDropdown === i) {
                              e.preventDefault();
                              setOpenSupplyDropdown(null);
                            }
                          }}
                        >
                          {item.itemId ? (
                            <span className="truncate font-semibold text-gray-900">
                              {supplies.find((s) => s.id === Number(item.itemId))?.name ||
                                "Seleccionar..."}
                            </span>
                          ) : (
                            <span className="text-gray-400">Seleccionar...</span>
                          )}
                          <ChevronDown size={16} className="text-slate-400 shrink-0" />
                        </div>
                        {openSupplyDropdown === i && (
                          <div className="absolute top-full left-0 w-full bg-white border rounded-lg shadow-lg z-20 mt-1">
                            <input
                              type="text"
                              placeholder="Buscar insumo..."
                              className="w-full px-3 py-2 text-sm border-b outline-none"
                              value={supplySearch[i] || ""}
                              onChange={(e) => {
                                setSupplySearch((prev) => ({
                                  ...prev,
                                  [i]: e.target.value,
                                }));
                                setHighlightedSupplyIndex((prev) => ({ ...prev, [i]: 0 }));
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "ArrowDown") {
                                  e.preventDefault();
                                  if (filteredSupplies.length === 0) return;
                                  const nextIndex =
                                    highlightedIndex < filteredSupplies.length - 1
                                      ? highlightedIndex + 1
                                      : 0;
                                  setHighlightedSupplyIndex((prev) => ({ ...prev, [i]: nextIndex }));
                                  scrollHighlightedSupplyIntoView(i, nextIndex);
                                  return;
                                }
                                if (e.key === "ArrowUp") {
                                  e.preventDefault();
                                  if (filteredSupplies.length === 0) return;
                                  const nextIndex =
                                    highlightedIndex > 0
                                      ? highlightedIndex - 1
                                      : filteredSupplies.length - 1;
                                  setHighlightedSupplyIndex((prev) => ({ ...prev, [i]: nextIndex }));
                                  scrollHighlightedSupplyIntoView(i, nextIndex);
                                  return;
                                }
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  const selected = filteredSupplies[highlightedIndex];
                                  if (!selected) return;
                                  handleItemChange(i, "itemId", selected.id);
                                  handleItemChange(i, "dose", "");
                                  handleItemChange(i, "totalUsed", "");
                                  setOpenSupplyDropdown(null);
                                  setSupplySearch((prev) => ({ ...prev, [i]: "" }));
                                  return;
                                }
                                if (e.key === "Escape") {
                                  e.preventDefault();
                                  setOpenSupplyDropdown(null);
                                  return;
                                }
                                if (e.key === "Tab") {
                                  setOpenSupplyDropdown(null);
                                }
                              }}
                              autoFocus
                            />
                            <ul
                              className="max-h-[200px] overflow-y-auto"
                              ref={(el) => {
                                supplyListRefs.current[i] = el;
                              }}
                            >
                              <li
                                className="px-3 py-2 cursor-pointer hover:bg-gray-100 text-blue-600 font-semibold border-b"
                                onMouseDown={(e) => {
                                  e.preventDefault();
                                  handleItemChange(i, "itemId", null);
                                  setItemIndexToUpdate(i);
                                  setOpenCreateSupply(true);
                                  setOpenSupplyDropdown(null);
                                  setSupplySearch((prev) => ({ ...prev, [i]: "" }));
                                }}
                              >
                                + Crear nuevo insumo
                              </li>
                              {filteredSupplies.map((s, supplyIdx) => (
                                  <li
                                    key={s.id}
                                    data-supply-option-index={supplyIdx}
                                    className={`px-3 py-2 cursor-pointer font-semibold text-gray-900 ${
                                      highlightedIndex === supplyIdx
                                        ? "bg-gray-100"
                                        : "hover:bg-gray-100"
                                    }`}
                                    onMouseEnter={() =>
                                      setHighlightedSupplyIndex((prev) => ({
                                        ...prev,
                                        [i]: supplyIdx,
                                      }))
                                    }
                                    onMouseDown={(e) => {
                                      e.preventDefault();
                                      handleItemChange(i, "itemId", s.id);
                                      handleItemChange(i, "dose", "");
                                      handleItemChange(i, "totalUsed", "");
                                      setOpenSupplyDropdown(null);
                                      setSupplySearch((prev) => ({ ...prev, [i]: "" }));
                                    }}
                                  >
                                    {s.name}
                                  </li>
                                ))}
                              {filteredSupplies.length === 0 && (
                                <li className="px-3 py-2 text-sm text-gray-400">
                                  Sin resultados
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                      <div className="sm:col-span-1">
                        <InputField
                          label=""
                          placeholder="Lt/Kg/Bolsas"
                          name={`totalUsed${i}`}
                          type="text"
                          value={item.totalUsed}
                          onChange={(e) => {
                            let value = e.target.value.replace(/,/g, ".");
                            if (/^\d*\.?\d{0,3}$/.test(value)) {
                              handleItemChange(i, "totalUsed", value);
                              if (
                                surface &&
                                surface !== "" &&
                                surface !== "0"
                              ) {
                                handleItemChange(
                                  i,
                                  "dose",
                                  (Number(value) / Number(surface)).toFixed(3).replace(/\.?0+$/, "")
                                );
                              }
                            }
                          }}
                          size="sm"
                        />
                      </div>
                      <div className="sm:col-span-1">
                        <InputField
                          label=""
                          placeholder="Total/superficie"
                          name={`dose${i}`}
                          type="text"
                          value={item.dose}
                          onChange={(e) => {
                            let value = e.target.value.replace(/,/g, ".");
                            if (/^\d*\.?\d{0,3}$/.test(value)) {
                              handleItemChange(i, "dose", value);
                              if (
                                surface &&
                                surface !== "" &&
                                surface !== "0"
                              ) {
                                handleItemChange(
                                  i,
                                  "totalUsed",
                                  (Number(value) * Number(surface)).toFixed(3).replace(/\.?0+$/, "")
                                );
                              }
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
                          Eliminar
                        </Button>
                      </div>
                    </div>
                    );
                  })}
                  <Button
                    variant="primary"
                    size="xs"
                    onClick={() => {
                      setItems([
                        ...items,
                        { itemId: null, totalUsed: "", dose: "" },
                      ]);
                    }}
                    className="text-blue-500 hover:underline max-w-fit"
                  >
                    + Agregar fila de insumo
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Observaciones
                </label>
                <textarea
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 min-h-[80px]"
                  placeholder="Escriba observaciones"
                  name="observaciones"
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                />
              </div>
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
                  onClick={handleSaveOrder}
                  variant="primary"
                  className="text-base font-medium"
                  disabled={processing || processingCreation || (splitByInvestor && investorSplits.reduce((acc, s) => acc + (Number(s.percentage) || 0), 0) !== 100)}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ============================
      DRAWER CREAR INSUMO
  ============================ */}
      <Drawer
        open={openCreateSupply}
        onClose={() => {
          setOpenCreateSupply(false);
          setItemIndexToUpdate(null);
          setPendingCreatedSupplyName(null);
        }}
      >
        <div className="flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-4">
            Crear Nuevo Insumo
          </h2>
          {/* FORMULARIO SIMPLE DE INSUMO */}
          <CreateSupplyInline
            projectId={projectId}
            onCreated={async (createdName) => {
              setPendingCreatedSupplyName(createdName);
              if (projectId) {
                await getSupplies(projectId);
              }

              setOpenCreateSupply(false);
            }}
            onCancel={() => {
              setOpenCreateSupply(false);
              setItemIndexToUpdate(null);
              setPendingCreatedSupplyName(null);
            }}
          />
        </div>
      </Drawer>
    </Drawer>

  );
}
