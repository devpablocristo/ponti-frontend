import { useCallback, useEffect, useMemo } from "react";
import { CalendarRange, Download, Plus, Upload } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { AppFilterBar as FilterBar } from "../../../../components/filters/AppFilterBar";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
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
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";

const baseColumns: Column<Campaign>[] = [
  { key: "name", header: "Nombre" },
];

type CampaignsListProps = {
  editorOnly?: boolean;
};

export default function CampaignsList({ editorOnly = false }: CampaignsListProps) {
  const {
    campaigns,
    processing,
    error,
    getCampaigns,
    createCampaign,
    updateCampaign,
    archiveCampaign,
  } = useCampaigns();
  const { filters } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);

  const refresh = useCallback(
    () => getCampaigns(""),
    [getCampaigns],
  );

  const drawer = useEntityFormDrawer<Campaign, CampaignPayloadInput>({
    buildSuccessLabel: (input) => `la campaña "${input.name}"`,
    create: createCampaign,
    update: updateCampaign,
    fallbackErrorMessage: "No se pudo guardar la campaña",
    onAfter: refresh,
  });

  const bulk = useBulkActions<Campaign>({
    items: campaigns,
    entity: ENTITY,
    archive: archiveCampaign,
    onEdit: drawer.openEdit,
    onAfter: refresh,
  });

  const handleExport = useCallback(() => {
    const csv = [
      "Nombre",
      ...campaigns.map((campaign) => `"${campaign.name.replace(/"/g, '""')}"`),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `campanias_${new Date().toISOString()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [campaigns]);

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const names = Array.from(
        new Set(
          text
            .split(/\r?\n/)
            .map((line) => line.split(/[;,]/)[0]?.replace(/^"|"$/g, "").trim())
            .filter(Boolean)
            .filter((name, index) => index > 0 || !/campana|campaña|nombre|name/i.test(name)),
        ),
      );
      await Promise.all(names.map((name) => createCampaign({ name })));
      refresh();
    },
    [createCampaign, refresh],
  );

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
      <FilterBar
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
            label: "Nueva Campaña",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: drawer.openCreate,
          },
        ]}
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing} />
        {error && <ErrorBanner message={error} />}
        {!processing && campaigns.length === 0 ? (
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
