import { useEffect, useRef, useState } from "react";
import InputField from "../../../../components/Input/InputField";
import Button from "../../../../components/Button/Button";
import SelectField from "../../../../components/Input/SelectField";
import FilterBar from "../../../../layout/FilterBar/FilterBar";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import { SupplyCreatePayload, Supply } from "../../../../hooks/useSupplies/types";
import useSupplies from "../../../../hooks/useSupplies";
import useCategories from "../../../../hooks/useCategories";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import { apiClient } from "../../../../api/client";
import * as XLSX from "xlsx";
import { units } from "../../../../constants/units";

interface Row {
  id: number;
  name: string;
  unit: string;
  price: string;
  type: string;
  category: string;
}

interface PendingImport {
  newRows: Row[];
  duplicates: { existing: Supply; updated: Supply }[];
  warnings: string[];
}

const HEADER_ALIASES = {
  name: ["insumo", "nombre", "name"],
  unit: ["unidad", "unit"],
  // Support stock exports too (e.g. "PRECIO U.", "PRECIO U$")
  price: ["precio", "precio_usd", "precio_u", "precio_u_usd", "usd", "u$s", "precio_unidad", "precio_unitario"],
  category: ["rubro", "categoria", "category"],
  type: ["tipo", "tipo_clase", "clase", "type"],
} as const;

