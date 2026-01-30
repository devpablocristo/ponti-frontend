import { useEffect, useMemo, useState } from "react";
import { LoaderCircle } from "lucide-react";

import DataTable from "../../../components/Table/DataTable";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import FilterBar from "../../../layout/FilterBar/FilterBar";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import CreateItem from "./CreateItem";
import useSupplyMovements from "../../../hooks/useSupplyMovement";
import { SupplyMovement } from "../../../hooks/useSupplyMovement/types";
import { Summary } from "../../../hooks/useSupplyMovement/types";
import { Column } from "../types";
import APIClient from "../../../restclient/apiInstance";
import { formatNumberAr } from "../utils";

const request = new APIClient({
  timeout: 15000,
  baseURL: "/api",
});

function ItemsIndicators({ summary }: { summary?: Summary }) {
  const safeSummary = summary ?? {
    total_kg: 0,
    total_lt: 0,
    total_usd: 0,
  };
  return (
    <div className="flex flex-col md:flex-row gap-4">
      <IndicatorCard
        title="Total insumos invertidos Kg"
        value={formatNumberAr(safeSummary.total_kg) + " Kg"}
        color="gray"
        height="85px"
        width="220px"
      />
      <IndicatorCard
        title="Total insumos invertido Lts"
        value={formatNumberAr(safeSummary.total_lt) + " Lts"}
        color="gray"
        height="85px"
        width="220px"
      />
      <IndicatorCard
        title="Total u$ / Neto"
        value={formatNumberAr(safeSummary.total_usd) + " u$"}
        color="gray"
        height="85px"
        width="220px"
      />
    </div>
  );
}


