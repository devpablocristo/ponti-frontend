import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Briefcase, Pencil, Plus, Trash2 } from "lucide-react";

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
import useCustomers from "../../../../hooks/useCustomers";
import {
  CustomerData,
  CustomerPayloadInput,
} from "../../../../hooks/useCustomers/types";
import { toastSuccess } from "../../../../lib/toast";
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

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerData | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    getCustomers("limit=1000");
  }, [getCustomers]);

  const bulk = useBulkActions<CustomerData>({
    items: customers,
    entityLabelPlural: "clientes",
    archive: archiveCustomer,
    hardDelete: hardDeleteCustomer,
    onAfter: () => getCustomers("limit=1000"),
  });

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

  const { handleArchive, handleHardDelete } = useEntityRowActions<CustomerData>({
    entityLabel: ENTITY_LABEL,
    getLabel: (c) => c.name,
    archive: archiveCustomer,
    hardDelete: hardDeleteCustomer,
    onAfter: () => getCustomers("limit=1000"),
  });

  const selectColumn = useMemo<Column<CustomerData>>(
    () => makeSelectColumn<CustomerData>(bulk, (c) => c.name, "cliente"),
    [bulk],
  );

  const tableColumns = useMemo<Column<CustomerData>[]>(
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
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={customers.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entityLabelPlural="clientes"
            />
            <DataTable data={customers} columns={tableColumns} />
          </>
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
