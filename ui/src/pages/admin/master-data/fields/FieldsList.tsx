import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, MapPin, Upload } from "lucide-react";

import { buildTimestampedFilename, csvEscape, downloadBlob } from "../../fileTransfer";

import { DataTable, usePagination } from "@/lib/dataDisplay";
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
};

export default function FieldsList({ editorOnly = false }: FieldsListProps) {
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
  const pagination = usePagination({ perPage: 25 });
  const [editorContext, setEditorContext] = useState<{
    initialProjectId: number | null;
  } | null>(null);
  const {
    fields,
    processing,
    error,
    getFields,
    archiveField,
  } = useFields();

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
    [allFilters],
  );

  const refresh = useCallback(() => getFields(""), [getFields]);

  // Client-side filter using the workspace selection. workspaceFields is
  // already scoped to the selected project (or all when no project selected).
  // We use it as the allow-list when any workspace filter is active and
  // intersect with the full catalog loaded locally.
  const visibleFields = useMemo(() => {
    const isScoped = Boolean(selectedCustomer || selectedProject || selectedCampaignId);
    if (!isScoped) return fields;
    const scopedIds = new Set(workspaceFields.map((f) => f.id));
    return fields.filter((f) => scopedIds.has(f.id));
  }, [fields, workspaceFields, selectedCustomer, selectedProject, selectedCampaignId]);

  const openFieldEditor = useCallback((field: Field) => {
    setEditorContext({ initialProjectId: field.project_id ?? null });
  }, []);

  const bulk = useBulkActions<Field>({
    items: visibleFields,
    entity: ENTITY,
    archive: archiveField,
    onEdit: openFieldEditor,
    onAfter: refresh,
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleExport = useCallback(() => {
    const header = ["Nombre", "Tipo de contrato"].join(",");
    const rows = visibleFields.map((f) =>
      [csvEscape(f.name), csvEscape(f.lease_type_name ?? "")].join(","),
    );
    const csv = [header, ...rows].join("\n");
    downloadBlob(
      new Blob([csv], { type: "text/csv;charset=utf-8" }),
      buildTimestampedFilename("campos", "csv"),
    );
  }, [visibleFields]);

  const selectColumn = useMemo<Column<Field>>(
    () => makeSelectColumn<Field>(bulk, (f) => f.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<Field>[]>(
    () => [selectColumn, ...baseColumns],
    [selectColumn],
  );

  return (
    <div>
      <AppFilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: handleExport,
          },
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
        <LoadingOverlay show={processing && visibleFields.length > 0} />
        {processing && visibleFields.length === 0 ? (
          <TableSkeleton rows={10} columns={tableColumns.length} />
        ) : visibleFields.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Aún no hay campos"
            description={
              editorOnly
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
            <DataTable
              data={visibleFields}
              columns={tableColumns}
              pagination={pagination.buildPagination(visibleFields.length)}
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
