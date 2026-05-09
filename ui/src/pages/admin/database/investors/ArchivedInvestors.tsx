import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useInvestors, { Investor } from "../../../../hooks/useInvestors";
import { Column } from "../../types";

const ENTITY_LABEL = "el inversor";

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
      entityLabel={ENTITY_LABEL}
      entityLabelPlural="inversores"
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
