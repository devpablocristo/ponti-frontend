import { useState } from "react";

import Button from "../../../components/Button/Button";
import {
  computeInsights,
  getInsights,
  getInsightsSummary,
  InsightsSummary,
  InsightItem,
} from "../../../restclient/aiClient";
import { useSelection } from "../../login/context/SelectionContext";

const AIInsights: React.FC = () => {
  const { projectId, project } = useSelection();
  const [entityType, setEntityType] = useState("project");
  const [entityId, setEntityId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<InsightsSummary | null>(null);
  const [insights, setInsights] = useState<InsightItem[]>([]);

  const headers = projectId ? { projectId: String(projectId) } : null;

  const handleSummary = async () => {
    setLoading(true);
    setError("");
    try {
      if (!headers) {
        throw new Error("Proyecto obligatorio");
      }
      const res = await getInsightsSummary(headers);
      setSummary(res);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCompute = async () => {
    setLoading(true);
    setError("");
    try {
      if (!headers) {
        throw new Error("Proyecto obligatorio");
      }
      await computeInsights(headers);
      await handleSummary();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchInsights = async () => {
    setLoading(true);
    setError("");
    try {
      if (!headers) {
        throw new Error("Proyecto obligatorio");
      }
      const res = await getInsights(headers, entityType, entityId);
      setInsights(res.insights);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6 py-4">
      <div>
        <h2 className="text-xl font-semibold">AI Insights</h2>
        <p className="text-sm text-slate-500">
          Resumen de alertas y recomendaciones generadas por IA.
        </p>
      </div>

      <div className="text-sm text-slate-600">
        Proyecto actual: {project?.name ?? "No seleccionado"}
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="primary"
          className="px-6"
          disabled={loading}
          onClick={handleSummary}
        >
          {loading ? "Cargando..." : "Refrescar badge"}
        </Button>
        <Button
          size="sm"
          variant="outlineGreen"
          className="px-6"
          disabled={loading}
          onClick={handleCompute}
        >
          Recalcular insights
        </Button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border rounded-md p-4">
          <div className="text-sm text-slate-500">Nuevos</div>
          <div className="text-2xl font-semibold">
            {summary?.new_count_total ?? "-"}
          </div>
        </div>
        <div className="border rounded-md p-4">
          <div className="text-sm text-slate-500">Alta severidad</div>
          <div className="text-2xl font-semibold">
            {summary?.new_count_high_severity ?? "-"}
          </div>
        </div>
        <div className="border rounded-md p-4">
          <div className="text-sm text-slate-500">Top insights</div>
          <div className="text-2xl font-semibold">
            {summary?.top_insights?.length ?? "-"}
          </div>
        </div>
      </div>

      <div className="border rounded-md p-4">
        <h3 className="font-semibold mb-2">Top insights</h3>
        <pre className="text-xs text-slate-700 whitespace-pre-wrap">
          {JSON.stringify(summary?.top_insights ?? [], null, 2)}
        </pre>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Entity type</label>
          <input
            className="border rounded-md px-3 py-2"
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            placeholder="project"
          />
        </div>
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Entity ID</label>
          <input
            className="border rounded-md px-3 py-2"
            value={entityId}
            onChange={(e) => setEntityId(e.target.value)}
            placeholder="demo-project"
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Button
          size="sm"
          variant="primary"
          className="px-6"
          disabled={loading}
          onClick={handleFetchInsights}
        >
          Ver insights
        </Button>
      </div>

      <div className="border rounded-md p-4">
        <h3 className="font-semibold mb-2">Listado de insights</h3>
        <pre className="text-xs text-slate-700 whitespace-pre-wrap">
          {JSON.stringify(insights ?? [], null, 2)}
        </pre>
      </div>
    </div>
  );
};

export default AIInsights;
