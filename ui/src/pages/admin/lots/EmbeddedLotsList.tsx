import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Plus, Rows3 } from "lucide-react";

import { buildWorkspaceQuery } from "@/lib/workspaceQuery";
import { usePagination } from "@/lib/dataDisplay";
import { formatNumberAr } from "../utils";
import { formatProperName } from "../../../lib/properName";
import { notify } from "@/lib/notify";
import type { LotsData } from "../../../hooks/useLots/types";
import useLots from "../../../hooks/useLots";
import type { ActorContextFilters } from "../master-data/actors/actorContextFilters";
import { Column } from "../types";
import { LOT_ENTITY as ENTITY } from "../entities";
import { AppFilterBar } from "../../../components/filters/AppFilterBar";
import { ArchivedDrawer } from "../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../components/crud/BulkSelectionPanel";
import { EmptyState } from "../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../components/feedback/Skeleton";
import { makeSelectColumn } from "../../../components/crud/makeSelectColumn";
import { ResponsiveTable } from "../../../components/crud/ResponsiveTable";
import { useBulkActions } from "../../../hooks/useBulkActions";
import ArchivedLots from "../master-data/lots/ArchivedLots";

type EmbeddedLotsListProps = {
  contextFilters?: ActorContextFilters;
  selectionMode: {
    label?: string;
    selectedIds?: number[];
    onAdd: (lots: LotsData[]) => void;
    onCreateNew?: () => void;
  };
  onAfterChange?: () => void | Promise<void>;
};

const hasPositiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

const lotColumns: Column<LotsData>[] = [
  { key: "field_name", header: "Campo", render: (value) => formatProperName(value) },
  { key: "lot_name", header: "Lote", render: (value) => formatProperName(value) },
  {
    key: "hectares",
    header: "Hectáreas",
    align: "right",
    render: (value) => `${formatNumberAr(String(value ?? 0))} Has`,
  },
  { key: "previous_crop", header: "Cultivo Anterior", render: (value) => formatProperName(value) },
  { key: "current_crop", header: "Cultivo Actual", render: (value) => formatProperName(value) },
  { key: "season", header: "Periodo", render: (value) => formatProperName(value) },
];

export default function EmbeddedLotsList({
  contextFilters,
  selectionMode,
  onAfterChange,
}: EmbeddedLotsListProps) {
  const pagination = usePagination({ perPage: 25 });
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [contextMode, setContextMode] = useState<"current" | "all">(
    hasPositiveId(contextFilters?.fieldId) || hasPositiveId(contextFilters?.projectId)
      ? "current"
      : "all",
  );
  const { lots, processing, error, getLots, archiveLot } = useLots();

  useEffect(() => {
    setContextMode(
      hasPositiveId(contextFilters?.fieldId) || hasPositiveId(contextFilters?.projectId)
        ? "current"
        : "all",
    );
  }, [contextFilters?.fieldId, contextFilters?.projectId]);

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);

  const query = useMemo(() => {
    if (contextMode === "all") {
      return buildWorkspaceQuery({ extra: { per_page: 1000 } });
    }

    return buildWorkspaceQuery({
      projectId: contextFilters?.projectId,
      fieldId: contextFilters?.fieldId,
      extra: { per_page: 1000 },
    });
  }, [contextFilters?.fieldId, contextFilters?.projectId, contextMode]);

  const refresh = useCallback(async () => {
    await getLots(query);
    await onAfterChange?.();
  }, [getLots, onAfterChange, query]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectedLotIds = useMemo(
    () => new Set(selectionMode.selectedIds ?? []),
    [selectionMode.selectedIds],
  );

  const bulk = useBulkActions<LotsData>({
    items: lots,
    entity: ENTITY,
    archive: archiveLot,
    onAfter: refresh,
  });

  const selectColumn = useMemo<Column<LotsData>>(
    () => makeSelectColumn<LotsData>(bulk, (lot) => lot.lot_name, ENTITY),
    [bulk],
  );
  const tableColumns = useMemo<Column<LotsData>[]>(
    () => [selectColumn, ...lotColumns],
    [selectColumn],
  );

  const addSelectedLots = () => {
    if (bulk.selectedItems.length === 0) {
      notify.warning("Seleccioná al menos un lote.");
      return;
    }
    const lotsToAdd = bulk.selectedItems.filter((lot) => !selectedLotIds.has(lot.id));
    if (lotsToAdd.length === 0) {
      notify.info("Los lotes seleccionados ya están cargados en el campo.");
      return;
    }
    selectionMode.onAdd(lotsToAdd);
    bulk.clear();
  };

  return (
    <div>
      <AppFilterBar
        filters={[]}
        actions={[
          ...(hasPositiveId(contextFilters?.fieldId) || hasPositiveId(contextFilters?.projectId)
            ? [
                {
                  label: "Proyecto Actual",
                  variant: contextMode === "current" ? ("light" as const) : ("primary" as const),
                  isPrimary: true,
                  onClick: () => setContextMode("current"),
                },
                {
                  label: "Todos",
                  variant: contextMode === "all" ? ("light" as const) : ("primary" as const),
                  isPrimary: true,
                  onClick: () => setContextMode("all"),
                },
              ]
            : []),
          {
            label: selectionMode.label ?? "Agregar",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: bulk.selectedCount === 0,
            onClick: addSelectedLots,
          },
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => setArchivedDrawerOpen(true),
          },
          ...(selectionMode.onCreateNew
            ? [
                {
                  label: "Nuevo",
                  icon: <Plus className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  onClick: selectionMode.onCreateNew,
                },
              ]
            : []),
        ]}
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing && lots.length > 0} />
        {processing && lots.length === 0 ? (
          <TableSkeleton rows={10} columns={tableColumns.length} />
        ) : lots.length === 0 ? (
          <EmptyState
            icon={Rows3}
            title="No Hay Lotes Para Los Filtros"
            description="Cambiá a Todos o creá un lote nuevo."
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={lots.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <ResponsiveTable<LotsData>
              data={lots}
              columns={tableColumns}
              pagination={pagination.buildPagination(lots.length)}
              primaryKey="lot_name"
              rowKey={(lot) => lot.id}
              emptyMessage="No hay lotes para mostrar"
            />
          </>
        )}
      </div>

      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Lotes Archivados"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedLots onAfterRestore={refresh} />
      </ArchivedDrawer>
    </div>
  );
}
