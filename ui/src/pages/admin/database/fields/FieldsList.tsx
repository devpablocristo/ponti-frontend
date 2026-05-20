import { useCallback, useEffect, useMemo, useState } from "react";
import { Archive, MapPin } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
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
  const { selectedCustomer, filters } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);

  const refresh = useCallback(() => getFields(""), [getFields]);

  const openFieldEditor = useCallback((field: Field) => {
    setEditorContext({ initialProjectId: field.project_id ?? null });
  }, []);

  const bulk = useBulkActions<Field>({
    items: fields,
    entity: ENTITY,
    archive: archiveField,
    onEdit: openFieldEditor,
    onAfter: refresh,
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

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
        {!processing && fields.length === 0 ? (
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
              totalCount={fields.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <DataTable data={fields} columns={tableColumns} />
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
