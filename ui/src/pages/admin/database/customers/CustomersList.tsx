import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Briefcase, Pencil, Plus, Trash2 } from "lucide-react";

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
import useCustomers from "../../../../hooks/useCustomers";
import {
  CustomerData,
  CustomerPayloadInput,
} from "../../../../hooks/useCustomers/types";
import { toastError, toastSuccess } from "../../../../lib/toast";
import { Column } from "../../types";
import CustomerFormDrawer from "./CustomerFormDrawer";

const ENTITY_LABEL = "el cliente";

const baseColumns: Column<CustomerData>[] = [
  { key: "name", header: "Cliente / Sociedad" },
];

export default function CustomersList() {
  const {
    customers,
    processing,
    error,
    getCustomers,
    createCustomer,
    updateCustomer,
    archiveCustomer,
    hardDeleteCustomer,
  } = useCustomers();
  const confirm = useConfirmDialog();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getCustomers("limit=1000");
  }, [getCustomers]);

  const openCreate = () => {
    setEditing(null);
    setSubmitError(null);
    setDrawerOpen(true);
  };

  const openEdit = (customer: CustomerData) => {
    setEditing(customer);
    setSubmitError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setSubmitError(null);
  };

  const handleSubmit = useCallback(
    async (input: CustomerPayloadInput) => {
      setSubmitError(null);
      try {
        if (editing) {
          await updateCustomer(editing.id, input);
          toastSuccess(getUpdateSuccessCopy(`el cliente "${input.name}"`));
        } else {
          await createCustomer(input);
          toastSuccess(getCreateSuccessCopy(`el cliente "${input.name}"`));
        }
        closeDrawer();
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "No se pudo guardar el cliente",
        );
      }
    },
    [createCustomer, editing, updateCustomer],
  );

  const handleArchive = useCallback(
    async (item: CustomerData) => {
      const ok = await confirm({
        ...getArchiveCopy(ENTITY_LABEL, item.name),
        primaryLabel: getArchiveCopy(ENTITY_LABEL, item.name).primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "warning",
      });
      if (!ok) return;
      try {
        await archiveCustomer(item.id);
        toastSuccess(`Se archivó "${item.name}"`);
      } catch (err) {
        toastError(
          err instanceof Error ? err.message : "No se pudo archivar el cliente",
        );
      }
    },
    [archiveCustomer, confirm],
  );

  const handleHardDelete = useCallback(
    async (item: CustomerData) => {
      const ok = await confirm({
        ...getHardDeleteCopy(ENTITY_LABEL, item.name),
        primaryLabel: getHardDeleteCopy(ENTITY_LABEL, item.name)
          .primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "danger",
      });
      if (!ok) return;
      try {
        await hardDeleteCustomer(item.id);
        toastSuccess(`Se eliminó "${item.name}" definitivamente`);
        getCustomers("limit=1000");
      } catch (err) {
        toastError(
          err instanceof Error
            ? err.message
            : "No se pudo eliminar el cliente",
        );
      }
    },
    [confirm, getCustomers, hardDeleteCustomer],
  );

  const tableColumns = useMemo<Column<CustomerData>[]>(
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
        title="Clientes y Sociedades"
        subtitle="Gestión simple del catálogo de clientes."
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={openCreate}
          >
            Nuevo cliente
          </Button>
        }
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing} />
        {error && <ErrorBanner message={error} />}
        {!processing && customers.length === 0 ? (
          <EmptyState
            icon={Briefcase}
            title="Aún no hay clientes"
            description="Creá el primero para empezar a gestionar proyectos."
            cta={
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={openCreate}
              >
                Nuevo cliente
              </Button>
            }
          />
        ) : (
          <DataTable data={customers} columns={tableColumns} />
        )}
      </div>

      <CustomerFormDrawer
        open={drawerOpen}
        customer={editing}
        processing={processing}
        errorMessage={submitError}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
