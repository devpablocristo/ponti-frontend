import { useEffect, useMemo, useState, useRef } from "react";
import * as XLSX from "xlsx";

import FilterBar from "../../../../layout/FilterBar/FilterBar";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import DataTable from "../../../../components/Table/DataTable";
import { LaborInfo, LaborToSave } from "../../../../hooks/useLabors/types";
import Button from "../../../../components/Button/Button";
import { Column } from "../../types";
import useLabors from "../../../../hooks/useLabors";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import InputField from "../../../../components/Input/InputField";
import SelectField from "../../../../components/Input/SelectField";
import useCategories from "../../../../hooks/useCategories";
import { apiClient } from "../../../../api/client";

const LABOR_HEADER_ALIASES = {
  name: ["labor", "nombre", "name"],
  category: ["rubro", "categoria", "category"],
  price: ["precio", "precio_usd", "usd", "u$s"],
  contractor: ["contratista", "contractor", "proveedor"],
  priceStatus: [
    "estado_precio",
    "precio_parcial",
    "is_partial_price",
    "parcial",
    "final_parcial",
    "estado_del_precio",
    "precio_tentativo",
  ],
} as const;

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let insideQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }
    if (char === "," && !insideQuotes) {
      values.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  values.push(current.trim());
  return values;
}

function parseCsv(content: string) {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length < 2) return [];
  const headers = parseCsvLine(lines[0]).map((h) => normalizeText(h));
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((header, idx) => {
      row[header] = values[idx] ?? "";
    });
    return row;
  });
}

function normalizeSpreadsheetRow(row: Record<string, unknown>) {
  const normalized: Record<string, string> = {};
  Object.entries(row).forEach(([key, value]) => {
    normalized[normalizeText(key)] = String(value ?? "").trim();
  });
  return normalized;
}

function getValueByAliases(
  row: Record<string, string>,
  aliases: readonly string[]
) {
  for (const alias of aliases) {
    const normalizedAlias = normalizeText(alias);
    if (row[normalizedAlias] !== undefined) {
      return row[normalizedAlias];
    }
  }
  return "";
}

function parsePartialPrice(rawValue: string) {
  const raw = (rawValue ?? "").trim();
  if (!raw) {
    return { provided: false, valid: true, value: false };
  }

  const normalized = normalizeText(raw).replace(/_/g, "");
  const partialValues = new Set([
    "parcial",
    "tentativo",
    "si",
    "true",
    "1",
    "x",
    "check",
    "checked",
  ]);
  const finalValues = new Set(["final", "no", "false", "0"]);

  if (partialValues.has(normalized)) {
    return { provided: true, valid: true, value: true };
  }
  if (finalValues.has(normalized)) {
    return { provided: true, valid: true, value: false };
  }

  return { provided: true, valid: false, value: false };
}

const columns: Column<LaborInfo>[] = [
  {
    key: "name",
    header: "Nombre",
    render: (value) => <strong className="text-blue-700">{value}</strong>,
  },
  {
    key: "category_name",
    header: "Categoría",
    render: (value) => value,
  },
  {
    key: "price",
    header: "Precio",
    render: (value, row) => (
      <div className="flex items-center gap-2">
        <strong>{value}</strong>
        {row.is_partial_price ? (
          <span className="inline-flex items-center rounded-md bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-300">
            Parcial
          </span>
        ) : null}
      </div>
    ),
  },
  {
    key: "contractor_name",
    header: "Contratista",
    render: (value) => value,
  },
];

