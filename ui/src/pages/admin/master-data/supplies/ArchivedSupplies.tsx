import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useSupplies from "../../../../hooks/useSupplies";
import type { Supply } from "../../../../hooks/useSupplies/types";
import { Column } from "../../types";
import { SUPPLY_ENTITY as ENTITY } from "../../entities";

const columns: Column<Supply>[] = [
  { key: "name", header: "Insumo" },
  { key: "category_name", header: "Rubro" },
  { key: "type_name", header: "Tipo / Clase" },
  { key: "unit_name", header: "Unidad" },
];

const restoreAdapter = (op: ReturnType<typeof useSupplies>["restoreSupply"]) =>
  op
    ? async (id: number) => {
        await op(id);
      }
    : undefined;

const hardDeleteAdapter = (
  op: ReturnType<typeof useSupplies>["hardDeleteSupply"],
) =>
  op
    ? async (id: number) => {
        await op(id);
      }
    : undefined;

type ArchivedSuppliesProps = {
  onAfterRestore?: () => void;
};

export default function ArchivedSupplies({ onAfterRestore }: ArchivedSuppliesProps = {}) {
  const {
    supplies,
    getArchivedSupplies,
    restoreSupply,
    hardDeleteSupply,
    processing,
    error,
  } = useSupplies();

  const refetch = useCallback(
    () => getArchivedSupplies("page=1&per_page=1000"),
    [getArchivedSupplies],
  );

  const adaptedRestore = restoreAdapter(restoreSupply);
  const adaptedHardDelete = hardDeleteAdapter(hardDeleteSupply);

  const { runRestore, runHardDelete, processing: actionProcessing } =
    useArchiveActions<Supply>({
      refetch,
      restore: adaptedRestore
        ? async (id) => {
            await adaptedRestore(id);
            onAfterRestore?.();
          }
        : undefined,
      hardDelete: adaptedHardDelete
        ? async (id) => {
            await adaptedHardDelete(id);
            onAfterRestore?.();
          }
        : undefined,
    });

  return (
    <ArchivedListPage<Supply>
      description="Restaurar o eliminar insumos de forma definitiva"
      columns={columns}
      data={supplies}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={error ?? undefined}
    />
  );
}
