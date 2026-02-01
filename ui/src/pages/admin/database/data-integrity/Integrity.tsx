import { useState } from "react";
import { AxiosError } from "axios";

import FilterBar from "../../../../layout/FilterBar/FilterBar";
import { useWorkspaceFilters } from "../../../../hooks/useWorkspaceFilters";
import Button from "../../../../components/Button/Button";
import DataTable from "../../../../components/Table/DataTable";
import APIClient from "../../../../restclient/apiInstance";
import { ErrorResponse } from "../../../../restclient/types";

type IntegrityCheck = {
  control_number: number;
  source_module: string;
  data_to_verify: string;
  target_module: string;
  control_rule: string;
  description: string;
  left_calculation: string;
  left_value: string;
  left_source?: string;
  left_interpretation: string;
  right_calculation: string;
  right_value: string;
  right_source?: string;
  right_interpretation: string;
  calculation_interpretation: string;
  difference: string;
  status: string;
  tolerance: string;
};

type IntegrityReportResponse = {
  checks: IntegrityCheck[];
};

const request = new APIClient({
  timeout: 60000,
  baseURL: "/api",
});

export default function Integrity() {
  const { filters, projectId, selectedProject } = useWorkspaceFilters([
    "customer",
    "project",
  ]);
  const [checks, setChecks] = useState<IntegrityCheck[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRun = async () => {
    setProcessing(true);
    setError(null);

    try {
      const resolvedProjectId = projectId ?? selectedProject?.id ?? null;
      const params = resolvedProjectId
        ? { project_id: resolvedProjectId }
        : undefined;
      const response = await request.get<IntegrityReportResponse>(
        "data-integrity/costs-check",
        params
      );
      setChecks(response.checks ?? []);
    } catch (error) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        const errorResponse = axiosError.response.data as ErrorResponse & {
          message?: string;
        };
        if (errorResponse.error?.details) {
          setError(errorResponse.error.details);
        } else if (errorResponse.message) {
          setError(errorResponse.message);
        } else {
          setError("Error desconocido en la validación.");
        }
      } else {
        setError("Error en el servicio, inténtalo más tarde.");
      }
      setChecks([]);
    } finally {
      setProcessing(false);
    }
  };

  const columns = [
    { key: "control_number", header: "#", sortable: true, width: "60px" },
    { key: "source_module", header: "Origen", sortable: true },
    { key: "target_module", header: "Destino", sortable: true },
    { key: "data_to_verify", header: "Dato", sortable: true },
    {
      key: "status",
      header: "Estado",
      sortable: true,
      render: (value) => (
        <span
          className={`font-semibold ${
            value === "OK" ? "text-green-700" : "text-red-700"
          }`}
        >
          {String(value)}
        </span>
      ),
    },
    { key: "difference", header: "Diferencia", sortable: true },
    { key: "tolerance", header: "Tolerancia", sortable: true },
  ] as any;

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Integridad de datos</h2>
      <FilterBar filters={filters} />
      <div className="flex items-center gap-3 mb-4">
        <Button onClick={handleRun} variant="success" disabled={processing}>
          {processing ? "Ejecutando..." : "Ejecutar controles"}
        </Button>
        <span className="text-sm text-gray-600">
          Proyecto opcional: si no se selecciona, valida todos.
        </span>
      </div>
      <DataTable
        data={checks}
        columns={columns}
        message="No hay controles disponibles"
        expandableRowRender={(item: IntegrityCheck) => (
          <div className="text-sm text-gray-700 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-semibold">
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
              {item.difference && (
                <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 text-xs font-semibold">
                  Diferencia: {item.difference}
                </span>
              )}
            </div>

            {item.description && (
              <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                <div className="text-xs font-semibold uppercase text-slate-500 mb-1">
                  Descripción
                </div>
                <div className="text-slate-800">{item.description}</div>
              </div>
            )}

            <div className="p-3 rounded-md bg-white border border-slate-200">
              <div className="text-xs font-semibold uppercase text-slate-500 mb-1">
                Regla
              </div>
              <div className="text-slate-800">{item.control_rule}</div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
                <div className="text-xs font-semibold uppercase text-emerald-700 mb-1">
                  LEFT (origen)
                </div>
                <div className="text-slate-800">
                  {item.left_calculation} ={" "}
                  <span className="font-semibold">{item.left_value}</span>
                  {item.left_source ? (
                    <span className="text-slate-500"> ({item.left_source})</span>
                  ) : null}
                </div>
                {item.left_interpretation && (
                  <div className="mt-2 text-slate-600">
                    <span className="font-semibold text-emerald-700">
                      Interpretación:
                    </span>{" "}
                    {item.left_interpretation}
                  </div>
                )}
              </div>

              <div className="p-3 rounded-md bg-sky-50 border border-sky-200">
                <div className="text-xs font-semibold uppercase text-sky-700 mb-1">
                  RIGHT (destino)
                </div>
                <div className="text-slate-800">
                  {item.right_calculation} ={" "}
                  <span className="font-semibold">{item.right_value}</span>
                  {item.right_source ? (
                    <span className="text-slate-500">
                      {" "}
                      ({item.right_source})
                    </span>
                  ) : null}
                </div>
                {item.right_interpretation && (
                  <div className="mt-2 text-slate-600">
                    <span className="font-semibold text-sky-700">
                      Interpretación:
                    </span>{" "}
                    {item.right_interpretation}
                  </div>
                )}
              </div>
            </div>

            {item.calculation_interpretation && (
              <div className="p-3 rounded-md bg-violet-50 border border-violet-200">
                <div className="text-xs font-semibold uppercase text-violet-700 mb-1">
                  Interpretación del cálculo
                </div>
                <div className="text-slate-800">
                  {item.calculation_interpretation}
                </div>
              </div>
            )}
          </div>
        )}
      />
      {error && (
        <div className="p-4 mt-4 text-sm text-red-800 rounded-lg bg-red-50" role="alert">
          <span className="font-medium">Error!</span> {error}
        </div>
      )}
    </div>
  );
}
