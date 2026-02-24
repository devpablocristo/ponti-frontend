import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LoaderCircle, Pencil } from "lucide-react";
import DataTable from "../../../components/Table/DataTable";
import { BaseModal } from "../../../components/Modal/BaseModal";
import { LotKPIs, LotsData, LotsDataUpdate } from "../../../hooks/useLots/types";
import useLots from "../../../hooks/useLots";
import FilterBar from "../../../layout/FilterBar/FilterBar";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import InputField from "../../../components/Input/InputField";
import Button from "../../../components/Button/Button";
import SelectField from "../../../components/Input/SelectField";
import { cropColors } from "../colors";
import { apiClient } from "@/api/client";
import { formatNumberAr } from "../utils";

const EditableCell = ({
  item,
  value,
  onSuccessEdit,
}: {
  item: any;
  value: string;
  onSuccessEdit: () => void;
}) => {
  const [editing, setEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(value ?? "");
  const { updateTons, processingTons, errorTons, resultTons } = useLots();

  useEffect(() => {
    setEditValue(value ?? "");
  }, [value, item.id]);

  const save = async () => {
    if (editValue === "") {
      return;
    }
    updateTons(item.id, Number(editValue));
  };

  useEffect(() => {
    if (errorTons) {
      alert(errorTons);
      return;
    }
    if (resultTons) {
      setEditing(false);
      onSuccessEdit();
      return;
    }
  }, [errorTons, resultTons]);

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          type="number"
          min="0"
          step="any"
          className="block w-full min-w-[80px] p-2 text-gray-900 border border-gray-300 rounded-lg bg-gray-50 text-sm focus:ring-blue-500 focus:border-blue-500"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          disabled={processingTons}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              save();
            }
            if (e.key === "Escape") {
              setEditing(false);
            }
          }}
        />
        {processingTons ? (
          <LoaderCircle className="animate-spin w-4 h-4 text-blue-500" />
        ) : (
          <button
            className="text-green-600 hover:text-green-800"
            onClick={save}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between w-full min-w-[80px]">
      <span className="truncate text-right w-full pr-2">{editValue}</span>
      <button
        className="text-blue-600 hover:text-blue-800 flex items-center p-1"
        style={{ minWidth: 24, minHeight: 24 }}
        onClick={() => setEditing(true)}
        aria-label="Editar"
      >
        <Pencil className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

function LotsIndicators({
  kpis,
  processing,
  error,
}: {
  kpis: LotKPIs;
  processing: boolean;
  error: string | null;
}) {
  return (
    <div className="bg-gray-50/60 rounded-xl p-4 border border-gray-100">
      {processing ? (
        <div className="flex items-center justify-center py-4">
          <LoaderCircle className="animate-spin w-5 h-5 text-custom-btn mr-2" />
          <span className="text-sm text-gray-500 font-medium">Cargando indicadores...</span>
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 text-red-600 text-sm font-medium">
          <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
          {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          <IndicatorCard
            title="Sup. sembrada"
            value={formatNumberAr(kpis.seeded_area) + " Has"}
            color="amber"
          />
          <IndicatorCard
            title="Sup. cosechada"
            value={formatNumberAr(kpis.harvested_area) + " Has"}
            color="amber"
          />
          <IndicatorCard
            title="Tn / hectárea"
            value={formatNumberAr(kpis.yield_tn_per_ha) + " Tn"}
            color="green"
          />
          <IndicatorCard
            title="Costo / hectárea"
            value={"u$ " + formatNumberAr(kpis.cost_per_hectare)}
            color="red"
          />
          <IndicatorCard
            title="Superficie total"
            value={formatNumberAr(kpis.superficie_total) + " Has"}
            color="amber"
          />
        </div>
      )}
    </div>
  );
}

function LotsHeader({
  fieldsAmount,
  lotsAmount,
  selectedColumns,
  setSelectedColumns,
  setVisibleColumns,
  columns,
  harvestColumns,
  commercializationColumns,
  allColumns,
}: {
  fieldsAmount: number;
  lotsAmount: number;
  selectedColumns: string[];
  setSelectedColumns: (columns: string[]) => void;
  setVisibleColumns: (columns: string[]) => void;
  columns: any[];
  harvestColumns: any[];
  commercializationColumns: any[];
  allColumns: any[];
}) {
  const [active, setActive] = useState("Siembra");
  const [showColumnsModal, setShowColumnsModal] = useState(false);

  const buttonBase =
    "px-4 py-2 text-sm font-medium border border-gray-200 focus:z-10 focus:outline-none transition-colors duration-150 rounded-none";
  const activeClass = "bg-custom-btn text-white shadow-sm";
  const inactiveClass =
    "bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900";

  return (
    <div className="flex justify-between items-center p-4 bg-white rounded-t-xl border-b border-gray-100">
      <div className="text-sm text-gray-900">
        Campos: <span className="font-semibold mr-2">{fieldsAmount}{" "}</span>
        Lotes: <span className="font-semibold">{lotsAmount}</span>
      </div>

      <div className="inline-flex rounded-md shadow-xs" role="group">
        <button
          type="button"
          className={`rounded-s-lg ${buttonBase} ${active === "Siembra" ? activeClass : inactiveClass
            }`}
          tabIndex={0}
          onClick={() => {
            setActive("Siembra");
            setVisibleColumns(columns.map((col) => col.key));
            setSelectedColumns(columns.map((col) => col.key));
          }}
        >
          Siembra
        </button>
        <button
          type="button"
          className={`${buttonBase} border-l-0 border-r-0 ${active === "Cosecha" ? activeClass : inactiveClass
            }`}
          tabIndex={0}
          onClick={() => {
            setActive("Cosecha");
            setVisibleColumns(harvestColumns.map((col) => col.key));
            setSelectedColumns(harvestColumns.map((col) => col.key));
          }}
        >
          Cosecha
        </button>
        <button
          type="button"
          className={`rounded-e-lg ${buttonBase} ${active === "Comercialización" ? activeClass : inactiveClass
            }`}
          tabIndex={0}
          onClick={() => {
            setActive("Comercialización");
            setVisibleColumns(commercializationColumns.map((col) => col.key));
            setSelectedColumns(commercializationColumns.map((col) => col.key));
          }}
        >
          Comercialización
        </button>
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
      <div
        className="fixed inset-0 bg-black bg-opacity-30 transition-opacity"
        onClick={onClose}
      />
      <div className="ml-auto h-full w-full max-w-xl bg-white shadow-xl p-8 overflow-y-auto relative animate-slide-in-right">
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

export function Lots() {
  const navigate = useNavigate();
  const [lot, setLot] = useState<LotsDataUpdate | null>(null);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [columnsFilters, setColumnsFilters] = useState<Record<string, any>>({});

  const {
    getLots,
    getLotsKpis,
    lots,
    crops,
    getCrops,
    updateLot,
    updateLotError,
    result,
    processing,
    error,
  } = useLots();


  // Handler para resetear página al aplicar filtros (igual que en WorkOrders)
  const handleFilterChange = (filters: Record<string, any>) => {
    setColumnsFilters(filters);
    setCurrentPage(1); // Importante: volver a la página 1 si filtramos
  };

   const getFilterOptionsForColumn = (columnKey: keyof LotsData) => {
      // Aplicar TODOS los filtros EXCEPTO el de esta columna
      let filteredData = lots.filter((lot) => {
        return Object.entries(columnsFilters).every(([filterKey, filterValue]) => {
          // Saltar el filtro de esta misma columna (permitir que muestre todas las opciones)
          if (filterKey === columnKey) return true;
          
          // Si no hay valor, incluir todo
          if (!filterValue || (Array.isArray(filterValue) && filterValue.length === 0)) return true;

          // Manejo especial para 'dates'
          if (filterKey === 'dates') {
            const lotDates = lot.dates as any[] || [];
            const sowingDates = lotDates
              .map(d => d.sowing_date)
              .filter(Boolean);
            
            if (Array.isArray(filterValue)) {
              return filterValue.some((filterDate) =>
                sowingDates.some((sowingDate) => 
                  String(sowingDate).toLowerCase() === String(filterDate).toLowerCase()
                )
              );
            } else {
              return sowingDates.some((sowingDate) =>
                String(sowingDate).toLowerCase().includes(String(filterValue).toLowerCase())
              );
            }
          }

          const cellValue = String(lot[filterKey as keyof LotsData] ?? "");
          
          if (Array.isArray(filterValue)) {
            return filterValue.some((option) => String(option).toLowerCase() === cellValue.toLowerCase());
          }
          
          return cellValue.toLowerCase().includes(String(filterValue).toLowerCase());
        });
      });

      // Extraer opciones únicas de la columna actual
      if (columnKey === 'dates') {
        const dates = [...new Set(filteredData.flatMap(l => l.dates?.map(d => d.sowing_date).filter(Boolean) || []))];
        return dates.filter(Boolean).sort().reverse() as string[];
      }
      
      if (columnKey === 'harvest_date') {
        const harvestDates = [...new Set(filteredData.flatMap(l => l.dates?.map(d => d.harvest_date).filter(Boolean) || []))];
        return harvestDates.filter(Boolean).sort().reverse() as string[];
      }
      
      const options = [...new Set(filteredData.map((lot) => lot[columnKey]))].filter(Boolean);
      return options.map(String).sort() as string[];
    };

  const { columns, harvestColumns, commercializationColumns } = useMemo(() => {

    const baseColumns: Column<LotsData>[] = [
      {
        key: "project_name",
        header: "Proyecto",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("project_name"),
        render: (value, data) => (
          <strong className="text-blue-700">
            <a href={`/admin/database/customers/${data.project_id}`}>
              {value as string}
            </a>
          </strong>
        ),
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
        key: "previous_crop",
        header: "Cultivo Ant.",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("previous_crop"),
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
        key: "current_crop",
        header: "Cultivo Act.",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("current_crop"),
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
        key: "variety",
        header: "Variedad",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("variety"),
        render: (value) => <b>{value}</b>,
      },
      { 
        key: "hectares", 
        header: "Sup. total", 
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("hectares"),
        render: (value) => (
          <span className="font-semibold text-emerald-700">{formatNumberAr(value)} <span className="text-emerald-400 font-normal text-xs">Has</span></span>
        ),
      },
      {
        key: "dates",
        header: "Fecha Siembra",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("dates"),
        render: (value) => {
          if (value?.length > 0) {
            for (let i = value.length - 1; i >= 0; i--) {
              if (value[i].sowing_date) {
                return <b>{value[i].sowing_date}</b>;
              }
            }
          }
          return "";
        },
      },
      {
        key: "cost_usd_per_ha",
        header: "Costo U$ /HA",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("cost_usd_per_ha"),
        render: (value) => <span className="font-semibold text-emerald-700">u$ {formatNumberAr(value)}</span>,
      },
    ];

    const harvest: Column<LotsData>[] = [
      ...baseColumns,
      { 
        key: "harvested_area",
        header: "Sup. Cosechada",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("harvested_area"),
        render: (value) => (
          <span className="font-semibold text-emerald-700">{formatNumberAr(value)} <span className="text-emerald-400 font-normal text-xs">Has</span></span>
        ),
      },
      {
        key: "harvest_date",
        header: "Fecha Cosecha",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("harvest_date"),
        render: (_value, item) => {
          if (item.dates && item.dates.length > 0) {
            for (let i = item.dates.length - 1; i >= 0; i--) {
              if (item.dates[i].harvest_date) {
                return <b>{item.dates[i].harvest_date}</b>;
              }
            }
          }
          return "";
        },
      },
      {
        key: "tons",
        header: "Toneladas",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("tons"),
        render: (value, item) => (
          <EditableCell item={item} value={value} onSuccessEdit={onSuccessEdit} />
        ),
      },
      {
        key: "yield",
        header: "Rendimiento",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("yield"),
        render: (value) => <span className="font-semibold text-amber-600">{formatNumberAr(value)} <span className="text-amber-400 font-normal text-xs">Tn/Has</span></span>,
      },
    ];

    const commercialization: Column<LotsData>[] = [
      ...harvest,
      {
        key: "net_income",
        header: "Ingreso Neto",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("net_income"),
        render: (value) => <span className="font-semibold text-rose-600">$ {formatNumberAr(value)}</span>,
      },
      { 
        key: "rent", 
        header: "Arriendo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("rent"),
        render: (value) => <span className="font-medium text-rose-600">$ {formatNumberAr(value)}</span>,
      },
      {
        key: "admin_cost",
        header: "Adm. Proyecto",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("admin_cost"),
        render: (value) => <span className="font-medium text-rose-600">$ {formatNumberAr(value)}</span>,
      },
      {
        key: "total_assets",
        header: "Activo Total",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("total_assets"),
        render: (value) => <span className="font-semibold text-rose-600">$ {formatNumberAr(value)}</span>,
      },
      {
        key: "operating_result",
        header: "Resultado Operativo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("operating_result"),
        render: (value) => <span className="font-bold text-rose-700">$ {formatNumberAr(value)}</span>,
      },
    ];

    return {
      columns: baseColumns,
      harvestColumns: harvest,
      commercializationColumns: commercialization,
    };
  }, [lots, columnsFilters]); // Dependencia: lots (para recalcular opciones)

  const allColumnsMap = new Map();
  [...columns, ...harvestColumns, ...commercializationColumns].forEach(
    (col) => {
      allColumnsMap.set(col.key, col);
    }
  );
  const allColumns = Array.from(allColumnsMap.values());

  const [selectedColumns, setSelectedColumns] = useState(
    allColumns.map((col) => col.key)
  );
  const [visibleColumns, setVisibleColumns] = useState(selectedColumns);

  const columnsToShow = allColumns.filter((col) => visibleColumns.includes(col.key));



  // Esto está bien, lo dejamos como está
  useEffect(() => {
    setVisibleColumns(columns.map((col) => col.key));
  }, []); // Solo al montar, carga las columnas por defecto (Siembra)


  useEffect(() => {
    getCrops();
  }, [getCrops]);

  const {
    selectedCustomer,
    projectId,
    selectedCampaignId,
    selectedField,
    fields,
    filters,
    seasons,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);

    // Filtros globales de workspace y limpiar filtros al cambiar de cliente
    useEffect(() => {
      setColumnsFilters({});
      setCurrentPage(1);
    }, [selectedCustomer]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!selectedCustomer || !projectId || !selectedCampaignId) {
      setMessage("Seleccione un proyecto, campaña y campo para ver resultados");
      return;
    }
    setMessage("");
    if (selectedField) {
      setCurrentPage(1);
      getLots(`field_id=${selectedField.id}`);
      getLotsKpis(`field_id=${selectedField.id}`);
    } else {
      setCurrentPage(1);
      getLots(`project_id=${projectId}`);
      getLotsKpis(`project_id=${projectId}`);
    }
  }, [getLots, selectedCustomer, projectId, selectedCampaignId, selectedField]);

  useEffect(() => {
    if (result !== "") {
      setSuccessMessage(result);
      if (selectedField) {
        setCurrentPage(1);
        getLots(`field_id=${selectedField.id}`);
        getLotsKpis(`field_id=${selectedField.id}`);
      } else if (projectId) {
        setCurrentPage(1);
        getLots(`project_id=${projectId}`);
        getLotsKpis(`project_id=${projectId}`);
      }
    }
  }, [result]);

  useEffect(() => {
    if (drawerOpen && lot) {
      const newLot = lots.find((l) => l.id === lot.id);
      if (newLot) {
        setLot(newLot);
      }
    }
  }, [lots]);

  useEffect(() => {
    if (updateLotError && updateLotError !== "") {
      setErrorMessage(updateLotError);
      setSuccessMessage("");
    }
  }, [updateLotError]);

  const onSuccessEdit = () => {
    if (selectedField) {
      setCurrentPage(1);
      getLots(`field_id=${selectedField.id}`);
      getLotsKpis(`field_id=${selectedField.id}`);
    } else if (projectId) {
      setCurrentPage(1);
      getLots(`project_id=${projectId}`);
      getLotsKpis(`project_id=${projectId}`);
    }
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

const filteredLots = useMemo(() => {
    return lots.filter((lot) => {
      return Object.entries(columnsFilters).every(([key, value]) => {
        // 1. Si no hay valor (null/undefined/vacio) o es un array vacío, mostramos todo
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        // Manejo especial para la columna 'dates'
        if (key === 'dates') {
          const lotDates = lot.dates as any[] || [];
          const sowingDates = lotDates
            .map(d => d.sowing_date)
            .filter(Boolean);
          
          if (Array.isArray(value)) {
            // Si hay múltiples filtros, verificar si alguna fecha coincide
            return value.some((filterDate) =>
              sowingDates.some((sowingDate) => 
                String(sowingDate).toLowerCase() === String(filterDate).toLowerCase()
              )
            );
          } else {
            // Filtro texto simple
            return sowingDates.some((sowingDate) =>
              String(sowingDate).toLowerCase().includes(String(value).toLowerCase())
            );
          }
        }

        const cellValue = String(lot[key as keyof LotsData] ?? "");

        // 2. Si el filtro es un Array (viene de los checkboxes del Select)
        if (Array.isArray(value)) {
          // Verificamos si el valor de la celda está INCLUIDO en las opciones seleccionadas
          // Usamos String() para asegurar que comparamos textos
          return value.some((option) => String(option).toLowerCase() === cellValue.toLowerCase());
        }

        // 3. Si el filtro es texto simple (input de búsqueda)
        // Usamos 'includes' para que si escribes "soja" encuentre "Soja Intacta"
        return cellValue.toLowerCase().includes(String(value).toLowerCase());
      });
    });
  }, [lots, columnsFilters]);

  // Calcular KPIs basados en los lotes filtrados
  const calculatedKpis = useMemo(() => {
    const totalSeededArea = filteredLots.reduce((sum, lot) => sum + (Number(lot.sowed_area) || 0), 0);
    const totalSurfaceArea = filteredLots.reduce((sum, lot) => sum + (Number(lot.hectares) || 0), 0);
    const totalHarvestedArea = filteredLots.reduce((sum, lot) => sum + (Number(lot.harvested_area) || 0), 0);
    const totalTons = filteredLots.reduce((sum, lot) => sum + (Number(lot.tons) || 0), 0);
    const weightedCost = filteredLots.reduce((sum, lot) => sum + ((Number(lot.cost_usd_per_ha) || 0) * (Number(lot.hectares) || 0)), 0);

    const avgYield = totalHarvestedArea > 0 ? totalTons / totalHarvestedArea : 0;
    const avgCostPerHa = totalSurfaceArea > 0 ? weightedCost / totalSurfaceArea : 0;

    return {
      seeded_area: totalSeededArea,
      harvested_area: totalHarvestedArea,
      yield_tn_per_ha: avgYield,
      cost_per_hectare: avgCostPerHa,
      superficie_total: totalSurfaceArea,
    };
  }, [filteredLots]);


  const handleCreateLot = () => {
    if (selectedField && projectId && selectedCustomer && selectedCampaignId) {
      navigate(`/admin/database/customers/${selectedField.project_id}`);
      return;
    }
  };

  function handleLotChange<K extends keyof LotsDataUpdate>(
    key: K,
    value: LotsDataUpdate[K]
  ) {
    setLot((prev) => ({
      ...prev,
      id: prev?.id || 0,
      lot_name: prev?.lot_name || "",
      field_id: prev?.field_id || 0,
      previous_crop_id: prev?.previous_crop_id || 0,
      current_crop_id: prev?.current_crop_id || 0,
      variety: prev?.variety || "",
      sowed_area: prev?.sowed_area || "",
      dates: prev?.dates || [],
      season: prev?.season || "",
      [key]: value,
      updated_at: prev?.updated_at || new Date().toISOString(),
    }));
  }

  const handleSave = () => {
    if (lot) {
      const lotToUpdate = { ...lot };
      if (lotToUpdate.dates) {
        const invalidDate = lotToUpdate.dates.find(
          (date) =>
            date &&
            date.harvest_date &&
            (!date.sowing_date || date.sowing_date === "")
        );
        if (invalidDate) {
          setErrorMessage(
            "Si hay fecha de cosecha, debe cargar también la fecha de siembra."
          );
          return;
        }
      }

      if (lotToUpdate.sowed_area === "" || lotToUpdate.sowed_area === "0") {
        setErrorMessage("Area de siembra obligatoria");
        return;
      }
      setSuccessMessage("");
      setErrorMessage("");
      updateLot(lotToUpdate);
    }
  };

  const handleExport = async () => {
    if (!projectId) return;

    try {
      const response = await apiClient.get<Blob>(
        `/lots/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(response);

      const link = document.createElement("a");
      link.href = url;
      link.download = `lotes_${projectId}_${new Date().toISOString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      setErrorMessage("No se pudo exportar el listado de lotes.");
    }
  };

  return (
    <div>
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar Lotes",
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
            label: "+ Nuevo Lote",
            variant: "success",
            isPrimary: true,
            disabled:
              !projectId ||
              !selectedCampaignId ||
              !selectedCustomer ||
              !selectedField,
            onClick: handleCreateLot,
          },
        ]}
      />
      {message && (
        <div className="flex items-center gap-3 p-4 mb-4 text-sm text-amber-800 rounded-xl bg-amber-50 border border-amber-200" role="alert">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg>
          <span className="font-medium">{message}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-3 p-4 mb-4 text-sm text-red-800 rounded-xl bg-red-50 border border-red-200" role="alert">
          <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
          <div><span className="font-semibold">Error:</span> {error}</div>
        </div>
      )}
      {!message && !error && (
        <div className="my-4">
          <LotsIndicators
            kpis={calculatedKpis}
            processing={false}
            error={null}
          />
        </div>
      )}
      <div className="mt-4 relative">
        {processing && (
          <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        )}
        <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          <div className="flex flex-col h-full">
            <h2 className="text-lg font-semibold mb-4">
              {lot?.project_name} ({selectedField?.name}: {lot?.lot_name})
            </h2>
            {processing ? (
              <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
                <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
              </div>
            ) : (
              <>
                <form className="space-y-4 flex-1">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="w-48">
                      <InputField
                        label="Fecha de siembra"
                        name="sowingDate"
                        type="date"
                        value={lot?.dates?.[0]?.sowing_date || ""}
                        onChange={(e) => {
                          const newDates = [...(lot?.dates || [])];
                          newDates[0] = {
                            ...newDates[0],
                            sowing_date: e.target.value,
                            sequence: 1,
                            harvest_date: newDates[0]?.harvest_date || "",
                          };
                          handleLotChange("dates", newDates);
                        }}
                        size="sm"
                      />
                    </div>
                    <div className="w-48">
                      <InputField
                        label="Fecha de cosecha"
                        placeholder="yyyy-dd-mm"
                        name="harvestDate"
                        type="date"
                        value={lot?.dates?.[0]?.harvest_date || ""}
                        onChange={(e) => {
                          const newDates = [...(lot?.dates || [])];
                          newDates[0] = {
                            ...newDates[0],
                            harvest_date: e.target.value,
                            sequence: 1,
                            sowing_date: newDates[0]?.sowing_date || "",
                          };
                          handleLotChange("dates", newDates);
                        }}
                        size="sm"
                      />
                    </div>
                    <div className="w-48">
                      <InputField
                        label=""
                        placeholder="yyyy-dd-mm"
                        name="sowingDate"
                        type="date"
                        value={lot?.dates?.[1]?.sowing_date || ""}
                        onChange={(e) => {
                          const newDates = [...(lot?.dates || [])];
                          newDates[1] = {
                            ...newDates[1],
                            sowing_date: e.target.value,
                            sequence: 2,
                            harvest_date: newDates[1]?.harvest_date || "",
                          };
                          handleLotChange("dates", newDates);
                        }}
                        size="sm"
                      />
                    </div>
                    <div className="w-48">
                      <InputField
                        label=""
                        placeholder="yyyy-dd-mm"
                        name="harvestDate"
                        type="date"
                        value={lot?.dates?.[1]?.harvest_date || ""}
                        onChange={(e) => {
                          const newDates = [...(lot?.dates || [])];
                          newDates[1] = {
                            ...newDates[1],
                            harvest_date: e.target.value,
                            sequence: 2,
                            sowing_date: newDates[1]?.sowing_date || "",
                          };
                          handleLotChange("dates", newDates);
                        }}
                        size="sm"
                      />
                    </div>
                    <div className="w-48">
                      <InputField
                        label=""
                        placeholder="yyyy-dd-mm"
                        name="sowingDate"
                        type="date"
                        value={lot?.dates?.[2]?.sowing_date || ""}
                        onChange={(e) => {
                          const newDates = [...(lot?.dates || [])];
                          newDates[2] = {
                            ...newDates[2],
                            sowing_date: e.target.value,
                            sequence: 3,
                            harvest_date: newDates[2]?.harvest_date || "",
                          };
                          handleLotChange("dates", newDates);
                        }}
                        size="sm"
                      />
                    </div>
                    <div className="w-48">
                      <InputField
                        label=""
                        placeholder="yyyy-dd-mm"
                        name="harvestDate"
                        type="date"
                        value={lot?.dates?.[2]?.harvest_date || ""}
                        onChange={(e) => {
                          const newDates = [...(lot?.dates || [])];
                          newDates[2] = {
                            ...newDates[2],
                            harvest_date: e.target.value,
                            sequence: 3,
                            sowing_date: newDates[2]?.sowing_date || "",
                          };
                          handleLotChange("dates", newDates);
                        }}
                        size="sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <hr />
                    </div>
                    <div>
                      <InputField
                        label="Lote"
                        name="lotName"
                        type="text"
                        value={lot?.lot_name || ""}
                        onChange={(e) =>
                          handleLotChange("lot_name", e.target.value)
                        }
                        size="sm"
                      />
                    </div>
                    <div>
                      <InputField
                        label="Hectáreas"
                        name="hectares"
                        type="number"
                        value={lot?.sowed_area || ""}
                        onChange={(e) =>
                          handleLotChange("sowed_area", e.target.value)
                        }
                        size="sm"
                      />
                    </div>
                    <div>
                      <SelectField
                        label="Cultivo Anterior"
                        placeholder="Seleccione cultivo"
                        name="previousCrop"
                        options={crops}
                        value={String(lot?.previous_crop_id || "")}
                        onChange={(e) =>
                          handleLotChange(
                            "previous_crop_id",
                            Number(e.target.value)
                          )
                        }
                        fullWidth
                        size="sm"
                      />
                    </div>
                    <div>
                      <SelectField
                        label="Cultivo Actual"
                        placeholder="Seleccione cultivo"
                        name="currentCrop"
                        options={crops}
                        value={String(lot?.current_crop_id || "")}
                        onChange={(e) =>
                          handleLotChange(
                            "current_crop_id",
                            Number(e.target.value)
                          )
                        }
                        size="sm"
                        fullWidth
                      />
                    </div>
                    <div>
                      <SelectField
                        label="Periodo"
                        name="season"
                        value={lot?.season || ""}
                        onChange={(e) =>
                          handleLotChange("season", e.target.value)
                        }
                        options={seasons}
                        size="sm"
                        fullWidth
                      />
                    </div>
                    <div>
                      <InputField
                        label="Variedad"
                        name="variety"
                        type="text"
                        value={lot?.variety || ""}
                        onChange={(e) =>
                          handleLotChange("variety", e.target.value)
                        }
                        size="sm"
                      />
                    </div>
                  </div>
                  {errorMessage && errorMessage !== "" && (
                    <div className="flex items-center gap-3 p-4 mb-4 text-sm text-red-800 rounded-xl bg-red-50 border border-red-200" role="alert">
                      <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" /></svg>
                      <div className="flex-1"><span className="font-semibold">Error:</span> {errorMessage}</div>
                      <button type="button" className="text-red-400 hover:text-red-600 transition-colors" aria-label="Close" onClick={() => setErrorMessage("")}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" /></svg>
                      </button>
                    </div>
                  )}
                  {successMessage && successMessage !== "" && (
                    <div className="flex items-center gap-3 p-4 mb-4 text-sm text-emerald-800 rounded-xl bg-emerald-50 border border-emerald-200" role="alert">
                      <svg className="w-5 h-5 text-emerald-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" /></svg>
                      <div className="flex-1"><span className="font-semibold">{successMessage}</span></div>
                      <button type="button" className="text-emerald-400 hover:text-emerald-600 transition-colors" aria-label="Close" onClick={() => setSuccessMessage("")}>
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 14 14"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" /></svg>
                      </button>
                    </div>
                  )}
                </form>
                <div className="flex justify-end gap-2 mt-auto pt-6 bg-white">
                  <Button
                    variant="outlineGray"
                    className="text-base font-medium"
                    onClick={() => setDrawerOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    variant="success"
                    className="text-base font-medium"
                    onClick={handleSave}
                  >
                    Guardar
                  </Button>
                </div>
              </>
            )}
          </div>
        </Drawer>
        {!message && !error && (
          <DataTable
            data={filteredLots}
            columns={columnsToShow}
            filters={columnsFilters}
            onFilterChange={handleFilterChange}
            enableFilters={true}
            headerComponent={
              <LotsHeader
                fieldsAmount={fields.length}
                lotsAmount={lots.length}
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                setVisibleColumns={setVisibleColumns}
                columns={columns}
                harvestColumns={harvestColumns}
                commercializationColumns={commercializationColumns}
                allColumns={allColumns}
              />
            }
            onEdit={(item) => {
              setLot(item);
              setSuccessMessage("");
              setDrawerOpen(true);
            }}
            message="No hay lotes disponibles"
            pagination={{
              page: currentPage,
              perPage: itemsPerPage,
              total: filteredLots.length,
              onPageChange: handlePageChange,
            }}
          />
        )}
      </div>
    </div>
  );
}

type Column<T> = {
  key: keyof T;
  header: string;
  render?: (value: any, item: T) => React.ReactNode;
  // --- Agregamos las propiedades faltantes ---
  filterable?: boolean;
  filterType?: "text" | "number" | "select" | "date";
  filterOptions?: string[];
};

export default Lots;
