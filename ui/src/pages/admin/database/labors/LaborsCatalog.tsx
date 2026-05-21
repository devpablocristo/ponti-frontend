import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Plus, Trash2 } from "lucide-react";
import InputField from "../../../../components/Input/InputField";
import Button from "../../../../components/Button/Button";
import SelectField from "../../../../components/Input/SelectField";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import useCategories from "../../../../hooks/useCategories";
import { CATEGORY_TYPE_ID, categoryTypeQuery } from "@/lib/categoryTypes";
import { LaborToSave, LaborInfo } from "../../../../hooks/useLabors/types";
import useLabors from "../../../../hooks/useLabors";
import { BaseModal } from "../../../../components/Modal/BaseModal";
import { apiClient } from "../../../../api/client";
import { LoadingOverlay } from "../../../../components/feedback/LoadingOverlay";
import { ErrorBanner } from "../../../../components/feedback/ErrorBanner";
import { SuccessBanner } from "../../../../components/feedback/SuccessBanner";
import {
  getValueByAliases,
  LABOR_HEADER_ALIASES,
  normalizeText,
  parseCsv,
  parsePartialPrice,
} from "./importUtils";
import { CSV_ACCEPT } from "../../fileTransfer";

export interface Labor {
  id: number;
  name: string;
  category: string;
  price: string;
  contractor: string;
  is_partial_price: boolean;
}

interface PendingLaborImport {
  newRows: Labor[];
  duplicates: { existing: LaborInfo; updated: LaborInfo }[];
  warnings: string[];
}

const emptyRow = (id: number): Labor => ({
  id,
  name: "",
  category: "",
  price: "",
  contractor: "",
  is_partial_price: false,
});

type LaborsCatalogProps = {
  hideWorkspaceFilters?: boolean;
  onCancel?: () => void;
  // When provided, the form arrives pre-loaded with these rows (e.g. after
  // importing a CSV in the parent list) and the inline "Importar" button is
  // hidden — the import already happened.
  initialRows?: Labor[];
};

