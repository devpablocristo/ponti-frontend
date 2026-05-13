import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Upload } from "lucide-react";

import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import {
  DataTable,
  useClientTableFilters,
  usePagination,
} from "@/lib/dataDisplay";
import { LaborInfo, LaborToSave } from "../../../../hooks/useLabors/types";
import Button from "../../../../components/Button/Button";
import { Column } from "../../types";
import useLabors from "../../../../hooks/useLabors";
import InputField from "../../../../components/Input/InputField";
import SelectField from "../../../../components/Input/SelectField";
import useCategories from "../../../../hooks/useCategories";
import { apiClient } from "../../../../api/client";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../../components/feedback/SuccessBanner";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { Checkbox } from "../../../../components/Input/Checkbox";
import { buildTimestampedFilename, downloadBlob } from "../../fileTransfer";

import { LABOR_ENTITY as ENTITY } from "../../entities";

function renderPriceCell(value: unknown, row: LaborInfo) {
  return (
    <div className="flex items-center gap-2">
      <strong>{String(value ?? "")}</strong>
      {row.is_partial_price ? (
        <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-300">
          Parcial
        </span>
      ) : null}
    </div>
  );
}

const newLabor = (): LaborInfo => ({
  id: 0,
  name: "",
  category_id: 0,
  price: "",
  contractor_name: "",
  category_name: "",
  is_partial_price: false,
});

type ListTasksProps = {
  editorOnly?: boolean;
};

