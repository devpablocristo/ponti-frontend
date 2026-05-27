import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Briefcase, Download, Plus, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../components/feedback/Skeleton";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { notify } from "@/lib/notify";
import { ArchivedDrawer } from "../../../components/crud/ArchivedDrawer";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../components/crud/ResponsiveTable";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { useBulkActions } from "../../../hooks/useBulkActions";
import CreateSupplyMovement from "./CreateSupplyMovement";
import ImportSupplyMovements from "./ImportSupplyMovements";
import useSupplyMovements from "../../../hooks/useSupplyMovements";
import { SupplyMovement } from "../../../hooks/useSupplyMovements/types";
import { Column } from "../types";
import { apiClient } from "@/api/client";
import { formatNumberAr, normalizeDate } from "../utils";
import { buildTimestampedFilename, downloadBlob, EXCEL_ACCEPT } from "../fileTransfer";
import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { getGuardedWorkspaceActionWarning } from "@/lib/workspaceActionGuards";
import {
  matchesSelectFilter,
  matchesTextFilter,
} from "@/lib/tableFilters";
import ArchivedSupplyMovements from "./ArchivedSupplyMovements";

import { SupplyMovementsIndicators } from "./_components/SupplyMovementsIndicators";

export function SupplyMovements() {
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  // Archivo elegido por el usuario en el file-picker del botón Importar.
  // Lo pasamos al drawer `ImportSupplyMovements` que parsea + previsualiza
  // + permite tildar por fila antes de confirmar. Misma mecánica que OT/Lotes.
  const [importFile, setImportFile] = useState<File | null>(null);
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

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  useEffect(() => {
    if (deleteError) notify.error(deleteError);
  }, [deleteError]);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const pagination = usePagination({ perPage: 10 });
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});
  const [editingMovement, setEditingMovement] = useState<SupplyMovement | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionErrorMessage, setActionErrorMessage] = useState<string | null>(
    null
  );
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [exportErrorMessage, setExportErrorMessage] = useState<string | null>(
    null
  );

  // Estado → toast (patrón en CreateOrder.tsx).
  useEffect(() => {
    if (warningMessage) notify.warning(warningMessage);
  }, [warningMessage]);
  useEffect(() => {
    if (successMessage) notify.success(successMessage);
  }, [successMessage]);
  useEffect(() => {
    if (actionErrorMessage) notify.error(actionErrorMessage);
  }, [actionErrorMessage]);
  useEffect(() => {
    if (exportErrorMessage) notify.error(exportErrorMessage);
  }, [exportErrorMessage]);

  // Aligned with BE `UpdateSupplyMovement`: rechaza editar movimientos internos
  // (afectan stock en dos proyectos a la vez) y movimientos de stock (overwrite
  // del conteo real, no metadata editable). Las filas "Consumo OT" tampoco son
  // editables — son una vista virtual de `workorder_items` desde el BE.
  const isMovementEditionBlocked = (entryType?: string) => {
    const normalized = String(entryType ?? "")
      .toLowerCase()
      .trim();

    return (
      normalized === "movimiento interno" ||
      normalized === "movimiento interno de entrada" ||
      normalized === "movimiento interno entrada" ||
      normalized === "stock" ||
      normalized === "consumo ot"
    );
  };

  const handleImportFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!projectId) {
      setWarningMessage("Para importar insumos, seleccioná un proyecto.");
      return;
    }

    setWarningMessage(null);
    setActionErrorMessage(null);
    setSuccessMessage(null);
    setImportFile(file);
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

        if (Array.isArray(value)) {
          return matchesSelectFilter(item[k as keyof SupplyMovement], value);
        }

        return matchesTextFilter(item[k as keyof SupplyMovement], value);
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
          return matchesSelectFilter(rawValue, value);
        }

        return matchesTextFilter(rawValue, value);
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
        render: (value) => {
          const text = String(value ?? "");
          if (text === "Movimiento interno entrada") {
            return (
              <span className="inline-flex items-center gap-1.5">
                <span>{text}</span>
                <span
                  title="Generado automáticamente al recibir un movimiento interno"
                  className="inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600"
                >
                  Auto
                </span>
              </span>
            );
          }
          if (text === "Consumo OT") {
            return (
              <span className="inline-flex items-center gap-1.5">
                <span>{text}</span>
                <span
                  title="Insumo consumido por una orden de trabajo (workorder_items). No editable desde acá."
                  className="inline-flex items-center rounded-md bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200"
                >
                  OT
                </span>
              </span>
            );
          }
          return text;
        },
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
          <span className="font-bold text-gray-900 dark:text-gray-100">{String(value ?? "")}</span>
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
          return <span className="font-bold text-gray-900 dark:text-gray-100">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
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
          return <span className="font-bold text-gray-900 dark:text-gray-100">{isNaN(num) ? "—" : `u$ ${formatNumberAr(num)}`}</span>;
        },
      },
    ],
    [supplyMovements, columnsFilters]
  );

  const { projectId, filters, customers, selectedCustomer, selectedCampaignId, selectedField, hasWorkspaceSelection } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);

  const supplyMovementQuery = useMemo(
    () =>
      buildWorkspaceQuery({
        customerId: selectedCustomer?.id,
        projectId,
        campaignId: selectedCampaignId,
        fieldId: selectedField?.id,
      }),
    [projectId, selectedCampaignId, selectedCustomer?.id, selectedField?.id]
  );

  useEffect(() => {
    if (!hasWorkspaceSelection) return;

    getSupplyMovements(supplyMovementQuery);
  }, [getSupplyMovements, hasWorkspaceSelection, supplyMovementQuery]);

  useEffect(() => {
    if (deleteError) {
      setActionErrorMessage(deleteError);
      setSuccessMessage(null);
    }
  }, [deleteError]);

  useEffect(() => {
    if (deleteResult) {
      setSuccessMessage("Movimiento archivado con éxito.");
      setActionErrorMessage(null);
      if (!hasWorkspaceSelection) return;
      getSupplyMovements(supplyMovementQuery);
    }
  }, [deleteResult, getSupplyMovements, hasWorkspaceSelection, supplyMovementQuery]);

  useEffect(() => {
    if (errorCreation) {
      setActionErrorMessage(errorCreation);
      setSuccessMessage(null);
    }
  }, [errorCreation]);

  const handleEdit = (movement: SupplyMovement) => {
    if (isMovementEditionBlocked(movement.entry_type)) {
      setActionErrorMessage(
        `No se puede editar un ${movement.entry_type}: afecta stock en dos proyectos o es un conteo de stock terminal.`,
      );
      setSuccessMessage(null);
      return;
    }
    setActionErrorMessage(null);
    setSuccessMessage(null);
    setEditingMovement(movement);
    setDrawerOpen(true);
  };

  const handleProductCreated = () => {
    pagination.resetPage();
    if (!hasWorkspaceSelection) return;
    getSupplyMovements(supplyMovementQuery);
  };

  const handleImported = useCallback(
    (message: string) => {
      setSuccessMessage(message);
      setActionErrorMessage(null);
      setImportDrawerOpen(false);
      setImportFile(null);
      // Refrescamos la lista con la query actual para que los nuevos
      // movimientos aparezcan inmediatamente. Sin esto, el usuario tiene
      // que hacer un filtro o navegar para verlos.
      if (hasWorkspaceSelection) {
        getSupplyMovements(supplyMovementQuery);
      }
    },
    [hasWorkspaceSelection, supplyMovementQuery, getSupplyMovements],
  );

  const filteredMovements = useMemo(() => {
    if (!hasWorkspaceSelection) return [];

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


        if (Array.isArray(value)) {
          return matchesSelectFilter(rawValue, value);
        }

        return matchesTextFilter(rawValue, value);
      });
    });
  }, [supplyMovements, columnsFilters, hasWorkspaceSelection]);

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
      if (!hasWorkspaceSelection) return;
      getSupplyMovements(supplyMovementQuery);
    },
  });

  const selectColumn = useMemo<Column<SupplyMovement>>(
    () =>
      makeSelectColumn<SupplyMovement>(
        bulk,
        (item) => item.supply_name,
        movementEntity,
        (item) => !isMovementEditionBlocked(item.entry_type),
      ),
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
      setWarningMessage("Para exportar movimientos de insumos, seleccioná un proyecto.");
      return;
    }

    try {
      setWarningMessage(null);
      setExportErrorMessage(null);
      const response = await apiClient.get<Blob>(
        `/supply_movements/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      downloadBlob(response, buildTimestampedFilename("insumos", "csv", projectId));
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
            accept: EXCEL_ACCEPT,
            onFileChange: handleImportFile,
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
            onClick: () => setArchivedDrawerOpen(true),
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => {
              const warning = getGuardedWorkspaceActionWarning(
                { projectId },
                ["project"],
                "crear",
                "un movimiento de insumos",
              );
              if (warning) {
                setWarningMessage(warning);
                return;
              }
              setWarningMessage(null);
              setEditingMovement(null);
              setDrawerOpen(true);
            },

          },
        ]}
      />
      {hasWorkspaceSelection && !error && (
        <div className="my-3">
          <SupplyMovementsIndicators summary={derivedSummary} />
        </div>
      )}
      <div className="mt-3 relative">
        <LoadingOverlay show={hasWorkspaceSelection && processing && filteredMovements.length > 0} />

        {projectId && (
          <>
            <CreateSupplyMovement
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
                if (!hasWorkspaceSelection) return;
                getSupplyMovements(supplyMovementQuery);
              }}
            />

            <ImportSupplyMovements
              open={importDrawerOpen}
              file={importFile}
              projectId={projectId}
              onClose={() => {
                setImportDrawerOpen(false);
                setImportFile(null);
              }}
              onImported={handleImported}
            />
          </>
        )}
        <ArchivedDrawer
          open={archivedDrawerOpen}
          title="Movimientos archivados"
          onClose={() => setArchivedDrawerOpen(false)}
        >
          <ArchivedSupplyMovements
            onAfterRestore={() => getSupplyMovements(supplyMovementQuery)}
          />
        </ArchivedDrawer>
        {!hasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver insumos"
            description="El listado no carga datos globales automáticamente."
          />
        ) : processing && filteredMovements.length === 0 ? (
          <TableSkeleton rows={10} columns={columnsWithSelection.length} />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={filteredMovements.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={movementEntity}
            />
            <ResponsiveTable<SupplyMovement>
              data={filteredMovements}
              rowStyle="softZebra"
              columns={columnsWithSelection}
              filters={columnsFilters}
              onFilterChange={handleFilterChange}
              enableFilters={true}
              message="Todavía no hay movimientos de insumos con los filtros actuales."
              pagination={pagination.buildPagination(filteredMovements.length)}
              rowKey={(m, i) => `${m.id ?? i}`}
              emptyMessage="Todavía no hay movimientos de insumos con los filtros actuales."
            />
          </>
        )}
      </div>
    </div>
  );
}
