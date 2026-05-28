import { DataTable, usePagination } from "@/lib/dataDisplay";
import { AlertCircle, LoaderCircle, Plus, Upload } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { apiClient } from "@/api/client";
import { AppFilterBar as FilterBar } from "../../../components/filters/AppFilterBar";
import useLots from "../../../hooks/useLots";
import { LotsData, LotsDataUpdate } from "../../../hooks/useLots/types";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { buildWorkspaceQuery } from "../../../lib/workspaceQuery";
import { Column } from "../types";
import { buildTimestampedFilename, downloadBlob } from "../fileTransfer";
import { LegacyLotDrawer } from "./components/LegacyLotDrawer";
import { LegacyLotsHeader } from "./components/LegacyLotsHeader";
import { LegacyLotsIndicators } from "./components/LegacyLotsIndicators";
import {
  calculateLotIndicators,
  filterLots,
  getLotFilterOptions,
  hasActiveLotFilters,
  mapApiLotIndicators,
} from "./lotTableUtils";
import { useLegacyLotColumns } from "./useLegacyLotColumns";

export function LegacyLots() {
  const navigate = useNavigate();
  const pagination = usePagination({ perPage: 10 });
  const resetPage = pagination.resetPage;

  const [lot, setLot] = useState<LotsDataUpdate | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [columnsFilters, setColumnsFilters] = useState<Record<string, unknown>>({});

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
    if (!projectId) return;

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
    (columnKey: keyof LotsData) => getLotFilterOptions(lots, columnsFilters, columnKey),
    [columnsFilters, lots]
  );

  const onSuccessEdit = useCallback(() => {
    reloadFromFirstPage();
  }, [reloadFromFirstPage]);

  const { columns, harvestColumns, commercializationColumns } = useLegacyLotColumns({
    getFilterOptionsForColumn,
    onSuccessEdit,
  });

  const allColumns = useMemo(
    () =>
      Array.from(
        new Map<keyof LotsData, Column<LotsData>>(
          [...columns, ...harvestColumns, ...commercializationColumns].map((column) => [
            column.key,
            column,
          ])
        ).values()
      ),
    [columns, commercializationColumns, harvestColumns]
  );

  const defaultColumnKeys = useMemo(() => columns.map((column) => column.key), [columns]);
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
  }, [projectId, resetPage, selectedCampaignId, selectedCustomer, selectedFieldId]);

  useEffect(() => {
    if (!selectedCustomer || !projectId || !selectedCampaignId) {
      setMessage("Seleccione un proyecto, campaña y campo para ver resultados");
      return;
    }

    setMessage("");
    reloadFromFirstPage();
  }, [projectId, reloadFromFirstPage, selectedCampaignId, selectedCustomer, selectedFieldId]);

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
  const calculatedKpis = useMemo(() => calculateLotIndicators(filteredLots), [filteredLots]);
  const hasColumnFilters = useMemo(() => hasActiveLotFilters(columnsFilters), [columnsFilters]);
  const indicators = useMemo(
    () => (hasColumnFilters ? calculatedKpis : mapApiLotIndicators(kpis)),
    [calculatedKpis, hasColumnFilters, kpis]
  );

  const columnsToShow = useMemo(
    () => allColumns.filter((column) => visibleColumns.includes(column.key)),
    [allColumns, visibleColumns]
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
      (date) => date?.harvest_date && (!date.sowing_date || date.sowing_date === "")
    );
    if (invalidDate) {
      setErrorMessage("Si hay fecha de cosecha, debe cargar también la fecha de siembra.");
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
      const response = await apiClient.get<Blob>(`/lots/export/${projectId}`, undefined, {
        responseType: "blob",
      });

      downloadBlob(response, buildTimestampedFilename("lotes", "xlsx", projectId));
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
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: handleExport,
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId || !selectedCampaignId || !selectedCustomer || !selectedField,
            onClick: handleCreateLot,
          },
        ]}
      />

      {message ? (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-amber-500" />
          <span className="font-medium">{message}</span>
        </div>
      ) : null}

      {error ? (
        <div
          className="mb-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          role="alert"
        >
          <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
          <div>
            <span className="font-semibold">Error:</span> {error}
          </div>
        </div>
      ) : null}

      {!message && !error ? (
        <div className="my-4">
          <LegacyLotsIndicators
            kpis={indicators}
            processing={!hasColumnFilters && processingKpis}
            error={!hasColumnFilters ? errorKpis : null}
          />
        </div>
      ) : null}

      <div className="relative mt-4">
        {processing ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/70 backdrop-blur-sm dark:bg-slate-900/70">
            <LoaderCircle className="h-10 w-10 animate-spin text-blue-600" />
          </div>
        ) : null}

        <LegacyLotDrawer
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

        {!message && !error ? (
          <DataTable
            data={filteredLots}
            columns={columnsToShow}
            filters={columnsFilters}
            onFilterChange={handleFilterChange}
            enableFilters
            headerComponent={
              <LegacyLotsHeader
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
            }}
            message="No hay lotes disponibles"
            pagination={pagination.buildPagination(filteredLots.length)}
          />
        ) : null}
      </div>
    </div>
  );
}

export default LegacyLots;
