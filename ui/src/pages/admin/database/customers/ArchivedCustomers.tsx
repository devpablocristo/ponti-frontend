import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useCustomers from "../../../../hooks/useCustomers";
import { Column } from "../../types";
import { CUSTOMER_ENTITY as ENTITY } from "../../entities";

type ArchivedCustomer = {
  id: number;
  name: string;
};

type ArchivedCustomersProps = {
  onAfterRestore?: () => Promise<void> | void;
};

const columns: Column<ArchivedCustomer>[] = [
  { key: "name", header: "Cliente/Sociedad" },
];

const getCustomerHardDeleteCopy = (count: number) => ({
  title: "Confirmar eliminación definitiva",
  message:
    count === 1
      ? "¿Eliminar definitivamente este cliente? Esta acción elimina en cascada el cliente, sus proyectos y los datos relacionados. No se puede deshacer."
      : `¿Eliminar definitivamente ${count} clientes? Esta acción elimina en cascada los clientes, sus proyectos y los datos relacionados. No se puede deshacer.`,
  primaryButtonText: "Eliminar definitivamente",
  secondaryButtonText: "Cancelar",
});

export default function ArchivedCustomers({ onAfterRestore }: ArchivedCustomersProps) {
  const {
    customers,
    getArchivedCustomers,
    restoreCustomer,
    hardDeleteCustomer,
    processing,
    error,
  } = useCustomers();

  const refetch = useCallback(
    () => getArchivedCustomers("page=1&per_page=1000"),
    [getArchivedCustomers],
  );
  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreCustomer(id);
      await onAfterRestore?.();
    },
    [onAfterRestore, restoreCustomer],
  );

  const { runRestore, runHardDelete, processing: actionProcessing } =
    useArchiveActions<ArchivedCustomer>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteCustomer,
    });

  return (
    <ArchivedListPage<ArchivedCustomer>
      description="Restaurar o eliminar clientes de forma definitiva"
      columns={columns}
      data={customers as ArchivedCustomer[]}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.name}
      ignoreWorkspaceFilters
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      getHardDeleteCopy={getCustomerHardDeleteCopy}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={error}
    />
  );
}
