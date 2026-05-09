import { useEffect, useMemo } from "react";
import { Archive, Pencil, Plus, Trash2, Users } from "lucide-react";

import { DataTable } from "@/lib/dataDisplay";
import Button from "../../../../components/Button/Button";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { EmptyState } from "../../../../components/feedback/EmptyState";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { PageHeader } from "../../../../components/layout/PageHeader";
import { RowActions } from "../../../../components/crud/RowActions";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityRowActions } from "../../../../hooks/useEntityRowActions";
import { useEntityFormDrawer } from "../../../../hooks/useEntityFormDrawer";
import useInvestors, {
  Investor,
  InvestorPayloadInput,
} from "../../../../hooks/useInvestors";
import { Column } from "../../types";
import InvestorFormDrawer from "./InvestorFormDrawer";

const ENTITY_LABEL = "el inversor";

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

  const refresh = () => getInvestors("limit=1000");

  const bulk = useBulkActions<Investor>({
    items: investors,
    entityLabelPlural: "inversores",
    archive: archiveInvestor,
    hardDelete: hardDeleteInvestor,
    onAfter: refresh,
  });

  const drawer = useEntityFormDrawer<Investor, InvestorPayloadInput>({
    buildSuccessLabel: (input) => `el inversor "${input.name}"`,
    create: createInvestor,
    update: updateInvestor,
    fallbackErrorMessage: "No se pudo guardar el inversor",
  });

  useEffect(() => {
    getInvestors("limit=1000");
  }, [getInvestors]);

  const { handleArchive, handleHardDelete } = useEntityRowActions<Investor>({
    entityLabel: ENTITY_LABEL,
    getLabel: (i) => i.name,
    archive: archiveInvestor,
    hardDelete: hardDeleteInvestor,
    onAfter: () => getInvestors("limit=1000"),
  });

  const selectColumn = useMemo<Column<Investor>>(
    () => makeSelectColumn<Investor>(bulk, (i) => i.name, "inversor"),
    [bulk],
  );

  const tableColumns = useMemo<Column<Investor>[]>(
    () => [
      selectColumn,
      ...columns,
      {
        key: "id",
        header: "",
        align: "center",
        render: (_value, item) => (
          <RowActions
            actions={[
              {
                label: "Editar",
                icon: Pencil,
                onClick: () => drawer.openEdit(item),
              },
              {
                label: "Archivar",
                icon: Archive,
                onClick: () => handleArchive(item),
              },
              {
                label: "Eliminar",
                icon: Trash2,
                variant: "danger",
                divider: true,
                onClick: () => handleHardDelete(item),
              },
            ]}
          />
        ),
      },
    ],
    [drawer, handleArchive, handleHardDelete, selectColumn],
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
              entityLabelPlural="inversores"
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