export default function ListTasks() {
  const {
    getLabors,
    error,
    labors,
    deleteLabor,
    updateLabor,
    saveLabors,
    getWorkOrdersCount,
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
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string; count: number } | null>(null);
  const [labor, setLabor] = useState<LaborInfo | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
  ]);

  useEffect(() => {
    if (projectId) {
      getLabors(projectId);
      getCategories("type_id=4");
    }
  }, [projectId]);

  useEffect(() => {
    if (result && projectId) {
      setSuccessMessage(result);
      setErrorMessage("");
      getLabors(projectId);
    }
  }, [result, projectId]);

  useEffect(() => {
    if (resultUpdate && projectId) {
      setSuccessMessage(resultUpdate);
      setErrorMessage("");
      getLabors(projectId);
    }
  }, [resultUpdate, projectId]);

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

  const handleDelete = async (item: LaborInfo) => {
    if (!projectId) return;
    const count = await getWorkOrdersCount(projectId, item.id);
    setDeleteTarget({ id: item.id, name: item.name, count });
    setDeleteModalOpen(true);
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    setErrorMessage("");
    setSuccessMessage(null);
    deleteLabor(deleteTarget.id);
    setDeleteModalOpen(false);
    setDeleteTarget(null);

    setTimeout(() => {
      const totalAfterDelete = labors.length - 1;
      const lastPage = Math.max(
        1,
        Math.ceil(totalAfterDelete / itemsPerPage)
      );
      if (currentPage > lastPage) {
        setCurrentPage(lastPage);
      }
    }, 200);
  };

  const handleEdit = (item: LaborInfo) => {
    setLabor(item);
    setModalOpen(true);
  };

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
    } catch (error) {
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
        categories.map((c) => [normalizeText(c.name), c])
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
          contractor
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

      await saveLabors(laborsToSave, projectId);
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

  const paginatedLabors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return labors.slice(startIndex, startIndex + itemsPerPage);
  }, [labors, currentPage, itemsPerPage]);

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
        {errorMessage && (
          <div
            id="alert-2"
            className="flex items-center p-4 mb-4 text-red-800 rounded-lg bg-red-50 dark:bg-gray-800 dark:text-red-400"
            role="alert"
          >
            <svg
              className="shrink-0 w-4 h-4"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
            </svg>
            <span className="sr-only">Error</span>
            <div className="ms-3 text-sm font-medium">{errorMessage}</div>
            <button
              type="button"
              className="ms-auto -mx-1.5 -my-1.5 bg-red-50 text-red-500 rounded-lg focus:ring-2 focus:ring-red-400 p-1.5 hover:bg-red-200 inline-flex items-center justify-center h-8 w-8"
              onClick={() => setErrorMessage("")}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>
        )}
        {successMessage && (
          <div
            className="flex items-center p-4 mb-4 text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400"
            role="alert"
          >
            <svg
              className="shrink-0 w-4 h-4"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
            </svg>
            <span className="sr-only">Success</span>
            <div className="ms-3 text-sm font-medium">{successMessage}</div>
            <button
              type="button"
              className="ms-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex items-center justify-center h-8 w-8"
              onClick={() => setSuccessMessage("")}
              aria-label="Close"
            >
              <span className="sr-only">Close</span>
              <svg
                className="w-3 h-3"
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 14 14"
              >
                <path
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
                />
              </svg>
            </button>
          </div>
        )}
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
                  setLabor({
                    id: labor?.id || 0,
                    category_id: labor?.category_id || 0,
                    price: labor?.price || "",
                    contractor_name: labor?.contractor_name || "",
                    category_name: labor?.category_name || "",
                    name: e.target.value,
                  });
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
                options={categories}
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
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-yellow-600 focus:ring-yellow-500"
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
          <BaseModal
            isOpen={deleteModalOpen}
            onClose={() => {
              setDeleteModalOpen(false);
              setDeleteTarget(null);
            }}
            title="Archivar labor"
            message={
              deleteTarget && deleteTarget.count > 0
                ? `La labor "${deleteTarget.name}" está en ${deleteTarget.count} orden${deleteTarget.count > 1 ? "es" : ""} de trabajo activa${deleteTarget.count > 1 ? "s" : ""}. Se archivará del catálogo pero las órdenes no se verán afectadas. ¿Continuar?`
                : `¿Está seguro que desea archivar la labor "${deleteTarget?.name}"?`
            }
            primaryButtonText="Archivar"
            primaryButtonColor="bg-red-600 hover:bg-red-800 focus:ring-red-300"
            onPrimaryAction={confirmDelete}
          />
          <DataTable
            data={paginatedLabors}
            columns={columns}
            onDelete={(item) => handleDelete(item)}
            onEdit={(item) => handleEdit(item)}
            message="No hay labores cargadas en el proyecto"
            pagination={{
              page: currentPage,
              perPage: itemsPerPage,
              total: labors.length,
              onPageChange: (newPage: number) => setCurrentPage(newPage),
            }}
          />
        </div>
      </div>
    </div>
  );
}
