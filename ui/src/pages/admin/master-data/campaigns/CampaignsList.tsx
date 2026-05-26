import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, CalendarRange, Plus, Upload } from "lucide-react";

import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../../components/crud/ResponsiveTable";
import Button from "../../../../components/Button/Button";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { notify } from "@/lib/notify";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../../components/feedback/Skeleton";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useCampaigns, {
  Campaign,
  CampaignPayloadInput,
} from "../../../../hooks/useCampaigns";
import { Column } from "../../types";
import { CAMPAIGN_ENTITY as ENTITY } from "../../entities";
import CampaignFormDrawer from "./CampaignFormDrawer";
import ArchivedCampaigns from "./ArchivedCampaigns";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import { buildTimestampedFilename, csvEscape, downloadBlob } from "../../fileTransfer";

const baseColumns: Column<Campaign>[] = [
  { key: "name", header: "Nombre" },
];

type CampaignsListProps = {
  editorOnly?: boolean;
};

export default function CampaignsList({ editorOnly = false }: CampaignsListProps) {
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const pagination = usePagination({ perPage: 25 });
  const {
    campaigns,
    processing,
    error,
    getCampaigns,
    createCampaign,
    updateCampaign,
    archiveCampaign,
  } = useCampaigns();

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  const {
    filters: allFilters,
    selectedCustomer,
    selectedProject,
    campaigns: workspaceCampaigns,
  } = useWorkspaceFilters(["customer", "project"]);
  // En la pantalla de Campañas el filtro de Campaña es redundante (estás
  // viendo el catálogo de campañas). useWorkspaceFilters siempre incluye
  // "campaign" en el set forzado, así que lo descartamos en el render.
  const filters = useMemo(
    () => allFilters.filter((f) => f.name !== "campaña" && f.name !== "campaign"),
    [allFilters],
  );

  const refresh = useCallback(
    () => getCampaigns(""),
    [getCampaigns],
  );

  // Client-side filter using the workspace selection. The workspace's
  // `campaigns` list is already scoped to the selected customer (one row per
  // project that uses each campaign), so we project it down to a set of ids
  // and intersect with the full catalog.
  const visibleCampaigns = useMemo(() => {
    if (!selectedCustomer && !selectedProject) return campaigns;
    const scopedIds = new Set(
      workspaceCampaigns
        .filter((c) => !selectedProject || c.project_id === selectedProject.id)
        .map((c) => c.id),
    );
    return campaigns.filter((c) => scopedIds.has(c.id));
  }, [campaigns, workspaceCampaigns, selectedCustomer, selectedProject]);

  const drawer = useEntityFormDrawer<Campaign, CampaignPayloadInput>({
    buildSuccessLabel: (input) => `la campaña "${input.name}"`,
    create: createCampaign,
    update: updateCampaign,
    fallbackErrorMessage: "No se pudo guardar la campaña",
    onAfter: refresh,
  });

  const bulk = useBulkActions<Campaign>({
    items: visibleCampaigns,
    entity: ENTITY,
    archive: archiveCampaign,
    onEdit: drawer.openEdit,
    onAfter: refresh,
  });

  const handleExport = useCallback(() => {
    const csv = [
      "Nombre",
      ...campaigns.map((campaign) => csvEscape(campaign.name)),
    ].join("\n");
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      buildTimestampedFilename("campanias", "csv"),
    );
  }, [campaigns]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectColumn = useMemo<Column<Campaign>>(
    () => makeSelectColumn<Campaign>(bulk, (c) => c.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<Campaign>[]>(
    () => [
      selectColumn,
      ...baseColumns,
    ],
    [selectColumn],
  );

  return (
    <div>
      <AppFilterBar
        filters={filters}
        // Orden canónico Datos Maestros: extras → Importar → Exportar → Archivados → Nuevo.
        actions={[
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
            label: "Nueva",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: drawer.openCreate,
          },
        ]}
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing && visibleCampaigns.length > 0} />
        {processing && visibleCampaigns.length === 0 ? (
          <TableSkeleton rows={10} columns={tableColumns.length} />
        ) : visibleCampaigns.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="Aún no hay campañas"
            description={
              editorOnly
                ? "No hay campañas disponibles para editar."
                : "Creá la primera para asociarla a tus proyectos."
            }
            cta={!editorOnly ? (
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={drawer.openCreate}
              >
                Nueva campaña
              </Button>
            ) : undefined}
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={visibleCampaigns.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <ResponsiveTable<Campaign>
              data={visibleCampaigns}
              columns={tableColumns}
              pagination={pagination.buildPagination(visibleCampaigns.length)}
              primaryKey="name"
              rowKey={(c) => c.id}
              emptyMessage="No hay campañas para mostrar"
            />
          </>
        )}
      </div>

      <CampaignFormDrawer
        open={drawer.open}
        campaign={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Campañas archivadas"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedCampaigns onAfterRestore={refresh} />
      </ArchivedDrawer>
    </div>
  );
}
