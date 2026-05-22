import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Button from "../../../components/Button/Button";
import InputField from "../../../components/Input/InputField";
import SelectField from "../../../components/Input/SelectField";
import { Checkbox } from "../../../components/Input/Checkbox";
import useLabors from "../../../hooks/useLabors";
import { LaborInfo } from "../../../hooks/useLabors/types";
import useWorkOrders from "../../../hooks/useWorkOrders";
import { Plus, Trash2 } from "lucide-react";
import useProjects from "../../../hooks/useDatabase/projects";
import { Plot } from "../../../hooks/useDatabase/projects/types";
import { WorkorderData } from "../../../hooks/useWorkOrders/types";
import useSupplies from "../../../hooks/useSupplies";
import useStock from "../../../hooks/useStock";
import { getUnitName } from "../../../constants/units";
import { apiClient } from "@/api/client";
import { formatError } from "@/lib/format";
import { notify } from "@/lib/notify";
import { DrawerShell } from "../../../components/Drawer/DrawerShell";
import { EntityFormDrawer } from "../../../components/crud/EntityFormDrawer";
import SupplyItemsTable from "../../../components/crud/SupplyItemsTable";
import CreateSupplyInline from "../../../components/crud/CreateSupplyInline";

import type { InvestorSplit } from "./orderTypes";

const emptyItems = Array.from({ length: 7 }, () => ({
  item: "",
  totalUsed: "",
  dose: "",
}));

