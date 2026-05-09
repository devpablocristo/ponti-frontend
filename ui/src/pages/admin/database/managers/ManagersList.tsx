import { useCallback, useEffect, useMemo } from "react";
import { Plus, UserCog } from "lucide-react";

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
import useManagers, {
  Manager,
  ManagerPayloadInput,
} from "../../../../hooks/useManagers";
import { Column } from "../../types";
import { MANAGER_ENTITY as ENTITY } from "../../entities";
import ManagerFormDrawer from "./ManagerFormDrawer";

const baseColumns: Column<Manager>[] = [
  { key: "name", header: "Nombre" },
];

export default function ManagersList() {
  const {
    managers,
    processing,
    error,
    getManagers,
    createManager,
    updateManager,
    archiveManager,
    hardDeleteManager,
  } = useManagers();

  const refresh = useCallback(() => {
    getManagers("limit=1000");
  }, [getManagers]);

  const bulk = useBulkActions<Manager>({
    items: managers,
    entity: ENTITY,
    archive: archiveManager,
    hardDelete: hardDeleteManager,
    onAfter: refresh,
  });

  const drawer = useEntityFormDrawer<Manager, ManagerPayloadInput>({
    buildSuccessLabel: (input) => `el responsable "${input.name}"`,
    create: createManager,
    update: updateManager,
    fallbackErrorMessage: "No se pudo guardar el responsable",
    onAfter: refresh,
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { handleArchive, handleHardDelete } = useEntityRowActions<Manager>({
    entity: ENTITY,
    getLabel: (m) => m.name,
    archive: archiveManager,
    hardDelete: hardDeleteManager,
    onAfter: refresh,
  });

  const selectColumn = useMemo<Column<Manager>>(
    () => makeSelectColumn<Manager>(bulk, (m) => m.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<Manager>[]>(
    () => [
      selectColumn,
      ...baseColumns,
      makeActionsColumn<Manager>({
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
        title="Responsables"
        subtitle="Personas responsables de proyectos."
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={drawer.openCreate}
          >
            Nuevo responsable
          </Button>
        }
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing} />
        {error && <ErrorBanner message={error} />}
        {!processing && managers.length === 0 ? (
          <EmptyState
            icon={UserCog}
            title="Aún no hay responsables"
            description="Creá el primero para asociarlo a tus proyectos."
            cta={
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={drawer.openCreate}
              >
                Nuevo responsable
              </Button>
            }
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={managers.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <DataTable data={managers} columns={tableColumns} />
          </>
        )}
      </div>

      <ManagerFormDrawer
        open={drawer.open}
        manager={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
    </div>
  );
}
