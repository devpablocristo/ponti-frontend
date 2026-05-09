import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useCustomers from "../../../../hooks/useCustomers";
import { Column } from "../../types";

type ArchivedCustomer = {
  id: number;
  name: string;
};

const ENTITY_LABEL = "el cliente";

const columns: Column<ArchivedCustomer>[] = [
  { key: "name", header: "Cliente/Sociedad" },
];

export default function ArchivedCustomers() {
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

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<ArchivedCustomer>({
      refetch,
      restore: restoreCustomer,
      hardDelete: hardDeleteCustomer,
    });

  return (
    <ArchivedListPage<ArchivedCustomer>
      description="Restaurar o eliminar clientes de forma definitiva"
      columns={columns}
      data={customers as ArchivedCustomer[]}
      entityLabel={ENTITY_LABEL}
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
