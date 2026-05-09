import { useCallback, useEffect, useMemo, useState } from "react";
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
import {
  getArchiveCopy,
  getCreateSuccessCopy,
  getHardDeleteCopy,
  getUpdateSuccessCopy,
} from "../../../../components/Modal/copy";
import { useConfirmDialog } from "../../../../hooks/useConfirmDialog";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import useInvestors, {
  Investor,
  InvestorPayloadInput,
} from "../../../../hooks/useInvestors";
import { toastError, toastSuccess } from "../../../../lib/toast";
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
  const confirm = useConfirmDialog();

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Investor | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const bulk = useBulkActions<Investor>({
    items: investors,
    entityLabelPlural: "inversores",
    archive: archiveInvestor,
    hardDelete: hardDeleteInvestor,
    onAfter: () => getInvestors("limit=1000"),
  });

  useEffect(() => {
    getInvestors("limit=1000");
  }, [getInvestors]);

  const openCreate = () => {
    setEditing(null);
    setSubmitError(null);
    setDrawerOpen(true);
  };

  const openEdit = (investor: Investor) => {
    setEditing(investor);
    setSubmitError(null);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setSubmitError(null);
  };

  const handleSubmit = useCallback(
    async (input: InvestorPayloadInput) => {
      setSubmitError(null);
      try {
        if (editing) {
          await updateInvestor(editing.id, input);
          toastSuccess(getUpdateSuccessCopy(`el inversor "${input.name}"`));
        } else {
          await createInvestor(input);
          toastSuccess(getCreateSuccessCopy(`el inversor "${input.name}"`));
        }
        closeDrawer();
      } catch (err) {
        setSubmitError(
          err instanceof Error ? err.message : "No se pudo guardar el inversor",
        );
      }
    },
    [createInvestor, editing, updateInvestor],
  );

  const handleArchive = useCallback(
    async (item: Investor) => {
      const ok = await confirm({
        ...getArchiveCopy(ENTITY_LABEL, item.name),
        primaryLabel: getArchiveCopy(ENTITY_LABEL, item.name).primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "warning",
      });
      if (!ok) return;
      try {
        await archiveInvestor(item.id);
        toastSuccess(`Se archivó "${item.name}"`);
      } catch (err) {
        toastError(
          err instanceof Error
            ? err.message
            : "No se pudo archivar el inversor",
        );
      }
    },
    [archiveInvestor, confirm],
  );

  const handleHardDelete = useCallback(
    async (item: Investor) => {
      const ok = await confirm({
        ...getHardDeleteCopy(ENTITY_LABEL, item.name),
        primaryLabel: getHardDeleteCopy(ENTITY_LABEL, item.name)
          .primaryButtonText,
        secondaryLabel: "Cancelar",
        severity: "danger",
      });
      if (!ok) return;
      try {
        await hardDeleteInvestor(item.id);
        toastSuccess(`Se eliminó "${item.name}" definitivamente`);
        getInvestors("limit=1000");
      } catch (err) {
        toastError(
          err instanceof Error
            ? err.message
            : "No se pudo eliminar el inversor",
        );
      }
    },
    [confirm, getInvestors, hardDeleteInvestor],
  );

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
                onClick: () => openEdit(item),
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
    [handleArchive, handleHardDelete, selectColumn],
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
            onClick={openCreate}
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
                onClick={openCreate}
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
        open={drawerOpen}
        investor={editing}
        processing={processing}
        errorMessage={submitError}
        onClose={closeDrawer}
        onSubmit={handleSubmit}
      />
    </div>
  );
}
