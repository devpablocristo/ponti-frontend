import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Archive, Download, Plus, Upload } from "lucide-react";

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
import { CATEGORY_TYPE_ID, categoryTypeQuery } from "@/lib/categoryTypes";
import { apiClient } from "../../../../api/client";
import { notify } from "@/lib/notify";
import { ArchivedDrawer } from "../../../../components/crud/ArchivedDrawer";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { EntityFormDrawer } from "../../../../components/crud/EntityFormDrawer";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { Checkbox } from "../../../../components/Input/Checkbox";
import { DrawerShell } from "../../../../components/Drawer/DrawerShell";
import { buildTimestampedFilename, downloadBlob, CSV_ACCEPT } from "../../fileTransfer";

import { LABOR_ENTITY as ENTITY } from "../../entities";
import ArchivedLabors from "./ArchivedLabors";
import LaborsCatalog, { type Labor as LaborRow } from "./LaborsCatalog";
import {
  getValueByAliases,
  LABOR_HEADER_ALIASES,
  normalizeText,
  parseCsv,
} from "./importUtils";

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

  useEffect(() => {
    if (errorMessage) notify.error(errorMessage);
  }, [errorMessage]);
  useEffect(() => {
    if (successMessage) notify.success(successMessage);
  }, [successMessage]);
  const [modalOpen, setModalOpen] = useState(false);
  const [labor, setLabor] = useState<LaborInfo | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importDrawerOpen, setImportDrawerOpen] = useState(false);
  const [importedRows, setImportedRows] = useState<LaborRow[] | undefined>(undefined);
  const [archivedDrawerOpen, setArchivedDrawerOpen] = useState(false);
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
      getCategories(categoryTypeQuery(CATEGORY_TYPE_ID.LABORES));
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

  const handleImportFromFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!projectId) {
      setErrorMessage("Para importar labores, seleccioná un proyecto.");
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv") || file.type.includes("csv");
    if (!isCsv) {
      setErrorMessage("Formato no soportado. Use .csv.");
      return;
    }

    try {
      setErrorMessage("");
      const text = await file.text();
      const parsedRows = parseCsv(text);
      if (parsedRows.length === 0) {
        setErrorMessage("El archivo no tiene datos válidos. Verifique encabezados y filas.");
        return;
      }

      const categoryByName = new Map(
        safeCategories.map((c) => [normalizeText(c.name), c]),
      );

      const previewRows: LaborRow[] = [];
      parsedRows.forEach((rawRow) => {
        const name = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.name).trim();
        const categoryRaw = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.category).trim();
        const priceRaw = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.price).trim();
        const contractor = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.contractor).trim();
        if (!name && !categoryRaw && !priceRaw && !contractor) return;

        const categoryByText = categoryByName.get(normalizeText(categoryRaw));
        const categoryId = categoryByText?.id ?? Number(categoryRaw);
        const priceValue = Number(priceRaw.replace(/\$/g, "").replace(",", "."));
        previewRows.push({
          id: previewRows.length,
          name,
          category:
            categoryId && !Number.isNaN(categoryId) ? String(categoryId) : "",
          price:
            !Number.isNaN(priceValue) && priceValue > 0 ? String(priceValue) : priceRaw,
          contractor,
          is_partial_price: false,
        });
      });

      if (previewRows.length === 0) {
        setErrorMessage("No se encontraron filas importables en el archivo.");
        return;
      }

      setImportedRows(previewRows);
      setImportDrawerOpen(true);
    } catch {
      setErrorMessage("No se pudo leer el archivo. Use .csv.");
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

      downloadBlob(response, buildTimestampedFilename("labores", "csv", projectId));
    } catch {
      setErrorMessage("No se pudo exportar el listado de labores.");
    }
  };

  return (
    <div className="w-full mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept={CSV_ACCEPT}
        onChange={handleImportFromFile}
        className="hidden"
      />
      <AppFilterBar
        filters={filters}
        // Orden canónico Datos Maestros: extras → Importar → Exportar → Archivados → Nuevo.
        actions={[
          {
            label: "Importar",
            icon: <Download className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => fileInputRef.current?.click(),
          },
          {
            label: "Exportar",
            icon: <Upload className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => handleExport(),
          },
          {
            label: "Archivados",
            icon: <Archive className="h-4 w-4" />,
            variant: "primary",
            isPrimary: true,
            onClick: () => setArchivedDrawerOpen(true),
          },
          {
            label: "Nueva",
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
      <ArchivedDrawer
        open={archivedDrawerOpen}
        title="Labores archivadas"
        onClose={() => setArchivedDrawerOpen(false)}
      >
        <ArchivedLabors onAfterRestore={refresh} />
      </ArchivedDrawer>
      <DrawerShell
        open={importDrawerOpen}
        onClose={() => {
          setImportDrawerOpen(false);
          setImportedRows(undefined);
        }}
        title="Importar labores"
      >
        <LaborsCatalog
          hideWorkspaceFilters
          initialRows={importedRows}
          onCancel={() => {
            setImportDrawerOpen(false);
            setImportedRows(undefined);
          }}
        />
      </DrawerShell>
      <div className="p-6 w-full mt-4 mx-auto bg-white dark:bg-slate-800 rounded-lg shadow-md">
        <div className="flex justify-between items-center">
          <h1 className="text-custom-text font-semibold text-xl leading-none">
            {editorOnly ? "Editar labores" : "Lista de labores"}
          </h1>
          {!editorOnly && (
            <Button
              variant="primary"
              size="sm"
              className="text-sm font-medium flex items-center gap-1"
              href="/admin/master-data/labors"
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
              <label className="inline-flex items-center gap-2 mt-2 text-sm text-gray-700 dark:text-gray-200">
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
            message="Todavía no hay labores en este proyecto."
            pagination={buildPagination(filteredLabors.length)}
          />
        </div>
      </div>
    </div>
  );
}
