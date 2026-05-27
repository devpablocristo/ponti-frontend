import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../components/crud/ResponsiveTable";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { Archive, Briefcase, Download, Plus, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../components/feedback/Skeleton";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../components/crud/ArchivedDrawer";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../hooks/useBulkActions";
import { LOT_ENTITY as ENTITY } from "../entities";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/api/client";
import { DrawerShell } from "../../../components/Drawer/DrawerShell";
import CustomerEditor from "../master-data/customers/CustomerEditor";
import useLots from "../../../hooks/useLots";
import { LotsData } from "../../../hooks/useLots/types";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { Column } from "../types";
import { LotsHeader } from "./components/LotsHeader";
import { LotsIndicators } from "./components/LotsIndicators";
import {
  calculateLotIndicators,
  filterLots,
  getLotFilterOptions,
  hasActiveLotFilters,
  mapApiLotIndicators,
} from "./lotTableUtils";
import { useLotColumns } from "./useLotColumns";
import { buildTimestampedFilename, downloadBlob, EXCEL_ACCEPT } from "../fileTransfer";
import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { getGuardedWorkspaceActionWarning } from "@/lib/workspaceActionGuards";
import ArchivedLots from "../master-data/lots/ArchivedLots";
import {
  parseAndResolveLotsCsv,
  LotPreviewRow,
  ImportLotsResult,
} from "./importLots";
import ImportLotsPreview from "./ImportLotsPreview";
import { notify } from "@/lib/notify";

