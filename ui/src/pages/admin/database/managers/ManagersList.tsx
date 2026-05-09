import { useCallback, useEffect, useMemo } from "react";
import { Archive, Pencil, Plus, Trash2, UserCog } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { RowActions } from "../../../../components/crud/RowActions";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityRowActions } from "../../../../hooks/useEntityRowActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useManagers, {
  Manager,
  ManagerPayloadInput,
} from "../../../../hooks/useManagers";
import { Column } from "../../types";
import ManagerFormDrawer from "./ManagerFormDrawer";

const ENTITY_LABEL = "el responsable";

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
    entityLabelPlural: "responsables",
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
    entityLabel: ENTITY_LABEL,
    getLabel: (m) => m.name,
    archive: archiveManager,
    hardDelete: hardDeleteManager,
    onAfter: refresh,
  });

  const selectColumn = useMemo<Column<Manager>>(
    () => makeSelectColumn<Manager>(bulk, (m) => m.name, "responsable"),
    [bulk],
  );

  const tableColumns = useMemo<Column<Manager>[]>(
    () => [
      selectColumn,
      ...baseColumns,
      {
        key: "id",
        header: "",
        align: "center",
        render: (_value, item) => (
          <RowActions
            actions={[
              {
                label: "Editar",
                icon: Pencil,
                onClick: () => drawer.openEdit(item),
              },
              {
                label: "Archivar",
                icon: Archive,
                onClick: () => handleArchive(item),
              },
              {
                label: "Eliminar",
                icon: Trash2,
                variant: "danger",
                divider: true,
                onClick: () => handleHardDelete(item),
              },
            ]}
          />
        ),
      },
    ],
    [drawer, handleArchive, handleHardDelete, selectColumn],
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
              entityLabelPlural="responsables"
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
