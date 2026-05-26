import { useCallback } from "react";

import { ArchivedListPage } from "../../../../components/ArchivedListPage/ArchivedListPage";
import { useArchiveActions } from "../../../../hooks/useArchiveActions";
import useProjects from "../../../../hooks/useDatabase/projects";
import { ProjectData } from "../../../../hooks/useDatabase/projects/types";
import { Column } from "../../types";
import { PROJECT_ENTITY as ENTITY } from "../../entities";

const columns: Column<ProjectData>[] = [
  { key: "customer", header: "Cliente/Sociedad" },
  { key: "name", header: "Proyecto" },
  { key: "campaign", header: "Campaña" },
  { key: "managers", header: "Responsable" },
  { key: "investors", header: "Inversores y aportes" },
];

const getProjectHardDeleteCopy = (count: number) => ({
  title: "Confirmar eliminación definitiva",
  message:
    count === 1
      ? "¿Eliminar definitivamente este proyecto? Esta acción elimina en cascada el proyecto, sus campos, lotes y datos relacionados. No se puede deshacer."
      : `¿Eliminar definitivamente ${count} proyectos? Esta acción elimina en cascada los proyectos, sus campos, lotes y datos relacionados. No se puede deshacer.`,
  primaryButtonText: "Eliminar definitivamente",
  secondaryButtonText: "Cancelar",
});

type ArchivedProjectsProps = {
  onAfterRestore?: () => Promise<void> | void;
};

export default function ArchivedProjects({ onAfterRestore }: ArchivedProjectsProps) {
  const {
    projects,
    getArchivedProjects,
    restoreProject,
    hardDeleteProject,
    processing,
    error,
  } = useProjects();

  const refetch = useCallback(
    () => getArchivedProjects("page=1&per_page=1000"),
    [getArchivedProjects],
  );
  const restoreAndNotify = useCallback(
    async (id: number) => {
      await restoreProject(id);
      await onAfterRestore?.();
    },
    [onAfterRestore, restoreProject],
  );

  const { runRestore, runHardDelete, processing: actionProcessing } =
    useArchiveActions<ProjectData>({
      refetch,
      restore: restoreAndNotify,
      hardDelete: hardDeleteProject,
    });

  return (
    <ArchivedListPage<ProjectData>
      description="Restaurar o eliminar proyectos de forma definitiva"
      columns={columns}
      data={projects}
      entity={ENTITY}
      bulk
      getItemLabel={(item) => item.name}
      ignoreWorkspaceFilters
      onRestore={runRestore ?? undefined}
      onHardDelete={runHardDelete ?? undefined}
      getHardDeleteCopy={getProjectHardDeleteCopy}
      onMount={refetch}
      processing={processing || actionProcessing}
      error={error}
    />
  );
}
