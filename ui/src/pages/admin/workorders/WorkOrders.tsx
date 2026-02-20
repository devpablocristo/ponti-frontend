import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle } from "lucide-react";
import DataTable from "../../../components/Table/DataTable";
import {Metrics, OrdersData, WorkorderData} from "../../../hooks/useWorkOrders/types";
import useOrders from "../../../hooks/useWorkOrders";
import FilterBar from "../../../layout/FilterBar/FilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import CreateOrder from "./CreateOrder";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { BaseModal } from "../../../components/Modal/BaseModal";
import Button from "../../../components/Button/Button";
import UpdateOrder from "./UpdateOrder";
import { cropColors, laborColors } from "../../../pages/admin/colors";
import { Column } from "../../../pages/admin/types";
import { apiClient } from "@/api/client";
import { formatNumberAr, normalizeDate, formatISODate } from "../utils";

const FILTER_HIERARCHY: Record<string, string[]> = {
  project_name: ["field_name", "lot_name"],
  field_name: ["lot_name"],
};

/** Clasifica la unidad de consumo de una orden (litros, kilos, o null si no se puede determinar). */
function classifyConsumptionUnit(order: OrdersData): "liter" | "kilo" | null {
  const consumption = String(order.consumption || "").trim().toUpperCase();
  const typeName = String(order.type_name || "").toUpperCase();
  const categoryName = String(order.category_name || "").toUpperCase();
  const supplyName = String(order.supply_name || "").toUpperCase();

  if (consumption.includes("L") || consumption.includes("LT")) return "liter";
  if (consumption.includes("KG") || consumption.includes("K")) return "kilo";

  if (typeName.includes("AGROQUÍMICO") || typeName.includes("AGROQUIMICO")) return "liter";
  if (typeName.includes("SEMILLA")) return "kilo";

  const LITER_CATEGORIES = ["HERBICIDA", "COADYUVANTE", "CURASEMILLA", "INSECTICIDA", "FUNGICIDA"];
  const KILO_CATEGORIES = ["SEMILLA", "FERTILIZANTE"];
  if (LITER_CATEGORIES.some((k) => categoryName.includes(k))) return "liter";
  if (KILO_CATEGORIES.some((k) => categoryName.includes(k))) return "kilo";

  const LITER_SUPPLIES = ["HERBICIDA", "ACEITE", "INSECTICIDA", "FUNGICIDA", "LITRO"];
  const KILO_SUPPLIES = ["SEMILLA", "FERTILIZANTE", "KILO"];
  if (LITER_SUPPLIES.some((k) => supplyName.includes(k))) return "liter";
  if (KILO_SUPPLIES.some((k) => supplyName.includes(k))) return "kilo";

  return null;
}

function OrdersHeader({
  ordersAmount,
  laborAmount,
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  allColumns,
}: {
  ordersAmount: number;
  laborAmount: number;
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  setVisibleColumns: (columns: string[]) => void;
  allColumns: any[];
}) {
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  return (
    <div className="flex justify-between items-center p-4 bg-white rounded-t-xl border-b border-gray-100">
      <div className="text-sm text-gray-900">
        <span className="font-semibold">Órdenes:</span> {ordersAmount}{" "}
        <span className="font-semibold ml-4">Labores:</span> {laborAmount}
      </div>

      <Button
        variant="light"
        size="sm"
        iconLeft={
          <svg
            className="w-4 h-4 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 4a1 1 0 011-1h2a1 1 0 011 1v16a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM17 4a1 1 0 011-1h2a1 1 0 011 1v16a1 1 0 01-1 1h-2a1 1 0 01-1-1V4zM10 10h4M10 14h4"
            />
          </svg>
        }
        onClick={() => setShowColumnsModal(true)}
      >
        Configurar columnas
      </Button>
      <BaseModal
        isOpen={showColumnsModal}
        onClose={() => setShowColumnsModal(false)}
        title=""
        primaryButtonText="Aplicar"
        primaryButtonColor="bg-blue-600 hover:bg-blue-800 focus:ring-blue-300 dark:focus:ring-blue-800"
        onPrimaryAction={() => {
          setVisibleColumns(selectedColumns);
          setShowColumnsModal(false);
        }}
        secondaryButtonText="Cancelar"
        onSecondaryAction={() => setShowColumnsModal(false)}
      >
        <h3 className="text-lg font-semibold mb-4">Columnas</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-72 overflow-y-auto px-2 mt-4">
          {allColumns.map((col) => (
            <label
              key={col.key}
              className="flex items-center text-sm font-medium text-gray-700 gap-2"
            >
              <input
                type="checkbox"
                checked={selectedColumns.includes(col.key)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedColumns([...selectedColumns, col.key]);
                  } else {
                    setSelectedColumns(
                      selectedColumns.filter((k) => k !== col.key)
                    );
                  }
                }}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              {col.header}
            </label>
          ))}
        </div>
      </BaseModal>
    </div>
  );
}