export default function UpdateOrder({
  orderId,
  isDigital,
  drawerOpen,
  setDrawerOpen,
  onOrderUpdated,
  onOrderDuplicated,
}: {
  orderId: number;
  isDigital: boolean;
  drawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
  onOrderUpdated: () => void;
  onOrderDuplicated: (order: WorkorderData) => void;
}) {
  const {
    updateOrder,
    updateDraftOrder,
    getWorkorder,
    getDraftWorkorder,
    selectedOrder,
    resultCreation,
    errorCreation,
    processingCreation,
  } = useWorkOrders();

  const { getProject, selectedProject, processing } = useProjects();

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado → toast: ver patrón documentado en CreateOrder.tsx.
  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  useEffect(() => {
    if (successMessage) notify.success(successMessage);
  }, [successMessage]);
  const { getSupplies, supplies } = useSupplies();
  const { getStock, stock } = useStock();
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
  const [pendingCreatedSupplyName, setPendingCreatedSupplyName] = useState<string | null>(null);
  const [investor, setInvestor] = useState<{ id: number; name: string } | null>(null);
  const [splitByInvestor, setSplitByInvestor] = useState(false);
  const [investorSplits, setInvestorSplits] = useState<InvestorSplit[]>([
    { investorId: null, percentage: "100" },
  ]);
  const [processingSplit, setProcessingSplit] = useState(false);
  const [investors, setInvestors] = useState<{ id: number; name: string }[]>([]);

  const [items, setItems] = useState<
    {
      item: string;
      totalUsed: string;
      dose: string;
    }[]
  >(emptyItems);
  const [preciseDoseByRow, setPreciseDoseByRow] = useState<Record<number, number>>({});
  const latestItemsRef = useRef(items);
  const latestFormatDoseRef = useRef<(value: number) => string>(() => "");

  useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

  const handleItemChange = useCallback((i: number, field: string, value: string) => {
    setItems((prev) => prev.map((item, idx) => (idx === i ? { ...item, [field]: value } : item)));
  }, []);

  useEffect(() => {
    if (!orderId) return;

    if (isDigital) {
      getDraftWorkorder(orderId);
      return;
    }

    getWorkorder(orderId);
  }, [orderId, isDigital, getDraftWorkorder, getWorkorder]);

  useEffect(() => {
    if (selectedOrder) {
      getProject(selectedOrder.project_id);
      getSupplies(selectedOrder.project_id);
      getLabors(selectedOrder.project_id);
      getStock(selectedOrder.project_id, "");
    }
  }, [selectedOrder, getProject, getSupplies, getLabors, getStock]);

  const availableSupplies = useMemo(() => {
    const stockBySupply = new Map<string, number>();
    for (const stockItem of stock || []) {
      const current = stockBySupply.get(stockItem.supply_name) || 0;
      stockBySupply.set(stockItem.supply_name, current + Number(stockItem.stock_units));
    }

    return (Array.isArray(supplies) ? supplies : []).map((supply) => ({
      ...supply,
      availableQty: Number(stockBySupply.get(supply.name) || 0),
      availableUnit: getUnitName(supply.unit_id),
    }));
  }, [supplies, stock]);

  useEffect(() => {
    if (!pendingCreatedSupplyName) return;
    if (itemIndexToUpdate === null) {
      setPendingCreatedSupplyName(null);
      return;
    }
    const createdSupply = (Array.isArray(supplies) ? supplies : []).find(
      (s) => s.name.trim().toUpperCase() === pendingCreatedSupplyName
    );
    if (!createdSupply) return;

    handleItemChange(itemIndexToUpdate, "item", String(createdSupply.id));
    setPendingCreatedSupplyName(null);
    setItemIndexToUpdate(null);
  }, [supplies, pendingCreatedSupplyName, itemIndexToUpdate, handleItemChange]);

  useEffect(() => {
    if (!selectedProject || !selectedOrder) return;
    const projectInvestors = Array.isArray(selectedProject.investors)
      ? selectedProject.investors
      : [];
    const projectFields = Array.isArray(selectedProject.fields) ? selectedProject.fields : [];

    setInvestors(
      projectInvestors.filter((i) => i.id !== null).map((i) => ({ id: i.id!, name: i.name }))
    );

    const foundField = projectFields.find((f) => String(f.id) === String(selectedOrder.field_id));

    if (foundField?.lots) {
      setLots(Array.isArray(foundField.lots) ? foundField.lots : []);
    } else {
      setLots([]);
    }
  }, [selectedProject, selectedOrder]);

  useEffect(() => {
    if (!selectedOrder) return;

    setOrderNumber(selectedOrder.number);
    setSurface(selectedOrder.effective_area.toString());

    const formattedDate = selectedOrder.date.split("T")[0];
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

    const loadedItems = (Array.isArray(selectedOrder.items) ? selectedOrder.items : []).map(
      (item) => ({
        item: item.supply_id.toString(),
        totalUsed: item.total_used.toString(),
        dose: item.final_dose.toString(),
      })
    );

    while (loadedItems.length < 7) {
      loadedItems.push({ item: "", totalUsed: "", dose: "" });
    }

    setItems(loadedItems);
    setPreciseDoseByRow({});
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
      return {
        error: "Debe ingresar al menos un inversor con porcentaje.",
        splits: [] as { investorId: number; percentage: number }[],
      };
    }

    const unique = new Set(validSplits.map((s) => s.investorId));
    if (unique.size !== validSplits.length) {
      return {
        error: "No se puede repetir el mismo inversor en la división.",
        splits: [] as { investorId: number; percentage: number }[],
      };
    }

    const totalPct = validSplits.reduce((acc, s) => acc + s.percentage, 0);
    if (Math.abs(totalPct - 100) > 0.001) {
      return {
        error: "La suma de porcentajes debe ser 100%.",
        splits: [] as { investorId: number; percentage: number }[],
      };
    }

    return { error: null, splits: validSplits };
  };

  useEffect(() => {
    if (errorCreation) {
      setError(errorCreation);
      setSuccessMessage(null);
    }
  }, [errorCreation]);

  const refreshStock = useCallback(() => {
    if (!selectedOrder) return;
    getStock(selectedOrder.project_id, "");
  }, [selectedOrder, getStock]);

  useEffect(() => {
    if (resultCreation) {
      setSuccessMessage(resultCreation);
      onOrderUpdated();
      refreshStock();
    }
  }, [resultCreation, onOrderUpdated, refreshStock]);

  useEffect(() => {
    setSuccessMessage(null);
  }, [drawerOpen]);

  useEffect(() => {
    if (surface && surface !== "" && surface !== "0") {
      latestItemsRef.current.forEach((item, i) => {
        if (item.totalUsed && item.totalUsed !== "") {
          const preciseDose = Number(item.totalUsed) / Number(surface);
          setPreciseDoseByRow((prev) => ({ ...prev, [i]: preciseDose }));
          handleItemChange(i, "dose", latestFormatDoseRef.current(preciseDose));
        }
      });
    }
  }, [surface, handleItemChange]);

  const roundTo = useCallback((value: number, decimals: number) => {
    const factor = 10 ** decimals;
    return Math.round((value + Number.EPSILON) * factor) / factor;
  }, []);

  const formatDose = useCallback(
    (value: number) =>
      roundTo(value, 3)
        .toFixed(3)
        .replace(/\.?0+$/, ""),
    [roundTo]
  );

  useEffect(() => {
    latestFormatDoseRef.current = formatDose;
  }, [formatDose]);

  const formatTotalUsedFromDose = (value: number) => roundTo(value, 0).toFixed(2);

  const handleSaveOrder = () => {
    setError(null);
    setSuccessMessage(null);
    if (isDigital && selectedOrder?.status === "published") {
      setError("El borrador ya fue publicado y no se puede editar.");
      return;
    }
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

    const itemsWithAnyValue = items.filter((item) => item.item || item.totalUsed || item.dose);

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
      const payload = {
        ...baseOrder,
        investor_id: investor!.id,
      };

      if (isDigital) {
        updateDraftOrder(orderId, payload);
      } else {
        updateOrder(orderId, payload);
      }
      return;
    }

    const { error: splitError, splits } = getValidInvestorSplits();
    if (splitError) {
      setError(splitError);
      return;
    }

    if (splits.length === 1) {
      const payload = {
        ...baseOrder,
        investor_id: splits[0].investorId,
      };

      if (isDigital) {
        updateDraftOrder(orderId, payload);
      } else {
        updateOrder(orderId, payload);
      }
      return;
    }

    (async () => {
      try {
        setProcessingSplit(true);

        const endpoint = isDigital
          ? `/work-orders/drafts/${Math.abs(orderId)}`
          : `/work-orders/${orderId}`;

        await apiClient.put(endpoint, {
          ...baseOrder,
          investor_id: splits[0].investorId,
          investor_splits: splits.map((s) => ({
            investor_id: s.investorId,
            percentage: s.percentage,
          })),
        });

        setSuccessMessage(
          isDigital
            ? "Borrador actualizado con división por inversor."
            : "Orden actualizada con división por inversor."
        );
        onOrderUpdated();
        refreshStock();
      } catch (err) {
        setError(
          formatError(err, {
            fallback: isDigital
              ? "No se pudo dividir el borrador por inversor."
              : "No se pudo dividir la orden por inversor.",
          }),
        );
      } finally {
        setProcessingSplit(false);
      }
    })();
  };

  return (
    <>
      <EntityFormDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={isDigital ? "Edición de Borrador Digital" : "Edición de Orden de Trabajo"}
        subtitle={selectedProject?.name}
        processing={processing || processingCreation || processingSplit}
        onSubmit={handleSaveOrder}
        extraActions={
          selectedOrder && !isDigital ? (
            <Button
              onClick={() => onOrderDuplicated(selectedOrder)}
              variant="primary"
              className="text-base font-medium"
            >
              Duplicar orden
            </Button>
          ) : null
        }
      >
        <>
          <section className="drawer-section">
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
                max={new Date().toISOString().split("T")[0]}
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
                  selectedProject?.fields.find((f) => f.id === selectedOrder?.field_id)?.name || ""
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
                  const selectedLot = lots.find((l) => l.id === Number(e.target.value));
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
                    const selectedLabor = labors.find((l) => l.id === Number(e.target.value));
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
          </section>

          <section className="drawer-section">
            <div className="flex items-center justify-between">
              <span className="drawer-section-title">Inversor del labor</span>
              <label className="inline-flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
                <Checkbox
                  tone="form"
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
                    const selectedInvestor = investors.find((i) => i.id === Number(e.target.value));
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
                          prev.map((row, i) => (i === idx ? { ...row, investorId: value } : row))
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
                            prev.map((row, i) => (i === idx ? { ...row, percentage: value } : row))
                          );
                        }
                      }}
                      placeholder="%"
                      size="sm"
                    />
                    <Button
                      variant="danger"
                      size="xs"
                      iconLeft={<Trash2 className="h-3.5 w-3.5" />}
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
                    variant="secondary"
                    size="xs"
                    iconLeft={<Plus className="h-3.5 w-3.5" />}
                    onClick={() =>
                      setInvestorSplits((prev) => [...prev, { investorId: null, percentage: "" }])
                    }
                  >
                    Agregar Inversor
                  </Button>
                  {(() => {
                    const total = investorSplits.reduce(
                      (acc, s) => acc + (Number(s.percentage) || 0),
                      0
                    );
                    return (
                      <span
                        className={`text-sm font-medium ${total === 100 ? "text-green-600" : "text-red-600"}`}
                      >
                        Total: {total}%
                        {total !== 100 && <span className="ml-1 text-xs">(debe ser 100%)</span>}
                      </span>
                    );
                  })()}
                </div>
              </div>
            )}
          </section>

          {/* Tabla de insumos */}
          <section className="drawer-section">
            <div className="drawer-section-header">
              <span className="drawer-section-title">Carga de insumos</span>
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
              items={items.map(({ item, totalUsed, dose }) => ({
                supplyId: item ? Number(item) : null,
                quantity: totalUsed,
                dose,
              }))}
              options={availableSupplies.map((s) => ({
                id: s.id,
                name: s.name,
                availableQty: s.availableQty,
                unitName: s.availableUnit,
              }))}
              showDoseColumn
              dosePlaceholder="Total/superficie"
              addRowLabel="Agregar Fila de Insumo"
              onItemChange={(rowIndex, field, value) => {
                if (field === "supplyId") {
                  handleItemChange(
                    rowIndex,
                    "item",
                    value === null ? "" : String(value),
                  );
                  handleItemChange(rowIndex, "dose", "");
                  handleItemChange(rowIndex, "totalUsed", "");
                } else if (field === "quantity") {
                  const strValue = String(value);
                  handleItemChange(rowIndex, "totalUsed", strValue);
                  if (surface && surface !== "" && surface !== "0") {
                    const preciseDose = Number(strValue) / Number(surface);
                    setPreciseDoseByRow((prev) => ({
                      ...prev,
                      [rowIndex]: preciseDose,
                    }));
                    handleItemChange(rowIndex, "dose", formatDose(preciseDose));
                  }
                } else if (field === "dose") {
                  const strValue = String(value);
                  handleItemChange(rowIndex, "dose", strValue);
                  if (surface && surface !== "" && surface !== "0") {
                    const preciseDose = preciseDoseByRow[rowIndex];
                    const doseForCalc =
                      typeof preciseDose === "number" &&
                      formatDose(preciseDose) === strValue
                        ? preciseDose
                        : Number(strValue);
                    handleItemChange(
                      rowIndex,
                      "totalUsed",
                      formatTotalUsedFromDose(doseForCalc * Number(surface)),
                    );
                  }
                }
              }}
              onAddRow={() =>
                setItems([...items, { item: "", totalUsed: "", dose: "" }])
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
          <section className="drawer-section">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Observaciones</label>
            <textarea
              className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 min-h-[80px]"
              placeholder="Escriba observaciones"
              name="observaciones"
              value={observations}
              onChange={(e) => setObservations(e.target.value)}
            />
          </section>
        </>
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
      </DrawerShell>
    </>
  );
}
