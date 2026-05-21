import { useCallback, useEffect, useMemo, useState } from "react";
import { GitMerge, RefreshCcw } from "lucide-react";

import Button from "../../../../components/Button/Button";
import { Checkbox } from "../../../../components/Input/Checkbox";
import { Notification } from "../../../../components/feedback/Notification";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import useActors, {
  ActorKind,
  ActorMergeImpact,
  ActorRole,
  DuplicateCandidate,
} from "../../../../hooks/useActors";
import { ACTOR_KIND_OPTIONS, ACTOR_ROLE_OPTIONS } from "./constants";

type MergeSelection = {
  targetId: number | null;
  sourceIds: number[];
};

type DuplicateActor = DuplicateCandidate["actors"][number];

type DuplicateActorsFilters = {
  actorId?: number | null;
  role?: ActorRole | "";
  kind?: ActorKind | "";
};

const candidateKey = (candidate: DuplicateCandidate) =>
  `${candidate.group_type}:${candidate.group_key}`;

const kindLabel = (kind?: string) =>
  ACTOR_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Sin definir";

const roleLabel = (role: string) =>
  ACTOR_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

const groupLabel = (groupType: string) => {
  switch (groupType) {
    case "identificador":
      return "Identificador";
    case "alias":
      return "Alias";
    case "razon_social":
      return "Razón social";
    case "nombre_comercial":
      return "Nombre comercial";
    default:
      return "Nombre";
  }
};

const actorMatchesFilters = (actor: DuplicateActor, filters?: DuplicateActorsFilters) => {
  if (!filters) return true;
  if (filters.role && !(actor.roles ?? []).includes(filters.role)) return false;
  if (filters.kind && actor.actor_kind !== filters.kind) return false;
  return true;
};

const filterCandidate = (
  candidate: DuplicateCandidate,
  filters?: DuplicateActorsFilters,
): DuplicateCandidate | null => {
  if (!filters?.actorId) {
    const actors = candidate.actors.filter((actor) => actorMatchesFilters(actor, filters));
    return actors.length >= 2 ? { ...candidate, actors } : null;
  }

  const selectedActor = candidate.actors.find((actor) => actor.id === filters.actorId);
  if (!selectedActor || !actorMatchesFilters(selectedActor, filters)) return null;
  return candidate;
};

type DuplicateActorsProps = {
  filters?: DuplicateActorsFilters;
};

