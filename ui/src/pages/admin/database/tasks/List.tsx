import { useCallback, useEffect, useMemo, useState, useRef } from "react";
import * as XLSX from "xlsx";

import { FilterBar } from "@devpablocristo/modules-ui-filters";
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
import { BaseModal } from "../../../../components/Modal/BaseModal";
import InputField from "../../../../components/Input/InputField";
import SelectField from "../../../../components/Input/SelectField";
import useCategories from "../../../../hooks/useCategories";
import { apiClient } from "../../../../api/client";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../../components/feedback/SuccessBanner";
import { BulkSelectionPanel } from "../../../../components/crud/BulkSelectionPanel";
import { makeActionsColumn } from "../../../../components/crud/makeActionsColumn";
import { makeSelectColumn } from "../../../../components/crud/makeSelectColumn";
import { useBulkActions } from "../../../../hooks/useBulkActions";
import { useEntityRowActions } from "../../../../hooks/useEntityRowActions";
import { Checkbox } from "../../../../components/Input/Checkbox";
import {
  getValueByAliases,
  LABOR_HEADER_ALIASES,
  normalizeSpreadsheetRow,
  normalizeText,
  parseCsv,
  parsePartialPrice,
} from "./importUtils";

const ENTITY_LABEL = "la labor";

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

