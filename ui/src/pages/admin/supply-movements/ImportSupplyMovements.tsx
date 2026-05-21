import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { DrawerFormActions } from "../../../components/Drawer/DrawerFormActions";
import { DrawerShell } from "../../../components/Drawer/DrawerShell";
import { Checkbox } from "../../../components/Input/Checkbox";
import useProjects from "../../../hooks/useDatabase/projects";
import useProviders from "../../../hooks/useProviders";
import useSupplies from "../../../hooks/useSupplies";
import useSupplyMovements from "../../../hooks/useSupplyMovements";
import { apiClient } from "@/api/client";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { replaceSupplyIdsWithNames } from "../utils";
import {
  normalizeText,
  parseCsv,
  parseImportDate,
  toCanonicalMovementType,
  getValueByAliases,
  MAX_IMPORT_FILE_SIZE_MB,
} from "./importUtils";
import { SuccessResponse } from "@/api/types";

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

  // Movimiento interno (destino)
  destinationCustomer: [
    "cliente_destino",
    "cliente destino",
    "customer_destino",
    "customer_destination",
    "destino_cliente",
  ],
  destinationProject: [
    "proyecto_destino",
    "proyecto destino",
    "project_destino",
    "project_destination",
    "destino_proyecto",
  ],
  destinationCampaign: [
    "campana_destino",
    "campaña_destino",
    "campana destino",
    "campaña destino",
    "campaign_destino",
    "campaign_destination",
    "destino_campana",
    "destino_campaña",
  ],

  // Opcional: solo para validar contra el proyecto activo
  originProject: ["proyecto_origen", "proyecto origen", "project_origin", "origen_proyecto"],
} as const;

const ALLOWED_MOVEMENT_TYPES = new Set(["Stock", "Movimiento interno", "Remito oficial"]);

type PreviewRow = {
  rowIndex: number;
  movementType: string;
  movementDate: string;
  referenceNumber: string;
  providerName: string;
  investorName: string;
  supplyName: string;
  quantity: string;

  originProjectName?: string;
  destinationCustomerName?: string;
  destinationProjectName?: string;
  destinationCampaignName?: string;

  providerId?: number;
  investorId?: number;
  supplyId?: number;
  destinationCustomerId?: number;
  destinationProjectId?: number;
  destinationCampaignId?: number;

  // `existing: true` cuando el remito + insumo (+ proyecto destino si es
  // movimiento interno) ya existe en el proyecto. El importador de archivos
  // nunca actualiza datos repetidos — la fila se marca amarilla, el checkbox
  // queda deshabilitado y no se envía en el submit.
  existing: boolean;
  errors: string[];
};

type Filter = "all" | "ok" | "errors" | "existing";

function statusOf(row: PreviewRow): "ok" | "error" | "existing" {
  if (row.existing) return "existing";
  if (row.errors.length > 0) return "error";
  return "ok";
}

// Entry shape mínima del BFF `/supply_movements/:projectId` para detectar
// duplicados. No tipamos todos los campos — solo los que importan para el
// match key.
type ExistingMovementEntry = {
  reference_number?: string;
  supply_name?: string;
  entry_type?: string;
  destination_project_id?: number | null;
};

type CustomerOption = {
  id: number;
  name: string;
};

type ProjectOption = {
  id: number;
  name: string;
};

type CampaignOption = {
  id: number;
  name: string;
  project_id?: number;
};

type ApiCollectionResponse<T> =
  | T[]
  | SuccessResponse<T[]>
  | {
      data?: T[] | SuccessResponse<T[]>;
    };

