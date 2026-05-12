import { ChangeEvent, useEffect, useMemo, useState } from "react";
import { Archive, Download, Plus, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../components/feedback/SuccessBanner";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { DataTable, usePagination } from "@/lib/dataDisplay";
import { IndicatorCard } from "../../../components/Card/IndicatorCard";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { useBulkActions } from "../../../hooks/useBulkActions";
import CreateItem from "./CreateItem";
import ImportSupplyMovements from "./ImportSupplyMovements";
import useSupplyMovements from "../../../hooks/useSupplyMovement";
import { SupplyMovement } from "../../../hooks/useSupplyMovement/types";
import { Summary } from "@/api/types";
import { Column } from "../types";
import { apiClient } from "@/api/client";
import { formatNumberAr, normalizeDate } from "../utils";
import { buildTimestampedFilename, downloadBlob, SPREADSHEET_ACCEPT } from "../fileTransfer";

function ItemsIndicators({ summary }: { summary?: Summary }) {
  const safeSummary = summary ?? {
    total_kg: 0,
    total_lt: 0,
    total_usd: 0,
  };
  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <IndicatorCard
          title="Total invertido Kg"
          value={formatNumberAr(safeSummary.total_kg) + " Kg"}
          color="gray"
        />
        <IndicatorCard
          title="Total invertido Lt"
          value={formatNumberAr(safeSummary.total_lt) + " Lt"}
          color="gray"
        />
        <IndicatorCard
          title="Total u$ / Neto"
          value={"u$ " + formatNumberAr(safeSummary.total_usd)}
          color="red"
        />
      </div>
    </div>
  );
}

