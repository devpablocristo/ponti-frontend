import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, Download, GitCompare, Plus, Upload, Users } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import { formatProperName } from "@/lib/properName";
import Button from "../../../../components/Button/Button";
import {
  AppFilterBar,
  FilterOption,
} from "../../../../components/filters/AppFilterBar";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useActors, {
  Actor,
  ActorKind,
  ActorPayloadInput,
  ActorRole,
} from "../../../../hooks/useActors";
import { Column } from "../../types";
import { ACTOR_ENTITY as ENTITY } from "../../entities";
import ActorFormDrawer from "./ActorFormDrawer";
import { ACTOR_KIND_OPTIONS, ACTOR_ROLE_OPTIONS } from "./constants";
import { downloadCsvRows } from "../../fileTransfer";
import ArchivedActors, { ActorListFilters } from "./ArchivedActors";
import DuplicateActors from "./DuplicateActors";

const kindLabel = (kind?: string) =>
  ACTOR_KIND_OPTIONS.find((option) => option.value === kind)?.label ?? "Sin definir";

const roleLabel = (role: string) =>
  ACTOR_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;

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

type ActorsListProps = {
  rolePreset?: ActorRole;
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
              className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700"
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

export default function ActorsList({ rolePreset }: ActorsListProps) {
  const [selectedRole, setSelectedRole] = useState<ActorRole | "">(rolePreset ?? "");
  const [selectedKind, setSelectedKind] = useState<ActorKind | "">("");
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [duplicatesDrawerOpen, setDuplicatesDrawerOpen] = useState(false);
  const { actors, processing, error, getActors, createActor, updateActor, archiveActor } =
    useActors();

  const refresh = useCallback(() => {
    const params = new URLSearchParams({ page: "1", per_page: "1000" });
    if (selectedRole) params.set("role", selectedRole);
    return getActors(params.toString());
  }, [getActors, selectedRole]);

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
    onAfter: refresh,
  });

  const rows = useMemo(() => {
    return actors.filter((actor) => {
      if (selectedRole && !(actor.roles ?? []).includes(selectedRole)) return false;
      if (selectedKind && actor.actor_kind !== selectedKind) return false;
      return true;
    });
  }, [actors, selectedKind, selectedRole]);

  const actorListFilters = useMemo<ActorListFilters>(
    () => ({
      role: selectedRole,
      kind: selectedKind,
    }),
    [selectedKind, selectedRole],
  );

  const handleImport = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;
      const text = await file.text();
      const inputs = parseCsv(text)
        .map(rowToActorInput)
        .filter((input): input is ActorPayloadInput => input !== null);

      await Promise.all(inputs.map((input) => createActor(input)));
      refresh();
    },
    [createActor, refresh]
  );

  const handleExport = useCallback(() => {
    downloadCsvRows(
      `actores_${new Date().toISOString()}.csv`,
      rows.map((actor) => ({
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
      }))
    );
  }, [rows]);

  const bulk = useBulkActions<Actor>({
    items: rows,
    entity: ENTITY,
    archive: archiveActor,
    onEdit: (item) => drawer.openEdit(item),
    onAfter: refresh,
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (rolePreset) {
      setSelectedRole(rolePreset);
    }
  }, [rolePreset]);

  const selectColumn = useMemo<Column<Actor>>(
    () => makeSelectColumn<Actor>(bulk, (actor) => actor.display_name, ENTITY),
    [bulk]
  );

  const tableColumns = useMemo<Column<Actor>[]>(() => [selectColumn, ...columns], [selectColumn]);

  return (
    <div className="relative">
      <LoadingOverlay show={processing} />
      {error && <ErrorBanner message={error} variant="outlined" prefix="Error:" />}

      <AppFilterBar
        filters={[
          {
            type: "search",
            name: "rol",
            label: "Rol",
            placeholder: "Buscar",
            value: selectedRole ? roleLabel(selectedRole) : "Todos los roles",
            options: roleOptions,
            disabled: Boolean(rolePreset),
            onChange: () => {},
            setData: (data) => {
              if (rolePreset) return;
              const option = data as FilterOption | undefined;
              setSelectedRole((option?.id as ActorRole | undefined) ?? "");
            },
            allLabel: "Todos los roles",
          },
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
        actions={[
          {
            label: "Importar",
            icon: <Download className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            accept: ".csv,text/csv",
            onFileChange: handleImport,
          },
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: handleExport,
          },
          ...(!rolePreset
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

      {!processing && rows.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Aún no hay actores"
          description="Creá el primer actor maestro para asignarle roles y relaciones."
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
            totalCount={rows.length}
            allSelected={bulk.allSelected}
            onToggleAll={bulk.toggleAll}
            onClear={bulk.clear}
            actions={bulk.actions}
            entity={ENTITY}
          />
          <DataTable data={rows} columns={tableColumns} />
        </>
      )}

      <ActorFormDrawer
        open={drawer.open}
        actor={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Actores archivados"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedActors filters={actorListFilters} onAfterRestore={refresh} />
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