function extractCollection<T>(payload: ApiCollectionResponse<T> | undefined): T[] {
  if (!payload) return [];
  if (Array.isArray(payload)) return payload;

  const firstLevel = payload.data;
  if (Array.isArray(firstLevel)) return firstLevel;
  if (firstLevel && Array.isArray(firstLevel.data)) return firstLevel.data;

  return [];
}

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

  // Set de keys de movimientos ya existentes en el proyecto. Se fetcheó
  // directo del BFF (sin pasar por el hook de listing) para no pisar el
  // estado de la página `/admin/supply-movements`.
  const [existingKeys, setExistingKeys] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<Record<number, boolean>>({});
  const [filter, setFilter] = useState<Filter>("all");

  const investors = useMemo(
    () =>
      selectedProject?.investors
        ?.filter((entry) => entry.id !== null)
        .map((entry) => ({ id: entry.id!, name: entry.name })) ?? [],
    [selectedProject]
  );

  const fileKey = file ? `${file.name}:${file.lastModified}:${file.size}:${projectId}` : "";

  useEffect(() => {
    if (!open || !projectId) return;

    let cancelled = false;

    // Fetch directo al BFF (sin pasar por `useSupplyMovements.getSupplyMovements`
    // para no pisar el estado de la página listadora).
    const fetchExistingMovements = async (): Promise<ExistingMovementEntry[]> => {
      try {
        const body = await apiClient.get<{
          success?: boolean;
          data?: { entries?: ExistingMovementEntry[] };
        }>(`/supply_movements/${projectId}`);
        return body?.data?.entries ?? [];
      } catch {
        return [];
      }
    };

    const loadLookups = async () => {
      setLookupReady(false);
      try {
        const [, , , existing] = await Promise.all([
          getProject(projectId),
          getProviders(""),
          getSupplies(projectId),
          fetchExistingMovements(),
        ]);

        if (!cancelled) {
          // Misma clave de dedup que usamos dentro del CSV en el parser:
          //   - movimientos internos: ref+supply+destination_project_id
          //   - resto: ref+supply
          // Se compara contra los entries existentes del BE (entry_type es
          // el equivalente al movement_type canonical).
          const next = new Set<string>();
          for (const e of existing) {
            const ref = e.reference_number ?? "";
            const supply = e.supply_name ?? "";
            if (!ref || !supply) continue;
            const refKey = normalizeText(ref);
            const supplyKey = normalizeText(supply);
            const isInternal = (e.entry_type ?? "") === "Movimiento interno";
            const key = isInternal
              ? `${refKey}::${supplyKey}::${e.destination_project_id ?? 0}`
              : `${refKey}::${supplyKey}`;
            next.add(key);
          }
          setExistingKeys(next);
        }
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
      setExistingKeys(new Set());
      setSelected({});
      setFilter("all");
    }
  }, [open]);

  useEffect(() => {
    if (!open || !file || !lookupReady || parsedFileKey === fileKey) {
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

      if (!isCsv) {
        if (!cancelled) {
          setPreviewRows([]);
          setParseError("Formato no soportado. Use .csv.");
          setParsedFileKey(fileKey);
        }
        return;
      }

      try {
        const parsedRows = parseCsv(await file.text());

        if (parsedRows.length === 0) {
          if (!cancelled) {
            setPreviewRows([]);
            setParseError("El archivo no tiene datos válidos. Verifique encabezados y filas.");
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
        const supplyByName = new Map(supplies.map((entry) => [normalizeText(entry.name), entry]));

        const customerByName = new Map<string, CustomerOption>();
        const projectsByCustomerId = new Map<number, ProjectOption[]>();
        const campaignsByCustomerAndProject = new Map<string, CampaignOption[]>();

        const customersResponse =
          await apiClient.get<ApiCollectionResponse<CustomerOption>>("/customers?limit=1000");
        const customers = extractCollection(customersResponse);

        customers.forEach((customer) => {
          if (customer?.id != null && customer?.name) {
            customerByName.set(normalizeText(customer.name), {
              id: Number(customer.id),
              name: String(customer.name),
            });
          }
        });

        const rawInternalDestinationCustomers = new Set<string>();
        parsedRows.forEach((rawRow) => {
          const rawMovementType = getValueByAliases(rawRow, HEADER_ALIASES.movementType).trim();
          const canonicalMovementType = rawMovementType
            ? toCanonicalMovementType(rawMovementType)
            : "Remito oficial";
          if (canonicalMovementType !== "Movimiento interno") return;

          const customerName = getValueByAliases(rawRow, HEADER_ALIASES.destinationCustomer).trim();
          if (customerName) {
            rawInternalDestinationCustomers.add(normalizeText(customerName));
          }
        });

        for (const normalizedCustomerName of rawInternalDestinationCustomers) {
          const customer = customerByName.get(normalizedCustomerName);
          if (!customer) continue;

          const projectsResponse = await apiClient.get<ApiCollectionResponse<ProjectOption>>(
            `/projects/customers/${customer.id}?limit=1000`
          );
          const projects = extractCollection(projectsResponse);
          projectsByCustomerId.set(customer.id, projects);

          for (const project of projects) {
            if (!project?.name) continue;
            const campaignsResponse = await apiClient.get<ApiCollectionResponse<CampaignOption>>(
              `/campaigns?customer_id=${customer.id}&project_name=${encodeURIComponent(
                project.name
              )}&limit=1000`
            );
            const campaigns = extractCollection(campaignsResponse);
            campaignsByCustomerAndProject.set(
              `${customer.id}::${normalizeText(project.name)}`,
              campaigns
            );
          }
        }

        const duplicateRowsByKey = new Map<string, number>();
        const nextRows: PreviewRow[] = [];

        parsedRows.forEach((rawRow, index) => {
          const rowIndex = index + 2;
          const rawMovementType = getValueByAliases(rawRow, HEADER_ALIASES.movementType).trim();
          const rawDate = getValueByAliases(rawRow, HEADER_ALIASES.date).trim();
          const rawReferenceNumber = getValueByAliases(
            rawRow,
            HEADER_ALIASES.referenceNumber
          ).trim();
          const rawProvider = getValueByAliases(rawRow, HEADER_ALIASES.provider).trim();
          const rawInvestor = getValueByAliases(rawRow, HEADER_ALIASES.investor).trim();
          const rawSupply = getValueByAliases(rawRow, HEADER_ALIASES.supply).trim();
          const rawQuantity = getValueByAliases(rawRow, HEADER_ALIASES.quantity).trim();

          const rawOriginProject = getValueByAliases(rawRow, HEADER_ALIASES.originProject).trim();

          const rawDestinationCustomer = getValueByAliases(
            rawRow,
            HEADER_ALIASES.destinationCustomer
          ).trim();

          const rawDestinationProject = getValueByAliases(
            rawRow,
            HEADER_ALIASES.destinationProject
          ).trim();

          const rawDestinationCampaign = getValueByAliases(
            rawRow,
            HEADER_ALIASES.destinationCampaign
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
          let destinationCustomerId: number | undefined;
          let destinationProjectId: number | undefined;
          let destinationCampaignId: number | undefined;

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
            errors.push(`Fila ${rowIndex}: el inversor "${rawInvestor}" no existe en el proyecto.`);
          }

          if (!rawSupply) {
            errors.push(`Fila ${rowIndex}: falta el insumo.`);
          } else if (!supply) {
            errors.push(`Fila ${rowIndex}: el insumo "${rawSupply}" no existe en el proyecto.`);
          }

          if (
            !rawQuantity ||
            Number.isNaN(quantity) ||
            quantity <= 0 ||
            !/^\d*\.?\d+$/.test(normalizedQuantity)
          ) {
            errors.push(`Fila ${rowIndex}: la cantidad debe ser numérica y mayor a 0.`);
          }

          if (movementType === "Movimiento interno") {
            if (rawOriginProject) {
              const currentOriginName = selectedProject?.name ?? "";
              if (
                !currentOriginName ||
                normalizeText(rawOriginProject) !== normalizeText(currentOriginName)
              ) {
                errors.push(
                  `Fila ${rowIndex}: el proyecto origen "${rawOriginProject}" no coincide con el proyecto activo.`
                );
              }
            }

            if (!rawDestinationCustomer) {
              errors.push(`Fila ${rowIndex}: falta cliente destino.`);
            } else {
              const customer = customerByName.get(normalizeText(rawDestinationCustomer));
              if (!customer) {
                errors.push(
                  `Fila ${rowIndex}: el cliente destino "${rawDestinationCustomer}" no existe.`
                );
              } else {
                destinationCustomerId = customer.id;
              }
            }

            if (!rawDestinationProject) {
              errors.push(`Fila ${rowIndex}: falta proyecto destino.`);
            }

            if (!rawDestinationCampaign) {
              errors.push(`Fila ${rowIndex}: falta campaña destino.`);
            }

            if (destinationCustomerId && rawDestinationProject && rawDestinationCampaign) {
              const destinationProjects = projectsByCustomerId.get(destinationCustomerId) ?? [];
              const matchedProject = destinationProjects.find(
                (entry) => normalizeText(entry.name) === normalizeText(rawDestinationProject)
              );

              if (!matchedProject) {
                errors.push(
                  `Fila ${rowIndex}: el proyecto destino "${rawDestinationProject}" no existe para el cliente "${rawDestinationCustomer}".`
                );
              } else {
                destinationProjectId = matchedProject.id;
                const campaignKey = `${destinationCustomerId}::${normalizeText(
                  matchedProject.name
                )}`;
                const campaigns = campaignsByCustomerAndProject.get(campaignKey) ?? [];
                const matchedCampaign = campaigns.find(
                  (entry) => normalizeText(entry.name) === normalizeText(rawDestinationCampaign)
                );

                if (!matchedCampaign) {
                  errors.push(
                    `Fila ${rowIndex}: la campaña destino "${rawDestinationCampaign}" no coincide con el cliente/proyecto destino.`
                  );
                } else {
                  destinationCampaignId = matchedCampaign.id;
                }
              }
            }

            if (destinationProjectId && destinationProjectId === projectId) {
              errors.push(
                `Fila ${rowIndex}: el proyecto destino no puede ser igual al proyecto origen.`
              );
            }
          }

          // Dedup contra DB y dentro del CSV. Si el remito+insumo ya existe
          // en el proyecto (o aparece en una fila anterior del mismo CSV),
          // marcamos esta fila como `existing` → amarilla, checkbox bloqueado.
          // Regla del producto: el importador de archivos nunca actualiza.
          let isExisting = false;
          if (rawReferenceNumber && supply) {
            const refKey = normalizeText(rawReferenceNumber);
            const supplyKey = normalizeText(supply.name);
            const dbKey =
              movementType === "Movimiento interno"
                ? `${refKey}::${supplyKey}::${destinationProjectId ?? 0}`
                : `${refKey}::${supplyKey}`;

            if (existingKeys.has(dbKey)) {
              isExisting = true;
            }

            const duplicateKey =
              movementType === "Movimiento interno"
                ? `${refKey}::${supply.id}::${destinationProjectId ?? 0}`
                : `${refKey}::${supply.id}`;
            const firstIndex = duplicateRowsByKey.get(duplicateKey);
            if (firstIndex !== undefined) {
              // Duplicado dentro del CSV: la primera fila se queda, las
              // siguientes se marcan amarillas también — solo una pasa.
              isExisting = true;
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
            originProjectName: rawOriginProject,
            destinationCustomerName: rawDestinationCustomer,
            destinationProjectName: rawDestinationProject,
            destinationCampaignName: rawDestinationCampaign,
            destinationCustomerId,
            destinationProjectId,
            destinationCampaignId,

            existing: isExisting,
            errors,
          });
        });

        if (!cancelled) {
          setPreviewRows(nextRows);
          // Pre-tildamos solo las filas OK. Errores y duplicadas quedan
          // destildadas; las duplicadas además tienen checkbox deshabilitado.
          const initialSel: Record<number, boolean> = {};
          for (const r of nextRows) initialSel[r.rowIndex] = statusOf(r) === "ok";
          setSelected(initialSel);
          setParsedFileKey(fileKey);
        }
      } catch {
        if (!cancelled) {
          setPreviewRows([]);
          setParseError("No se pudo leer el archivo. Use .csv válido.");
          setParsedFileKey(fileKey);
        }
      }
    };

    parseFile();

    return () => {
      cancelled = true;
    };
  }, [
    open,
    file,
    fileKey,
    parsedFileKey,
    lookupReady,
    providers,
    investors,
    supplies,
    selectedProject,
    projectId,
    existingKeys,
  ]);

  const counts = useMemo(() => {
    let ok = 0;
    let errs = 0;
    let existing = 0;
    for (const r of previewRows) {
      const s = statusOf(r);
      if (s === "ok") ok += 1;
      else if (s === "error") errs += 1;
      else existing += 1;
    }
    return { ok, errs, existing, total: previewRows.length };
  }, [previewRows]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return previewRows;
    return previewRows.filter(
      (r) => statusOf(r) === (filter === "errors" ? "error" : filter),
    );
  }, [filter, previewRows]);

  const selectedCount = useMemo(
    () => previewRows.filter((r) => selected[r.rowIndex]).length,
    [previewRows, selected],
  );

  const toggleRow = (rowIndex: number) => {
    setSelected((prev) => ({ ...prev, [rowIndex]: !prev[rowIndex] }));
  };

  const toggleAllFiltered = () => {
    const toggleable = filteredRows.filter((r) => !r.existing);
    if (toggleable.length === 0) return;
    const allOn = toggleable.every((r) => selected[r.rowIndex]);
    setSelected((prev) => {
      const next = { ...prev };
      for (const r of toggleable) next[r.rowIndex] = !allOn;
      return next;
    });
  };

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

    const rowBasedMatches = displayError.match(/Fila\s+\d+:[\s\S]*?(?=Fila\s+\d+:|$)/g);

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

    const hasErrors = importedMovements.some((movement) => movement.error_detail !== "");
    setImportAttempted(false);

    if (hasErrors) return;

    onImported(
      `Se importaron ${importedMovements.length} movimiento${
        importedMovements.length !== 1 ? "s" : ""
      } con éxito.`
    );
  }, [open, importAttempted, resultCreation, onImported]);

  const handleImport = () => {
    // Solo filas seleccionadas. Regla del producto: las filas `existing`
    // nunca se mandan (red de seguridad — el checkbox ya está deshabilitado).
    const toSubmit = previewRows.filter(
      (r) => selected[r.rowIndex] && !r.existing && r.errors.length === 0,
    );
    if (toSubmit.length === 0) return;

    setImportAttempted(true);
    saveImportedSupplyMovement(projectId, {
      mode: "strict",
      items: toSubmit.map((row) => ({
        movement_type: row.movementType,
        movement_date: new Date(row.movementDate),
        reference_number: row.referenceNumber,
        project_destination_id:
          row.movementType === "Movimiento interno" ? row.destinationProjectId || 0 : 0,
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
    <DrawerShell
      open={open}
      onClose={onClose}
      title="Importar Insumos"
      subtitle={
        <>
          El archivo puede contener multiples remitos, fechas, proveedores e inversores. La
          importacion se guarda de forma atomica.
          {file ? (
            <span className="mt-2 block font-medium text-slate-700">Archivo: {file.name}</span>
          ) : null}
        </>
      }
      footer={
        <DrawerFormActions
          cancelLabel="Cancelar"
          submitLabel={
            processingCreation
              ? "Importando..."
              : `Importar ${selectedCount} movimientos`
          }
          onCancel={onClose}
          onSubmit={handleImport}
          disabled={processingCreation || selectedCount === 0}
        />
      }
    >
      {displayError && (
        <ErrorBanner>
          <span className="font-semibold">Error:</span>
          <div className="mt-1 space-y-1">
            {displayErrorLines.map((line, index) => (
              <p key={`${line}-${index}`}>{line}</p>
            ))}
          </div>
        </ErrorBanner>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <FilterChip
          label={`Todas (${counts.total})`}
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <FilterChip
          label={`Listas (${counts.ok})`}
          active={filter === "ok"}
          tone="green"
          onClick={() => setFilter("ok")}
        />
        <FilterChip
          label={`Errores (${counts.errs})`}
          active={filter === "errors"}
          tone="red"
          onClick={() => setFilter("errors")}
        />
        <FilterChip
          label={`Ya existen (${counts.existing})`}
          active={filter === "existing"}
          tone="yellow"
          onClick={() => setFilter("existing")}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-lg border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200 text-sm">
          <thead className="sticky top-0 bg-gray-50">
            <tr>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">
                {(() => {
                  const toggleable = filteredRows.filter((r) => !r.existing);
                  return (
                    <Checkbox
                      checked={
                        toggleable.length > 0 &&
                        toggleable.every((r) => selected[r.rowIndex])
                      }
                      disabled={toggleable.length === 0}
                      onChange={toggleAllFiltered}
                    />
                  );
                })()}
              </th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Estado</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Fila</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Ingreso</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Fecha</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Remito</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Proveedor</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Inversor</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Insumo</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Cantidad</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Cliente destino</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Proyecto destino</th>
              <th className="px-3 py-3 text-left font-semibold text-gray-700">Campaña destino</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 bg-white">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={13} className="px-4 py-8 text-center text-gray-500">
                  No hay filas en esta vista.
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const status = statusOf(row);
                const bg =
                  status === "error"
                    ? "bg-red-50"
                    : status === "existing"
                      ? "bg-amber-50"
                      : "";
                return (
                  <tr
                    key={`${row.rowIndex}-${row.referenceNumber}-${row.supplyName}`}
                    className={bg}
                  >
                    <td className="px-3 py-3 align-top">
                      <Checkbox
                        checked={!row.existing && !!selected[row.rowIndex]}
                        disabled={row.existing}
                        title={
                          row.existing
                            ? "Ya existe. El importador nunca actualiza — eliminá el movimiento primero y volvé a importar."
                            : undefined
                        }
                        onChange={() => toggleRow(row.rowIndex)}
                      />
                    </td>
                    <td className="px-3 py-3 align-top">
                      <StatusBadge status={status} reasons={row.errors} />
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">{row.rowIndex}</td>
                    <td className="px-3 py-3 align-top text-gray-700">{row.movementType}</td>
                    <td className="px-3 py-3 align-top text-gray-700">{row.movementDate || "—"}</td>
                    <td className="px-3 py-3 align-top font-medium text-gray-900">
                      {row.referenceNumber || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">{row.providerName || "—"}</td>
                    <td className="px-3 py-3 align-top text-gray-700">{row.investorName || "—"}</td>
                    <td className="px-3 py-3 align-top text-gray-700">{row.supplyName || "—"}</td>
                    <td className="px-3 py-3 align-top text-gray-700">{row.quantity || "—"}</td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.destinationCustomerName || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.destinationProjectName || "—"}
                    </td>
                    <td className="px-3 py-3 align-top text-gray-700">
                      {row.destinationCampaignName || "—"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </DrawerShell>
  );
}

type FilterChipProps = {
  label: string;
  active: boolean;
  tone?: "green" | "red" | "yellow";
  onClick: () => void;
};

function FilterChip({ label, active, tone, onClick }: FilterChipProps) {
  const base =
    "px-3 py-1 text-xs font-medium rounded-full border transition-colors cursor-pointer";
  const idle = "bg-white text-gray-700 border-gray-300 hover:bg-gray-50";
  const activeCls =
    tone === "green"
      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
      : tone === "red"
        ? "bg-red-50 text-red-700 border-red-300"
        : tone === "yellow"
          ? "bg-amber-50 text-amber-700 border-amber-300"
          : "bg-blue-50 text-blue-700 border-blue-300";
  return (
    <button type="button" onClick={onClick} className={`${base} ${active ? activeCls : idle}`}>
      {label}
    </button>
  );
}

type StatusBadgeProps = {
  status: "ok" | "error" | "existing";
  reasons: string[];
};

function StatusBadge({ status, reasons }: StatusBadgeProps) {
  if (status === "error") {
    return (
      <span
        title={reasons.join("; ")}
        className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-red-700"
      >
        <XCircle className="h-3 w-3" /> Error
      </span>
    );
  }
  if (status === "existing") {
    return (
      <span
        title="Ya existe un movimiento con este remito + insumo en el proyecto"
        className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-amber-700"
      >
        <AlertTriangle className="h-3 w-3" /> Ya existe
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
      <CheckCircle2 className="h-3 w-3" /> Ok
    </span>
  );
}
