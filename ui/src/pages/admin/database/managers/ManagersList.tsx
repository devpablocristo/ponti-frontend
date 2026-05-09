import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  getCreateSuccessCopy,
  getUpdateSuccessCopy,
} from "../../../../components/Modal/copy";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityRowActions } from "../../../../hooks/useEntityRowActions";
import useManagers, {
  Manager,
  ManagerPayloadInput,
} from "../../../../hooks/useManagers";
import { toastSuccess } from "../../../../lib/toast";
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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Manager | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

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

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openCreate = () => {
    setEditing(null);
    setSubmitError(null);
    setDrawerOpen(true);
  };

  const openEdit = (manager: Manager) => {
    setEditing(manager);
    setSubmitError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setSubmitError(null);
  };

  const handleSubmit = useCallback(
    async (input: ManagerPayloadInput) => {
      setSubmitError(null);
      try {
        if (editing) {
          await updateManager(editing.id, input);
          toastSuccess(getUpdateSuccessCopy(`el responsable "${input.name}"`));
        } else {
          await createManager(input);
          toastSuccess(getCreateSuccessCopy(`el responsable "${input.name}"`));
        }
        closeDrawer();
        refresh();
      } catch (err) {
        setSubmitError(
          err instanceof Error
            ? err.message
            : "No se pudo guardar el responsable",
        );
      }
    },
    [createManager, editing, refresh, updateManager],
  );

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
                onClick: () => openEdit(item),
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
    [handleArchive, handleHardDelete, selectColumn],
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
            onClick={openCreate}
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
                onClick={openCreate}
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
        open={drawerOpen}
        manager={editing}
        processing={processing}
        errorMessage={submitError}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