function Lots() {
  const pagination = usePagination({ perPage: 10 });
  const resetPage = pagination.resetPage;

  const [editorContext, setEditorContext] = useState<{
    initialProjectId: number | null;
  } | null>(null);
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  // Estado → toast (ver patrón en CreateOrder.tsx). El error puede venir del
  // estado local o del hook `useLots()`; ambos se publican al toaster.
  useEffect(() => {
    if (message) notify.warning(message);
  }, [message]);
  useEffect(() => {
    if (successMessage) notify.success(successMessage);
  }, [successMessage]);
  useEffect(() => {
    if (errorMessage) notify.error(errorMessage);
  }, [errorMessage]);

  // Errores que vienen del hook `useLots()` se publican al mismo toaster.

  // Drawer del preview del import. Mismo patrón que `/admin/work-orders`:
  // parseamos el CSV, resolvemos lotes+cultivos, mostramos la tabla y dejamos
  // al usuario destildar las filas con error antes de PUTear.
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importRows, setImportRows] = useState<LotPreviewRow[]>([]);
  const [importGlobalErrors, setImportGlobalErrors] = useState<string[]>([]);
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>(
    {}
  );

  const {
    getLots,
    getLotsKpis,
    lots,
    getCrops,
    crops,
    result,
    processing,
    error,
    kpis,
    processingKpis,
    errorKpis,
    archiveLot,
  } = useLots();

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);


  const {
    selectedCustomer,
    projectId,
    selectedCampaignId,
    selectedField,
    fields,
    filters,
    hasWorkspaceSelection,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const selectedFieldId = selectedField?.id;

  const loadCurrentLots = useCallback(() => {
    if (!hasWorkspaceSelection) return;

    const query = buildWorkspaceQuery({
      customerId: selectedCustomer?.id,
      projectId,
      campaignId: selectedCampaignId,
      fieldId: selectedFieldId,
    });
    getLots(query);
    getLotsKpis(query);
  }, [
    getLots,
    getLotsKpis,
    hasWorkspaceSelection,
    projectId,
    selectedCampaignId,
    selectedCustomer?.id,
    selectedFieldId,
  ]);

  const reloadFromFirstPage = useCallback(() => {
    resetPage();
    loadCurrentLots();
  }, [loadCurrentLots, resetPage]);

  const handleFilterChange = useCallback(
    (filters: Record<string, unknown>) => {
      setColumnsFilters(filters);
      resetPage();
    },
    [resetPage]
  );

  const getFilterOptionsForColumn = useCallback(
    (columnKey: keyof LotsData) =>
      getLotFilterOptions(lots, columnsFilters, columnKey),
    [columnsFilters, lots]
  );

  const onSuccessEdit = useCallback(() => {
    reloadFromFirstPage();
  }, [reloadFromFirstPage]);

  const { columns, harvestColumns, commercializationColumns } = useLotColumns({
    getFilterOptionsForColumn,
    onSuccessEdit,
  });

  const allColumns = useMemo(
    () =>
      Array.from(
        new Map<keyof LotsData, Column<LotsData>>(
          [...columns, ...harvestColumns, ...commercializationColumns].map(
            (column) => [column.key, column]
          )
        ).values()
      ),
    [columns, commercializationColumns, harvestColumns]
  );

  const defaultColumnKeys = useMemo(
    () => columns.map((column) => column.key),
    [columns]
  );
  const defaultColumnKeysRef = useRef(defaultColumnKeys);
  const [selectedColumns, setSelectedColumns] = useState<Array<keyof LotsData>>(
    () => defaultColumnKeys
  );
  const [visibleColumns, setVisibleColumns] = useState<Array<keyof LotsData>>(
    () => defaultColumnKeys
  );

  useEffect(() => {
    defaultColumnKeysRef.current = defaultColumnKeys;
  }, [defaultColumnKeys]);

  useEffect(() => {
    setVisibleColumns((previousColumns) =>
      previousColumns.length === 0 ? defaultColumnKeysRef.current : previousColumns
    );
  }, [columns]);

  useEffect(() => {
    getCrops();
  }, [getCrops]);

  useEffect(() => {
    setColumnsFilters({});
    resetPage();
  }, [
    projectId,
    resetPage,
    selectedCampaignId,
    selectedCustomer,
    selectedFieldId,
  ]);

  useEffect(() => {
    setMessage("");
    reloadFromFirstPage();
  }, [
    projectId,
    reloadFromFirstPage,
    selectedCampaignId,
    selectedCustomer,
    selectedFieldId,
  ]);

  useEffect(() => {
    if (!result) return;
    setSuccessMessage(result);
    reloadFromFirstPage();
  }, [reloadFromFirstPage, result]);

  const filteredLots = useMemo(
    () => (hasWorkspaceSelection ? filterLots(lots, columnsFilters) : []),
    [columnsFilters, hasWorkspaceSelection, lots]
  );

  const calculatedKpis = useMemo(
    () => calculateLotIndicators(filteredLots),
    [filteredLots]
  );
  const hasColumnFilters = useMemo(
    () => hasActiveLotFilters(columnsFilters),
    [columnsFilters]
  );
  const indicators = useMemo(
    () =>
      hasWorkspaceSelection
        ? hasColumnFilters
          ? calculatedKpis
          : mapApiLotIndicators(kpis)
        : calculatedKpis,
    [calculatedKpis, hasColumnFilters, hasWorkspaceSelection, kpis]
  );
  const fieldsAmount = hasWorkspaceSelection ? fields.length : 0;
  const lotsAmount = filteredLots.length;

  const openEditDrawer = useCallback((item: LotsData) => {
    setSuccessMessage("");
    setErrorMessage("");
    setEditorContext({ initialProjectId: item.project_id });
  }, []);

  const bulk = useBulkActions<LotsData>({
    items: filteredLots,
    entity: ENTITY,
    archive: archiveLot,
    onEdit: openEditDrawer,
    onAfter: reloadFromFirstPage,
  });

  const selectColumn = useMemo<Column<LotsData>>(
    () => makeSelectColumn<LotsData>(bulk, (l) => l.lot_name, ENTITY),
    [bulk],
  );

  const columnsToShow = useMemo(
    () => [
      selectColumn,
      ...allColumns.filter((column) => visibleColumns.includes(column.key)),
    ],
    [allColumns, selectColumn, visibleColumns]
  );

  const handleCreateLot = () => {
    const warning = getGuardedWorkspaceActionWarning(
      {
        customerId: selectedCustomer?.id,
        projectId,
        campaignId: selectedCampaignId,
        fieldId: selectedFieldId,
      },
      ["customer", "project", "campaign", "field"],
      "crear",
      "un lote",
    );

    if (warning) {
      setMessage(warning);
      return;
    }

    setEditorContext({ initialProjectId: selectedField?.project_id ?? projectId ?? null });
  };

  const handleExport = async () => {
    if (!projectId) {
      setMessage("Para exportar lotes, seleccioná un proyecto.");
      return;
    }

    try {
      setMessage("");
      const response = await apiClient.get<Blob>(
        `/lots/export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      downloadBlob(response, buildTimestampedFilename("lotes", "csv", projectId));
    } catch {
      setErrorMessage("No se pudo exportar el listado de lotes.");
    }
  };

  const handleImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!projectId) {
      setMessage("Para importar lotes, seleccioná un proyecto.");
      return;
    }

    setMessage("");
    setErrorMessage("");
    setSuccessMessage("");

    try {
      const { rows, globalErrors } = await parseAndResolveLotsCsv({
        file,
        projectId,
        fallbackLots: lots,
        crops,
      });

      if (rows.length === 0 && globalErrors.length > 0) {
        setErrorMessage(globalErrors.join(" "));
        return;
      }

      // Abrimos el drawer aunque haya globalErrors: el usuario los ve arriba
      // y puede igual revisar las filas.
      setImportRows(rows);
      setImportGlobalErrors(globalErrors);
      setImportDrawerOpen(true);
    } catch {
      setErrorMessage("No se pudo procesar el Excel. Use .xlsx válido.");
    }
  };

  const handleImportCompleted = (result: ImportLotsResult) => {
    setImportDrawerOpen(false);
    setImportRows([]);
    setImportGlobalErrors([]);

    if (result.imported > 0) {
      setSuccessMessage(
        result.errors.length
          ? `Se crearon ${result.imported} lotes. Se omitieron ${result.errors.length} filas.`
          : `Se crearon ${result.imported} lotes correctamente.`,
      );
      reloadFromFirstPage();
    }
    if (result.errors.length > 0) {
      setErrorMessage(result.errors.slice(0, 5).join(" "));
    }
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
            onFileChange: handleImport,
          },
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: handleExport,
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
            onClick: handleCreateLot,
          },
        ]}
      />

      {hasWorkspaceSelection && !message && !error ? (
        <div className="my-3">
          <LotsIndicators
            kpis={indicators}
            fieldsAmount={fieldsAmount}
            lotsAmount={lotsAmount}
            processing={!hasColumnFilters && processingKpis}
            error={!hasColumnFilters ? errorKpis : null}
          />
        </div>
      ) : null}

      <div className="relative mt-3">
        <LoadingOverlay show={processing && filteredLots.length > 0} />

        <DrawerShell
          open={editorContext !== null}
          onClose={() => setEditorContext(null)}
          title={editorContext?.initialProjectId ? "Editar Proyecto" : "Nuevo Proyecto"}
        >
          {editorContext && (
            <CustomerEditor
              embedded
              mode="project"
              customerId={selectedCustomer?.id ?? null}
              initialProjectId={editorContext.initialProjectId}
              onClose={() => {
                setEditorContext(null);
                loadCurrentLots();
              }}
            />
          )}
        </DrawerShell>

        <ArchivedDrawer
          open={archivedDrawerOpen}
          title="Lotes archivados"
          onClose={() => setArchivedDrawerOpen(false)}
        >
          <ArchivedLots onAfterRestore={loadCurrentLots} />
        </ArchivedDrawer>
        <ImportLotsPreview
          open={importDrawerOpen}
          onClose={() => {
            setImportDrawerOpen(false);
            setImportRows([]);
            setImportGlobalErrors([]);
          }}
          rows={importRows}
          globalErrors={importGlobalErrors}
          onCompleted={handleImportCompleted}
        />

        {!hasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver lotes."
            description="El listado no carga datos sin un workspace (cliente / proyecto / campaña / campo) seleccionado."
          />
        ) : processing && filteredLots.length === 0 ? (
          <TableSkeleton rows={10} columns={columnsToShow.length} />
        ) : !message && !error ? (
          <BulkSelectionPanel
            selectedCount={bulk.selectedCount}
            totalCount={filteredLots.length}
            allSelected={bulk.allSelected}
            onToggleAll={bulk.toggleAll}
            onClear={bulk.clear}
            actions={bulk.actions}
            entity={ENTITY}
          />
        ) : null}
        {hasWorkspaceSelection && !(processing && filteredLots.length === 0) && !message && !error ? (
          <ResponsiveTable<LotsData>
            data={filteredLots}
            columns={columnsToShow}
            filters={columnsFilters}
            onFilterChange={handleFilterChange}
            enableFilters
            headerComponent={
              <LotsHeader
                selectedColumns={selectedColumns}
                setSelectedColumns={setSelectedColumns}
                setVisibleColumns={setVisibleColumns}
                columns={columns}
                harvestColumns={harvestColumns}
                commercializationColumns={commercializationColumns}
                allColumns={allColumns}
              />
            }
            message="Todavía no hay lotes con los filtros actuales."
            pagination={pagination.buildPagination(filteredLots.length)}
            rowKey={(l, i) => `${l.id ?? i}`}
            emptyMessage="Todavía no hay lotes con los filtros actuales."
          />
        ) : null}
      </div>
    </div>
  );
}

export default Lots;
