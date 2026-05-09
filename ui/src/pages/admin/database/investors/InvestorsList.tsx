import { useCallback, useEffect, useMemo } from "react";
import { Plus, Users } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeActionsColumn } from "../../../../components/crud/makeActionsColumn";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityRowActions } from "../../../../hooks/useEntityRowActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useInvestors, {
  Investor,
  InvestorPayloadInput,
} from "../../../../hooks/useInvestors";
import { Column } from "../../types";
import type { EntityCopy } from "../../../../components/Modal/copy";
import InvestorFormDrawer from "./InvestorFormDrawer";

const ENTITY: EntityCopy = { article: "el", singular: "inversor", plural: "inversores" };

const columns: Column<Investor>[] = [
  { key: "name", header: "Nombre" },
  {
    key: "percentage",
    header: "Porcentaje",
    align: "right",
    render: (value) => {
      const num = Number(value);
      return (
        <span className="tabular-nums">
          {Number.isFinite(num) && num > 0 ? `${num}%` : "—"}
        </span>
      );
    },
  },
];

export default function InvestorsList() {
  const {
    investors,
    processing,
    error,
    getInvestors,
    createInvestor,
    updateInvestor,
    archiveInvestor,
    hardDeleteInvestor,
  } = useInvestors();

  const refresh = useCallback(
    () => getInvestors("limit=1000"),
    [getInvestors],
  );

  const bulk = useBulkActions<Investor>({
    items: investors,
    entity: ENTITY,
    archive: archiveInvestor,
    hardDelete: hardDeleteInvestor,
    onAfter: refresh,
  });

  const drawer = useEntityFormDrawer<Investor, InvestorPayloadInput>({
    buildSuccessLabel: (input) => `el inversor "${input.name}"`,
    create: createInvestor,
    update: updateInvestor,
    fallbackErrorMessage: "No se pudo guardar el inversor",
    onAfter: refresh,
  });

  useEffect(() => {
    refresh();
  }, [refresh]);

  const { handleArchive, handleHardDelete } = useEntityRowActions<Investor>({
    entity: ENTITY,
    getLabel: (i) => i.name,
    archive: archiveInvestor,
    hardDelete: hardDeleteInvestor,
    onAfter: refresh,
  });

  const selectColumn = useMemo<Column<Investor>>(
    () => makeSelectColumn<Investor>(bulk, (i) => i.name, ENTITY),
    [bulk],
  );

  const tableColumns = useMemo<Column<Investor>[]>(
    () => [
      selectColumn,
      ...columns,
      makeActionsColumn<Investor>({
        onEdit: drawer.openEdit,
        onArchive: handleArchive,
        onHardDelete: handleHardDelete,
      }),
    ],
    [drawer.openEdit, handleArchive, handleHardDelete, selectColumn],
  );

  return (
    <div>
      <PageHeader
        title="Inversores"
        subtitle="Personas o sociedades que aportan a los proyectos."
        actions={
          <Button
            variant="primary"
            iconLeft={<Plus className="h-4 w-4" />}
            onClick={drawer.openCreate}
          >
            Nuevo inversor
          </Button>
        }
      />

      <div className="relative mt-4">
        <LoadingOverlay show={processing} />
        {error && <ErrorBanner message={error} />}
        {!processing && investors.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Aún no hay inversores"
            description="Creá el primero para asociarlo a tus proyectos."
            cta={
              <Button
                variant="primary"
                iconLeft={<Plus className="h-4 w-4" />}
                onClick={drawer.openCreate}
              >
                Nuevo inversor
              </Button>
            }
          />
        ) : (
          <>
            <BulkSelectionPanel
              selectedCount={bulk.selectedCount}
              totalCount={investors.length}
              allSelected={bulk.allSelected}
              onToggleAll={bulk.toggleAll}
              onClear={bulk.clear}
              actions={bulk.actions}
              entity={ENTITY}
            />
            <DataTable data={investors} columns={tableColumns} />
          </>
        )}
      </div>

      <InvestorFormDrawer
        open={drawer.open}
        investor={drawer.editing}
        processing={processing}
        errorMessage={drawer.submitError}
        onClose={drawer.close}
        onSubmit={drawer.handleSubmit}
      />
    </div>
  );
}
