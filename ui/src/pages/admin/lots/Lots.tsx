import { DataTable, usePagination } from "@/lib/dataDisplay";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { Archive, Briefcase, Download, Plus, Upload } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../components/feedback/SuccessBanner";
import { WarningBanner } from "../../../components/feedback/WarningBanner";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../components/crud/ArchivedDrawer";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../hooks/useBulkActions";
import { LOT_ENTITY as ENTITY } from "../entities";
import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { apiClient } from "@/api/client";
import { DrawerShell } from "../../../components/Drawer/DrawerShell";
import CustomerEditor from "../database/customers/CustomerEditor";
import useLots from "../../../hooks/useLots";
import { LotsData, LotsDataUpdate } from "../../../hooks/useLots/types";
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
import {
  getValueByAliases,
  parseCsv,
  parseImportDate,
} from "../products/importUtils";
import { buildTimestampedFilename, downloadBlob } from "../fileTransfer";
import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { getGuardedWorkspaceActionWarning } from "@/lib/workspaceActionGuards";
import ArchivedLots from "../database/lots/ArchivedLots";

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
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>(
    {}
  );

  const {
    getLots,
    getLotsKpis,
    lots,
    getCrops,
    result,
    processing,
    error,
    kpis,
    processingKpis,
    errorKpis,
    archiveLot,
  } = useLots();


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
    if (!file) return;

    if (!projectId) {
      setMessage("Para importar lotes, seleccioná un proyecto.");
      return;
    }

    try {
      setMessage("");
      setErrorMessage("");
      setSuccessMessage("");

      const rows = parseCsv(await file.text());
      if (rows.length === 0) {
        setErrorMessage("El archivo no tiene lotes válidos. Use CSV con encabezados.");
        return;
      }

      const errors: string[] = [];
      let imported = 0;

      for (const [index, row] of rows.entries()) {
        const rowNumber = index + 2;
        const rawId = getValueByAliases(row, ["id", "lot_id", "lote_id"]);
        const rawName = getValueByAliases(row, ["lote", "lot", "nombre", "lot_name"]);
        const target = rawId
          ? lots.find((item) => item.id === Number(rawId))
          : lots.find(
              (item) =>
                item.lot_name.trim().toLowerCase() === rawName.trim().toLowerCase() &&
                (!selectedFieldId || item.field_id === selectedFieldId),
            );

        if (!target) {
          errors.push(`Fila ${rowNumber}: no se encontró el lote "${rawName || rawId}".`);
          continue;
        }

        const sowedArea = getValueByAliases(row, [
          "hectareas",
          "hectáreas",
          "superficie",
          "superficie_has",
          "sowed_area",
        ]);
        const currentCrop = getValueByAliases(row, [
          "cultivo_actual_id",
          "current_crop_id",
        ]);
        const previousCrop = getValueByAliases(row, [
          "cultivo_anterior_id",
          "previous_crop_id",
        ]);
        const sowingDate = parseImportDate(
          getValueByAliases(row, ["fecha_siembra", "sowing_date"]),
        );
        const harvestDate = parseImportDate(
          getValueByAliases(row, ["fecha_cosecha", "harvest_date"]),
        );

        const payload: LotsDataUpdate = {
          id: target.id,
          field_id: target.field_id,
          project_name: target.project_name,
          field_name: target.field_name,
          lot_name: rawName || target.lot_name,
          previous_crop_id: previousCrop ? Number(previousCrop) : target.previous_crop_id,
          current_crop_id: currentCrop ? Number(currentCrop) : target.current_crop_id,
          variety: getValueByAliases(row, ["variedad", "variety"]) || target.variety || "",
          sowed_area: sowedArea || target.sowed_area || target.hectares || "0",
          dates:
            sowingDate || harvestDate
              ? [
                  {
                    sowing_date: sowingDate || target.dates?.[0]?.sowing_date || "",
                    harvest_date: harvestDate || target.dates?.[0]?.harvest_date || null,
                    sequence: 1,
                  },
                ]
              : target.dates || [],
          season: getValueByAliases(row, ["periodo", "campaña", "season"]) || target.season || "",
          updated_at: target.updated_at ?? new Date().toISOString(),
        };

        if (!payload.sowed_area || Number(payload.sowed_area) <= 0) {
          errors.push(`Fila ${rowNumber}: falta superficie/hectáreas.`);
          continue;
        }

        await apiClient.put(`/lots/${target.id}`, payload);
        imported += 1;
      }

      if (imported > 0) {
        setSuccessMessage(
          errors.length
            ? `Se importaron ${imported} lotes. Se omitieron ${errors.length} filas.`
            : `Se importaron ${imported} lotes correctamente.`,
        );
        reloadFromFirstPage();
      }

      if (errors.length > 0) {
        setErrorMessage(errors.slice(0, 5).join(" "));
      }
    } catch {
      setErrorMessage("No se pudo importar lotes. Use CSV válido.");
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
            accept: ".csv,text/csv",
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

      <WarningBanner message={message || null} />
      <SuccessBanner message={successMessage || null} variant="outlined" />

      <ErrorBanner message={errorMessage || error} variant="outlined" prefix="Error:" />

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
        <LoadingOverlay show={processing} />

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

        {!hasWorkspaceSelection ? (
          <EmptyState
            icon={Briefcase}
            title="Seleccioná filtros para ver lotes"
            description="El listado no carga datos globales automáticamente."
          />
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
        {hasWorkspaceSelection && !message && !error ? (
          <DataTable
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
            message="No hay lotes disponibles"
            pagination={pagination.buildPagination(filteredLots.length)}
          />
        ) : null}
      </div>
    </div>
  );
}

export default Lots;