export function Products() {
  const {
    getSupplyMovements,
    supplyMovements,
    deleteSupplyMovement,
    deleteError,
    deleteResult,
    processing,
    error,
  } = useSupplyMovements();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [columnsFilters, setColumnsFilters] = useState<Record<string, any>>({});
  const itemsPerPage = 10;

  const normalizeDate = (date: string) => {
    if (!date) return "";
    return date.includes("/")
      ? date.split("/").reverse().join("-") // DD/MM/YYYY → YYYY-MM-DD
      : date.split("T")[0]; // ISO → YYYY-MM-DD
  };

  function getFilterOptionsForColumn(
    key: keyof SupplyMovement,
    data: SupplyMovement[],
    filters: Record<string, any>
  ) {
    const otherFilters = { ...filters };
    delete otherFilters[key];

    const filtered = data.filter((item) =>
      Object.entries(otherFilters).every(([k, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        const itemValue = String(
          item[k as keyof SupplyMovement] ?? ""
        ).toLowerCase();

        if (Array.isArray(value)) {
          return value.some((v) =>
            itemValue.includes(String(v).toLowerCase())
          );
        }

        return itemValue.includes(String(value).toLowerCase());
      })
    );

    return [...new Set(filtered.map((i) => String(i[key] ?? "")))].filter(Boolean);
  }

  function getDateFilterOptions(
    data: SupplyMovement[],
    filters: Record<string, any>
  ) {
    const otherFilters = { ...filters };
    delete otherFilters.entry_date;

    const filtered = data.filter((item) =>
      Object.entries(otherFilters).every(([k, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) return true;

        const rawValue = item[k as keyof SupplyMovement];

        if (Array.isArray(value)) {
          return value.some((v) =>
            String(rawValue ?? "")
              .toLowerCase()
              .includes(String(v).toLowerCase())
          );
        }

        return String(rawValue ?? "")
          .toLowerCase()
          .includes(String(value).toLowerCase());
      })
    );

    return [
      ...new Set(
        filtered.map((m) => normalizeDate(String(m.entry_date)))
      ),
    ];
  }

  const columns: Column<SupplyMovement>[] = useMemo(
    () => [
      {
        key: "entry_type",
        header: "Ingreso",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "entry_type",
          supplyMovements,
          columnsFilters
        ),
      },
      {
        key: "reference_number",
        header: "N° Remito",
        render: (value: any) => <strong>{value}</strong>,
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "reference_number",
          supplyMovements,
          columnsFilters
        ),
      }, {
        key: "entry_date",
        header: "Fecha",
        filterable: true,
        filterType: "select",
        filterOptions: getDateFilterOptions(
          supplyMovements,
          columnsFilters
        ),
        render: (dateString) => {
          if (!dateString) return "";
          const datePart = normalizeDate(String(dateString));
          const [year, month, day] = datePart.split("-");
          return `${day}/${month}/${year}`;
        },
      },
      {
        key: "investor_name",
        header: "Inversor",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "investor_name",
          supplyMovements,
          columnsFilters
        ),
      },
      {
        key: "supply_name",
        header: "Insumo",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "supply_name",
          supplyMovements,
          columnsFilters
        ),
        render: (value: any) => <strong>{value}</strong>,
      },
      {
        key: "quantity",
        header: "Cantidad",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "quantity",
          supplyMovements,
          columnsFilters
        ),
        render: (value: any) => <strong>{value}</strong>,
      },
      {
        key: "category",
        header: "Rubro",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "category",
          supplyMovements,
          columnsFilters
        ),
      },
      {
        key: "type",
        header: "Tipo/Clase",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "type",
          supplyMovements,
          columnsFilters
        ),
      },
      {
        key: "provider_name",
        header: "Proveedor",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "provider_name",
          supplyMovements,
          columnsFilters
        ),
      },
      {
        key: "price_usd",
        header: "Precio u$",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "price_usd",
          supplyMovements,
          columnsFilters
        ),
        render: (value: any) => {
          const num = Number(value);
          return <strong>{isNaN(num) ? "-" : `u$${formatNumberAr(num)}`}</strong>;
        },
      },
      {
        key: "total_usd",
        header: "Total u$",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "total_usd",
          supplyMovements,
          columnsFilters
        ),
        render: (value: any) => {
          const num = Number(value);
          return isNaN(num) ? "-" : `u$${formatNumberAr(num)}`;
        },
      },
    ],
    [supplyMovements, columnsFilters]
  );

  const { projectId, filters, customers } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);

  useEffect(() => {
    if (!projectId) return;
    getSupplyMovements(projectId);
  }, [getSupplyMovements, projectId]);

  useEffect(() => {
    if (deleteError) {
      alert(deleteError);
    }
  }, [deleteError]);

  useEffect(() => {
    if (deleteResult && projectId) {
      getSupplyMovements(projectId);
    }
  }, [deleteResult, projectId]);

  const handleDelete = async (p: SupplyMovement) => {
    if (!projectId || !p.id) return;
    window.confirm("¿Estás seguro de eliminar este movimiento?") &&
      deleteSupplyMovement(p.id, projectId);
  };

  const handlePageChange = (newPage: number) => {
    setCurrentPage(newPage);
  };

  const handleProductCreated = () => {
    if (!projectId) return;
    setCurrentPage(1);
    getSupplyMovements(projectId);
  };


  const filteredMovements = useMemo(() => {
    return supplyMovements.filter((item) => {
      return Object.entries(columnsFilters).every(([key, value]) => {
        if (!value || (Array.isArray(value) && value.length === 0)) {
          return true;
        }

        const rawValue = item[key as keyof SupplyMovement];

        // 🟢 FECHA
        if (key === "entry_date") {
          const itemDate = normalizeDate(String(rawValue));
          if (Array.isArray(value)) {
            return value.some(
              (v) => normalizeDate(String(v)) === itemDate
            );
          }
          return normalizeDate(String(value)) === itemDate;
        }

        // 🟢 NUMÉRICOS
        if (["quantity", "price_usd", "total_usd"].includes(key)) {
          const num = Number(rawValue);
          if (Array.isArray(value)) {
            return value.some((v) => Number(v) === num);
          }
          return Number(value) === num;
        }

        // 🟢 STRING (multi + single)
        const itemValue = String(rawValue ?? "").toLowerCase();

        if (Array.isArray(value)) {
          return value.some((v) =>
            itemValue.includes(String(v).toLowerCase())
          );
        }

        return itemValue.includes(String(value).toLowerCase());
      });
    });
  }, [supplyMovements, columnsFilters]);

  const derivedSummary = useMemo(() => {
  let totalKg = 0;
  let totalLt = 0;
  let totalUsd = 0;

  filteredMovements.forEach((m) => {
    const quantityRaw = String(m.quantity ?? "").toLowerCase();
    const totalUsdValue = Number(m.total_usd) || 0;

    // Extraer número (320 de "320 kg")
    const numericQty = parseFloat(quantityRaw.replace(",", "."));

    if (!isNaN(numericQty)) {
      if (quantityRaw.includes("kg")) {
        totalKg += numericQty;
      }

      if (quantityRaw.includes("lt") || quantityRaw.includes("l ")) {
        totalLt += numericQty;
      }
    }

    totalUsd += totalUsdValue;
  });

  return {
    total_kg: totalKg,
    total_lt: totalLt,
    total_usd: totalUsd,
  };
}, [filteredMovements]);



  const handleExport = async () => {
    if (!projectId) return;

    try {
      const response = await request.get<Blob>(
        `/supply_movements/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      const url = window.URL.createObjectURL(response);

      const link = document.createElement("a");
      link.href = url;
      link.download = `insumos_${projectId}_${new Date().toISOString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
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
            label: "Exportar insumos",
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
            label: "+ Nuevo insumo",
            variant: "success",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => {
              setDrawerOpen(true);
            },
          },
        ]}
      />
      {!error && (
        <div className="my-4">
          <ItemsIndicators summary={derivedSummary} />
        </div>
      )}
      <div className="mt-4 relative">
        {processing && (
          <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        )}

        {error && (
          <div
            className="p-4 mb-4 text-sm text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
            role="alert"
          >
            <span className="font-medium">Error!</span> {error}
          </div>
        )}
        {projectId && (
          <CreateItem
            customers={customers}
            drawerOpen={drawerOpen}
            setDrawerOpen={setDrawerOpen}
            projectId={projectId}
            onProductCreated={handleProductCreated}
          />
        )}
        <DataTable
          data={filteredMovements}
          columns={columns}
          filters={columnsFilters}
          onFilterChange={handleFilterChange}
          enableFilters={true}
          onDelete={(item) => handleDelete(item)}
          message="No hay movimientos disponibles"
          pagination={{
            page: currentPage,
            perPage: itemsPerPage,
            total: filteredMovements.length,
            onPageChange: handlePageChange,
          }}
        />
      </div>
    </div>
  );
}
