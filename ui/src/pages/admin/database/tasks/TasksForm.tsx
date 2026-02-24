import { useEffect, useRef, useState } from "react";
import InputField from "../../../../components/Input/InputField";
import Button from "../../../../components/Button/Button";
import SelectField from "../../../../components/Input/SelectField";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import FilterBar from "../../../../layout/FilterBar/FilterBar";
import useCategories from "../../../../hooks/useCategories";
import { LaborToSave, LaborInfo } from "../../../../hooks/useLabors/types";
import useLabors from "../../../../hooks/useLabors";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import { apiClient } from "../../../../api/client";
import { LoaderCircle } from "lucide-react";
import * as XLSX from "xlsx";

interface Labor {
  id: number;
  name: string;
  category: string;
  price: string;
  contractor: string;
}

interface PendingLaborImport {
  newRows: Labor[];
  duplicates: { existing: LaborInfo; updated: LaborInfo }[];
  warnings: string[];
}

const LABOR_HEADER_ALIASES = {
  name: ["labor", "nombre", "name"],
  category: ["rubro", "categoria", "category"],
  price: ["precio", "precio_usd", "usd", "u$s"],
  contractor: ["contratista", "contractor", "proveedor"],
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

  if (lines.length < 2) {
    return [];
  }

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

export default function TasksForm() {
  const { saveLabors, result, error, processing, labors, getLabors } = useLabors();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingLaborImport | null>(null);
  const [overwriting, setOverwriting] = useState(false);
  const { categories, getCategories } = useCategories();

  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
  ]);

  const [rows, setLabors] = useState<Labor[]>(
    Array.from({ length: 5 }, (_, i) => ({
      id: i,
      name: "",
      category: "",
      price: "",
      contractor: "",
    }))
  );

  useEffect(() => {
    getCategories("type_id=4");
  }, []);

  useEffect(() => {
    if (projectId) {
      getLabors(projectId);
    }
  }, [projectId]);

  function cleanForm() {
    setLabors(
      Array.from({ length: 5 }, (_, i) => ({
        id: i,
        name: "",
        category: "",
        price: "",
        contractor: "",
      }))
    );
  }

  useEffect(() => {
    if (result !== "") {
      cleanForm();
      setTimeout(() => {
        document
          .getElementById("main-scroll")
          ?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
    }
    setErrorMessage("");
    setSuccessMessage(result);
  }, [result]);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
    }
  }, [error]);

  useEffect(() => {
    if (errorMessage) {
      setSuccessMessage(null);
    }
  }, [errorMessage]);

  const handleChange = (id: number, field: keyof Labor, value: string) => {
    setLabors((prev) =>
      prev.map((labor) =>
        labor.id === id ? { ...labor, [field]: value } : labor
      )
    );
  };

  function hasIncompleteRows(rows: Labor[]) {
    return rows.some((row) => {
      const anyFilled = row.name || row.category || row.price || row.contractor;
      const anyMissing =
        !row.name || !row.category || !row.price || !row.contractor;
      return anyFilled && anyMissing;
    });
  }

  const handleCreateLabors = () => {
    if (!projectId) {
      setErrorMessage(
        "Por favor, seleccione un proyecto y campaña antes de guardar."
      );
      return;
    }

    setErrorMessage("");
    if (hasIncompleteRows(rows)) {
      setErrorMessage(
        "Por favor, complete todos los campos del registro antes de guardar."
      );
      return;
    }

    const laborsToSave: LaborToSave[] = rows
      .filter((row) => row.name && row.category && row.price && row.contractor)
      .map((row) => ({
        name: row.name,
        category_id: Number(row.category),
        price: row.price,
        contractor_name: row.contractor,
      }));

    if (laborsToSave.length === 0) {
      setErrorMessage(
        "Por favor, ingrese al menos un insumo antes de guardar."
      );
      return;
    }

    saveLabors(laborsToSave, projectId);
  };

  function loadNewLaborRows(newRows: Labor[], warnings: string[]) {
    const rowsWithMinimum = [...newRows];
    while (rowsWithMinimum.length < 5) {
      rowsWithMinimum.push({
        id: rowsWithMinimum.length,
        name: "",
        category: "",
        price: "",
        contractor: "",
      });
    }

    if (newRows.length > 0) {
      setLabors(rowsWithMinimum);
    }

    if (warnings.length > 0) {
      setErrorMessage(warnings.join(" "));
    } else {
      setErrorMessage("");
    }

    if (newRows.length > 0) {
      setSuccessMessage(
        `Se importaron ${newRows.length} labores nuevas. Revise y presione Guardar.`
      );
    }
  }

  const handleSkipDuplicates = () => {
    if (!pendingImport) return;
    setImportModalOpen(false);

    const { newRows, duplicates, warnings } = pendingImport;

    if (newRows.length === 0) {
      const namesList = duplicates
        .slice(0, 8)
        .map((d) => `  - ${d.existing.name}`)
        .join("\n");
      const extra = duplicates.length > 8 ? `\n  y ${duplicates.length - 8} más...` : "";
      setErrorMessage("");
      setSuccessMessage(
        `Se omitieron ${duplicates.length} labores que ya existen:\n${namesList}${extra}`
      );
    } else {
      loadNewLaborRows(newRows, warnings);
      const namesList = duplicates
        .slice(0, 8)
        .map((d) => `  - ${d.existing.name}`)
        .join("\n");
      const extra = duplicates.length > 8 ? `\n  y ${duplicates.length - 8} más...` : "";
      setSuccessMessage(
        `Se importaron ${newRows.length} labores nuevas.\nSe omitieron ${duplicates.length} que ya existen:\n${namesList}${extra}\nRevise y presione Guardar.`
      );
    }

    setPendingImport(null);
  };

  const handleOverwrite = async () => {
    if (!pendingImport || !projectId) return;
    setOverwriting(true);

    const { newRows, duplicates, warnings } = pendingImport;
    const results = await Promise.allSettled(
      duplicates.map((d) =>
        apiClient.put(`/labors/projects/${projectId}/${d.updated.id}`, d.updated)
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    setImportModalOpen(false);
    setOverwriting(false);
    setPendingImport(null);

    loadNewLaborRows(newRows, warnings);

    // Refresh labors list to reflect updates
    getLabors(projectId);

    const parts: string[] = [];
    if (succeeded > 0) parts.push(`Se actualizaron ${succeeded} labores existentes.`);
    if (failed > 0) parts.push(`Fallaron ${failed} actualizaciones.`);
    if (newRows.length > 0) parts.push(`Se cargaron ${newRows.length} nuevas en el formulario.`);
    if (newRows.length > 0) parts.push("Revise y presione Guardar.");
    setSuccessMessage(parts.join(" "));

    if (failed > 0) {
      setErrorMessage(`${failed} labores no se pudieron actualizar.`);
    }
  };

  const handleImportLaborsFromFile = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (!projectId) {
      setErrorMessage(
        "Por favor, seleccione un proyecto y campaña antes de importar."
      );
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
        setErrorMessage(
          "El archivo no tiene datos válidos. Verifique encabezados y filas."
        );
        return;
      }

      const categoryByName = new Map(
        categories.map((c) => [normalizeText(c.name), c])
      );

      const importedRows: Labor[] = [];
      const importErrors: string[] = [];
      const duplicates: { existing: LaborInfo; updated: LaborInfo }[] = [];

      const laborByName = new Map(
        (labors || []).map((l) => [l.name.trim().toLowerCase(), l])
      );

      parsedRows.forEach((rawRow, idx) => {
        const rowNumber = idx + 2;
        const name = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.name).trim();
        const categoryRaw = getValueByAliases(
          rawRow,
          LABOR_HEADER_ALIASES.category
        ).trim();
        const priceRaw = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.price).trim();
        const contractor = getValueByAliases(
          rawRow,
          LABOR_HEADER_ALIASES.contractor
        ).trim();

        if (!name && !categoryRaw && !priceRaw && !contractor) return;

        const categoryByText = categoryByName.get(normalizeText(categoryRaw));
        const categoryId = categoryByText?.id ?? Number(categoryRaw);
        const priceValue = Number(priceRaw.replace(/\$/g, "").replace(",", "."));

        if (!name) return;

        // Check if labor already exists
        const existing = laborByName.get(name.trim().toLowerCase());
        if (existing) {
          const catName = categoryByText?.name ?? existing.category_name;
          duplicates.push({
            existing,
            updated: {
              ...existing,
              name,
              price: !Number.isNaN(priceValue) && priceValue > 0 ? String(priceValue) : existing.price,
              category_id: (categoryId && !Number.isNaN(categoryId)) ? categoryId : existing.category_id,
              category_name: catName,
              contractor_name: contractor || existing.contractor_name,
            },
          });
          return;
        }

        if (!categoryId || Number.isNaN(categoryId)) {
          importErrors.push(`Fila ${rowNumber}: "Rubro" inválido.`);
        }
        if (!priceRaw || Number.isNaN(priceValue) || priceValue <= 0) {
          importErrors.push(`Fila ${rowNumber}: "Precio" inválido.`);
        }
        if (!contractor) {
          importErrors.push(`Fila ${rowNumber}: falta "Contratista".`);
        }

        if (
          name &&
          categoryId &&
          !Number.isNaN(categoryId) &&
          !Number.isNaN(priceValue) &&
          priceValue > 0 &&
          contractor
        ) {
          importedRows.push({
            id: importedRows.length,
            name,
            category: String(categoryId),
            price: String(priceValue),
            contractor,
          });
        }
      });

      // If there are duplicates, show modal to let user choose
      if (duplicates.length > 0) {
        setPendingImport({ newRows: importedRows, duplicates, warnings: importErrors });
        setImportModalOpen(true);
        return;
      }

      // No duplicates — load directly into form
      loadNewLaborRows(importedRows, importErrors);

      if (importedRows.length === 0 && importErrors.length === 0) {
        setErrorMessage("No se encontraron filas importables en el archivo.");
      }
    } catch {
      setErrorMessage("No se pudo leer el archivo. Use .xlsx, .xls o .csv.");
    }
  };

  return (
    <div className="w-full mx-auto">
      <FilterBar filters={filters} />
      <div className="w-full p-6 mt-4 bg-white rounded-lg shadow-md">
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
        {successMessage && successMessage !== "" && (
          <div
            className="flex items-center p-4 mb-4 text-sm text-green-800 rounded-lg bg-green-50 dark:bg-gray-800 dark:text-green-400"
            role="alert"
          >
            <svg
              className="shrink-0 inline w-4 h-4 me-3"
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M10 .5a9.5 9.5 0 1 0 9.5 9.5A9.51 9.51 0 0 0 10 .5ZM9.5 4a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM12 15H8a1 1 0 0 1 0-2h1v-3H8a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1v4h1a1 1 0 0 1 0 2Z" />
            </svg>
            <span className="sr-only">Info</span>
            <div className="whitespace-pre-line">
              <span className="font-medium">{successMessage}</span>
            </div>
            <button
              type="button"
              className="ms-auto -mx-1.5 -my-1.5 bg-green-50 text-green-500 rounded-lg focus:ring-2 focus:ring-green-400 p-1.5 hover:bg-green-200 inline-flex items-center justify-center h-8 w-8 dark:bg-gray-800 dark:text-green-400 dark:hover:bg-gray-700"
              data-dismiss-target="#alert-3"
              aria-label="Close"
              onClick={() => setSuccessMessage("")}
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
            Agregar labores
          </h1>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleImportLaborsFromFile}
              className="hidden"
            />
            <Button
              variant="primary"
              size="sm"
              className="text-sm font-medium"
              onClick={() => fileInputRef.current?.click()}
            >
              Importar labores
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="text-sm font-medium flex items-center gap-1"
              href="/admin/database/tasks/list"
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
                  d="M4 6h16M4 10h16M4 14h16M4 18h16"
                />
              </svg>
              Ver listado
            </Button>
          </div>
        </div>
        {processing ? (
          <div className="absolute inset-0 bg-white bg-opacity-70 backdrop-blur-sm flex items-center justify-center z-10">
            <LoaderCircle className="w-10 h-10 text-blue-600 animate-spin" />
          </div>
        ) : (
          <div className="mt-4">
            <div className="hidden sm:grid grid-cols-[1fr_1fr_0.5fr_1fr] gap-4 mb-2">
              <span className="font-semibold">Labor</span>
              <span className="font-semibold">Rubro</span>
              <span className="font-semibold">Precio</span>
              <span className="font-semibold">Contratista</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_0.5fr_1fr] gap-4">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className="sm:contents border sm:border-0 p-4 sm:p-0 rounded-md sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none"
                >
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Labor
                    </label>
                    <InputField
                      label=""
                      name={`labor-${index}`}
                      value={row.name}
                      onChange={(e) =>
                        handleChange(index, "name", e.target.value)
                      }
                      placeholder="nombre"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Rubro
                    </label>
                    <SelectField
                      key={row.id}
                      label=""
                      name={`category-${index}`}
                      value={row.category.toString()}
                      onChange={(e) =>
                        handleChange(row.id, "category", e.target.value)
                      }
                      options={categories}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Precio
                    </label>
                    <InputField
                      label=""
                      name={`precio-${index}`}
                      value={row.price}
                      onChange={(e) => {
                        let value = e.target.value.replace(/,/g, ".");
                        if (/^\d*\.?\d{0,2}$/.test(value)) {
                          handleChange(index, "price", value);
                        }
                      }}
                      placeholder="u$s"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Contratista
                    </label>
                    <InputField
                      label=""
                      name={`contratista-${index}`}
                      value={row.contractor}
                      onChange={(e) =>
                        handleChange(index, "contractor", e.target.value)
                      }
                      placeholder="nombre"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <div className="flex justify-between flex-wrap gap-4 my-4">
        <div />
        <div className="flex gap-4 my-2 justify-end">
          <Button variant="primary" className="text-base font-medium">
            Cancelar
          </Button>
          <Button
            onClick={handleCreateLabors}
            variant="primary"
            className="text-base font-medium"
            disabled={processing}
          >
            Guardar
          </Button>
        </div>
      </div>

      <BaseModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setPendingImport(null);
        }}
        title="Se encontraron labores existentes"
        message={
          pendingImport
            ? `El archivo contiene ${pendingImport.duplicates.length} labor${pendingImport.duplicates.length > 1 ? "es" : ""} que ya existe${pendingImport.duplicates.length > 1 ? "n" : ""} en la lista.${pendingImport.newRows.length > 0 ? `\n\nAdemás hay ${pendingImport.newRows.length} labor${pendingImport.newRows.length > 1 ? "es" : ""} nueva${pendingImport.newRows.length > 1 ? "s" : ""}.` : ""}`
            : ""
        }
        primaryButtonText={overwriting ? "Actualizando..." : "Sobreescribir existentes"}
        primaryButtonColor="bg-blue-600 hover:bg-blue-700 focus:ring-blue-300"
        onPrimaryAction={handleOverwrite}
        secondaryButtonText="Solo nuevos"
        onSecondaryAction={handleSkipDuplicates}
        isSaving={overwriting}
      />
    </div>
  );
}
