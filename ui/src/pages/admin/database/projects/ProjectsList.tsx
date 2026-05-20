import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, FolderKanban } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import useProjects from "../../../../hooks/useDatabase/projects";
import type { ProjectData } from "../../../../hooks/useDatabase/projects/types";
import { Column } from "../../types";
import { PROJECT_ENTITY as ENTITY } from "../../entities";
import ArchivedProjects from "./ArchivedProjects";

const baseColumns: Column<ProjectData>[] = [
  { key: "name", header: "Nombre" },
  { key: "customer", header: "Cliente" },
  { key: "campaign", header: "Campaña" },
  { key: "managers", header: "Responsables" },
];

export default function ProjectsList() {
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const {
    projects,
    processing,
    error,
    getProjects,
    deleteProject,
  } = useProjects();
  const { filters } = useWorkspaceFilters(["customer", "project", "campaign"]);

  const refresh = useCallback(() => getProjects(""), [getProjects]);

  // `deleteProject` del hook llama a POST /projects/:id/archive (soft delete).
  // Edit individual no se ofrece aquí: requiere navegar al editor de Customer,
  // que necesita customer_id no incluido en la respuesta de lista de projects.
  const bulk = useBulkActions<ProjectData>({
    items: projects,
    entity: ENTITY,
    archive: deleteProject,
    onAfter: refresh,
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const selectColumn = useMemo<Column<ProjectData>>(
    () => makeSelectColumn<ProjectData>(bulk, (p) => p.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<ProjectData>[]>(
    () => [selectColumn, ...baseColumns],
    [selectColumn],
  );

  return (
    <div>
      <AppFilterBar
        filters={filters}
        actions={[
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => setArchivedDrawerOpen(true),
          },
        ]}
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing} />
        {error && <ErrorBanner message={error} />}
        {!processing && projects.length === 0 ? (
          <EmptyState
            icon={FolderKanban}
            title="Aún no hay proyectos"
            description="Los proyectos se crean desde el editor de Clientes."
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={projects.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <DataTable data={projects} columns={tableColumns} />
          </>
        )}
      </div>

      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Proyectos archivados"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedProjects onAfterRestore={refresh} />
      </ArchivedDrawer>
    </div>
  );
}
