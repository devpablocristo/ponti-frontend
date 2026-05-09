import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useInvestors, { Investor } from "../../../../hooks/useInvestors";
import { Column } from "../../types";
import type { EntityCopy } from "../../../../components/Modal/copy";

const ENTITY: EntityCopy = { article: "el", singular: "inversor", plural: "inversores" };

const columns: Column<Investor>[] = [
  { key: "name", header: "Inversor" },
];

export default function ArchivedInvestors() {
  const {
    archivedInvestors,
    getArchivedInvestors,
    restoreInvestor,
    hardDeleteInvestor,
    processing,
    error,
  } = useInvestors();

  const refetch = useCallback(async () => {
    await getArchivedInvestors("page=1&per_page=1000");
  }, [getArchivedInvestors]);

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<Investor>({
      refetch,
      restore: restoreInvestor,
      hardDelete: hardDeleteInvestor,
    });

  return (
    <ArchivedListPage<Investor>
      description="Restaurar o eliminar inversores de forma definitiva"
      columns={columns}
      data={archivedInvestors}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
