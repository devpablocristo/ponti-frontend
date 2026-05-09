import { useCallback, useEffect, useMemo } from "react";
import { CalendarRange, Plus } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeActionsColumn } from "../../../../components/crud/makeActionsColumn";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityRowActions } from "../../../../hooks/useEntityRowActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useCampaigns, {
  Campaign,
  CampaignPayloadInput,
} from "../../../../hooks/useCampaigns";
import { Column } from "../../types";
import type { EntityCopy } from "../../../../components/Modal/copy";
import CampaignFormDrawer from "./CampaignFormDrawer";

const ENTITY: EntityCopy = { article: "la", singular: "campaña", plural: "campañas" };

const baseColumns: Column<Campaign>[] = [
  { key: "name", header: "Nombre" },
];

export default function CampaignsList() {
  const {
    campaigns,
    processing,
    error,
    getCampaigns,
    createCampaign,
    updateCampaign,
    archiveCampaign,
    hardDeleteCampaign,
  } = useCampaigns();

  const refresh = useCallback(
    () => getCampaigns(""),
    [getCampaigns],
  );

  const bulk = useBulkActions<Campaign>({
    items: campaigns,
    entity: ENTITY,
    archive: archiveCampaign,
    hardDelete: hardDeleteCampaign,
    onAfter: refresh,
  });

  const drawer = useEntityFormDrawer<Campaign, CampaignPayloadInput>({
    buildSuccessLabel: (input) => `la campaña "${input.name}"`,
    create: createCampaign,
    update: updateCampaign,
    fallbackErrorMessage: "No se pudo guardar la campaña",
    onAfter: refresh,
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { handleArchive, handleHardDelete } = useEntityRowActions<Campaign>({
    entity: ENTITY,
    getLabel: (c) => c.name,
    archive: archiveCampaign,
    hardDelete: hardDeleteCampaign,
    onAfter: refresh,
  });

  const selectColumn = useMemo<Column<Campaign>>(
    () => makeSelectColumn<Campaign>(bulk, (c) => c.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<Campaign>[]>(
    () => [
      selectColumn,
      ...baseColumns,
      makeActionsColumn<Campaign>({
        onEdit: drawer.openEdit,
        onArchive: handleArchive,
        onHardDelete: handleHardDelete,
      }),
    ],
    [drawer.openEdit, handleArchive, handleHardDelete, selectColumn],
  );

  return (
    <div>
      <PageHeader
        title="Campañas"
        subtitle="Ciclos productivos asociados a los proyectos."
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={drawer.openCreate}
          >
            Nueva campaña
          </Button>
        }
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing} />
        {error && <ErrorBanner message={error} />}
        {!processing && campaigns.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="Aún no hay campañas"
            description="Creá la primera para asociarla a tus proyectos."
            cta={
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={drawer.openCreate}
              >
                Nueva campaña
              </Button>
            }
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={campaigns.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <DataTable data={campaigns} columns={tableColumns} />
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
    </div>
  );
}
