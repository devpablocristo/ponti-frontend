import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, MapPin, Plus, Upload } from "lucide-react";

import { buildTimestampedFilename, downloadExcelRows } from "../../fileTransfer";

import { usePagination } from "@/lib/dataDisplay";
import { ResponsiveTable } from "../../../../components/crud/ResponsiveTable";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { notify } from "@/lib/notify";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { TableSkeleton } from "../../../../components/feedback/Skeleton";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { DrawerShell } from "../../../../components/Drawer/DrawerShell";
import { formatProperName } from "../../../../lib/properName";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import useFields from "../../../../hooks/useFields";
import { Data as Field } from "../../../../hooks/useFields/types";
import { Column } from "../../types";
import { FIELD_ENTITY as ENTITY } from "../../entities";
import CustomerEditor from "../customers/CustomerEditor";
import ArchivedFields from "./ArchivedFields";
import type { ActorContextFilters } from "../actors/actorContextFilters";

const baseColumns: Column<Field>[] = [
  { key: "name", header: "Nombre", render: (value) => formatProperName(value) },
  {
    key: "lease_type_name",
    header: "Tipo de contrato",
    render: (value) => String(value ?? "-"),
  },
];

type FieldsListProps = {
  editorOnly?: boolean;
  embedded?: boolean;
  selectionOnly?: boolean;
  contextFilters?: ActorContextFilters;
  selectionMode?: {
    label?: string;
    selectedIds?: number[];
    onAdd: (fields: Field[]) => void;
    onCreateNew?: () => void;
  };
  onAfterChange?: () => void | Promise<void>;
};

const hasPositiveId = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value > 0;

