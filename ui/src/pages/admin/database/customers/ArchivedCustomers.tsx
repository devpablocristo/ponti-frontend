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

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
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
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
