import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Pencil, Plus, Trash2, UserCog } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { RowActions } from "../../../../components/crud/RowActions";
import {
  getArchiveCopy,
  getCreateSuccessCopy,
  getHardDeleteCopy,
  getUpdateSuccessCopy,
} from "../../../../components/Modal/copy";
import { useConfirmDialog } from "../../../../hooks/useConfirmDialog";
import useManagers, {
  Manager,
  ManagerPayloadInput,
} from "../../../../hooks/useManagers";
import { toastError, toastSuccess } from "../../../../lib/toast";
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
  const confirm = useConfirmDialog();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Manager | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    getManagers("limit=1000");
  }, [getManagers]);

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

  const handleArchive = useCallback(
    async (item: Manager) => {
      const ok = await confirm({
        ...getArchiveCopy(ENTITY_LABEL, item.name),
        primaryLabel: getArchiveCopy(ENTITY_LABEL, item.name).primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "warning",
      });
      if (!ok) return;
      try {
        await archiveManager(item.id);
        toastSuccess(`Se archivó "${item.name}"`);
        refresh();
      } catch (err) {
        toastError(
          err instanceof Error
            ? err.message
            : "No se pudo archivar el responsable",
        );
      }
    },
    [archiveManager, confirm, refresh],
  );

  const handleHardDelete = useCallback(
    async (item: Manager) => {
      const ok = await confirm({
        ...getHardDeleteCopy(ENTITY_LABEL, item.name),
        primaryLabel: getHardDeleteCopy(ENTITY_LABEL, item.name)
          .primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "danger",
      });
      if (!ok) return;
      try {
        await hardDeleteManager(item.id);
        toastSuccess(`Se eliminó "${item.name}" definitivamente`);
        refresh();
      } catch (err) {
        toastError(
          err instanceof Error
            ? err.message
            : "No se pudo eliminar el responsable",
        );
      }
    },
    [confirm, hardDeleteManager, refresh],
  );

  const tableColumns = useMemo<Column<Manager>[]>(
    () => [
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
    [handleArchive, handleHardDelete],
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
          <DataTable data={managers} columns={tableColumns} />
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