export default function LaborsCatalog({
  hideWorkspaceFilters = false,
  onCancel,
  initialRows,
}: LaborsCatalogProps = {}) {
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

  const seedRows = (): Labor[] => {
    if (initialRows && initialRows.length > 0) {
      return initialRows.map((row, idx) => ({ ...row, id: idx }));
    }
    return Array.from({ length: 5 }, (_, i) => emptyRow(i));
  };
  const initialSeedCount = initialRows && initialRows.length > 0 ? initialRows.length : 5;
  const nextIdRef = useRef(initialSeedCount);
  const [rows, setLabors] = useState<Labor[]>(() => seedRows());
  const hasImportedRows = Boolean(initialRows && initialRows.length > 0);

  const addRow = () => {
    const id = nextIdRef.current++;
    setLabors((prev) => [...prev, emptyRow(id)]);
  };

  const removeRow = (id: number) => {
    setLabors((prev) => {
      const next = prev.filter((row) => row.id !== id);
      if (next.length === 0) {
        const newId = nextIdRef.current++;
        return [emptyRow(newId)];
      }
      return next;
    });
  };

  // Per-cell validation. Returns an object keyed by row id whose value is a
  // record { fieldName: errorMessage } for cells that fail. A row that is
  // completely empty has no errors (it is treated as "not filled in" and
  // filtered out at save time, not as invalid).
  const rowErrors = useMemo<Record<number, Partial<Record<keyof Labor, string>>>>(() => {
    const out: Record<number, Partial<Record<keyof Labor, string>>> = {};
    rows.forEach((row) => {
      const isEmpty =
        !row.name.trim() &&
        !row.category &&
        !row.price.trim() &&
        !row.contractor.trim();
      if (isEmpty) return;
      const errors: Partial<Record<keyof Labor, string>> = {};
      if (!row.name.trim()) errors.name = "Falta el nombre.";
      if (!row.category) errors.category = "Elegí un rubro.";
      const priceNum = Number(row.price.replace(/,/g, "."));
      if (!row.price.trim() || Number.isNaN(priceNum) || priceNum <= 0) {
        errors.price = "Precio inválido.";
      }
      if (!row.contractor.trim()) errors.contractor = "Falta el contratista.";
      if (Object.keys(errors).length > 0) out[row.id] = errors;
    });
    return out;
  }, [rows]);

  const hasErrors = Object.keys(rowErrors).length > 0;

  useEffect(() => {
    getCategories(categoryTypeQuery(CATEGORY_TYPE_ID.LABORES));
  }, [getCategories]);

  useEffect(() => {
    if (projectId) {
      getLabors(projectId);
    }
  }, [projectId, getLabors]);

  const cleanForm = useCallback(() => {
    nextIdRef.current = 5;
    setLabors(Array.from({ length: 5 }, (_, i) => emptyRow(i)));
  }, []);

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
  }, [result, cleanForm]);

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

  const handleChange = (id: number, field: keyof Labor, value: string | boolean) => {
    setLabors((prev) =>
      prev.map((labor) =>
        labor.id === id ? { ...labor, [field]: value } : labor
      )
    );
  };

  const handleCreateLabors = () => {
    if (!projectId) {
      setErrorMessage(
        "Por favor, seleccione un proyecto y campaña antes de guardar."
      );
      return;
    }

    if (hasErrors) {
      setErrorMessage("Corregí las filas marcadas en rojo antes de guardar.");
      return;
    }

    setErrorMessage("");

    const laborsToSave: LaborToSave[] = rows
      .filter((row) => row.name && row.category && row.price && row.contractor)
      .map((row) => ({
        name: row.name,
        category_id: Number(row.category),
        price: row.price,
        contractor_name: row.contractor,
        is_partial_price: Boolean(row.is_partial_price),
      }));

    if (laborsToSave.length === 0) {
      setErrorMessage(
        "Por favor, ingrese al menos una labor antes de guardar."
      );
      return;
    }

    saveLabors(laborsToSave, projectId);
  };

  function loadNewLaborRows(newRows: Labor[], _warnings: string[]) {
    if (newRows.length === 0) return;
    // Append imported rows after any manually-filled rows. Drop the trailing
    // empty rows so the imported batch lands at the bottom of the existing
    // filled-in entries.
    setLabors((prev) => {
      const filled = prev.filter(
        (row) => row.name || row.category || row.price || row.contractor,
      );
      let cursor = nextIdRef.current;
      const renumbered = newRows.map((row) => {
        const id = cursor++;
        return { ...row, id };
      });
      nextIdRef.current = cursor;
      return [...filled, ...renumbered];
    });
    setErrorMessage("");
    setSuccessMessage(
      `Se importaron ${newRows.length} labores. Revisá las filas marcadas en rojo y presioná Guardar.`,
    );
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

    if (!isCsv) {
      setErrorMessage("Formato no soportado. Use .csv.");
      return;
    }

    try {
      const text = await file.text();
      const parsedRows = parseCsv(text);

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
      const duplicates: { existing: LaborInfo; updated: LaborInfo }[] = [];

      const laborByName = new Map(
        (labors || []).map((l) => [l.name.trim().toLowerCase(), l])
      );

      parsedRows.forEach((rawRow) => {
        const name = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.name).trim();
        const categoryRaw = getValueByAliases(
          rawRow,
          LABOR_HEADER_ALIASES.category
        ).trim();
        const priceRaw = getValueByAliases(rawRow, LABOR_HEADER_ALIASES.price).trim();
        const priceStatusRaw = getValueByAliases(
          rawRow,
          LABOR_HEADER_ALIASES.priceStatus
        ).trim();
        const contractor = getValueByAliases(
          rawRow,
          LABOR_HEADER_ALIASES.contractor
        ).trim();
        const parsedPartial = parsePartialPrice(priceStatusRaw);

        if (!name && !categoryRaw && !priceRaw && !contractor) return;

        const categoryByText = categoryByName.get(normalizeText(categoryRaw));
        const categoryId = categoryByText?.id ?? Number(categoryRaw);
        const priceValue = Number(priceRaw.replace(/\$/g, "").replace(",", "."));

        // Detect duplicates against existing labors (BE-side) and queue them
        // for the overwrite modal.
        const existing = name ? laborByName.get(name.trim().toLowerCase()) : null;
        if (existing) {
          const catName = categoryByText?.name ?? existing.category_name;
          duplicates.push({
            existing,
            updated: {
              ...existing,
              name,
              price:
                !Number.isNaN(priceValue) && priceValue > 0
                  ? String(priceValue)
                  : existing.price,
              category_id:
                categoryId && !Number.isNaN(categoryId)
                  ? categoryId
                  : existing.category_id,
              category_name: catName,
              contractor_name: contractor || existing.contractor_name,
              is_partial_price:
                parsedPartial.provided && parsedPartial.valid
                  ? parsedPartial.value
                  : Boolean(existing.is_partial_price),
            },
          });
          return;
        }

        // Everything else — even rows with bad/missing data — lands in the
        // editable form so the user can fix them inline before saving.
        importedRows.push({
          id: 0, // assigned by loadNewLaborRows
          name,
          category:
            categoryId && !Number.isNaN(categoryId) ? String(categoryId) : "",
          price:
            !Number.isNaN(priceValue) && priceValue > 0
              ? String(priceValue)
              : priceRaw,
          contractor,
          is_partial_price:
            parsedPartial.provided && parsedPartial.valid
              ? parsedPartial.value
              : false,
        });
      });

      // If there are duplicates, show modal to let user choose
      if (duplicates.length > 0) {
        setPendingImport({ newRows: importedRows, duplicates, warnings: [] });
        setImportModalOpen(true);
        return;
      }

      // No duplicates — load directly into form
      loadNewLaborRows(importedRows, []);

      if (importedRows.length === 0) {
        setErrorMessage("No se encontraron filas importables en el archivo.");
      }
    } catch {
      setErrorMessage("No se pudo leer el archivo. Use .csv.");
    }
  };

  const isEmbedded = hideWorkspaceFilters;

  return (
    <div className="w-full mx-auto">
      {!hideWorkspaceFilters && <AppFilterBar filters={filters} />}
      <div
        className={
          isEmbedded
            ? "w-full"
            : "w-full p-6 mt-4 bg-white rounded-lg shadow-md"
        }
      >
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
        <div className="flex items-center justify-between gap-3">
          {!isEmbedded && (
            <h1 className="text-custom-text font-semibold text-xl leading-none">
              Agregar labores
            </h1>
          )}
          <div className="ml-auto flex items-center gap-2">
            {!hasImportedRows && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={CSV_ACCEPT}
                  onChange={handleImportLaborsFromFile}
                  className="hidden"
                />
                <Button
                  variant="primary"
                  size="sm"
                  className="text-sm font-medium flex items-center gap-1"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Download className="h-4 w-4" />
                  Importar Labores
                </Button>
              </>
            )}
            {!isEmbedded && (
            <Button
              variant="primary"
              size="sm"
              className="text-sm font-medium flex items-center gap-1"
              href="/admin/database/labors/list"
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
              Ver Listado
            </Button>
            )}
          </div>
        </div>
        {processing ? (
          <LoadingOverlay show />
        ) : (
          <div className="mt-4">
            <div className="hidden sm:grid grid-cols-[1fr_1fr_0.5fr_0.45fr_1fr_auto] gap-4 mb-2">
              <span className="font-semibold">Labor</span>
              <span className="font-semibold">Rubro</span>
              <span className="font-semibold">Precio</span>
              <span className="font-semibold">Estado precio</span>
              <span className="font-semibold">Contratista</span>
              <span className="font-semibold sr-only">Acciones</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[1fr_1fr_0.5fr_0.45fr_1fr_auto] gap-4">
              {rows.map((row, index) => {
                const errors = rowErrors[row.id] ?? {};
                const errorClass = (field: keyof Labor) =>
                  errors[field] ? "border-red-500 bg-red-50" : "";
                return (
                  <div
                    key={row.id}
                    className="sm:contents border sm:border-0 p-4 sm:p-0 rounded-md sm:rounded-none mb-4 sm:mb-0 shadow-sm sm:shadow-none"
                  >
                    <div className="sm:col-span-1">
                      <label className="sm:hidden text-sm text-gray-600">Labor</label>
                      <InputField
                        label=""
                        name={`labor-${index}`}
                        value={row.name}
                        onChange={(e) => handleChange(row.id, "name", e.target.value)}
                        placeholder="nombre"
                        inputClassName={errorClass("name")}
                      />
                      {errors.name && (
                        <p className="text-xs text-red-600 mt-1">{errors.name}</p>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      <label className="sm:hidden text-sm text-gray-600">Rubro</label>
                      <SelectField
                        key={row.id}
                        label=""
                        name={`category-${index}`}
                        value={row.category.toString()}
                        onChange={(e) => handleChange(row.id, "category", e.target.value)}
                        options={categories}
                        className={errorClass("category")}
                      />
                      {errors.category && (
                        <p className="text-xs text-red-600 mt-1">{errors.category}</p>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      <label className="sm:hidden text-sm text-gray-600">Precio</label>
                      <InputField
                        label=""
                        name={`precio-${index}`}
                        value={row.price}
                        onChange={(e) => {
                          const value = e.target.value.replace(/,/g, ".");
                          if (/^\d*\.?\d{0,2}$/.test(value)) {
                            handleChange(row.id, "price", value);
                          }
                        }}
                        placeholder="u$s"
                        inputClassName={errorClass("price")}
                      />
                      {errors.price && (
                        <p className="text-xs text-red-600 mt-1">{errors.price}</p>
                      )}
                    </div>
                    <div className="sm:col-span-1">
                      <label className="sm:hidden text-sm text-gray-600">
                        Estado precio
                      </label>
                      <button
                        type="button"
                        aria-pressed={Boolean(row.is_partial_price)}
                        onClick={() =>
                          handleChange(row.id, "is_partial_price", !row.is_partial_price)
                        }
                        className={`input-base w-full px-3 py-2 text-sm font-medium transition-colors focus:ring-0 ${
                          row.is_partial_price
                            ? "border-blue-200 bg-blue-50 text-blue-700"
                            : "border-slate-200 bg-white text-slate-500"
                        }`}
                      >
                        Parcial
                      </button>
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
                          handleChange(row.id, "contractor", e.target.value)
                        }
                        placeholder="nombre"
                        inputClassName={errorClass("contractor")}
                      />
                      {errors.contractor && (
                        <p className="text-xs text-red-600 mt-1">{errors.contractor}</p>
                      )}
                    </div>
                    <div className="sm:col-span-1 flex items-start justify-center pt-2">
                      <button
                        type="button"
                        aria-label="Quitar fila"
                        onClick={() => removeRow(row.id)}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              type="button"
              onClick={addRow}
              className="mt-4 flex items-center gap-1 text-sm font-medium text-primary-700 hover:text-primary-800"
            >
              <Plus className="h-4 w-4" />
              Agregar fila
            </button>
          </div>
        )}
      </div>
      <div className="flex justify-between flex-wrap gap-4 my-4">
        <div />
        <div className="flex gap-4 my-2 justify-end">
          <Button
            variant="secondary"
            className="text-base font-medium"
            onClick={onCancel ?? cleanForm}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleCreateLabors}
            variant="primary"
            className="text-base font-medium"
            disabled={processing || hasErrors}
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
        primaryButtonText={overwriting ? "Actualizando..." : "Sobreescribir Existentes"}
        primaryButtonColor="bg-blue-600 hover:bg-blue-700 focus:ring-blue-300"
        onPrimaryAction={handleOverwrite}
        secondaryButtonText="Solo Nuevos"
        onSecondaryAction={handleSkipDuplicates}
        isSaving={overwriting}
      />
    </div>
  );
}