export default function ListTasks() {
  const {
    getLabors,
    error,
    labors,
    archiveLabor,
    hardDeleteLabor,
    updateLabor,
    saveLabors,
    result,
    resultUpdate,
    processing,
    errorUpdate,
  } = useLabors();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
  ]);

  const refresh = useCallback(() => {
    if (projectId) getLabors(projectId);
  }, [projectId, getLabors]);

  const bulk = useBulkActions<LaborInfo>({
    items: safeLabors,
    entityLabelPlural: "labores",
    archive: archiveLabor,
    hardDelete: hardDeleteLabor,
    onAfter: refresh,
  });

  const handleEdit = useCallback((item: LaborInfo) => {
    setLabor(item);
    setModalOpen(true);
  }, []);

  const { handleArchive, handleHardDelete } = useEntityRowActions<LaborInfo>({
    entityLabel: ENTITY_LABEL,
    getLabel: (l) => l.name,
    archive: archiveLabor,
    hardDelete: hardDeleteLabor,
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
    () => makeSelectColumn<LaborInfo>(bulk, (l) => l.name, "labor"),
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
      makeActionsColumn<LaborInfo>({
        onEdit: handleEdit,
        onArchive: handleArchive,
        onHardDelete: handleHardDelete,
      }),
    ],
    [getFilterOptionsForColumn, handleArchive, handleEdit, handleHardDelete, selectColumn]
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

  const handleSave = () => {
    if (processing) return;
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

      const url = window.URL.createObjectURL(response);
      const link = document.createElement("a");
      link.href = url;
      link.download = `labores_${projectId}_${new Date().toISOString()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      setErrorMessage("No se pudo exportar el listado de labores.");
    }
  };

  const handleImportLaborsFromFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!projectId) {
      setErrorMessage("Por favor, seleccione un proyecto antes de importar.");
      return;
    }

    const lowerName = file.name.toLowerCase();
    const isCsv = lowerName.endsWith(".csv") || file.type.includes("csv");
    const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

    if (!isCsv && !isExcel) {
      setErrorMessage("Formato no soportado. Use .xlsx, .xls o .csv.");
      return;
    }

    try {
      setErrorMessage("");
      setSuccessMessage(null);

      let parsedRows: Record<string, string>[] = [];
      if (isCsv) {
        const text = await file.text();
        parsedRows = parseCsv(text);
      } else {
        const buffer = await file.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array" });
        const sheetNames = workbook.SheetNames || [];
        const preferred =
          sheetNames.find((n) => normalizeText(n).includes("labor")) ??
          sheetNames[0];

        const trySheets = [
          preferred,
          ...sheetNames.filter((n) => n !== preferred),
        ].filter(Boolean) as string[];

        let jsonRows: Record<string, unknown>[] = [];
        for (const sheetName of trySheets) {
          const sheet = workbook.Sheets[sheetName];
          if (!sheet) continue;
          const candidate = XLSX.utils.sheet_to_json<Record<string, unknown>>(
            sheet,
            { defval: "" }
          );
          if (candidate.length > 0) {
            jsonRows = candidate;
            break;
          }
        }
        parsedRows = jsonRows.map(normalizeSpreadsheetRow);
      }

      if (parsedRows.length === 0) {
        setErrorMessage("El archivo no tiene datos válidos. Verifique encabezados y filas.");
        return;
      }

      const categoryByName = new Map(
        safeCategories.map((c) => [normalizeText(c.name), c])
      );

      const laborsToSave: LaborToSave[] = [];
      const importErrors: string[] = [];

      parsedRows.forEach((rawRow, idx) => {
        const rowNumber = idx + 2;
        const name = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.name).trim();
        const categoryRaw = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.category).trim();
        const priceRaw = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.price).trim();
        const priceStatusRaw = getValueByAliases(
          rawRow,
          LABOR_HEADER_ALIASES.priceStatus
        ).trim();
        const contractor = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.contractor).trim();
        const parsedPartial = parsePartialPrice(priceStatusRaw);

        if (!name && !categoryRaw && !priceRaw && !contractor) return;

        const categoryByText = categoryByName.get(normalizeText(categoryRaw));
        const categoryId = categoryByText?.id ?? Number(categoryRaw);
        const priceValue = Number(priceRaw.replace(/\$/g, "").replace(",", "."));

        if (!name) importErrors.push(`Fila ${rowNumber}: falta "Labor".`);
        if (!categoryId || Number.isNaN(categoryId))
          importErrors.push(`Fila ${rowNumber}: "Rubro" inválido.`);
        if (!priceRaw || Number.isNaN(priceValue) || priceValue <= 0)
          importErrors.push(`Fila ${rowNumber}: "Precio" inválido.`);
        if (!contractor)
          importErrors.push(`Fila ${rowNumber}: falta "Contratista".`);
        if (parsedPartial.provided && !parsedPartial.valid) {
          importErrors.push(
            `Fila ${rowNumber}: "Estado Precio" inválido ("${priceStatusRaw}"). Use Final o Parcial.`
          );
        }

        if (
          name &&
          categoryId &&
          !Number.isNaN(categoryId) &&
          !Number.isNaN(priceValue) &&
          priceValue > 0 &&
          contractor &&
          (!parsedPartial.provided || parsedPartial.valid)
        ) {
          laborsToSave.push({
            name,
            category_id: categoryId,
            price: String(priceValue),
            contractor_name: contractor,
            is_partial_price: parsedPartial.valid ? parsedPartial.value : false,
          });
        }
      });

      if (laborsToSave.length === 0) {
        setErrorMessage(
          importErrors.length > 0
            ? importErrors.slice(0, 8).join(" ")
            : "No se encontraron filas importables en el archivo."
        );
        return;
      }

      const saved = await saveLabors(laborsToSave, projectId);
      if (!saved) {
        return;
      }

      getLabors(projectId);

      if (importErrors.length > 0) {
        setSuccessMessage(
          `Se importaron ${laborsToSave.length} labores. Se omitieron ${importErrors.length} filas con error.`
        );
      } else {
        setSuccessMessage(`Se importaron ${laborsToSave.length} labores con éxito.`);
      }
    } catch {
      setErrorMessage("No se pudo leer el archivo. Use .xlsx, .xls o .csv.");
    }
  };

  return (
    <div className="w-full mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={handleImportLaborsFromFile}
        className="hidden"
      />
      <FilterBar
        filters={filters}
        actions={[
          {
            label: "Exportar Labores",
            icon: <svg width="14" height="13" viewBox="0 0 14 13" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5.66675 2.49984H3.00008C2.64646 2.49984 2.30732 2.64031 2.05727 2.89036C1.80722 3.14041 1.66675 3.47955 1.66675 3.83317V10.4998C1.66675 10.8535 1.80722 11.1926 2.05727 11.4426C2.30732 11.6927 2.64646 11.8332 3.00008 11.8332H9.66675C10.0204 11.8332 10.3595 11.6927 10.6096 11.4426C10.8596 11.1926 11.0001 10.8535 11.0001 10.4998V7.83317M8.33341 1.1665H12.3334M12.3334 1.1665V5.1665M12.3334 1.1665L5.66675 7.83317" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            ,
            variant: "primary",
            isPrimary: true,
            disabled: !projectId,
            onClick: () => handleExport(),
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
            Lista de labores
          </h1>
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
        </div>
        <div className="mt-4">
          <BaseModal
            isOpen={modalOpen}
            onClose={() => {
              setModalOpen(false);
              setLabor(null);
            }}
            title={`Edicion de labor ${labor?.name || ""}`}
            primaryButtonText="Guardar"
            onPrimaryAction={handleSave}
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
          </BaseModal>
          <BulkSelectionPanel
            selectedCount={bulk.selectedCount}
            totalCount={filteredLabors.length}
            allSelected={bulk.allSelected}
            onToggleAll={bulk.toggleAll}
            onClear={bulk.clear}
            actions={bulk.actions}
            entityLabelPlural="labores"
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
