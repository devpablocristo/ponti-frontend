import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import Button from "../../../components/Button/Button";
import Drawer from "../../../components/Drawer/Drawer";
import useProjects from "../../../hooks/useDatabase/projects";
import useProviders from "../../../hooks/useProviders";
import useSupplies from "../../../hooks/useSupplies";
import useSupplyMovements from "../../../hooks/useSupplyMovement";
import { replaceSupplyIdsWithNames } from "../utils";
import {
  normalizeText,
  parseCsv,
  parseImportDate,
  toCanonicalMovementType,
  normalizeSpreadsheetRow,
  getValueByAliases,
  MAX_IMPORT_FILE_SIZE_MB,
} from "./importUtils";

const HEADER_ALIASES = {
  movementType: ["ingreso", "tipo_ingreso", "movement_type"],
  date: ["fecha", "date"],
  referenceNumber: [
    "remito",
    "numero",
    "nro",
    "n_remito",
    "nro_remito",
    "numero_remito",
    "numero_nombre",
    "numero_o_nombre",
    "nombre",
  ],
  provider: ["proveedor", "provider"],
  investor: ["inversor", "investor"],
  supply: ["insumo", "producto", "item"],
  quantity: ["cantidad", "qty", "cantidad_unidades"],
} as const;

const ALLOWED_MOVEMENT_TYPES = new Set([
  "Stock",
  "Movimiento interno",
  "Remito oficial",
]);

type PreviewRow = {
  rowIndex: number;
  movementType: string;
  movementDate: string;
  referenceNumber: string;
  providerName: string;
  investorName: string;
  supplyName: string;
  quantity: string;
  providerId?: number;
  investorId?: number;
  supplyId?: number;
  errors: string[];
};

