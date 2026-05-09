import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useFields from "../../../../hooks/useFields";
import type { Data as Field } from "../../../../hooks/useFields/types";
import { Column } from "../../types";

const ENTITY_LABEL = "el campo";

const columns: Column<Field>[] = [
  { key: "name", header: "Campo" },
  { key: "project_id", header: "Proyecto (id)" },
];

export default function ArchivedFields() {
  const {
    archivedFields,
    getArchivedFields,
    restoreField,
    hardDeleteField,
    processing,
    error,
  } = useFields();

  const refetch = useCallback(async () => {
    await getArchivedFields("page=1&per_page=1000");
  }, [getArchivedFields]);

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<Field>({
      refetch,
      restore: restoreField,
      hardDelete: hardDeleteField,
    });

  return (
    <ArchivedListPage<Field>
      description="Restaurar o eliminar campos de forma definitiva"
      columns={columns}
      data={archivedFields}
      entityLabel={ENTITY_LABEL}
      entityLabelPlural="campos"
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