export default function DuplicateActors({ filters }: DuplicateActorsProps) {
  const { getDuplicateCandidates, mergeActors } = useActors();
  const [candidates, setCandidates] = useState<DuplicateCandidate[]>([]);
  const [selection, setSelection] = useState<Record<string, MergeSelection>>({});
  const [impactByGroup, setImpactByGroup] = useState<Record<string, ActorMergeImpact>>({});
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDuplicateCandidates();
      setCandidates(data);
      setSelection((current) => {
        const next: Record<string, MergeSelection> = {};
        data.forEach((candidate) => {
          const key = candidateKey(candidate);
          const existing = current[key];
          const targetId = existing?.targetId ?? candidate.actors[0]?.id ?? null;
          next[key] = {
            targetId,
            sourceIds:
              existing?.sourceIds.filter((id) =>
                candidate.actors.some((actor) => actor.id === id && actor.id !== targetId)
              ) ??
              candidate.actors
                .slice(1)
                .map((actor) => actor.id)
                .filter((id) => id !== targetId),
          };
        });
        return next;
      });
    } catch {
      setError("No se pudieron cargar los posibles duplicados.");
    } finally {
      setLoading(false);
    }
  }, [getDuplicateCandidates]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const visibleCandidates = useMemo(
    () =>
      candidates
        .map((candidate) => filterCandidate(candidate, filters))
        .filter((candidate): candidate is DuplicateCandidate => candidate !== null),
    [candidates, filters],
  );

  const totalGroups = visibleCandidates.length;

  const setTarget = (key: string, targetId: number) => {
    setSelection((current) => {
      const previous = current[key] ?? { targetId: null, sourceIds: [] };
      return {
        ...current,
        [key]: {
          targetId,
          sourceIds: previous.sourceIds.filter((id) => id !== targetId),
        },
      };
    });
    setImpactByGroup((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const toggleSource = (key: string, sourceId: number) => {
    setSelection((current) => {
      const previous = current[key] ?? { targetId: null, sourceIds: [] };
      const sourceIds = previous.sourceIds.includes(sourceId)
        ? previous.sourceIds.filter((id) => id !== sourceId)
        : [...previous.sourceIds, sourceId];
      return { ...current, [key]: { ...previous, sourceIds } };
    });
    setImpactByGroup((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const simulate = async (candidate: DuplicateCandidate) => {
    const key = candidateKey(candidate);
    const current = selection[key];
    if (!current?.targetId || current.sourceIds.length === 0) return;
    setActionLoading(`simulate:${key}`);
    setError(null);
    try {
      const impact = await mergeActors({
        target_actor_id: current.targetId,
        source_actor_ids: current.sourceIds,
        reason: "Simulación de merge desde UI",
        confirm: false,
      });
      setImpactByGroup((previous) => ({ ...previous, [key]: impact }));
    } catch {
      setError("No se pudo simular el merge.");
    } finally {
      setActionLoading(null);
    }
  };

  const confirm = async (candidate: DuplicateCandidate) => {
    const key = candidateKey(candidate);
    const current = selection[key];
    if (!current?.targetId || current.sourceIds.length === 0) return;
    setActionLoading(`confirm:${key}`);
    setError(null);
    try {
      await mergeActors({
        target_actor_id: current.targetId,
        source_actor_ids: current.sourceIds,
        reason: "Merge manual confirmado desde UI",
        confirm: true,
      });
      setImpactByGroup((previous) => {
        const next = { ...previous };
        delete next[key];
        return next;
      });
      await refresh();
    } catch {
      setError("No se pudo confirmar el merge.");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="relative">
      <LoadingOverlay show={loading} />
      {error ? <Notification variant="error" message={error} prefix="Error:" /> : null}

      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-slate-600">
          {totalGroups} grupos de posibles duplicados
        </div>
        <Button
          variant="light"
          size="sm"
          iconLeft={<RefreshCcw className="h-4 w-4" />}
          onClick={refresh}
          disabled={loading}
        >
          Actualizar
        </Button>
      </div>

      {visibleCandidates.length === 0 && !loading ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <GitMerge className="mx-auto mb-3 h-8 w-8 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-800">No hay posibles duplicados</h2>
          <p className="mt-1 text-sm text-slate-500">
            La búsqueda por identificador, nombre, alias y razón social no encontró grupos.
          </p>
        </div>
      ) : null}

      <div className="space-y-4">
        {visibleCandidates.map((candidate) => {
          const key = candidateKey(candidate);
          const visibleActorIds = new Set(candidate.actors.map((actor) => actor.id));
          const saved = selection[key];
          const targetId =
            saved?.targetId && visibleActorIds.has(saved.targetId)
              ? saved.targetId
              : candidate.actors[0]?.id ?? null;
          const current = {
            targetId,
            sourceIds: (
              saved?.sourceIds ??
              candidate.actors
                .slice(1)
                .map((actor) => actor.id)
            ).filter((id) => visibleActorIds.has(id) && id !== targetId),
          };
          const impact = impactByGroup[key];
          const busy = actionLoading?.endsWith(key);
          return (
            <section key={key} className="rounded-lg border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-1 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">
                    {groupLabel(candidate.group_type)}: {candidate.group_key}
                  </h2>
                  <p className="text-xs text-slate-500">
                    Elegí un destino y uno o más orígenes. Primero simulá, después confirmá.
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  {candidate.actors.length} actores
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-sm">
                  <thead className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Destino</th>
                      <th className="px-4 py-3">Origen</th>
                      <th className="px-4 py-3">Actor</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Roles</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {candidate.actors.map((actor) => (
                      <tr key={`${key}-${actor.id}`}>
                        <td className="px-4 py-3">
                          <input
                            type="radio"
                            name={`target-${key}`}
                            checked={current.targetId === actor.id}
                            onChange={() => setTarget(key, actor.id)}
                            className="h-4 w-4 text-blue-600"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Checkbox
                            checked={current.sourceIds.includes(actor.id)}
                            disabled={current.targetId === actor.id}
                            onChange={() => toggleSource(key, actor.id)}
                          />
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {actor.display_name}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{kindLabel(actor.actor_kind)}</td>
                        <td className="px-4 py-3 text-slate-700">
                          {actor.roles.length ? actor.roles.map(roleLabel).join(", ") : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {impact ? (
                <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Impacto simulado
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(impact.counts).length === 0 ? (
                      <span className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600">
                        Sin referencias bloqueantes ni relaciones para mover.
                      </span>
                    ) : (
                      Object.entries(impact.counts).map(([name, count]) => (
                        <span
                          key={`${key}-${name}`}
                          className="rounded-md bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                        >
                          {name}: {count}
                        </span>
                      ))
                    )}
                  </div>
                </div>
              ) : null}

              <div className="flex justify-end gap-2 border-t border-slate-100 px-4 py-3">
                <Button
                  variant="light"
                  size="sm"
                  disabled={!current.targetId || current.sourceIds.length === 0 || busy}
                  onClick={() => simulate(candidate)}
                >
                  Simular
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={!impact || !current.targetId || current.sourceIds.length === 0 || busy}
                  iconLeft={<GitMerge className="h-4 w-4" />}
                  onClick={() => confirm(candidate)}
                >
                  Confirmar merge
                </Button>
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