export function Products() {
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const {
    getSupplyMovements,
    supplyMovements,
    archiveSupplyMovement,
    deleteError,
    deleteResult,
    processing,
    error,
    errorCreation,
  } = useSupplyMovements();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const pagination = usePagination({ perPage: 10 });
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const [editingMovement, setEditingMovement] = useState<SupplyMovement | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(
    null
  );

  const isInternalMovementEditionBlocked = (entryType?: string) => {
    const normalized = String(entryType ?? "")
      .toLowerCase()
      .trim();

    return (
      normalized === "movimiento interno" ||
      normalized === "movimiento interno de entrada" ||
      normalized === "movimiento interno entrada"
    );
  };

  const handleImportFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    if (!file) return;

    if (!projectId) {
      setActionErrorMessage("Seleccione un proyecto antes de importar insumos.");
      return;
    }

    setActionErrorMessage(null);
    setSuccessMessage(null);
    setPendingImportFile(file);
    setImportDrawerOpen(true);
  };

  function getFilterOptionsForColumn(
    key: keyof SupplyMovement,
    data: SupplyMovement[],
    filters: Record<string, unknown>
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
    filters: Record<string, unknown>
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
        render: (value) => <strong>{String(value ?? "")}</strong>,
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "reference_number",
          supplyMovements,
          columnsFilters
        ),
      },
      {
        key: "origin_project_name",
        header: "Proyecto origen",
        filterable: true,
        filterType: "select",
        filterOptions: getFilterOptionsForColumn(
          "origin_project_name",
          supplyMovements,
          columnsFilters
        ),
        render: (value) => {
          const label = typeof value === "string" ? value : value == null ? "" : String(value);
          if (!label) {
            return <span className="block w-full text-center">—</span>;
          }
          return <span className="no-underline">{label}</span>;
        },
      },
      {
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
        render: (value) => <strong>{String(value ?? "")}</strong>,
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
        render: (value) => (
          <span className="font-bold text-gray-900">{String(value ?? "")}</span>
        ),
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
        render: (value) => {
          const num = Number(value);
          return <span className="font-bold text-gray-900">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
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
        render: (value) => {
          const num = Number(value);
          return <span className="font-bold text-gray-900">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
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
      setActionErrorMessage(deleteError);
      setSuccessMessage(null);
    }
  }, [deleteError]);

  useEffect(() => {
    if (deleteResult && projectId) {
      setSuccessMessage("Movimiento archivado con éxito.");
      setActionErrorMessage(null);
      getSupplyMovements(projectId);
    }
  }, [deleteResult, projectId, getSupplyMovements]);

  useEffect(() => {
    if (errorCreation) {
      setActionErrorMessage(errorCreation);
      setSuccessMessage(null);
    }
  }, [errorCreation]);

  const handleEdit = (movement: SupplyMovement) => {
    if (isInternalMovementEditionBlocked(movement.entry_type)) return;
    setActionErrorMessage(null);
    setSuccessMessage(null);
    setEditingMovement(movement);
    setDrawerOpen(true);
  };

  const handleProductCreated = () => {
    if (!projectId) return;
    pagination.resetPage();
    getSupplyMovements(projectId);
  };

  const handleImported = (message: string) => {
    if (!projectId) return;
    setSuccessMessage(message);
    setActionErrorMessage(null);
    pagination.resetPage();
    getSupplyMovements(projectId);
    setPendingImportFile(null);
    setImportDrawerOpen(false);
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
        // 🟢 NUMÉRICOS (solo campos realmente numéricos)
        if (["price_usd", "total_usd"].includes(key)) {
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

  const movementEntity = useMemo(
    () => ({
      article: "el",
      singular: "movimiento",
      plural: "movimientos",
    }),
    [],
  );

  const bulk = useBulkActions<SupplyMovement>({
    items: filteredMovements,
    entity: movementEntity,
    archive: projectId
      ? (id) => archiveSupplyMovement(id, projectId)
      : undefined,
    onEdit: handleEdit,
    onAfter: () => {
      if (projectId) getSupplyMovements(projectId);
    },
  });

  const selectColumn = useMemo<Column<SupplyMovement>>(
    () => makeSelectColumn<SupplyMovement>(bulk, (item) => item.supply_name, movementEntity),
    [bulk, movementEntity],
  );

  const columnsWithSelection = useMemo(
    () => [selectColumn, ...columns],
    [columns, selectColumn],
  );

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
    if (!projectId) {
      setExportErrorMessage("Seleccione un proyecto antes de exportar insumos.");
      return;
    }

    try {
      setExportErrorMessage(null);
      const response = await apiClient.get<Blob>(
        `/supply_movements/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      downloadBlob(response, buildTimestampedFilename("insumos", "xlsx", projectId));
    } catch {
      setExportErrorMessage("No se pudo exportar el listado de insumos.");
    }
  };

  const handleFilterChange = (filters: Record<string, unknown>) => {
    setColumnsFilters(filters);
    pagination.resetPage();
  };



  return (
    <div>
      <AppFilterBar
        filters={filters}
        actions={[
          {
            label: "Importar",
            icon: <Download className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            accept: SPREADSHEET_ACCEPT,
            onFileChange: handleImportFileChange,
          },
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => handleExport(),
          },
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            href: "/admin/products/archived",
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => {
              if (!projectId) {
                setActionErrorMessage("Seleccione un proyecto antes de crear un insumo.");
                return;
              }
              setEditingMovement(null);
              setDrawerOpen(true);
            },

          },
        ]}
      />
      <SuccessBanner message={successMessage} variant="outlined" />
      {!error && (
        <div className="my-3">
          <ItemsIndicators summary={derivedSummary} />
        </div>
      )}
      <div className="mt-3 relative">
        <LoadingOverlay show={processing} />

        <ErrorBanner
          message={actionErrorMessage || exportErrorMessage || error}
          variant="outlined"
          prefix="Error:"
        />
        {projectId && (
          <>
            <CreateItem
              customers={customers}
              drawerOpen={drawerOpen}
              setDrawerOpen={setDrawerOpen}
              projectId={projectId}
              onProductCreated={handleProductCreated}
              editingMovement={editingMovement}
              onEditSaved={() => {
                setEditingMovement(null);
                setSuccessMessage("Movimiento actualizado con éxito.");
                setActionErrorMessage(null);
                if (projectId) getSupplyMovements(projectId);
              }}
            />

            {importDrawerOpen && (
              <ImportSupplyMovements
                open={importDrawerOpen}
                file={pendingImportFile}
                projectId={projectId}
                onClose={() => {
                  setImportDrawerOpen(false);
                  setPendingImportFile(null);
                }}
                onImported={handleImported}
              />
            )}
          </>
        )}
        <BulkSelectionPanel
          selectedCount={bulk.selectedCount}
          totalCount={filteredMovements.length}
          allSelected={bulk.allSelected}
          onToggleAll={bulk.toggleAll}
          onClear={bulk.clear}
          actions={bulk.actions}
          entity={movementEntity}
        />
        <DataTable
          data={filteredMovements}
          rowStyle="softZebra"
          columns={columnsWithSelection}
          filters={columnsFilters}
          onFilterChange={handleFilterChange}
          enableFilters={true}
          message="No hay movimientos disponibles"
          pagination={pagination.buildPagination(filteredMovements.length)}
        />
      </div>
    </div>
  );
}
