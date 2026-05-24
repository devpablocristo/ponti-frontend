import { useEffect, useState } from "react";

import { AppFilterBar } from "../../../../components/filters/AppFilterBar";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import Button from "../../../../components/Button/Button";
import { notify } from "@/lib/notify";
import { ResponsiveTable } from "../../../../components/crud/ResponsiveTable";
import { apiClient } from "@/api/client";
import { formatError } from "@/lib/format";
import { Column } from "../../types";
import {
  IntegrityCheck,
  hasRecalcBData,
  sortIntegrityChecks,
} from "./integrityUtils";

type IntegrityReportResponse = {
  checks: IntegrityCheck[];
};

export default function Integrity() {
  const { filters, projectId, workspaceReady } = useWorkspaceFilters([
    "customer",
    "project",
  ]);
  const [checks, setChecks] = useState<IntegrityCheck[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (error) notify.error(error);
  }, [error]);

  const handleRun = async () => {
    if (!workspaceReady || !projectId) {
      setError("Seleccioná cliente, proyecto y campaña para ejecutar los controles.");
      setChecks([]);
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const params = { project_id: projectId };
      const response = await apiClient.get<IntegrityReportResponse>(
        "data-integrity/costs-check",
        params
      );
      setChecks(sortIntegrityChecks(response.checks ?? []));
    } catch (error) {
      setError(
        formatError(error, {
          fallback: "No se pudieron cargar los controles de integridad. Intentá nuevamente en unos minutos.",
        }),
      );
      setChecks([]);
    } finally {
      setProcessing(false);
    }
  };

  const columns: Column<IntegrityCheck>[] = [
    { key: "control_number", header: "#", sortable: true, width: "60px" },
    { key: "data_to_verify", header: "Dato", sortable: true },
    { key: "system_value", header: "Valor sistema", sortable: true },
    { key: "recalc_a_value", header: "Recalc A", sortable: true },
    {
      key: "status",
      header: "Estado",
      sortable: true,
      render: (value: unknown) => (
        <span
          className={`font-semibold ${
            value === "OK" ? "text-green-700" : "text-red-700"
          }`}
        >
          {String(value)}
        </span>
      ),
    },
    { key: "difference_a", header: "Dif A", sortable: true },
    { key: "tolerance", header: "Tolerancia", sortable: true },
  ];

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Integridad de Datos</h2>
      <AppFilterBar filters={filters} />
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={handleRun} variant="primary" disabled={processing}>
          {processing ? "Ejecutando..." : "Ejecutar controles"}
        </Button>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Se muestran {checks.length} controles.
        </span>
        <span className="text-sm text-gray-600 dark:text-gray-300">
          Requiere cliente, proyecto y campaña seleccionados.
        </span>
      </div>
      <ResponsiveTable<IntegrityCheck>
        data={checks}
        columns={columns}
        message="Todavía no hay controles de integridad para mostrar."
        primaryKey="data_to_verify"
        rowKey={(c) => c.control_number}
        emptyMessage="Todavía no hay controles de integridad para mostrar."
        expandableRowRender={(item: IntegrityCheck) => (
          <div className="text-sm text-gray-700 dark:text-gray-200 space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 text-xs font-semibold">
                Control #{item.control_number}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                  item.status === "OK"
                    ? "bg-green-100 text-green-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {item.status}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                Diferencia A: {item.difference_a}
              </span>
              {item.difference_b != null && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  Diferencia B: {item.difference_b}
                </span>
              )}
            </div>

            {item.description && (
              <div className="p-3 rounded-md bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
                <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                  Descripción
                </div>
                <div className="text-slate-800 dark:text-slate-200">{item.description}</div>
              </div>
            )}

            <div className="p-3 rounded-md bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
              <div className="text-xs font-semibold uppercase text-slate-500 dark:text-slate-400 mb-1">
                Regla
              </div>
              <div className="text-slate-800 dark:text-slate-200">{item.control_rule}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 min-w-0">
              <div className="min-w-0 p-3 rounded-md bg-emerald-50 border border-emerald-200">
                <div className="text-xs font-semibold uppercase text-emerald-700 mb-1">
                  Sistema
                </div>
                <div className="text-slate-800 dark:text-slate-200 break-words">
                  {item.system_calculation} ={" "}
                  <span className="font-semibold">{item.system_value}</span>
                  {item.system_source ? (
                    <span className="text-slate-500 dark:text-slate-400"> ({item.system_source})</span>
                  ) : null}
                </div>
                {item.system_meaning && (
                  <div className="mt-2 text-slate-600 dark:text-slate-300 text-xs">
                    {item.system_meaning}
                  </div>
                )}
              </div>

              <div className="min-w-0 p-3 rounded-md bg-sky-50 border border-sky-200">
                <div className="text-xs font-semibold uppercase text-sky-700 mb-1">
                  Recálculo A
                </div>
                <div className="text-slate-800 dark:text-slate-200 break-words">
                  {item.recalc_a_calculation} ={" "}
                  <span className="font-semibold">{item.recalc_a_value}</span>
                  {item.recalc_a_source ? (
                    <span className="text-slate-500 dark:text-slate-400"> ({item.recalc_a_source})</span>
                  ) : null}
                </div>
                {item.recalc_a_meaning && (
                  <div className="mt-2 text-slate-600 dark:text-slate-300 text-xs">
                    {item.recalc_a_meaning}
                  </div>
                )}
              </div>

              {hasRecalcBData(item) && (
                <div className="min-w-0 p-3 rounded-md bg-violet-50 border border-violet-200">
                  <div className="text-xs font-semibold uppercase text-violet-700 mb-1">
                    Recálculo B
                  </div>
                  <div className="text-slate-800 dark:text-slate-200 break-words">
                    {item.recalc_b_calculation ?? "-"} ={" "}
                    <span className="font-semibold">{item.recalc_b_value ?? "-"}</span>
                    {item.recalc_b_source ? (
                      <span className="text-slate-500 dark:text-slate-400"> ({item.recalc_b_source})</span>
                    ) : null}
                  </div>
                  {item.recalc_b_meaning && (
                    <div className="mt-2 text-slate-600 dark:text-slate-300 text-xs">{item.recalc_b_meaning}</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      />
    </div>
  );
}