export default function ImportSupplyMovements({
  open,
  file,
  projectId,
  onClose,
  onImported,
}: {
  open: boolean;
  file: File | null;
  projectId: number;
  onClose: () => void;
  onImported: (message: string) => void;
}) {
  const { getProject, selectedProject } = useProjects();
  const { getProviders, providers } = useProviders();
  const { getSupplies, supplies } = useSupplies();
  const {
    saveImportedSupplyMovement,
    resultCreation,
    errorCreation,
    errorCreationPayload,
    processingCreation,
  } = useSupplyMovements();

  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedFileKey, setParsedFileKey] = useState<string>("");
  const [lookupReady, setLookupReady] = useState(false);
  const [importAttempted, setImportAttempted] = useState(false);

  const investors = useMemo(
    () =>
      selectedProject?.investors
        ?.filter((entry) => entry.id !== null)
        .map((entry) => ({ id: entry.id!, name: entry.name })) ?? [],
    [selectedProject]
  );

  const fileKey = file
    ? `${file.name}:${file.lastModified}:${file.size}:${projectId}`
    : "";

  useEffect(() => {
    if (!open || !projectId) return;

    let cancelled = false;

    const loadLookups = async () => {
      setLookupReady(false);
      try {
        await Promise.all([
          getProject(projectId),
          getProviders(""),
          getSupplies(projectId),
        ]);
      } finally {
        if (!cancelled) {
          setLookupReady(true);
        }
      }
    };

    loadLookups();

    return () => {
      cancelled = true;
    };
  }, [open, projectId, getProject, getProviders, getSupplies]);

  useEffect(() => {
    if (!open) {
      setPreviewRows([]);
      setParseError(null);
      setParsedFileKey("");
      setLookupReady(false);
      setImportAttempted(false);
    }
  }, [open]);

  useEffect(() => {
    if (
      !open ||
      !file ||
      !lookupReady ||
      parsedFileKey === fileKey
    ) {
      return;
    }

    let cancelled = false;

    const parseFile = async () => {
      setParseError(null);

      if (file.size > MAX_IMPORT_FILE_SIZE_MB * 1024 * 1024) {
        if (!cancelled) {
          setPreviewRows([]);
          setParseError(`El archivo excede el límite de ${MAX_IMPORT_FILE_SIZE_MB}MB.`);
          setParsedFileKey(fileKey);
        }
        return;
      }

      const lowerName = file.name.toLowerCase();
      const isCsv = lowerName.endsWith(".csv") || file.type.includes("csv");
      const isExcel = lowerName.endsWith(".xlsx") || lowerName.endsWith(".xls");

      if (!isCsv && !isExcel) {
        if (!cancelled) {
          setPreviewRows([]);
          setParseError("Formato no soportado. Use .xlsx, .xls o .csv.");
          setParsedFileKey(fileKey);
        }
        return;
      }

      try {
        let parsedRows: Record<string, string>[] = [];

        if (isCsv) {
          parsedRows = parseCsv(await file.text());
        } else {
          const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
          const sheetNames = workbook.SheetNames || [];
          const preferredSheetNames = [
            ...sheetNames.filter((name) => normalizeText(name).includes("insumo")),
            ...sheetNames.filter((name) => normalizeText(name).includes("remito")),
            ...sheetNames,
          ].filter((name, index, arr) => arr.indexOf(name) === index);

          for (const sheetName of preferredSheetNames) {
            const sheet = workbook.Sheets[sheetName];
            if (!sheet) continue;
            const candidate = XLSX.utils
              .sheet_to_json<Record<string, unknown>>(sheet, {
                defval: "",
                raw: false,
                dateNF: "yyyy-mm-dd",
              })
              .map(normalizeSpreadsheetRow);

            if (candidate.length > 0) {
              parsedRows = candidate;
              break;
            }
          }
        }

        if (parsedRows.length === 0) {
          if (!cancelled) {
            setPreviewRows([]);
            setParseError(
              "El archivo no tiene datos válidos. Verifique encabezados y filas."
            );
            setParsedFileKey(fileKey);
          }
          return;
        }

        const providerByName = new Map(
          providers.map((entry) => [normalizeText(entry.name), entry])
        );
        const investorByName = new Map(
          investors.map((entry) => [normalizeText(entry.name), entry])
        );
        const supplyByName = new Map(
          supplies.map((entry) => [normalizeText(entry.name), entry])
        );

        const duplicateRowsByKey = new Map<string, number>();
        const nextRows: PreviewRow[] = [];

        parsedRows.forEach((rawRow, index) => {
          const rowIndex = index + 2;
          const rawMovementType = getValueByAliases(
            rawRow,
            HEADER_ALIASES.movementType
          ).trim();
          const rawDate = getValueByAliases(rawRow, HEADER_ALIASES.date).trim();
          const rawReferenceNumber = getValueByAliases(
            rawRow,
            HEADER_ALIASES.referenceNumber
          ).trim();
          const rawProvider = getValueByAliases(
            rawRow,
            HEADER_ALIASES.provider
          ).trim();
          const rawInvestor = getValueByAliases(
            rawRow,
            HEADER_ALIASES.investor
          ).trim();
          const rawSupply = getValueByAliases(rawRow, HEADER_ALIASES.supply).trim();
          const rawQuantity = getValueByAliases(
            rawRow,
            HEADER_ALIASES.quantity
          ).trim();

          if (
            !rawMovementType &&
            !rawDate &&
            !rawReferenceNumber &&
            !rawProvider &&
            !rawInvestor &&
            !rawSupply &&
            !rawQuantity
          ) {
            return;
          }

          const errors: string[] = [];
          const canonicalMovementType = rawMovementType
            ? toCanonicalMovementType(rawMovementType)
            : "Remito oficial";
          const movementType = canonicalMovementType ?? rawMovementType;
          const movementDate = parseImportDate(rawDate);
          const provider = providerByName.get(normalizeText(rawProvider));
          const investor = investorByName.get(normalizeText(rawInvestor));
          const supply = supplyByName.get(normalizeText(rawSupply));
          const normalizedQuantity = rawQuantity.replace(/,/g, ".");
          const quantity = Number(normalizedQuantity);

          if (!canonicalMovementType || !ALLOWED_MOVEMENT_TYPES.has(canonicalMovementType)) {
            errors.push(`Fila ${rowIndex}: ingreso inválido "${movementType}".`);
          }

          if (!movementDate) {
            errors.push(`Fila ${rowIndex}: falta una fecha válida.`);
          }

          if (!rawReferenceNumber) {
            errors.push(`Fila ${rowIndex}: falta el número/nombre de remito.`);
          }

          if (!rawProvider) {
            errors.push(`Fila ${rowIndex}: falta el proveedor.`);
          } else if (!provider) {
            errors.push(`Fila ${rowIndex}: el proveedor "${rawProvider}" no existe.`);
          }

          if (!rawInvestor) {
            errors.push(`Fila ${rowIndex}: falta el inversor.`);
          } else if (!investor) {
            errors.push(
              `Fila ${rowIndex}: el inversor "${rawInvestor}" no existe en el proyecto.`
            );
          }

          if (!rawSupply) {
            errors.push(`Fila ${rowIndex}: falta el insumo.`);
          } else if (!supply) {
            errors.push(
              `Fila ${rowIndex}: el insumo "${rawSupply}" no existe en el proyecto.`
            );
          }

          if (
            !rawQuantity ||
            Number.isNaN(quantity) ||
            quantity <= 0 ||
            !/^\d*\.?\d+$/.test(normalizedQuantity)
          ) {
            errors.push(
              `Fila ${rowIndex}: la cantidad debe ser numérica y mayor a 0.`
            );
          }

          if (rawReferenceNumber && supply) {
            const duplicateKey = `${normalizeText(rawReferenceNumber)}::${supply.id}`;
            const firstIndex = duplicateRowsByKey.get(duplicateKey);
            if (firstIndex !== undefined) {
              const duplicateMessage = `Fila ${rowIndex}: el remito "${rawReferenceNumber}" repite el insumo "${supply.name}".`;
              errors.push(duplicateMessage);
              nextRows[firstIndex].errors.push(
                `Fila ${nextRows[firstIndex].rowIndex}: el remito "${rawReferenceNumber}" repite el insumo "${supply.name}".`
              );
            } else {
              duplicateRowsByKey.set(duplicateKey, nextRows.length);
            }
          }

          nextRows.push({
            rowIndex,
            movementType,
            movementDate,
            referenceNumber: rawReferenceNumber,
            providerName: rawProvider,
            investorName: rawInvestor,
            supplyName: rawSupply,
            quantity: normalizedQuantity,
            providerId: provider?.id,
            investorId: investor?.id,
            supplyId: supply?.id,
            errors,
          });
        });

        if (!cancelled) {
          setPreviewRows(nextRows);
          setParsedFileKey(fileKey);
        }
      } catch {
        if (!cancelled) {
          setPreviewRows([]);
          setParseError("No se pudo leer el archivo. Use .xlsx, .xls o .csv válidos.");
          setParsedFileKey(fileKey);
        }
      }
    };

    parseFile();

    return () => {
      cancelled = true;
    };
  }, [open, file, fileKey, parsedFileKey, lookupReady, providers, investors, supplies]);

  const rowErrors = useMemo(
    () => previewRows.flatMap((row) => row.errors),
    [previewRows]
  );

  const displayError = useMemo(() => {
    if (parseError) return parseError;
    if (!errorCreation) return null;
    return replaceSupplyIdsWithNames(
      typeof errorCreationPayload?.error?.details === "string"
        ? errorCreationPayload.error.details
        : errorCreation,
      supplies
    );
  }, [parseError, errorCreation, errorCreationPayload, supplies]);

  const displayErrorLines = useMemo(() => {
    if (!displayError) return [];

    const rowBasedMatches = displayError.match(
      /Fila\s+\d+:[\s\S]*?(?=Fila\s+\d+:|$)/g
    );

    if (rowBasedMatches && rowBasedMatches.length > 0) {
      return rowBasedMatches.map((line) => line.trim()).filter(Boolean);
    }

    return displayError
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }, [displayError]);

  useEffect(() => {
    if (!open || !importAttempted) return;

    const importedMovements = resultCreation.supply_movements;
    if (!importedMovements.length) return;

    const hasErrors = importedMovements.some(
      (movement) => movement.error_detail !== ""
    );
    setImportAttempted(false);

    if (hasErrors) return;

    onImported(
      `Se importaron ${importedMovements.length} movimiento${
        importedMovements.length !== 1 ? "s" : ""
      } con éxito.`
    );
  }, [open, importAttempted, resultCreation, onImported]);

  const handleImport = () => {
    if (previewRows.length === 0 || rowErrors.length > 0) return;

    setImportAttempted(true);
    saveImportedSupplyMovement(projectId, {
      mode: "strict",
      items: previewRows.map((row) => ({
        movement_type: row.movementType,
        movement_date: new Date(row.movementDate),
        reference_number: row.referenceNumber,
        project_destination_id: 0,
        supply_id: row.supplyId || 0,
        investor_id: row.investorId || 0,
        quantity: Number(row.quantity),
        provider: {
          id: row.providerId || 0,
          name: row.providerName,
        },
      })),
    });
  };

  return (
    <Drawer open={open} onClose={onClose} maxWidth="max-w-6xl">
      <div className="flex flex-col h-full">
        <div className="mb-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Importar insumos
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            El archivo puede contener multiples remitos, fechas, proveedores e
            inversores. La importacion se guarda de forma atomica.
          </p>
          {file && (
            <p className="mt-2 text-sm font-medium text-gray-700">
              Archivo: {file.name}
            </p>
          )}
        </div>

        {displayError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span className="font-semibold">Error:</span>
            <div className="mt-1 space-y-1">
              {displayErrorLines.map((line, index) => (
                <p key={`${line}-${index}`}>{line}</p>
              ))}
            </div>
          </div>
        )}

        {rowErrors.length > 0 && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <span className="font-semibold">
              Se detectaron {rowErrors.length} error
              {rowErrors.length !== 1 ? "es" : ""} antes de guardar:
            </span>
            <ul className="mt-2 list-disc pl-5">
              {rowErrors.slice(0, 10).map((rowError, index) => (
                <li key={`${rowError}-${index}`}>{rowError}</li>
              ))}
            </ul>
            {rowErrors.length > 10 && (
              <p className="mt-2">
                Y {rowErrors.length - 10} error
                {rowErrors.length - 10 !== 1 ? "es" : ""} mas.
              </p>
            )}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="sticky top-0 bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Fila
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Ingreso
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Fecha
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Remito
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Proveedor
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Inversor
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Insumo
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Cantidad
                </th>
                <th className="px-3 py-3 text-left font-semibold text-gray-700">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {previewRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    No hay filas importadas para previsualizar.
                  </td>
                </tr>
              ) : (
                previewRows.map((row) => (
                  <tr key={`${row.rowIndex}-${row.referenceNumber}-${row.supplyName}`}>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.rowIndex}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.movementType}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.movementDate || "—"}
                    </td>
                    <td className="px-3 py-3 align-top font-medium text-gray-900">
                      {row.referenceNumber || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.providerName || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.investorName || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.supplyName || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.quantity || "—"}
                    </td>
                    <td className="px-3 py-3 align-top">
                      {row.errors.length > 0 ? (
                        <div className="space-y-1">
                          {row.errors.map((error) => (
                            <p key={error} className="text-xs text-red-700">
                              {replaceSupplyIdsWithNames(error, supplies)}
                            </p>
                          ))}
                        </div>
                      ) : (
                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                          Lista para importar
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <Button variant="primary" onClick={onClose} disabled={processingCreation}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={
              processingCreation || previewRows.length === 0 || rowErrors.length > 0
            }
          >
            {processingCreation ? "Importando..." : "Confirmar importacion"}
          </Button>
        </div>
      </div>
    </Drawer>
  );
}
