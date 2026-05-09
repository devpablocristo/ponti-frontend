import { useCallback, useEffect, useMemo } from "react";
import { Briefcase, Plus } from "lucide-react";

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
import useCustomers from "../../../../hooks/useCustomers";
import {
  CustomerData,
  CustomerPayloadInput,
} from "../../../../hooks/useCustomers/types";
import { Column } from "../../types";
import type { EntityCopy } from "../../../../components/Modal/copy";
import CustomerFormDrawer from "./CustomerFormDrawer";

const ENTITY: EntityCopy = { article: "el", singular: "cliente", plural: "clientes" };

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

  const refresh = useCallback(
    () => getCustomers("limit=1000"),
    [getCustomers],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  const bulk = useBulkActions<CustomerData>({
    items: customers,
    entity: ENTITY,
    archive: archiveCustomer,
    hardDelete: hardDeleteCustomer,
    onAfter: refresh,
  });

  const drawer = useEntityFormDrawer<CustomerData, CustomerPayloadInput>({
    buildSuccessLabel: (input) => `el cliente "${input.name}"`,
    create: createCustomer,
    update: updateCustomer,
    fallbackErrorMessage: "No se pudo guardar el cliente",
    onAfter: refresh,
  });

  const { handleArchive, handleHardDelete } = useEntityRowActions<CustomerData>({
    entity: ENTITY,
    getLabel: (c) => c.name,
    archive: archiveCustomer,
    hardDelete: hardDeleteCustomer,
    onAfter: refresh,
  });

  const selectColumn = useMemo<Column<CustomerData>>(
    () => makeSelectColumn<CustomerData>(bulk, (c) => c.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<CustomerData>[]>(
    () => [
      selectColumn,
      ...baseColumns,
      makeActionsColumn<CustomerData>({
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
        title="Clientes y Sociedades"
        subtitle="Gestión simple del catálogo de clientes."
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={drawer.openCreate}
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
                onClick={drawer.openCreate}
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
              entity={ENTITY}
            />
            <DataTable data={customers} columns={tableColumns} />
          </>
        )}
      </div>

      <CustomerFormDrawer
        open={drawer.open}
        customer={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
    </div>
  );
}