export default function FieldsList({
  editorOnly = false,
  embedded = false,
  selectionOnly = false,
  contextFilters,
  selectionMode,
  onAfterChange,
}: FieldsListProps) {
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const [contextMode, setContextMode] = useState<"current" | "all">(
    hasPositiveId(contextFilters?.projectId) ? "current" : "all"
  );
  const pagination = usePagination({ perPage: 25 });
  const [editorContext, setEditorContext] = useState<{
    initialProjectId: number | null;
  } | null>(null);
  const { fields, processing, error, getFields, archiveField } = useFields();

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);
  const {
    filters: allFilters,
    selectedCustomer,
    selectedProject,
    selectedCampaignId,
    fields: workspaceFields,
  } = useWorkspaceFilters(["customer", "project", "campaign", "field"]);
  // El catálogo de Campos no necesita filtrar por Campo (estás viendo
  // campos). Pasamos "field" al hook solo para que la lista de fields del
  // workspace se cargue, pero lo escondemos del filter bar.
  const filters = useMemo(
    () => allFilters.filter((f) => f.name !== "campo" && f.name !== "field"),
    [allFilters]
  );

  useEffect(() => {
    setContextMode(hasPositiveId(contextFilters?.projectId) ? "current" : "all");
  }, [contextFilters?.projectId]);

  const refresh = useCallback(async () => {
    await getFields("");
    await onAfterChange?.();
  }, [getFields, onAfterChange]);

  // Client-side filter using the workspace selection. workspaceFields is
  // already scoped to the selected project (or all when no project selected).
  // We use it as the allow-list when any workspace filter is active and
  // intersect with the full catalog loaded locally.
  const visibleFields = useMemo(() => {
    if (embedded) {
      if (contextMode !== "current" || !hasPositiveId(contextFilters?.projectId)) {
        return fields;
      }
      return fields.filter((field) => field.project_id === contextFilters.projectId);
    }

    const isScoped = Boolean(selectedCustomer || selectedProject || selectedCampaignId);
    if (!isScoped) return fields;
    const scopedIds = new Set(workspaceFields.map((f) => f.id));
    return fields.filter((f) => scopedIds.has(f.id));
  }, [
    contextFilters?.projectId,
    contextMode,
    embedded,
    fields,
    selectedCampaignId,
    selectedCustomer,
    selectedProject,
    workspaceFields,
  ]);

  const openFieldEditor = useCallback((field: Field) => {
    setEditorContext({ initialProjectId: field.project_id ?? null });
  }, []);

  const bulk = useBulkActions<Field>({
    items: visibleFields,
    entity: ENTITY,
    archive: selectionOnly ? undefined : archiveField,
    onEdit: embedded ? undefined : openFieldEditor,
    onAfter: refresh,
  });

  const selectedFieldIds = useMemo(
    () => new Set(selectionMode?.selectedIds ?? []),
    [selectionMode?.selectedIds]
  );

  const addSelectedFields = () => {
    if (!selectionMode) return;
    if (bulk.selectedItems.length === 0) {
      notify.warning("Seleccioná al menos un campo.");
      return;
    }
    const fieldsToAdd = bulk.selectedItems.filter((field) => !selectedFieldIds.has(field.id));
    if (fieldsToAdd.length === 0) {
      notify.info("Los campos seleccionados ya están cargados en el proyecto.");
      return;
    }
    selectionMode.onAdd(fieldsToAdd);
    bulk.clear();
  };

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleExport = useCallback(() => {
    void downloadExcelRows(
      buildTimestampedFilename("campos", "xlsx"),
      visibleFields.map((field) => ({
        Nombre: field.name,
        "Tipo de contrato": field.lease_type_name ?? "",
      })),
      "Campos"
    );
  }, [visibleFields]);

  const selectColumn = useMemo<Column<Field>>(
    () => makeSelectColumn<Field>(bulk, (f) => f.name, ENTITY),
    [bulk]
  );

  const tableColumns = useMemo<Column<Field>[]>(
    () => [selectColumn, ...baseColumns],
    [selectColumn]
  );

  return (
    <div>
      <AppFilterBar
        filters={embedded ? [] : filters}
        actions={[
          ...(embedded && selectionMode && hasPositiveId(contextFilters?.projectId)
            ? [
                {
                  label: "Proyecto Actual",
                  variant: contextMode === "current" ? ("light" as const) : ("primary" as const),
                  isPrimary: true,
                  onClick: () => setContextMode("current"),
                },
                ...(!selectionOnly
                  ? [
                      {
                        label: "Todos",
                        variant: contextMode === "all" ? ("light" as const) : ("primary" as const),
                        isPrimary: true,
                        onClick: () => setContextMode("all"),
                      },
                    ]
                  : []),
              ]
            : []),
          ...(embedded && selectionMode
            ? [
                {
                  label: selectionMode.label ?? "Agregar",
                  icon: <Plus className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  disabled: bulk.selectedCount === 0,
                  onClick: addSelectedFields,
                },
              ]
            : []),
          ...(!embedded
            ? [
                {
                  label: "Exportar",
                  icon: <Upload className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  onClick: handleExport,
                },
              ]
            : []),
          ...(!selectionOnly
            ? [
                {
                  label: "Archivados",
                  icon: <Archive className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  onClick: () => setArchivedDrawerOpen(true),
                },
              ]
            : []),
          ...(embedded && selectionMode?.onCreateNew
            ? [
                {
                  label: "Nuevo",
                  icon: <Plus className="h-4 w-4" />,
                  variant: "primary" as const,
                  isPrimary: true,
                  onClick: selectionMode.onCreateNew,
                },
              ]
            : []),
        ]}
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing && visibleFields.length > 0} />
        {processing && visibleFields.length === 0 ? (
          <TableSkeleton rows={10} columns={tableColumns.length} />
        ) : visibleFields.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Aún no hay campos"
            description={
              selectionOnly
                ? "No hay campos disponibles para el contexto seleccionado."
                : editorOnly
                  ? "No hay campos disponibles para editar."
                  : "Los campos se crean desde el editor de cada proyecto."
            }
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={visibleFields.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <ResponsiveTable<Field>
              data={visibleFields}
              columns={tableColumns}
              pagination={pagination.buildPagination(visibleFields.length)}
              primaryKey="name"
              rowKey={(f) => f.id}
              emptyMessage="No hay campos para mostrar"
            />
          </>
        )}
      </div>

      <DrawerShell
        open={editorContext !== null}
        onClose={() => setEditorContext(null)}
        title="Editar Proyecto"
      >
        {editorContext && (
          <CustomerEditor
            embedded
            mode="project"
            customerId={selectedCustomer?.id ?? null}
            initialProjectId={editorContext.initialProjectId}
            onClose={() => {
              setEditorContext(null);
              refresh();
            }}
          />
        )}
      </DrawerShell>
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Campos archivados"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedFields onAfterRestore={refresh} />
      </ArchivedDrawer>
    </div>
  );
}
