import { DataTable, usePagination } from "@/lib/dataDisplay";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { ExternalLink } from "lucide-react";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { WarningBanner } from "../../../components/feedback/WarningBanner";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { makeActionsColumn } from "../../../components/crud/makeActionsColumn";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../hooks/useBulkActions";
import { useEntityRowActions } from "../../../hooks/useEntityRowActions";
import { LOT_ENTITY as ENTITY } from "../entities";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import useLots from "../../../hooks/useLots";
import { LotsData, LotsDataUpdate } from "../../../hooks/useLots/types";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { Column } from "../types";
import { LotDrawer } from "./components/LotDrawer";
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

export function Lots() {
  const navigate = useNavigate();
  const pagination = usePagination({ perPage: 10 });
  const resetPage = pagination.resetPage;

  const [lot, setLot] = useState<LotsDataUpdate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
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
    crops,
    getCrops,
    updateLot,
    updateLotError,
    result,
    processing,
    error,
    kpis,
    processingKpis,
    errorKpis,
    archiveLot,
    hardDeleteLot,
  } = useLots();


  const {
    selectedCustomer,
    projectId,
    selectedCampaignId,
    selectedField,
    fields,
    filters,
    seasons,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  const selectedFieldId = selectedField?.id;

  const loadCurrentLots = useCallback(() => {
    if (selectedFieldId) {
      const query = `field_id=${selectedFieldId}`;
      getLots(query);
      getLotsKpis(query);
      return;
    }

    if (projectId) {
      const query = `project_id=${projectId}`;
      getLots(query);
      getLotsKpis(query);
    }
  }, [getLots, getLotsKpis, projectId, selectedFieldId]);

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
    if (!selectedCustomer || !projectId || !selectedCampaignId) {
      setMessage("Seleccione un proyecto, campaña y campo para ver resultados");
      return;
    }

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

  useEffect(() => {
    if (!updateLotError) return;
    setErrorMessage(updateLotError);
    setSuccessMessage("");
  }, [updateLotError]);

  const filteredLots = useMemo(
    () => filterLots(lots, columnsFilters),
    [columnsFilters, lots]
  );

  const bulk = useBulkActions<LotsData>({
    items: filteredLots,
    entity: ENTITY,
    archive: archiveLot,
    hardDelete: hardDeleteLot,
    onAfter: reloadFromFirstPage,
  });
  const calculatedKpis = useMemo(
    () => calculateLotIndicators(filteredLots),
    [filteredLots]
  );
  const hasColumnFilters = useMemo(
    () => hasActiveLotFilters(columnsFilters),
    [columnsFilters]
  );
  const indicators = useMemo(
    () => (hasColumnFilters ? calculatedKpis : mapApiLotIndicators(kpis)),
    [calculatedKpis, hasColumnFilters, kpis]
  );

  const openEditDrawer = useCallback((item: LotsData) => {
    setLot({
      id: item.id,
      field_id: item.field_id,
      project_name: item.project_name,
      field_name: item.field_name,
      lot_name: item.lot_name,
      previous_crop_id: item.previous_crop_id,
      current_crop_id: item.current_crop_id,
      variety: item.variety,
      sowed_area: item.sowed_area ?? "",
      dates: item.dates,
      season: item.season,
      updated_at: item.updated_at ?? new Date().toISOString(),
    });
    setSuccessMessage("");
    setErrorMessage("");
    setDrawerOpen(true);
  }, []);

  const { handleArchive: handleArchiveLot, handleHardDelete: handleHardDeleteLot } =
    useEntityRowActions<LotsData>({
      entity: ENTITY,
      getLabel: (l) => l.lot_name,
      archive: archiveLot,
      hardDelete: hardDeleteLot,
      onAfter: reloadFromFirstPage,
    });

  const selectColumn = useMemo<Column<LotsData>>(
    () => makeSelectColumn<LotsData>(bulk, (l) => l.lot_name, ENTITY),
    [bulk],
  );

  const actionsColumn = useMemo<Column<LotsData>>(
    () =>
      makeActionsColumn<LotsData>({
        onEdit: openEditDrawer,
        onArchive: handleArchiveLot,
        onHardDelete: handleHardDeleteLot,
      }),
    [handleArchiveLot, handleHardDeleteLot, openEditDrawer],
  );

  const columnsToShow = useMemo(
    () => [
      selectColumn,
      ...allColumns.filter((column) => visibleColumns.includes(column.key)),
      actionsColumn,
    ],
    [actionsColumn, allColumns, selectColumn, visibleColumns]
  );

  const handleCreateLot = () => {
    if (selectedField && projectId && selectedCustomer && selectedCampaignId) {
      navigate(`/admin/database/customers/${selectedField.project_id}`);
    }
  };

  function handleLotChange<K extends keyof LotsDataUpdate>(
    key: K,
    value: LotsDataUpdate[K]
  ) {
    setLot((previousLot) => ({
      ...previousLot,
      id: previousLot?.id || 0,
      lot_name: previousLot?.lot_name || "",
      field_id: previousLot?.field_id || 0,
      previous_crop_id: previousLot?.previous_crop_id || 0,
      current_crop_id: previousLot?.current_crop_id || 0,
      variety: previousLot?.variety || "",
      sowed_area: previousLot?.sowed_area || "",
      dates: previousLot?.dates || [],
      season: previousLot?.season || "",
      [key]: value,
      updated_at: previousLot?.updated_at || new Date().toISOString(),
    }));
  }

  const handleSave = () => {
    if (!lot) return;

    const invalidDate = lot.dates?.find(
      (date) =>
        date?.harvest_date && (!date.sowing_date || date.sowing_date === "")
    );
    if (invalidDate) {
      setErrorMessage(
        "Si hay fecha de cosecha, debe cargar también la fecha de siembra."
      );
      return;
    }

    if (!lot.sowed_area || lot.sowed_area === "0") {
      setErrorMessage("Area de siembra obligatoria");
      return;
    }

    setSuccessMessage("");
    setErrorMessage("");
    updateLot({ ...lot });
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
    } catch {
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
            icon: <ExternalLink className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: handleExport,
          },
          {
            label: "+ Nuevo Lote",
            variant: "primary",
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

      <WarningBanner message={message || null} />

      <ErrorBanner message={error} variant="outlined" prefix="Error:" />

      {!message && !error ? (
        <div className="my-4">
          <LotsIndicators
            kpis={indicators}
            processing={!hasColumnFilters && processingKpis}
            error={!hasColumnFilters ? errorKpis : null}
          />
        </div>
      ) : null}

      <div className="relative mt-4">
        <LoadingOverlay show={processing} />

        <LotDrawer
          open={drawerOpen}
          lot={lot}
          selectedFieldName={selectedField?.name}
          crops={crops}
          seasons={seasons}
          processing={processing}
          errorMessage={errorMessage}
          successMessage={successMessage}
          onClose={() => setDrawerOpen(false)}
          onDismissError={() => setErrorMessage("")}
          onDismissSuccess={() => setSuccessMessage("")}
          onLotChange={handleLotChange}
          onSave={handleSave}
        />

        {!message && !error && (
          <BulkSelectionPanel
            selectedCount={bulk.selectedCount}
            totalCount={filteredLots.length}
            allSelected={bulk.allSelected}
            onToggleAll={bulk.toggleAll}
            onClear={bulk.clear}
            actions={bulk.actions}
            entity={ENTITY}
          />
        )}
        {!message && !error ? (
          <DataTable
            data={filteredLots}
            columns={columnsToShow}
            filters={columnsFilters}
            onFilterChange={handleFilterChange}
            enableFilters
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
            message="No hay lotes disponibles"
            pagination={pagination.buildPagination(filteredLots.length)}
          />
        ) : null}
      </div>
    </div>
  );
}

export default Lots;
