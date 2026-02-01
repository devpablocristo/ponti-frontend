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
  left_calculation: string;
  left_value: string;
  left_source?: string;
  right_calculation: string;
  right_value: string;
  right_source?: string;
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
          <div className="text-sm text-gray-700 space-y-1">
            <div>
              <strong>Regla:</strong> {item.control_rule}
            </div>
            <div>
              <strong>LEFT:</strong> {item.left_calculation} ={" "}
              {item.left_value}
              {item.left_source ? ` (${item.left_source})` : ""}
            </div>
            <div>
              <strong>RIGHT:</strong> {item.right_calculation} ={" "}
              {item.right_value}
              {item.right_source ? ` (${item.right_source})` : ""}
            </div>
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