function normalizeText(value: string) {
  // Normalize headers from spreadsheets:
  // - remove accents
  // - turn common separators into underscores
  // - normalize USD markers (U$, U$S)
  // - drop remaining punctuation
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/u\$\s*s?/g, "usd")
    .replace(/\$/g, "usd")
    .replace(/[\s./-]+/g, "_")
    .replace(/[^a-z0-9_]/g, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function inferUnitId(unitRaw: string, name: string): number {
  // Be forgiving: spreadsheets can have "L" / "LT" / "LTS" and sometimes the unit is only in the name.
  const normalized = normalizeText(`${unitRaw} ${name}`);
  const hay = normalized.replace(/_/g, " ");

  if (normalized === "1") return 1;
  if (
    normalized === "l" ||
    normalized === "lt" ||
    normalized === "lts" ||
    hay.includes("lts") ||
    hay.includes("lt") ||
    hay.includes("litro") ||
    hay.includes("litros") ||
    hay.includes("ltrs")
  ) {
    return 1;
  }

  if (normalized === "2") return 2;
  if (
    hay.includes("kg") ||
    hay.includes("kgs") ||
    hay.includes("kgr") ||
    hay.includes("kilo") ||
    hay.includes("kilos") ||
    /\b\d+\s*g\b/.test(hay)
  ) {
    return 2;
  }

  if (normalized === "3") return 3;
  if (
    hay.includes("bolsa") ||
    hay.includes("bolsas") ||
    hay.includes("bag") ||
    hay.includes("bags")
  ) {
    return 3;
  }

  return 0;
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

export default function Items() {
  const { saveSupplies, result, error, supplies, getSupplies } = useSupplies();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [errorMessage, setErrorMessage] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState<boolean>(false);
  const [initialRows, setInitialRows] = useState<string>("");
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [overwriting, setOverwriting] = useState(false);
  const { categories, types, getCategories, getTypes } = useCategories();
  const {
    filters,
    selectedProject,
    projectId,
    selectedCustomer,
    selectedCampaignId,
  } = useWorkspaceFilters(["customer", "project", "campaign"]);
  const [rows, setRows] = useState<Row[]>(
    Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: "",
      unit: "",
      price: "",
      type: "",
      category: "",
    }))
  );

  useEffect(() => {
    getCategories("");
    getTypes();

    // Set initial rows state
    setInitialRows(
      JSON.stringify(
        Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: "",
          unit: "",
          price: "",
          type: "",
          category: "",
        }))
      )
    );


    // Add browser refresh/close protection
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        const message =
          "Hay cambios sin guardar. Si continúa, los cambios se perderán.";
        e.returnValue = message;
        return message;
      }
    };

    // Add protection for all link clicks in the app
    const handleLinkClick = (e: MouseEvent) => {
      if (!hasUnsavedChanges) return; // Si no hay cambios, permitir navegación normal

      // Buscar si el clic fue en un enlace (a) o en un elemento dentro de un enlace
      let target = e.target as HTMLElement;
      while (target && target.tagName !== "A" && target.tagName !== "BODY") {
        target = target.parentElement as HTMLElement;
      }

      // Si es un enlace y no es el botón de guardar, mostrar confirmación
      if (target && target.tagName === "A") {
        // Ignorar si el enlace es part of the form (guardar, agregar)
        if (target.classList.contains("ignore-protection")) return;

        const confirmed = window.confirm(
          "Hay cambios sin guardar. ¿Desea salir de todas formas?"
        );
        if (!confirmed) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleLinkClick, true); // true para fase de captura

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleLinkClick, true);
    };
  }, [getCategories, getTypes, hasUnsavedChanges]);

  useEffect(() => {
    if (projectId) {
      getSupplies(projectId);
    }
  }, [projectId]);

  function cleanForm() {
    const emptyRows = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1,
      name: "",
      unit: "",
      price: "",
      type: "",
      category: "",
    }));

    setRows(emptyRows);
    setHasUnsavedChanges(false);
    setInitialRows(JSON.stringify(emptyRows));
  }

  useEffect(() => {
    if (result !== "") {
      cleanForm();
      setTimeout(() => {
        document
          .getElementById("main-scroll")
          ?.scrollTo({ top: 0, behavior: "smooth" });
      }, 0);
      setHasUnsavedChanges(false);
    }
    setErrorMessage("");
    setSuccessMessage(result);
  }, [result]);

  useEffect(() => {
    if (error) {
      setErrorMessage(error);
      setSuccessMessage(null);
    }
  }, [error]);

  const handleChange = (id: number, field: keyof Row, value: string) => {
    setRows((prev) => {
      const newRows = prev.map((row) =>
        row.id === id ? { ...row, [field]: value } : row
      );
      const hasChanges = JSON.stringify(newRows) !== initialRows;
      setHasUnsavedChanges(hasChanges);
      return newRows;
    });
  };

  function hasIncompleteRows(rows: Row[]) {
    return rows.some((row) => {
      const anyFilled =
        row.name || row.unit || row.price || row.type || row.category;
      const anyMissing =
        !row.name || !row.unit || !row.price || !row.type || !row.category;
      return anyFilled && anyMissing;
    });
  }

  function findDuplicateNames(
    rows: Row[],
    existingSupplies: { name: string }[]
  ) {
    const errors: string[] = [];

    const normalized = (v: string) => v.trim().toLowerCase();

    // 1. Duplicados dentro del formulario
    const namesInForm = rows
      .filter((r) => r.name)
      .map((r) => normalized(r.name));

    const duplicatedInForm = namesInForm.filter(
      (name, i, arr) => arr.indexOf(name) !== i
    );

    duplicatedInForm.forEach((name) => {
      errors.push(`El insumo "${name}" está duplicado en el formulario.`);
    });

    // 2. Duplicados contra BD
    rows.forEach((row, index) => {
      if (!row.name) return;

      const exists = existingSupplies.some(
        (p) => normalized(p.name) === normalized(row.name)
      );

      if (exists) {
        errors.push(
          `Fila ${index + 1}: ya existe un insumo con el nombre "${row.name}".`
        );
      }
    });

    return errors;
  }

  const handleCreateSupply = () => {
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

    const suppliesToSave: SupplyCreatePayload[] = rows
      .filter(
        (row) => row.name && row.unit && row.price && row.type && row.category
      )
      .map((row) => ({
        name: row.name,
        unit: Number(row.unit),
        price: Number(row.price),
        type: Number(row.type),
        category: Number(row.category),
      }));

    if (suppliesToSave.length === 0) {
      setErrorMessage(
        "Por favor, ingrese al menos un insumo antes de guardar."
      );
      return;
    }

    const duplicateErrors = findDuplicateNames(rows, supplies || []);

    if (duplicateErrors.length > 0) {
      setErrorMessage(duplicateErrors.join(" "));
      return;
    }

    saveSupplies(suppliesToSave, projectId);
  };

  const handleAddRow = () => {
    setRows((prev) => {
      const newRows = [
        ...prev,
        {
          id: prev.length + 1,
          name: "",
          unit: "",
          price: "",
          type: "",
          category: "",
        },
      ];
      setHasUnsavedChanges(true);
      return newRows;
    });
  };

  function loadNewRows(newRows: Row[], warnings: string[]) {
    const rowsWithMinimum = [...newRows];
    while (rowsWithMinimum.length < 5) {
      rowsWithMinimum.push({
        id: rowsWithMinimum.length + 1,
        name: "",
        unit: "",
        price: "",
        type: "",
        category: "",
      });
    }

    if (newRows.length > 0) {
      setRows(rowsWithMinimum);
      setHasUnsavedChanges(true);
    }

    if (warnings.length > 0) {
      setErrorMessage(
        `Hay ${warnings.length} advertencias: ${warnings.slice(0, 6).join(" ")}`
      );
    } else {
      setErrorMessage("");
    }

    if (newRows.length > 0) {
      setSuccessMessage(
        `Se importaron ${newRows.length} insumos nuevos. Revise y presione Guardar.`
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
        `Se omitieron ${duplicates.length} insumos que ya existen:\n${namesList}${extra}`
      );
    } else {
      loadNewRows(newRows, warnings);
      const namesList = duplicates
        .slice(0, 8)
        .map((d) => `  - ${d.existing.name}`)
        .join("\n");
      const extra = duplicates.length > 8 ? `\n  y ${duplicates.length - 8} más...` : "";
      setSuccessMessage(
        `Se importaron ${newRows.length} insumos nuevos.\nSe omitieron ${duplicates.length} que ya existen:\n${namesList}${extra}\nRevise y presione Guardar.`
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
        apiClient.put(`/supplies/projects/${projectId}/${d.updated.id}`, d.updated)
      )
    );

    const succeeded = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.filter((r) => r.status === "rejected").length;

    setImportModalOpen(false);
    setOverwriting(false);
    setPendingImport(null);

    loadNewRows(newRows, warnings);

    // Refresh supplies list to reflect updates
    getSupplies(projectId);

    const parts: string[] = [];
    if (succeeded > 0) parts.push(`Se actualizaron ${succeeded} insumos existentes.`);
    if (failed > 0) parts.push(`Fallaron ${failed} actualizaciones.`);
    if (newRows.length > 0) parts.push(`Se cargaron ${newRows.length} nuevos en el formulario.`);
    if (newRows.length > 0) parts.push("Revise y presione Guardar.");
    setSuccessMessage(parts.join(" "));

    if (failed > 0) {
      setErrorMessage(`${failed} insumos no se pudieron actualizar.`);
    }
  };

  const handleImportFromFile = async (
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
        // Prefer a meaningful sheet (stock exports often have an empty first sheet).
        const sheetNames = workbook.SheetNames || [];
        const preferred =
          sheetNames.find((n) => normalizeText(n).includes("stock")) ??
          sheetNames.find((n) => normalizeText(n).includes("insumo")) ??
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
          "El archivo no tiene datos válidos. Verifique que tenga encabezados y filas."
        );
        return;
      }

      const categoryByName = new Map(
        categories.map((c) => [normalizeText(c.name), c])
      );
      const typeByName = new Map(types.map((t) => [normalizeText(t.name), t]));

      const importedRows: Row[] = [];
      const importWarnings: string[] = [];
      const duplicates: { existing: Supply; updated: Supply }[] = [];

      const supplyByName = new Map(
        (supplies || []).map((s) => [s.name.trim().toLowerCase(), s])
      );

      parsedRows.forEach((rawRow, idx) => {
        const rowNumber = idx + 2;
        const name = getValueByAliases(rawRow, HEADER_ALIASES.name).trim();
        const unitRaw = getValueByAliases(rawRow, HEADER_ALIASES.unit).trim();
        const priceRaw = getValueByAliases(rawRow, HEADER_ALIASES.price).trim();
        const categoryRaw = getValueByAliases(
          rawRow,
          HEADER_ALIASES.category
        ).trim();
        const typeRaw = getValueByAliases(rawRow, HEADER_ALIASES.type).trim();

        if (!name && !unitRaw && !priceRaw && !categoryRaw && !typeRaw) return;

        const unitId = inferUnitId(unitRaw, name);

        // Accept formats like "U$S 15,5", "$ 15.5", "15,5"
        const normalizedPrice = priceRaw
          .replace(/[^0-9,.-]/g, "")
          .replace(/\s/g, "")
          .replace(",", ".");
        const priceValue = normalizedPrice ? Number(normalizedPrice) : Number.NaN;

        const categoryByText = categoryByName.get(normalizeText(categoryRaw));
        const categoryId = categoryByText?.id ?? Number(categoryRaw);
        const typeFromCategory = categoryByText?.type_id;
        const typeByText = typeByName.get(normalizeText(typeRaw));
        const typeId = typeFromCategory ?? typeByText?.id ?? Number(typeRaw);

        if (!name) return;

        // Check if item already exists in the database
        const existing = supplyByName.get(name.trim().toLowerCase());
        if (existing) {
          const unitName = units.find((u) => u.id === (unitId || existing.unit_id))?.name ?? existing.unit_name ?? "";
          const catName = categoryByText?.name ?? existing.category_name;
          const typName = typeByText?.name ?? existing.type_name;
          duplicates.push({
            existing,
            updated: {
              ...existing,
              name,
              price: !Number.isNaN(priceValue) && priceValue > 0 ? String(priceValue) : existing.price,
              unit_id: unitId || existing.unit_id,
              unit_name: unitName,
              category_id: (categoryId && !Number.isNaN(categoryId)) ? categoryId : existing.category_id,
              category_name: catName,
              type_id: (typeId && !Number.isNaN(typeId)) ? typeId : existing.type_id,
              type_name: typName,
            },
          });
          return;
        }

        if (!unitId) {
          importWarnings.push(
            `Fila ${rowNumber} ("${name}"): "Unidad" inválida${unitRaw ? ` ("${unitRaw}")` : ""}.`
          );
        }
        if (!priceRaw || Number.isNaN(priceValue) || priceValue <= 0) {
          importWarnings.push(`Fila ${rowNumber} ("${name}"): "Precio" inválido.`);
        }
        if (!categoryId || Number.isNaN(categoryId)) {
          importWarnings.push(`Fila ${rowNumber} ("${name}"): "Rubro" inválido.`);
        }
        if (!typeId || Number.isNaN(typeId)) {
          importWarnings.push(
            `Fila ${rowNumber} ("${name}"): "Tipo/Clase" inválido o no deducible por rubro.`
          );
        }

        importedRows.push({
          id: importedRows.length + 1,
          name,
          unit: unitId ? String(unitId) : "",
          price:
            !Number.isNaN(priceValue) && priceValue > 0 ? String(priceValue) : "",
          category: categoryId && !Number.isNaN(categoryId) ? String(categoryId) : "",
          type: typeId && !Number.isNaN(typeId) ? String(typeId) : "",
        });
      });

      // If there are duplicates, show modal to let user choose
      if (duplicates.length > 0) {
        setPendingImport({ newRows: importedRows, duplicates, warnings: importWarnings });
        setImportModalOpen(true);
        return;
      }

      // No duplicates — load directly into form
      loadNewRows(importedRows, importWarnings);
    } catch {
      setErrorMessage("No se pudo leer el archivo. Use .xlsx, .xls o .csv.");
    }
  };

  return (
    <div className="w-full mx-auto">
      <FilterBar filters={filters} />
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
            Agregar insumos
          </h1>
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              onChange={handleImportFromFile}
              className="hidden"
            />
            <Button
              variant="outlinePonti"
              size="sm"
              className="text-sm font-medium"
              onClick={() => fileInputRef.current?.click()}
            >
              Importar Excel
            </Button>
            <Button
              variant="primary"
              size="sm"
              className="text-sm font-medium flex items-center gap-1"
              href="/admin/database/items/list"
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
        <div className="mt-4">
          <div className="hidden sm:grid grid-cols-[1fr_0.5fr_0.5fr_1fr_1fr] gap-4 mb-2">
            <span className="font-medium">Insumo</span>
            <span className="font-medium">Unidad</span>
            <span className="font-medium">Precio</span>
            <span className="font-medium">Rubro</span>
            <span className="font-medium">Tipo/Clase</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr_0.5fr_0.5fr_1fr_1fr] gap-4">
            {rows.map((row, index) => {
              return (
                <div
                  key={index}
                  className="sm:contents border sm:border-0 p-4 sm:p-0 rounded-md sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none"
                >
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Insumo
                    </label>
                    <InputField
                      label=""
                      name={`item-${index}`}
                      value={row.name}
                      onChange={(e) =>
                        handleChange(row.id, "name", e.target.value)
                      }
                      placeholder="Ingrese nombre"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Unidad
                    </label>
                    <SelectField
                      key={row.id}
                      label=""
                      name={`unit-${index}`}
                      value={row.unit}
                      onChange={(e) =>
                        handleChange(row.id, "unit", e.target.value)
                      }
                      options={units}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Precio
                    </label>
                    <InputField
                      label=""
                      name={`price-${index}`}
                      value={row.price}
                      type="text"
                      onChange={(e) => {
                        let value = e.target.value.replace(/,/g, ".");
                        if (/^\d*\.?\d{0,2}$/.test(value)) {
                          handleChange(row.id, "price", value);
                        }
                      }}
                      placeholder="u$s"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Rubro
                    </label>
                    <SelectField
                      key={`category-${row.id}`}
                      label=""
                      name={`category-${index}`}
                      value={row.category.toString()}
                      onChange={(e) => {
                        const cat = categories.find(
                          (cat) => cat.id === Number(e.target.value)
                        );
                        handleChange(row.id, "category", e.target.value);
                        handleChange(
                          row.id,
                          "type",
                          cat?.type_id?.toString() || ""
                        );
                      }}
                      options={categories}
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="sm:hidden text-sm text-gray-600">
                      Tipo / Clase
                    </label>
                    <SelectField
                      key={`type-${row.id}`}
                      label=""
                      name={`type-${index}`}
                      value={row.type.toString()}
                      disabled
                      onChange={() => { }}
                      options={types}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={handleAddRow}
            className="text-blue-500 hover:underline mt-4"
          >
            + Agregar nuevo insumo
          </Button>
        </div>
      </div>
      <div className="flex gap-4 my-4 justify-end">
        <Button
          variant="outlineGray"
          className="text-base font-medium"
          onClick={() => {
            if (hasUnsavedChanges) {
              const confirmed = window.confirm(
                "Hay cambios sin guardar. ¿Desea cancelar de todas formas?"
              );
              if (confirmed) {
                cleanForm();
              }
            } else {
              cleanForm();
            }
          }}
        >
          Cancelar
        </Button>
        <Button
          variant="success"
          disabled={
            !selectedProject || !selectedCustomer || !selectedCampaignId
          }
          onClick={handleCreateSupply}
          className="text-base font-medium"
        >
          Guardar
        </Button>
      </div>

      <BaseModal
        isOpen={importModalOpen}
        onClose={() => {
          setImportModalOpen(false);
          setPendingImport(null);
        }}
        title="Se encontraron insumos existentes"
        message={
          pendingImport
            ? `El archivo contiene ${pendingImport.duplicates.length} insumo${pendingImport.duplicates.length > 1 ? "s" : ""} que ya existe${pendingImport.duplicates.length > 1 ? "n" : ""} en la lista.${pendingImport.newRows.length > 0 ? `\n\nAdemás hay ${pendingImport.newRows.length} insumo${pendingImport.newRows.length > 1 ? "s" : ""} nuevo${pendingImport.newRows.length > 1 ? "s" : ""}.` : ""}`
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
