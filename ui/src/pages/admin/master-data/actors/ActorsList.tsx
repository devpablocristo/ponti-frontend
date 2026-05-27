import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Download, GitCompare, Plus, Upload, Users } from "lucide-react";

import { apiClient } from "@/api/client";
import { SuccessResponse } from "@/api/types";
import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../../components/crud/ResponsiveTable";
import { formatProperName } from "@/lib/properName";
import Button from "../../../../components/Button/Button";
import { AppFilterBar, FilterOption } from "../../../../components/filters/AppFilterBar";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { notify } from "@/lib/notify";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../../components/feedback/Skeleton";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useActors, {
  Actor,
  ActorKind,
  ActorPayloadInput,
  ActorRole,
} from "../../../../hooks/useActors";
import useCustomers from "../../../../hooks/useCustomers";
import useProjects from "../../../../hooks/useDatabase/projects";
import type { Project } from "../../../../hooks/useDatabase/projects/types";
import useInvestors from "../../../../hooks/useInvestors";
import useManagers from "../../../../hooks/useManagers";
import { Column } from "../../types";
import ActorFormDrawer from "./ActorFormDrawer";
import { ACTOR_KIND_OPTIONS, ACTOR_ROLE_OPTIONS } from "./constants";
import {
  buildTimestampedFilename,
  downloadExcelRows,
  EXCEL_ACCEPT,
  readImportTableAsCsvText,
} from "../../fileTransfer";
import ArchivedActorsByRole from "./ArchivedActorsByRole";
import type { ActorListFilters } from "./ArchivedActors";
import {
  buildActorArchiveRelations,
  getActorArchivedDrawerTitle,
  getActorBulkEntity,
  resolveActorArchiveTarget,
} from "./actorCrudarRouting";
import {
  actorMatchesResponsibleContext,
  buildInvestorContextMatch,
  buildResponsibleContextMatch,
  hasActorContextFilters,
  type ActorContextFilters,
} from "./actorContextFilters";
import DuplicateActors from "./DuplicateActors";

const kindLabel = (kind?: string) =>
  ACTOR_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Sin definir";

const roleLabel = (role: string) =>
  ACTOR_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

const rolePluralLabel = (role: ActorRole | "") => {
  switch (role) {
    case "responsable":
      return "Responsables";
    case "inversor":
      return "Inversores";
    case "cliente":
      return "Clientes";
    case "arrendatario":
      return "Arrendatarios";
    case "proveedor":
      return "Proveedores";
    case "contratista":
      return "Contratistas";
    default:
      return "Actores";
  }
};

const normalize = (value: unknown) =>
  String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const roleOptions: FilterOption[] = ACTOR_ROLE_OPTIONS.map((role) => ({
  id: role.value,
  name: role.label,
}));

const kindOptions: FilterOption[] = ACTOR_KIND_OPTIONS.map((kind) => ({
  id: kind.value,
  name: kind.label,
}));

type ActorSelectionMode = {
  label?: string;
  entityLabel?: string;
  emptySelectionMessage?: string;
  duplicateMessage?: string;
  selectedActorIds?: number[];
  onAdd: (actors: Actor[]) => void;
};

type ActorsListProps = {
  rolePreset?: ActorRole;
  embedded?: boolean;
  contextFilters?: ActorContextFilters;
  selectionMode?: ActorSelectionMode;
  onAfterChange?: () => void | Promise<void>;
};

function parseCsv(text: string) {
  // Strip BOM + sep= hint so files exported by the BE re-import cleanly.
  const cleaned = text.replace(/^\uFEFF/, "");
  const lines = cleaned
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !/^sep=.$/i.test(line));
  if (lines.length === 0) return [];

  const delimiter = lines[0].includes(";") ? ";" : ",";
  const headers = lines[0].split(delimiter).map((header) => normalize(header).replace(/\s+/g, "_"));

  return lines.slice(1).map((line) => {
    const values = line.split(delimiter).map((value) => value.replace(/^"|"$/g, "").trim());
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? "";
      return acc;
    }, {});
  });
}

