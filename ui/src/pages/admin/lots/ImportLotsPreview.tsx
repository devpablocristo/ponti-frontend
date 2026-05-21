import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

import {
  DrawerBody,
  DrawerFooter,
  DrawerShell,
} from "../../../components/Drawer/DrawerShell";
import Button from "../../../components/Button/Button";
import { Checkbox } from "../../../components/Input/Checkbox";
import { ErrorBanner } from "../../../components/feedback/ErrorBanner";
import { InlineSpinner } from "../../../components/feedback/InlineSpinner";
import { extractErrorMessage } from "@/api/hooks/useApiCall";
import {
  ImportLotsResult,
  LotPreviewRow,
  submitLotRows,
} from "./importLots";

type ImportLotsPreviewProps = {
  open: boolean;
  onClose: () => void;
  rows: LotPreviewRow[];
  globalErrors: string[];
  onCompleted: (result: ImportLotsResult) => void;
};

type Filter = "all" | "ok" | "errors" | "existing";

function statusOf(row: LotPreviewRow): "ok" | "error" | "existing" {
  if (row.existing) return "existing";
  if (row.rowErrors.length > 0) return "error";
  return "ok";
}

export default function ImportLotsPreview({
  open,
  onClose,
  rows,
  globalErrors,
  onCompleted,
}: ImportLotsPreviewProps) {
  // Pre-seleccionamos OK. Errores: destildados, el usuario puede tildarlos
  // (el POST fallará). Existentes: destildados y deshabilitados — regla del
  // producto, el importador nunca actualiza datos repetidos.
  const initialSelected = useMemo(() => {
    const map: Record<number, boolean> = {};
    for (const r of rows) map[r.rowNumber] = statusOf(r) === "ok";
    return map;
  }, [rows]);

  const [selected, setSelected] = useState<Record<number, boolean>>(initialSelected);
  const [filter, setFilter] = useState<Filter>("all");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const counts = useMemo(() => {
    let ok = 0;
    let errs = 0;
    let existing = 0;
    for (const r of rows) {
      const s = statusOf(r);
      if (s === "ok") ok += 1;
      else if (s === "error") errs += 1;
      else existing += 1;
    }
    return { ok, errs, existing, total: rows.length };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (filter === "all") return rows;
    return rows.filter((r) => statusOf(r) === (filter === "errors" ? "error" : filter));
  }, [filter, rows]);

  const selectedCount = useMemo(
    () => rows.filter((r) => selected[r.rowNumber]).length,
    [rows, selected],
  );

  // Saltea las filas duplicadas — están deshabilitadas, nunca se tildan.
  const toggleAllFiltered = () => {
    const toggleable = filteredRows.filter((r) => !r.existing);
    if (toggleable.length === 0) return;
    const allOn = toggleable.every((r) => selected[r.rowNumber]);
    setSelected((prev) => {
      const next = { ...prev };
      for (const r of toggleable) next[r.rowNumber] = !allOn;
      return next;
    });
  };

  const handleSubmit = async () => {
    setSubmitError(null);
    const toSubmit = rows.filter((r) => selected[r.rowNumber]);
    if (toSubmit.length === 0) {
      setSubmitError("Seleccioná al menos una fila para crear.");
      return;
    }
    setSubmitting(true);
    try {
      const result = await submitLotRows(toSubmit);
      onCompleted(result);
    } catch (error) {
      setSubmitError(
        extractErrorMessage(error, "No se pudo procesar la importación."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DrawerShell
      open={open}
      onClose={onClose}
      title="Importar Lotes"
      footer={
        <DrawerFooter>
          <div className="flex w-full items-center justify-between gap-3">
            <span className="text-sm text-gray-600">
              {selectedCount} seleccionadas / {counts.total} filas
            </span>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button
                variant="primary"
                onClick={handleSubmit}
                disabled={submitting || selectedCount === 0}
              >
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <InlineSpinner size="sm" />
                    Creando…
                  </span>
                ) : (
                  `Crear ${selectedCount} lotes`
                )}
              </Button>
            </div>
          </div>
        </DrawerFooter>
      }
    >
      <DrawerBody>
        {globalErrors.length > 0 ? (
          <div className="mb-4 space-y-2">
            {globalErrors.map((msg, i) => (
              <ErrorBanner key={i} message={msg} variant="outlined" prefix="Catálogo:" />
            ))}
          </div>
        ) : null}

        {submitError ? (
          <div className="mb-4">
            <ErrorBanner
              message={submitError}
              variant="outlined"
              prefix="Error:"
              onDismiss={() => setSubmitError(null)}
            />
          </div>
        ) : null}

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

        <div className="overflow-x-auto rounded-md border border-gray-200">
          <table className="min-w-full text-xs">
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th className="px-2 py-2">
                  {(() => {
                    const toggleable = filteredRows.filter((r) => !r.existing);
                    return (
                      <Checkbox
                        checked={
                          toggleable.length > 0 &&
                          toggleable.every((r) => selected[r.rowNumber])
                        }
                        disabled={toggleable.length === 0}
                        onChange={toggleAllFiltered}
                      />
                    );
                  })()}
                </th>
                <th className="px-2 py-2">Estado</th>
                <th className="px-2 py-2">Campo</th>
                <th className="px-2 py-2">Lote</th>
                <th className="px-2 py-2">Cultivo anterior</th>
                <th className="px-2 py-2">Cultivo actual</th>
                <th className="px-2 py-2">Variedad</th>
                <th className="px-2 py-2 text-right">Sup. siembra</th>
                <th className="px-2 py-2">Fecha siembra</th>
                <th className="px-2 py-2 text-right">Sup. cosecha</th>
                <th className="px-2 py-2">Fecha cosecha</th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-2 py-6 text-center text-gray-500">
                    No hay filas en esta vista.
                  </td>
                </tr>
              ) : (
                filteredRows.map((r) => {
                  const status = statusOf(r);
                  const bg =
                    status === "error"
                      ? "bg-red-50"
                      : status === "existing"
                        ? "bg-amber-50"
                        : "";
                  return (
                    <tr key={r.rowNumber} className={`border-t border-gray-200 ${bg}`}>
                      <td className="px-2 py-2">
                        <Checkbox
                          checked={!r.existing && !!selected[r.rowNumber]}
                          disabled={r.existing}
                          title={
                            r.existing
                              ? "Ya existe. El importador nunca actualiza — eliminá el lote primero y volvé a importar."
                              : undefined
                          }
                          onChange={() =>
                            setSelected((prev) => ({
                              ...prev,
                              [r.rowNumber]: !prev[r.rowNumber],
                            }))
                          }
                        />
                      </td>
                      <td className="px-2 py-2">
                        <StatusBadge status={status} reasons={r.rowErrors} />
                      </td>
                      <td className="px-2 py-2">
                        <CellWithError
                          value={r.rawFieldName}
                          ok={r.fieldId > 0}
                        />
                      </td>
                      <td className="px-2 py-2 font-medium">{r.rawLotName || "—"}</td>
                      <td className="px-2 py-2">
                        <CellWithError
                          value={r.previousCropRaw}
                          ok={!r.previousCropRaw || r.previousCropId !== null}
                        />
                      </td>
                      <td className="px-2 py-2">
                        <CellWithError
                          value={r.currentCropRaw}
                          ok={!r.currentCropRaw || r.currentCropId !== null}
                        />
                      </td>
                      <td className="px-2 py-2">{r.variety || "—"}</td>
                      <td className="px-2 py-2 text-right">{r.sowedArea || "—"}</td>
                      <td className="px-2 py-2">{r.sowingDate || "—"}</td>
                      <td className="px-2 py-2 text-right">{r.harvestedArea || "—"}</td>
                      <td className="px-2 py-2">{r.harvestDate || "—"}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </DrawerBody>
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
        title="Ya existe un lote con este nombre en el campo"
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

type CellWithErrorProps = {
  value: string;
  ok: boolean;
};

function CellWithError({ value, ok }: CellWithErrorProps) {
  if (!value) return <span className="text-gray-400">—</span>;
  return <span className={ok ? "" : "text-red-700 font-medium"}>{value}</span>;
}
