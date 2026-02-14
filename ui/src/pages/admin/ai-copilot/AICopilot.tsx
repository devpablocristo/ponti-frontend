import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import Button from "../../../components/Button/Button";
import FilterBar from "../../../layout/FilterBar/FilterBar";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { askAICopilot, AskResponse } from "@/api/aiClient";

const AICopilot: React.FC = () => {
  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);
  const suggestedQuestions = [
    "Cuanto se gasto en costos directos del proyecto?",
    "Cual es el costo directo por hectarea?",
    "Cuanto se uso de insumos en total?",
    "Cuantos workorders tiene el proyecto?",
    "Cuantas ordenes se hicieron en los ultimos 30 dias?",
    "Cual es la variacion de stock real vs inicial?",
    "Cuantas hectareas totales tiene el proyecto?",
    "Hectareas por lote del proyecto",
    "Indicadores operativos de la campana activa",
    "Insumos por categoria del proyecto",
  ];
  const [question, setQuestion] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const preset = params.get("q");
    if (preset) {
      setQuestion(preset);
    }
  }, [location.search]);

  const handleSubmit = async () => {
    setError("");
    setResponse(null);
    setLoading(true);

    try {
      const payload = {
        question,
        context: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
      };
      if (!projectId) {
        throw new Error("Proyecto obligatorio");
      }
      const res = await askAICopilot(payload, { projectId: String(projectId) });
      setResponse(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      <FilterBar filters={filters} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-sm font-medium">Pregunta</label>
          <input
            className="border rounded-md px-3 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Necesito el resumen del proyecto"
          />
          <div className="flex flex-wrap gap-2 pt-2">
            {suggestedQuestions.map((item) => (
              <button
                key={item}
                type="button"
                className="rounded-full border px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                onClick={() => setQuestion(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Fecha desde</label>
          <input
            className="border rounded-md px-3 py-2"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Fecha hasta</label>
          <input
            className="border rounded-md px-3 py-2"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            placeholder="YYYY-MM-DD"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="primary"
          className="px-6"
          disabled={loading}
          onClick={handleSubmit}
        >
          {loading ? "Consultando..." : "Consultar"}
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {response && (
        <div className="grid grid-cols-1 gap-4">
          <div className="border rounded-md p-4">
            <h3 className="font-semibold">Respuesta</h3>
            <p className="text-sm text-slate-700">{response.answer}</p>
          </div>
          <div className="border rounded-md p-4">
            <h3 className="font-semibold">Datos</h3>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap">
              {JSON.stringify(response.data, null, 2)}
            </pre>
          </div>
          <div className="border rounded-md p-4">
            <h3 className="font-semibold">Fuentes</h3>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap">
              {JSON.stringify(response.sources, null, 2)}
            </pre>
          </div>
          <div className="border rounded-md p-4">
            <h3 className="font-semibold">Warnings</h3>
            <pre className="text-xs text-slate-700 whitespace-pre-wrap">
              {JSON.stringify(response.warnings, null, 2)}
            </pre>
          </div>
          <div className="border rounded-md p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold">Insights relacionados</h3>
              <Link
                className="text-sm text-blue-600 hover:underline"
                to="/admin/ai-insights"
              >
                Ver insights
              </Link>
            </div>
            <div className="mt-2 text-sm text-slate-700">
              Relacionados: {response.related_insights_count}
            </div>
            {response.related_insights.length === 0 ? (
              <div className="mt-2 text-sm text-slate-500">
                No hay insights activos para este proyecto.
              </div>
            ) : (
              <div className="mt-3 grid grid-cols-1 gap-2">
                {response.related_insights.map((item) => (
                  <Link
                    key={item.id}
                    className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    to={`/admin/ai-insights?entity_type=${item.entity_type}&entity_id=${item.entity_id}`}
                  >
                    {item.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AICopilot;