function rowToActorInput(row: Record<string, string>): ActorPayloadInput | null {
  const displayName =
    row.display_name || row.nombre || row.nombre_visible || row.actor || row.name || "";
  if (!displayName.trim()) return null;

  const rawKind = normalize(row.actor_kind || row.tipo || row.kind);
  const actorKind =
    ACTOR_KIND_OPTIONS.find((option) => option.value === rawKind)?.value ??
    ("unknown" as ActorKind);
  const roles = (row.roles || row.rol || row.role || "")
    .split(/[|,;]+/)
    .map((role) => normalize(role))
    .filter((role): role is ActorRole =>
      ACTOR_ROLE_OPTIONS.some((option) => option.value === role)
    );

  return {
    actor_kind: actorKind,
    display_name: displayName.trim(),
    primary_email: row.email || row.primary_email || null,
    primary_phone: row.telefono || row.phone || row.primary_phone || null,
    notes: row.notas || row.notes || null,
    roles,
  };
}

const columns: Column<Actor>[] = [
  {
    key: "display_name",
    header: "Actor",
    render: (value) => <strong>{formatProperName(value)}</strong>,
  },
  {
    key: "actor_kind",
    header: "Tipo",
    render: (value) => kindLabel(String(value ?? "")),
  },
  {
    key: "roles",
    header: "Roles",
    wrap: true,
    render: (_value, actor) => {
      const roles = actor.roles ?? [];
      if (roles.length === 0) return "—";
      return (
        <div className="flex flex-wrap gap-1.5">
          {roles.map((role) => (
            <span
              key={`${actor.id}-${role}`}
              className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-1 text-xs font-medium text-slate-700 dark:text-slate-200"
            >
              {roleLabel(role)}
            </span>
          ))}
        </div>
      );
    },
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
  {
    key: "aliases",
    header: "Aliases",
    wrap: true,
    render: (_value, actor) =>
      actor.aliases?.length ? actor.aliases.map((alias) => alias.alias).join(", ") : "—",
  },
  {
    key: "primary_email",
    header: "Email",
    render: (value) => String(value || "—"),
  },
  {
    key: "primary_phone",
    header: "Teléfono",
    render: (value) => String(value || "—"),
  },
];

export default function ActorsList({
  rolePreset,
  embedded = false,
  contextFilters,
  selectionMode,
  onAfterChange,
}: ActorsListProps) {
  const [selectedRole, setSelectedRole] = useState<ActorRole | "">(rolePreset ?? "");
  const [selectedKind, setSelectedKind] = useState<ActorKind | "">("");
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const pagination = usePagination({ perPage: 25 });
  const [duplicatesDrawerOpen, setDuplicatesDrawerOpen] = useState(false);
  const hasContextFilters = hasActorContextFilters(contextFilters);
  const [contextMode, setContextMode] = useState<"current" | "all">(
    hasContextFilters ? "current" : "all"
  );
  const [projectDetails, setProjectDetails] = useState<Record<number, Project>>({});
  const [loadingContextDetails, setLoadingContextDetails] = useState(false);
  const { actors, processing, error, getActors, createActor, updateActor, archiveActor } =
    useActors();
  const { customers, getCustomers, archiveCustomer } = useCustomers();
  const { managers, getManagers, archiveManager } = useManagers();
  const { investors, getInvestors, archiveInvestor } = useInvestors();
  const {
    projects,
    processing: projectsProcessing,
    error: projectsError,
    getProjects,
  } = useProjects();

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  useEffect(() => {
    if (projectsError) notify.error(projectsError);
  }, [projectsError]);

  useEffect(() => {
    setContextMode(hasContextFilters ? "current" : "all");
  }, [hasContextFilters]);

  const refreshCrudarRelations = useCallback(async () => {
    await Promise.allSettled([
      getCustomers("page=1&per_page=1000"),
      getManagers("page=1&per_page=1000"),
      getInvestors("page=1&per_page=1000"),
    ]);
  }, [getCustomers, getInvestors, getManagers]);

  const refresh = useCallback(async () => {
    const params = new URLSearchParams({ page: "1", per_page: "1000" });
    if (selectedRole) params.set("role", selectedRole);
    await getActors(params.toString());
    await refreshCrudarRelations();
  }, [getActors, refreshCrudarRelations, selectedRole]);

  const refreshProjects = useCallback(() => {
    if (!embedded || !hasContextFilters) return;
    getProjects("page=1&per_page=1000");
  }, [embedded, getProjects, hasContextFilters]);

  const afterActorChange = useCallback(async () => {
    await refresh();
    refreshProjects();
    await onAfterChange?.();
  }, [onAfterChange, refresh, refreshProjects]);

  const saveActor = useCallback(
    async (id: number, input: ActorPayloadInput) => {
      await updateActor(id, input);
    },
    [updateActor]
  );

  const drawer = useEntityFormDrawer<Actor, ActorPayloadInput>({
    buildSuccessLabel: (input) => `el actor "${input.display_name}"`,
    create: createActor,
    update: (id, input) => saveActor(id, input),
    fallbackErrorMessage: "No se pudo guardar el actor",
    onAfter: afterActorChange,
  });

  const rows = useMemo(() => {
    return actors.filter((actor) => {
      if (selectedRole && !(actor.roles ?? []).includes(selectedRole)) return false;
      if (selectedKind && actor.actor_kind !== selectedKind) return false;
      return true;
    });
  }, [actors, selectedKind, selectedRole]);

  const roleContextMatch = useMemo(() => {
    if (!contextFilters) return null;
    if (selectedRole === "inversor") {
      return buildInvestorContextMatch(investors, projects, projectDetails, contextFilters);
    }
    return buildResponsibleContextMatch(managers, projects, projectDetails, contextFilters);
  }, [contextFilters, investors, managers, projectDetails, projects, selectedRole]);

  const visibleRows = useMemo(() => {
    if (!embedded || contextMode !== "current" || !roleContextMatch || !hasContextFilters) {
      return rows;
    }
    return rows.filter((actor) => actorMatchesResponsibleContext(actor, roleContextMatch));
  }, [contextMode, embedded, hasContextFilters, roleContextMatch, rows]);

  const selectedActorIdSet = useMemo(
    () => new Set(selectionMode?.selectedActorIds ?? []),
    [selectionMode?.selectedActorIds]
  );

  const actorListFilters = useMemo<ActorListFilters>(
    () => ({
      role: selectedRole,
      kind: selectedKind,
    }),
    [selectedKind, selectedRole]
  );

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await readImportTableAsCsvText(file);
      const inputs = parseCsv(text)
        .map(rowToActorInput)
        .filter((input): input is ActorPayloadInput => input !== null);

      await Promise.all(inputs.map((input) => createActor(input)));
      void afterActorChange();
    },
    [afterActorChange, createActor]
  );

  const handleExport = useCallback(() => {
    void downloadExcelRows(
      buildTimestampedFilename("actores", "xlsx"),
      visibleRows.map((actor) => ({
        Actor: actor.display_name,
        Tipo: kindLabel(actor.actor_kind),
        Roles: (actor.roles ?? []).map(roleLabel).join(" | "),
        Identificadores:
          actor.identifiers
            ?.map((identifier) => `${identifier.identifier_type}: ${identifier.identifier_value}`)
            .join(" | ") ?? "",
        Aliases: actor.aliases?.map((alias) => alias.alias).join(" | ") ?? "",
        Email: actor.primary_email ?? "",
        Telefono: actor.primary_phone ?? "",
      })),
      "Actores"
    );
  }, [visibleRows]);

  const actorArchiveRelations = useMemo(
    () => buildActorArchiveRelations({ customers, managers, investors }),
    [customers, investors, managers]
  );

  const archiveActorRow = useCallback(
    async (actorId: number) => {
      const actor = rows.find((item) => item.id === actorId);
      if (!actor) return;

      const target = resolveActorArchiveTarget(actor, actorArchiveRelations);
      switch (target.kind) {
        case "customer":
          await archiveCustomer(target.id);
          return;
        case "manager":
          await archiveManager(target.id);
          return;
        case "investor":
          await archiveInvestor(target.id);
          return;
        case "actor":
          await archiveActor(target.id);
          return;
      }
    },
    [actorArchiveRelations, archiveActor, archiveCustomer, archiveInvestor, archiveManager, rows]
  );

  const bulkEntity = useMemo(() => getActorBulkEntity(selectedRole), [selectedRole]);
  const defaultActorFormRoles = useMemo<ActorRole[]>(
    () => (selectedRole ? [selectedRole] : []),
    [selectedRole]
  );

  const bulk = useBulkActions<Actor>({
    items: visibleRows,
    entity: bulkEntity,
    archive: archiveActorRow,
    onEdit: (item) => drawer.openEdit(item),
    onAfter: () => {
      void afterActorChange();
    },
  });

  useEffect(() => {
    refresh();
    refreshProjects();
  }, [refresh, refreshProjects]);

  useEffect(() => {
    if (rolePreset) {
      setSelectedRole(rolePreset);
    }
  }, [rolePreset]);

  useEffect(() => {
    if (!embedded || !hasContextFilters || projects.length === 0) return;
    const missingProjects = projects.filter((project) => !projectDetails[project.id]);
    if (missingProjects.length === 0) return;

    let cancelled = false;
    setLoadingContextDetails(true);

    Promise.all(
      missingProjects.map(async (project) => {
        const response = await apiClient.get<SuccessResponse<Project>>(`/projects/${project.id}`);
        return [project.id, response.data] as const;
      })
    )
      .then((entries) => {
        if (cancelled) return;
        setProjectDetails((prev) => {
          const next = { ...prev };
          entries.forEach(([id, detail]) => {
            next[id] = detail;
          });
          return next;
        });
      })
      .catch(() => {
        // El modo embebido conserva la lista general aunque no pueda hidratar contexto.
      })
      .finally(() => {
        if (!cancelled) setLoadingContextDetails(false);
      });

    return () => {
      cancelled = true;
    };
  }, [embedded, hasContextFilters, projectDetails, projects]);

  const selectColumn = useMemo<Column<Actor>>(
    () => makeSelectColumn<Actor>(bulk, (actor) => actor.display_name, bulkEntity),
    [bulk, bulkEntity]
  );

  const tableColumns = useMemo<Column<Actor>[]>(() => [selectColumn, ...columns], [selectColumn]);

  const addSelectedActors = () => {
    if (!selectionMode) return;
    const actorsToAdd = bulk.selectedItems.filter((actor) => !selectedActorIdSet.has(actor.id));
    if (bulk.selectedItems.length === 0) {
      notify.warning(
        selectionMode.emptySelectionMessage ??
          `Seleccioná al menos un ${selectionMode.entityLabel ?? "actor"}.`
      );
      return;
    }
    if (actorsToAdd.length === 0) {
      notify.info(
        selectionMode.duplicateMessage ??
          "Los actores seleccionados ya están cargados en el proyecto."
      );
      return;
    }
    selectionMode.onAdd(actorsToAdd);
    bulk.clear();
  };
  const embeddedEntityLabel = rolePluralLabel(selectedRole);

  return (
    <div className={embedded ? "relative" : "relative"}>
      <LoadingOverlay
        show={(processing || projectsProcessing || loadingContextDetails) && visibleRows.length > 0}
      />

      <AppFilterBar
        filters={[
          ...(!rolePreset
            ? [
                {
                  type: "search" as const,
                  name: "rol",
                  label: "Rol",
                  placeholder: "Buscar",
                  value: selectedRole ? roleLabel(selectedRole) : "Todos los roles",
                  options: roleOptions,
                  disabled: Boolean(rolePreset),
                  onChange: () => {},
                  setData: (data: unknown) => {
                    if (rolePreset) return;
                    const option = data as FilterOption | undefined;
                    setSelectedRole((option?.id as ActorRole | undefined) ?? "");
                  },
                  allLabel: "Todos los roles",
                },
              ]
            : []),
          {
            type: "search",
            name: "tipo",
            label: "Tipo",
            placeholder: "Buscar",
            value: selectedKind ? kindLabel(selectedKind) : "Todos los tipos",
            options: kindOptions,
            onChange: () => {},
            setData: (data) => {
              const option = data as FilterOption | undefined;
              setSelectedKind((option?.id as ActorKind | undefined) ?? "");
            },
            allLabel: "Todos los tipos",
          },
        ]}
        // Orden canónico Datos Maestros: extras → Importar → Exportar → Archivados → Nuevo.
        actions={[
          ...(!rolePreset && !embedded
            ? [
                {
                  label: "Duplicados",
                  icon: <GitCompare className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  onClick: () => setDuplicatesDrawerOpen(true),
                },
              ]
            : []),
          ...(!embedded
            ? [
                {
                  label: "Importar",
                  icon: <Download className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  accept: EXCEL_ACCEPT,
                  onFileChange: handleImport,
                },
                {
                  label: "Exportar",
                  icon: <Upload className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  onClick: handleExport,
                },
              ]
            : []),
          ...(selectionMode
            ? [
                ...(hasContextFilters
                  ? [
                      {
                        label: "Proyecto Actual",
                        variant:
                          contextMode === "current" ? ("light" as const) : ("primary" as const),
                        isPrimary: true,
                        onClick: () => setContextMode("current"),
                      },
                      {
                        label: "Todos",
                        variant: contextMode === "all" ? ("light" as const) : ("primary" as const),
                        isPrimary: true,
                        onClick: () => setContextMode("all"),
                      },
                    ]
                  : []),
                {
                  label: selectionMode.label ?? "Agregar",
                  icon: <Plus className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  disabled: bulk.selectedCount === 0,
                  onClick: addSelectedActors,
                },
              ]
            : []),
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => setArchivedDrawerOpen(true),
          },
          {
            label: "Nuevo",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: drawer.openCreate,
          },
        ]}
      />

      {(processing || projectsProcessing || loadingContextDetails) && visibleRows.length === 0 ? (
        <TableSkeleton rows={10} columns={tableColumns.length} />
      ) : visibleRows.length === 0 ? (
        <EmptyState
          icon={Users}
          title={
            embedded && contextMode === "current"
              ? `No Hay ${embeddedEntityLabel} En El Proyecto Actual`
              : "Aún No Hay Actores"
          }
          description={
            embedded && contextMode === "current"
              ? `Cambiá a Todos para buscar ${embeddedEntityLabel.toLowerCase()} fuera del proyecto actual.`
              : "Creá el primer actor maestro para asignarle roles y relaciones."
          }
          cta={
            <Button
              variant="primary"
              iconLeft={<Plus className="h-4 w-4" />}
              onClick={drawer.openCreate}
            >
              Nuevo
            </Button>
          }
        />
      ) : (
        <>
          <BulkSelectionPanel
            selectedCount={bulk.selectedCount}
            totalCount={visibleRows.length}
            allSelected={bulk.allSelected}
            onToggleAll={bulk.toggleAll}
            onClear={bulk.clear}
            actions={bulk.actions}
            entity={bulkEntity}
          />
          <ResponsiveTable<Actor>
            data={visibleRows}
            columns={tableColumns}
            pagination={pagination.buildPagination(visibleRows.length)}
            primaryKey="display_name"
            rowKey={(a) => a.id}
            emptyMessage="No hay actores para mostrar"
          />
        </>
      )}

      <ActorFormDrawer
        open={drawer.open}
        actor={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        defaultRoles={defaultActorFormRoles}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title={getActorArchivedDrawerTitle(selectedRole)}
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedActorsByRole filters={actorListFilters} onAfterRestore={afterActorChange} />
      </ArchivedDrawer>
      <ArchivedDrawer
        open={duplicatesDrawerOpen}
        title="Duplicados"
        onClose={() => setDuplicatesDrawerOpen(false)}
      >
        <DuplicateActors filters={actorListFilters} />
      </ArchivedDrawer>
    </div>
  );
}