function OrdersIndicators({
  metrics,
  processing,
}: {
  metrics: Metrics;
  processing: boolean;
}) {
  return (
    <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-100">
      {processing ? (
        <div className="flex items-center justify-center py-4">
          <LoaderCircle className="animate-spin w-5 h-5 text-custom-btn mr-2" />
          <span className="text-sm text-gray-500 font-medium">Cargando indicadores...</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <IndicatorCard
            title="Sup. ejecutada"
            value={formatNumberAr(metrics.surface_ha) + " Has"}
            color="amber"
          />
          <IndicatorCard
            title="Consumo en litros"
            value={formatNumberAr(metrics.liters) + " Lt"}
            color="gray"
          />
          <IndicatorCard
            title="Consumo en kilos"
            value={formatNumberAr(metrics.kilograms) + " Kg"}
            color="gray"
          />
          <IndicatorCard
            title="Costos directos"
            value={"u$ " + formatNumberAr(metrics.direct_cost)}
            color="red"
          />
        </div>
      )}
    </div>
  );
}

export function WorkOrders() {
  const navigate = useNavigate();
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerUpdateOpen, setDrawerUpdateOpen] = useState(false);
  const [orderToDuplicate, setOrderToDuplicate] =
    useState<WorkorderData | null>(null);

  const {
    getOrders,
    deleteOrder,
    getMetrics,
    metrics,
    processingMetrics,
    errorMetrics,
    orders,
    processing,
    error,
  } = useOrders();

  // Filtros activos por columna
  const [columnsFilters, setColumnsFilters] = useState<Record<string, any>>({});

  // Helper: filtra las órdenes según todos los filtros activos
  const filterOrders = (data: OrdersData[], filters: Record<string, any>) => {
    return data.filter((order) => {
      return Object.entries(filters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        if (key === "date") {
          const orderDate = normalizeDate(String(order.date));
          if (Array.isArray(value)) {
            return value.some((v) => orderDate === normalizeDate(String(v)));
          }
          return orderDate === normalizeDate(String(value));
        }

        const orderValRaw = order[key as keyof OrdersData];
        const orderVal = String(orderValRaw ?? "").toLowerCase();
        if (Array.isArray(value)) {
          return value.some((v) => orderVal === String(v).toLowerCase());
        }
        return orderVal === String(value).toLowerCase();
      });
    });
  };

  // Helper: obtiene las opciones válidas para una columna
  const getFilterOptionsForColumn = (
    key: keyof OrdersData,
    customSort?: (a: any, b: any) => number
  ) => {
    const filtersExceptCurrent = { ...columnsFilters };
    delete filtersExceptCurrent[key];
    const filtered = filterOrders(orders, filtersExceptCurrent);
    let options = [...new Set(filtered.map((order) => order[key]))];
    if (customSort) {
      options.sort(customSort);
    } else {
      options.sort();
    }
    return options.map(String);
  };

  const columns: Column<OrdersData>[] = React.useMemo(() => {
    return [
      {
        key: "number",
        header: "N°",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("number", (a, b) => Number(a) - Number(b)),
        render: (value, data) => (
          <strong className="text-blue-700">
            <a
              onClick={() => {
                setSelectedOrderId(data.id);
                setDrawerUpdateOpen(true);
              }}
            >
              {value as string}
            </a>
          </strong>
        ),
      },
      {
        key: "project_name",
        header: "Proyecto",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("project_name"),
      },
      {
        key: "field_name",
        header: "Campo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("field_name"),
      },
      {
        key: "lot_name",
        header: "Lote",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("lot_name"),
      },
      {
        key: "date",
        header: "Fecha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("date")
          .map(formatISODate)
          .filter((v, i, a) => a.indexOf(v) === i)
          .sort(),
        render: (dateString) => formatISODate(dateString),
      },
      {
        key: "crop_name",
        header: "Cultivo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("crop_name"),
        render: (crop) => (
          <span
            className={`px-2 py-1 text-[14px] rounded-md ${cropColors[crop] || "bg-[#E5E7EB] text-[#000000] border border-[#000000]"
              }`}
          >
            {crop}
          </span>
        ),
      },
      {
        key: "labor_category_name",
        header: "Labor",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("labor_category_name"),
        render: (labor) => (
          <span
            className={`px-2 py-1 text-[14px] rounded-md ${laborColors[labor] || "bg-[#E5E7EB] text-[#000000] border border-[#000000]"
              }`}
          >
            {labor}
          </span>
        ),
      },
      {
        key: "type_name",
        header: "Tipo/Clase",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("type_name"),
      },
      {
        key: "contractor",
        header: "Contratista",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("contractor"),
      },
      {
        key: "surface_ha",
        header: "Superficie",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("surface_ha"),
        render: (value: any) => (
          <span className="font-semibold text-emerald-700">{formatNumberAr(value)} <span className="text-emerald-400 font-normal text-xs">Has</span></span>
        ),
      },
      {
        key: "supply_name",
        header: "Insumo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("supply_name"),
      },
      {
        key: "consumption",
        header: "Consumo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("consumption"),
        render: (value: any) => <span className="font-semibold text-blue-700">{value}</span>,
      },
      {
        key: "category_name",
        header: "Rubro",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("category_name"),
      },
      {
        key: "dose",
        header: "Dosis",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("dose"),
        render: (value: any) => <span className="font-semibold text-blue-700">{value}</span>
      },
      {
        key: "cost_per_ha",
        header: "Costo USD/Ha",
        filterable: false,
        render: (value: any) => {
          const num = Number(value);
          return <span className="font-semibold text-emerald-700">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
        },
      },
      {
        key: "unit_price",
        header: "Precio unidad",
        filterable: false,
        render: (value: any) => {
          const num = Number(value);
          return <span className="font-semibold text-emerald-700">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
        },
      },
      {
        key: "total_cost",
        header: "Total costo (USD)",
        filterable: false,
        render: (value: any) => {
          const num = Number(value);
          return <span className="font-bold text-emerald-700">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
        },
      },
    ];
  }, [orders, columnsFilters]);

  const allColumnsMap = new Map();
  [...columns].forEach((col) => {
    allColumnsMap.set(col.key, col);
  });
  const allColumns = Array.from(allColumnsMap.values());

  const [columnsToShow, setColumnsToShow] = useState(columns);
  const [selectedColumns, setSelectedColumns] = useState(
    allColumns.map((col) => col.key)
  );
  const [visibleColumns, setVisibleColumns] = useState(selectedColumns);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const {
    projectId,
    selectedProject,
    selectedField,
    selectedCustomer,
    selectedCampaignId,
    filters,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  // Filtros globales de workspace y limpiar filtros al cambiar de cliente
  useEffect(() => {
    setColumnsFilters({});
    setCurrentPage(1);
  }, [selectedCustomer]);

  const [errorMessage, setErrorMessage] = useState("");

  const [isProcessing, setIsProcessing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalConfig, setModalConfig] = useState({
    title: "",
    message: "",
    primaryButtonText: "",
    secondaryButtonText: "Cancelar",
    onConfirm: () => { },
  });

  useEffect(() => {
    if (!error) return;
    setErrorMessage(error);
  }, [error]);

  useEffect(() => {
    setColumnsToShow(columns);
  }, [columns]);

  useEffect(() => {
    Object.entries(FILTER_HIERARCHY).forEach(([parent, children]) => {
      if (!columnsFilters[parent]) return;

      const parentFilter = columnsFilters[parent];
      const validData = orders.filter((o) => {
        const orderValue = String(o[parent as keyof OrdersData]).toLowerCase();
        if (Array.isArray(parentFilter)) {
          return parentFilter.some(
            (val) => String(val).toLowerCase() === orderValue
          );
        } else {
          return orderValue === String(parentFilter).toLowerCase();
        }
      });

      children.forEach((child) => {
        const validValues = new Set(
          validData.map((o) => o[child as keyof OrdersData])
        );

        const childFilter = columnsFilters[child];
        if (childFilter) {
          if (Array.isArray(childFilter)) {
            const validChildValues = childFilter.filter((val) =>
              validValues.has(val)
            );
            if (validChildValues.length !== childFilter.length) {
              setColumnsFilters((prev) => {
                const updated = { ...prev };
                if (validChildValues.length > 0) {
                  updated[child] = validChildValues;
                } else {
                  delete updated[child];
                }
                return updated;
              });
            }
          } else {
            if (!validValues.has(childFilter)) {
              setColumnsFilters((prev) => {
                const updated = { ...prev };
                delete updated[child];
                return updated;
              });
            }
          }
        }
      });
    });
  }, [columnsFilters, orders]);

  const buildQueryParams = () => {
    const params: Record<string, string> = {};
    if (selectedCustomer && selectedCustomer.id !== 0) params.customer_id = String(selectedCustomer.id);
    if (projectId) params.project_id = String(projectId);
    if (selectedCampaignId) params.campaign_id = String(selectedCampaignId);
    if (selectedField && selectedField.id !== 0) params.field_id = String(selectedField.id);
    return new URLSearchParams(params).toString();
  };

  useEffect(() => {
    if (!projectId && !selectedField) {
      setErrorMessage("Seleccione un proyecto o un campo para ver las ordenes");
      return;
    }
    setErrorMessage("");
    setVisibleColumns(columns.map((col) => col.key));

    const query = buildQueryParams();
    setCurrentPage(1);
    getOrders(query);
    getMetrics(query);
  }, [projectId, selectedField, selectedCampaignId, selectedCustomer]);

  const handleOrderCreated = () => {
    const query = buildQueryParams();
    setCurrentPage(1);
    getOrders(query);
    getMetrics(query);
  };

  const handleOrderDuplicated = (order: WorkorderData) => {
    setSelectedOrderId(null);
    setDrawerUpdateOpen(false);
    setDrawerOpen(true);
    setOrderToDuplicate(order);
  };

  const handlePreFinish = (id: number) => {
    setModalConfig({
      title: "Confirmar eliminación",
      message: "¿Está seguro que desea eliminar la orden?",
      primaryButtonText: "Sí, eliminar",
      secondaryButtonText: "Cancelar",
      onConfirm: () => handleFinishConfirmed(id),
    });
    setIsModalOpen(true);
  };

  const handleFinishConfirmed = async (id: number) => {
    setIsProcessing(true);

    try {
      await deleteOrder(id);
      setModalConfig({
        title: "Confirmación",
        message: "La orden ha sido eliminada.",
        primaryButtonText: "Volver",
        secondaryButtonText: "Volver",
        onConfirm: () => {
          navigate("/admin/work-orders");
        },
      });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Error al eliminar la orden.";
      setErrorMessage(message);
      setModalConfig({
        title: "Error",
        message,
        primaryButtonText: "Volver",
        secondaryButtonText: "Volver",
        onConfirm: () => {
          setIsModalOpen(false);
        },
      });
    } finally {
      setIsModalOpen(true);
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    setColumnsToShow(
      allColumns.filter((col) => visibleColumns.includes(col.key))
    );
  }, [visibleColumns]);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      return Object.entries(columnsFilters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        if (key === "date") {
          const orderDate = normalizeDate(String(order.date));
          if (Array.isArray(value)) {
            return value.some((v) => orderDate === normalizeDate(String(v)));
          }
          return orderDate === normalizeDate(String(value));
        }
        const orderValRaw = order[key as keyof OrdersData];
        const orderVal = String(orderValRaw ?? "").toLowerCase();
        if (Array.isArray(value)) {
          return value.some((v) => orderVal === String(v).toLowerCase());
        }
        return orderVal === String(value).toLowerCase();
      });
    });
  }, [orders, columnsFilters]);

  const derivedMetrics: Metrics = useMemo(() => {
    const toNum = (v: any) => Number(v) || 0;
    let surface_ha = 0, liters = 0, kilograms = 0, direct_cost = 0;

    filteredOrders.forEach((order) => {
      surface_ha += toNum(order.surface_ha);

      const consumption = String(order.consumption || "").trim();
      const match = consumption.match(/[\d.]+/);
      const amount = match ? parseFloat(match[0]) || 0 : 0;
      const unit = classifyConsumptionUnit(order);
      if (unit === "liter") liters += amount;
      else if (unit === "kilo") kilograms += amount;

      direct_cost += toNum(order.total_cost);
    });

    return { surface_ha, liters, kilograms, direct_cost };
  }, [filteredOrders]);

  const handleExport = async () => {
    if (!projectId) return;

    try {
      const response = await apiClient.get<Blob>(
        `/work-orders/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(response);

      const link = document.createElement("a");
      link.href = url;
      link.download = `ordenes_${projectId}_${new Date().toISOString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage("No se pudo exportar el listado de órdenes.");
    }
  };

  const handleFilterChange = (filters: Record<string, any>) => {
    setColumnsFilters(filters);
    setCurrentPage(1);
  };

  return (
    <div>
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar órdenes",
            icon: <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.66675 2.49984H3.00008C2.64646 2.49984 2.30732 2.64031 2.05727 2.89036C1.80722 3.14041 1.66675 3.47955 1.66675 3.83317V10.4998C1.66675 10.8535 1.80722 11.1926 2.05727 11.4426C2.30732 11.6927 2.64646 11.8332 3.00008 11.8332H9.66675C10.0204 11.8332 10.3595 11.6927 10.6096 11.4426C10.8596 11.1926 11.0001 10.8535 11.0001 10.4998V7.83317M8.33341 1.1665H12.3334M12.3334 1.1665V5.1665M12.3334 1.1665L5.66675 7.83317" stroke="#547792" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ,
            variant: "outlinePonti",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => handleExport(),
          },
          {
            label: "+ Nueva orden",
            variant: "success",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => {
              setDrawerOpen(true);
              setOrderToDuplicate(null);
            },
          },
        ]}
      />
      {errorMessage && (
        <div className="flex items-center gap-3 p-4 mb-4 text-sm text-red-800 rounded-xl bg-red-50 border border-red-200" role="alert">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
          <div><span className="font-semibold">Error:</span> {errorMessage}</div>
        </div>
      )}
      {!processing && !errorMetrics && orders.length > 0 && (
        <div className="my-4">
          <OrdersIndicators
            metrics={Object.keys(columnsFilters).length > 0 ? derivedMetrics : metrics}
            processing={processingMetrics}
          />
        </div>
      )}
      <div className="mt-4 relative">
        {(processing || isProcessing) && (
            <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
              <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
            </div>
          )}
        {selectedProject && (
          <CreateOrder
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
            projectId={projectId}
            orderToDuplicate={orderToDuplicate}
            selectedField={selectedField}
            onOrderCreated={handleOrderCreated}
          />
        )}
        {selectedOrderId && (
          <UpdateOrder
            orderId={selectedOrderId}
            drawerOpen={drawerUpdateOpen}
            setDrawerOpen={setDrawerUpdateOpen}
            onOrderUpdated={handleOrderCreated}
            onOrderDuplicated={handleOrderDuplicated}
          />
        )}
        <DataTable
          key={`${projectId}-${selectedField?.id || 0}-${orders.length}`}
          data={filteredOrders}
          filters={columnsFilters}
          onFilterChange={handleFilterChange}
          columns={columnsToShow}
          onDelete={(item) => handlePreFinish(item.id)}
          enableFilters={true}
          headerComponent={
            <OrdersHeader
              ordersAmount={orders.length}
              laborAmount={orders.length}
              selectedColumns={selectedColumns}
              setSelectedColumns={setSelectedColumns}
              setVisibleColumns={setVisibleColumns}
              allColumns={allColumns}
            />
          }
          message="No hay ordenes disponibles"
          pagination={{
            page: currentPage,
            perPage: itemsPerPage,
            total: filteredOrders.length,
            onPageChange: handlePageChange,
          }}
        />
        <BaseModal
          isOpen={isModalOpen}
          isSaving={isProcessing}
          onClose={() => setIsModalOpen(false)}
          title={modalConfig.title}
          message={modalConfig.message}
          primaryButtonText={modalConfig.primaryButtonText}
          secondaryButtonText={modalConfig.secondaryButtonText}
          onPrimaryAction={() => {
            modalConfig.onConfirm();
            setIsModalOpen(false);
          }}
        >
          <div className="flex flex-col items-center gap-2">
            <p>{modalConfig.message}</p>
          </div>
        </BaseModal>
      </div>
    </div>
  );
}
