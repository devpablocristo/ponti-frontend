import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useActors, { Actor } from "../../../../hooks/useActors";
import { Column } from "../../types";
import { ACTOR_ENTITY as ENTITY } from "../../entities";
import { ACTOR_KIND_OPTIONS, ACTOR_ROLE_OPTIONS } from "./constants";

const kindLabel = (kind?: string) =>
  ACTOR_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Sin definir";

const roleLabel = (role: string) =>
  ACTOR_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

const columns: Column<Actor>[] = [
  { key: "display_name", header: "Actor" },
  {
    key: "actor_kind",
    header: "Tipo",
    render: (value) => kindLabel(String(value ?? "")),
  },
  {
    key: "roles",
    header: "Roles",
    wrap: true,
    render: (_value, actor) =>
      actor.roles?.length ? actor.roles.map(roleLabel).join(", ") : "—",
  },
  {
    key: "identifiers",
    header: "Identificadores",
    wrap: true,
    render: (_value, actor) =>
      actor.identifiers?.length
        ? actor.identifiers
            .map((identifier) => `${identifier.identifier_type}: ${identifier.identifier_value}`)
            .join(", ")
        : "—",
  },
];

export default function ArchivedActors() {
  const {
    archivedActors,
    getArchivedActors,
    restoreActor,
    hardDeleteActor,
    processing,
    error,
  } = useActors();

  const refetch = useCallback(async () => {
    await getArchivedActors("page=1&per_page=1000");
  }, [getArchivedActors]);

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<Actor>({
      refetch,
      restore: restoreActor,
      hardDelete: hardDeleteActor,
    });

  return (
    <ArchivedListPage<Actor>
      description="Restaurar o eliminar actores de forma definitiva"
      columns={columns}
      data={archivedActors}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.display_name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
    />
  );
}