export default function ListTasks({ editorOnly = false }: ListTasksProps) {
  const {
    getLabors,
    error,
    labors,
    archiveLabor,
    updateLabor,
    saveLabors,
    result,
    resultUpdate,
    processing,
    errorUpdate,
  } = useLabors();
  const { categories, getCategories } = useCategories();
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [labor, setLabor] = useState<LaborInfo | null>(null);
  const pagination = usePagination({ perPage: 10 });
  const { buildPagination, resetPage } = pagination;
  const safeLabors = useMemo(() => (Array.isArray(labors) ? labors : []), [labors]);
  const {
    filters: columnsFilters,
    filteredRows: filteredLabors,
    getFilterOptionsForColumn,
    handleFilterChange,
    resetFilters,
  } = useClientTableFilters<LaborInfo>({
    rows: safeLabors,
    onChange: resetPage,
  });
  const safeCategories = useMemo(
    () => (Array.isArray(categories) ? categories : []),
    [categories]
  );

  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);

  const refresh = useCallback(() => {
    if (projectId) getLabors(projectId);
  }, [projectId, getLabors]);

  const handleEdit = useCallback((item: LaborInfo) => {
    setLabor(item);
    setModalOpen(true);
  }, []);

  const bulk = useBulkActions<LaborInfo>({
    items: safeLabors,
    entity: ENTITY,
    archive: archiveLabor,
    onEdit: handleEdit,
    onAfter: refresh,
  });

  useEffect(() => {
    if (projectId) {
      getLabors(projectId);
      getCategories("type_id=4");
    }
  }, [projectId, getCategories, getLabors]);

  useEffect(() => {
    resetFilters();
    resetPage();
  }, [projectId, resetFilters, resetPage]);

  const selectColumn = useMemo<Column<LaborInfo>>(
    () => makeSelectColumn<LaborInfo>(bulk, (l) => l.name, ENTITY),
    [bulk],
  );

  const columns = useMemo<Column<LaborInfo>[]>(
    () => [
      selectColumn,
      {
        key: "name",
        header: "Labor",
        render: (value) => (
          <strong className="text-blue-700">{String(value ?? "")}</strong>
        ),
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("name"),
      },
      {
        key: "category_name",
        header: "Rubro",
        render: (value) => String(value ?? ""),
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("category_name"),
      },
      {
        key: "price",
        header: "Precio",
        render: (value, row) => renderPriceCell(value, row),
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("price"),
      },
      {
        key: "contractor_name",
        header: "Contratista",
        render: (value) => String(value ?? ""),
        filterType: "select",
        filterOptions: getFilterOptionsForColumn("contractor_name"),
      },
    ],
    [getFilterOptionsForColumn, selectColumn]
  );

  useEffect(() => {
    if (result && projectId) {
      setSuccessMessage(result);
      setErrorMessage("");
      getLabors(projectId);
    }
  }, [result, projectId, getLabors]);

  useEffect(() => {
    if (resultUpdate && projectId) {
      setSuccessMessage(resultUpdate);
      setErrorMessage("");
      getLabors(projectId);
    }
  }, [resultUpdate, projectId, getLabors]);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setSuccessMessage(null);
    }
  }, [error]);

  useEffect(() => {
    if (errorUpdate) {
      setErrorMessage(errorUpdate);
      setSuccessMessage(null);
    }
  }, [errorUpdate]);

  const handleSave = async () => {
    if (processing) return;
    if (!labor || !projectId) return;

    if (!labor.id) {
      const payload: LaborToSave = {
        name: labor.name.trim(),
        category_id: Number(labor.category_id || 0),
        price: labor.price,
        contractor_name: labor.contractor_name.trim(),
        is_partial_price: Boolean(labor.is_partial_price),
      };

      const saved = await saveLabors([payload], projectId);
      if (saved) {
        setModalOpen(false);
        setLabor(null);
        getLabors(projectId);
      }
      return;
    }

    if (labor && projectId) {
      updateLabor(projectId, labor);
      setModalOpen(false);
    }
  };

  const handleExport = async () => {
    if (!projectId) return;

    try {
      setErrorMessage("");
      const response = await apiClient.get<Blob>(
        `/labors/database-export/${projectId}`,
        undefined,
        { responseType: "blob" }
      );

      downloadBlob(response, buildTimestampedFilename("labores", "xlsx", projectId));
    } catch {
      setErrorMessage("No se pudo exportar el listado de labores.");
    }
  };

  return (
    <div className="w-full mx-auto">
      <AppFilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => handleExport(),
          },
          {
            label: "Nueva Labor",
            icon: <Plus className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => {
              setLabor(newLabor());
              setModalOpen(true);
            },
          },
        ]}
      />
      <div className="p-6 w-full mt-4 mx-auto bg-white rounded-lg shadow-md">
        <ErrorBanner
          message={errorMessage || null}
          variant="alert"
          onDismiss={() => setErrorMessage("")}
        />
        <SuccessBanner
          message={successMessage || null}
          variant="alert"
          onDismiss={() => setSuccessMessage("")}
        />
        <div className="flex justify-between items-center">
          <h1 className="text-custom-text font-semibold text-xl leading-none">
            {editorOnly ? "Editar labores" : "Lista de labores"}
          </h1>
          {!editorOnly && (
            <Button
              variant="primary"
              size="sm"
              className="text-sm font-medium flex items-center gap-1"
              href="/admin/database/tasks"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
              Volver
            </Button>
          )}
        </div>
        <div className="mt-4">
          <EntityFormDrawer
            open={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setLabor(null);
            }}
            title={labor?.id ? `Edicion de labor ${labor.name || ""}` : "Nueva Labor"}
            submitLabel="Guardar"
            processing={processing}
            onSubmit={handleSave}
          >
            <div className="flex flex-col gap-1">
              <InputField
                label="Nombre de la labor"
                placeholder="Nombre de la labor"
                name="name"
                type="text"
                value={labor?.name || ""}
                onChange={(e) => {
                  setLabor((prev) =>
                    prev
                      ? {
                          ...prev,
                          name: e.target.value,
                        }
                      : null
                  );
                }}
              />
              <SelectField
                label="Rubro"
                name={`category-${labor?.id || 0}`}
                value={labor?.category_id.toString() || ""}
                onChange={(e) => {
                  if (!labor) return;
                  setLabor({ ...labor, category_id: parseInt(e.target.value) });
                }}
                options={safeCategories}
              />
              <InputField
                label="Precio"
                placeholder="Precio"
                name="price"
                type="text"
                value={labor?.price || ""}
                onChange={(e) => {
                  if (!labor) return;
                  setLabor({ ...labor, price: e.target.value });
                }}
              />
              <InputField
                label="Contratista"
                placeholder="Contratista"
                name="contractor"
                type="text"
                value={labor?.contractor_name || ""}
                onChange={(e) => {
                  if (!labor) return;
                  setLabor({ ...labor, contractor_name: e.target.value });
                }}
              />
              <label className="inline-flex items-center gap-2 mt-2 text-sm text-gray-700">
                <Checkbox
                  tone="warning"
                  checked={Boolean(labor?.is_partial_price)}
                  onChange={(e) => {
                    if (!labor) return;
                    setLabor({ ...labor, is_partial_price: e.target.checked });
                  }}
                />
                Precio parcial (tentativo)
              </label>
            </div>
          </EntityFormDrawer>
          <BulkSelectionPanel
            selectedCount={bulk.selectedCount}
            totalCount={filteredLabors.length}
            allSelected={bulk.allSelected}
            onToggleAll={bulk.toggleAll}
            onClear={bulk.clear}
            actions={bulk.actions}
            entity={ENTITY}
          />
          <DataTable
            data={filteredLabors}
            columns={columns}
            filters={columnsFilters}
            onFilterChange={handleFilterChange}
            enableFilters={true}
            message="No hay labores cargadas en el proyecto"
            pagination={buildPagination(filteredLabors.length)}
          />
        </div>
      </div>
    </div>
  );
}
