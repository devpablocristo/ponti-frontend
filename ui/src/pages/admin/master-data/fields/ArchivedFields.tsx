import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useFields from "../../../../hooks/useFields";
import type { Data as Field } from "../../../../hooks/useFields/types";
import { Column } from "../../types";
import { FIELD_ENTITY as ENTITY } from "../../entities";

const columns: Column<Field>[] = [
  { key: "name", header: "Campo" },
  { key: "project_id", header: "Proyecto (id)" },
];

type ArchivedFieldsProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedFields({ onAfterRestore }: ArchivedFieldsProps = {}) {
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

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreField(id);
      onAfterRestore?.();
    },
    [restoreField, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      await hardDeleteField(id);
      onAfterRestore?.();
    },
    [hardDeleteField, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing } =
    useArchiveActions<Field>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  return (
    <ArchivedListPage<Field>
      description="Restaurar o eliminar campos de forma definitiva"
      columns={columns}
      data={archivedFields}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={error}
    />
  );
}
