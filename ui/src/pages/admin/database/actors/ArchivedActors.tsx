import { useCallback, useMemo } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useActors, { Actor, ActorKind, ActorRole } from "../../../../hooks/useActors";
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

export type ActorListFilters = {
  actorId?: number | null;
  actorName?: string;
  role?: ActorRole | "";
  kind?: ActorKind | "";
};

const actorMatchesFilters = (actor: Actor, filters?: ActorListFilters) => {
  if (!filters) return true;
  if (filters.actorId && actor.id !== filters.actorId) return false;
  if (filters.role && !(actor.roles ?? []).includes(filters.role)) return false;
  if (filters.kind && actor.actor_kind !== filters.kind) return false;
  return true;
};

type ArchivedActorsProps = {
  filters?: ActorListFilters;
  onAfterRestore?: () => void;
};

export default function ArchivedActors({ filters, onAfterRestore }: ArchivedActorsProps) {
  const {
    archivedActors,
    getArchivedActors,
    restoreActor,
    hardDeleteActor,
    processing,
    error,
  } = useActors();

  const refetch = useCallback(async () => {
    const params = new URLSearchParams({ page: "1", per_page: "1000" });
    if (filters?.role) params.set("role", filters.role);
    if (filters?.actorName) params.set("q", filters.actorName);
    await getArchivedActors(params.toString());
  }, [filters?.actorName, filters?.role, getArchivedActors]);

  const filteredActors = useMemo(
    () => archivedActors.filter((actor) => actorMatchesFilters(actor, filters)),
    [archivedActors, filters],
  );

  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreActor(id);
      onAfterRestore?.();
    },
    [restoreActor, onAfterRestore],
  );

  const hardDeleteAndNotify = useCallback(
    async (id: number) => {
      await hardDeleteActor(id);
      onAfterRestore?.();
    },
    [hardDeleteActor, onAfterRestore],
  );

  const { runRestore, runHardDelete, processing: actionProcessing, lastError } =
    useArchiveActions<Actor>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteAndNotify,
    });

  return (
    <ArchivedListPage<Actor>
      description="Restaurar o eliminar actores de forma definitiva"
      columns={columns}
      data={filteredActors}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.display_name}
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={lastError ?? error}
      ignoreWorkspaceFilters
    />
  );
}
