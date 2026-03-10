import { useCallback, useEffect, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
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
import Drawer from "../../../components/Drawer/Drawer";

const emptyItems = Array.from({ length: 7 }, () => ({
  item: "",
  totalUsed: "",
  dose: "",
}));

type InvestorSplit = {
  investorId: number | null;
  percentage: string;
};

export default function UpdateOrder({
  orderId,
  drawerOpen,
  setDrawerOpen,
  onOrderUpdated,
  onOrderDuplicated,
}: {
  orderId: number;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onOrderUpdated: () => void;
  onOrderDuplicated: (order: WorkorderData) => void;
}) {
  const {
    updateOrder,
    getWorkorder,
    selectedOrder,
    resultCreation,
    errorCreation,
    processingCreation,
  } = useWorkOrders();

  const { getProject, selectedProject, processing } = useProjects();

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const { getSupplies, supplies } = useSupplies();
  const { getLabors, labors } = useLabors();
  const [lots, setLots] = useState<Plot[]>([]);
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
  const typeaheadBufferByRowRef = useRef<Record<number, string>>({});
  const lastTypeaheadAtByRowRef = useRef<Record<number, number>>({});
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

  const [items, setItems] = useState<
    {
      item: string;
      totalUsed: string;
      dose: string;
    }[]
  >(emptyItems);
  const [preciseDoseByRow, setPreciseDoseByRow] = useState<Record<number, number>>(
    {}
  );
  const latestItemsRef = useRef(items);
  const latestFormatDoseRef = useRef<(value: number) => string>(() => "");

  useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

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
      if (error) {
        setSaving(false);
      }
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
                  if (
                    !projectId ||
                    !name ||
                    !unit ||
                    !price ||
                    !category ||
                    !type
                  ) {
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
          </>
        )}
      </div>
    );
  }

  const handleItemChange = useCallback((i: number, field: string, value: string) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item))
    );
  }, []);

  useEffect(() => {
    if (orderId) {
      getWorkorder(orderId);
    }
  }, [orderId, getWorkorder]);

  useEffect(() => {
    if (selectedOrder) {
      getProject(selectedOrder.project_id);
      getSupplies(selectedOrder.project_id);
      getLabors(selectedOrder.project_id);
    }
  }, [selectedOrder, getProject, getSupplies, getLabors]);

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

    handleItemChange(itemIndexToUpdate, "item", String(createdSupply.id));
    setPendingCreatedSupplyName(null);
    setItemIndexToUpdate(null);
  }, [supplies, pendingCreatedSupplyName, itemIndexToUpdate, handleItemChange]);

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
    if (!selectedProject || !selectedOrder) return;
    setInvestors(
      selectedProject.investors
        .filter((i) => i.id !== null)
        .map((i) => ({ id: i.id!, name: i.name }))
    );

    const foundField = selectedProject.fields.find(
      (f) => String(f.id) === String(selectedOrder.field_id)
    );

    if (foundField?.lots) {
      setLots(foundField.lots);
    } else {
      setLots([]);
    }
  }, [selectedProject, selectedOrder]);

  useEffect(() => {
    if (
      selectedOrder &&
      investors.length > 0 &&
      labors.length > 0 &&
      lots.length > 0
    ) {
      setOrderNumber(selectedOrder.number);
      setSurface(selectedOrder.effective_area.toString());

      const isoDate = selectedOrder.date; // "2025-08-06T00:00:00Z"
      const formattedDate = isoDate.split("T")[0]; // "2025-08-06"
      setDate(formattedDate);

      const apiSplits = selectedOrder.investor_splits ?? [];
      if (apiSplits.length > 1) {
        setSplitByInvestor(true);
        setInvestorSplits(
          apiSplits.map((s) => ({
            investorId: s.investor_id,
            percentage: String(s.percentage),
          }))
        );
        // Dejar el dropdown simple sincronizado con el primer split.
        const firstInvestor = investors.find((i) => i.id === apiSplits[0].investor_id);
        setInvestor(firstInvestor || null);
      } else {
        const investorObj = investors.find((i) => i.id === selectedOrder.investor_id);
        setInvestor(investorObj || null);
        setSplitByInvestor(false);
        setInvestorSplits([{ investorId: selectedOrder.investor_id, percentage: "100" }]);
      }

      const laborObj = labors.find((l) => l.id === selectedOrder.labor_id);
      setLabor(laborObj || null);

      const lotObj = lots.find((l) => l.id === selectedOrder.lot_id);
      setLot(lotObj || null);

      setContractor(selectedOrder.contractor);
      setObservations(selectedOrder.observations);

      const loadedItems = selectedOrder.items.map((item) => ({
        item: item.supply_id.toString(),
        totalUsed: item.total_used.toString(),
        dose: item.final_dose.toString(),
      }));

      while (loadedItems.length < 7) {
        loadedItems.push({ item: "", totalUsed: "", dose: "" });
      }

      setItems(loadedItems);
      setPreciseDoseByRow({});
    }
  }, [selectedOrder, investors, labors, lots]);

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
    if (errorCreation) {
      setError(errorCreation);
      setSuccessMessage(null);
    }
  }, [errorCreation]);

  useEffect(() => {
    if (resultCreation) {
      setSuccessMessage(resultCreation);
      onOrderUpdated();
    }
  }, [resultCreation, onOrderUpdated]);

  useEffect(() => {
    setSuccessMessage(null);
  }, [drawerOpen]);

  useEffect(() => {
    if (surface && surface !== "" && surface !== "0") {
      latestItemsRef.current.forEach((item, i) => {
        if (item.totalUsed && item.totalUsed !== "") {
          const preciseDose = Number(item.totalUsed) / Number(surface);
          setPreciseDoseByRow((prev) => ({ ...prev, [i]: preciseDose }));
          handleItemChange(
            i,
            "dose",
            latestFormatDoseRef.current(preciseDose)
          );
        }
      });
    }
  }, [surface, handleItemChange]);

  const roundTo = useCallback((value: number, decimals: number) => {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }, []);

  const formatDose = useCallback(
    (value: number) => roundTo(value, 3).toFixed(3).replace(/\.?0+$/, ""),
    [roundTo]
  );

  useEffect(() => {
    latestFormatDoseRef.current = formatDose;
  }, [formatDose]);

  
  const formatTotalUsedFromDose = (value: number) => roundTo(value, 0).toFixed(2);

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

  const handleSupplyTypeahead = (
    rowIndex: number,
    typedKey: string,
    selectedSupplyId: number | null
  ) => {
    const safeSupplies = Array.isArray(supplies) ? supplies : [];
    if (safeSupplies.length === 0) return;

    const now = Date.now();
    const lowerKey = typedKey.toLowerCase();
    const previousBuffer = typeaheadBufferByRowRef.current[rowIndex] || "";
    const lastTypedAt = lastTypeaheadAtByRowRef.current[rowIndex] || 0;
    const withinWindow = now - lastTypedAt <= 700;

    const findByPrefix = (prefix: string, startIndex = 0) => {
      if (!prefix) return null;
      const normalizedPrefix = prefix.toLowerCase();
      const ordered = [
        ...safeSupplies.slice(startIndex),
        ...safeSupplies.slice(0, startIndex),
      ];
      return (
        ordered.find((s) => s.name.toLowerCase().startsWith(normalizedPrefix)) ||
        null
      );
    };

    const shouldCycleSameLetter =
      withinWindow && previousBuffer.length === 1 && previousBuffer === lowerKey;

    let matchedSupply = null;

    if (shouldCycleSameLetter) {
      const currentIndex = selectedSupplyId
        ? safeSupplies.findIndex((s) => s.id === selectedSupplyId)
        : -1;
      matchedSupply = findByPrefix(lowerKey, currentIndex + 1);
      typeaheadBufferByRowRef.current[rowIndex] = lowerKey;
    } else {
      const nextBuffer = withinWindow
        ? `${previousBuffer}${lowerKey}`
        : lowerKey;

      matchedSupply = findByPrefix(nextBuffer);

      if (!matchedSupply && nextBuffer.length > 1) {
        matchedSupply = findByPrefix(lowerKey);
        typeaheadBufferByRowRef.current[rowIndex] = lowerKey;
      } else {
        typeaheadBufferByRowRef.current[rowIndex] = nextBuffer;
      }
    }

    lastTypeaheadAtByRowRef.current[rowIndex] = now;

    if (!matchedSupply) return;

    handleItemChange(rowIndex, "item", String(matchedSupply.id));
    handleItemChange(rowIndex, "dose", "");
    handleItemChange(rowIndex, "totalUsed", "");
    setSupplySearch((prev) => ({ ...prev, [rowIndex]: "" }));
  };

  const handleSaveOrder = () => {
    setError(null);
    setSuccessMessage(null);
    if (
      !selectedOrder ||
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
      (item) => item.item || item.totalUsed || item.dose
    );

    if (itemsWithAnyValue.length > 0) {
      const hasPartial = itemsWithAnyValue.some(
        (item) => !item.item || !item.totalUsed || !item.dose
      );

      if (hasPartial) {
        setError("No se completaron todos los campos de los items cargados");
        return;
      }
    }

    const baseOrder = {
      number: orderNumber,
      date,
      project_id: selectedOrder.project_id,
      field_id: selectedOrder.field_id,
      lot_id: lot.id,
      crop_id: lot.current_crop_id,
      labor_id: labor.id,
      contractor,
      effective_area: Number(surface),
      items: itemsWithAnyValue.map((item) => ({
        supply_id: Number(item.item),
        total_used: Number(item.totalUsed),
        final_dose: Number(item.dose),
      })),
      observations,
    };

    if (!splitByInvestor) {
      updateOrder(orderId, {
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
      updateOrder(orderId, {
        ...baseOrder,
        investor_id: splits[0].investorId,
      });
      return;
    }

    (async () => {
      try {
        setProcessingSplit(true);
        // Importante: NO duplicar órdenes. Persistimos 1 workorder y actualizamos
        // la división como investor_splits.
        await apiClient.put(`/work-orders/${orderId}`, {
          ...baseOrder,
          investor_id: splits[0].investorId,
          investor_splits: splits.map((s) => ({
            investor_id: s.investorId,
            percentage: s.percentage,
          })),
        });

        setSuccessMessage("Orden actualizada con división por inversor.");
        onOrderUpdated();
      } catch (err) {
        setError(extractErrorMessage(err, "Error al dividir la orden por inversor."));
      } finally {
        setProcessingSplit(false);
      }
    })();
  };

  return (
    <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
      <div className="flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-2">
          Edición de Orden de Trabajo:{" "}
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
                <InputField
                  label="Campo"
                  name="field"
                  type="text"
                  value={
                    selectedProject?.fields.find(
                      (f) => f.id === selectedOrder?.field_id
                    )?.name || ""
                  }
                  onChange={() => {}}
                  disabled
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
                  disabled={!selectedOrder || processing}
                  size="sm"
                />

                <div>
                  <InputField
                    label="Cultivo Actual"
                    placeholder="Selecciona el lote"
                    name="crop"
                    type="text"
                    value={lot?.current_crop_name || ""}
                    onChange={() => {}}
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
                      const value = e.target.value.replace(/,/g, ".");
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
                  onChange={() => {}}
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
                            if (
                              openSupplyDropdown !== i &&
                              e.key.length === 1 &&
                              !e.altKey &&
                              !e.ctrlKey &&
                              !e.metaKey
                            ) {
                              e.preventDefault();
                              handleSupplyTypeahead(
                                i,
                                e.key,
                                item.item ? Number(item.item) : null
                              );
                            }
                          }}
                        >
                          {item.item ? (
                            <span className="truncate font-semibold text-gray-900">
                              {supplies.find((s) => s.id === Number(item.item))?.name ||
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
                                  handleItemChange(i, "item", String(selected.id));
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
                                  handleItemChange(i, "item", "");
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
                                      handleItemChange(i, "item", String(s.id));
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
                            const value = e.target.value.replace(/,/g, ".");
                            if (/^\d*\.?\d{0,3}$/.test(value)) {
                              handleItemChange(i, "totalUsed", value);
                              if (
                                surface &&
                                surface !== "" &&
                                surface !== "0"
                              ) {
                                const preciseDose = Number(value) / Number(surface);
                                setPreciseDoseByRow((prev) => ({
                                  ...prev,
                                  [i]: preciseDose,
                                }));
                                handleItemChange(
                                  i,
                                  "dose",
                                  formatDose(preciseDose)
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
                            const value = e.target.value.replace(/,/g, ".");
                            if (/^\d*\.?\d{0,3}$/.test(value)) {
                              handleItemChange(i, "dose", value);
                              if (
                                surface &&
                                surface !== "" &&
                                surface !== "0"
                              ) {
                                const preciseDose = preciseDoseByRow[i];
                                const doseForCalc =
                                  typeof preciseDose === "number" &&
                                  formatDose(preciseDose) === value
                                    ? preciseDose
                                    : Number(value);
                                handleItemChange(
                                  i,
                                  "totalUsed",
                                  formatTotalUsedFromDose(
                                    doseForCalc * Number(surface)
                                  )
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
                        { item: "", totalUsed: "", dose: "" },
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
            <div className="flex justify-between gap-2 mt-auto pt-6 pb-2 bg-white">
              {selectedOrder && (
                <Button
                  onClick={() => onOrderDuplicated(selectedOrder)}
                  variant="primary"
                  className="text-base font-medium"
                >
                  Duplicar orden
                </Button>
              )}
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

      <Drawer
        open={openCreateSupply}
        onClose={() => {
          setOpenCreateSupply(false);
          setItemIndexToUpdate(null);
          setPendingCreatedSupplyName(null);
        }}
      >
        <div className="flex flex-col h-full">
          <h2 className="text-lg font-semibold mb-4">Crear Nuevo Insumo</h2>
          <CreateSupplyInline
            projectId={selectedOrder?.project_id || null}
            onCreated={async (createdName) => {
              setPendingCreatedSupplyName(createdName);
              if (selectedOrder?.project_id) {
                await getSupplies(selectedOrder.project_id);
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
