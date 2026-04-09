import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import { CopilotResponsePanel } from "@devpablocristo/modules-ai-console";
import Button from "../../../components/Button/Button";
import { FilterBar } from "@devpablocristo/modules-ui-filters";
import { useWorkspaceFilters } from "../../../hooks/useWorkspaceFilters";
import { askAICopilot } from "@/api/aiClient";
import type { CopilotMode, PontiCopilotResponse } from "@/types/ai";

const AICopilot: React.FC = () => {
  const { filters, projectId } = useWorkspaceFilters([
    "customer",
    "project",
    "campaign",
    "field",
  ]);
  const [insightId, setInsightId] = useState("");
  const [insightTitle, setInsightTitle] = useState("");
  const [mode, setMode] = useState<CopilotMode>("explain");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<PontiCopilotResponse | null>(null);
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const presetInsightId = params.get("insight_id");
    const presetTitle = params.get("title");
    const presetMode = params.get("mode");

    if (presetInsightId) {
      setInsightId(presetInsightId);
    }
    setInsightTitle(presetTitle ?? "");

    if (
      presetMode === "explain" ||
      presetMode === "why" ||
      presetMode === "next-steps"
    ) {
      setMode(presetMode);
    }
  }, [location.search]);

  const handleSubmit = async (nextMode: CopilotMode = mode) => {
    setError("");
    setResponse(null);
    setLoading(true);
    setMode(nextMode);

    try {
      if (!projectId) {
        throw new Error("Proyecto obligatorio");
      }
      if (!insightId) {
        throw new Error("Insight obligatorio");
      }
      const res = await askAICopilot(insightId, nextMode, {
        projectId: String(projectId),
      });
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
      <div className="grid grid-cols-1 gap-4">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Insight</label>
          <input
            className="border rounded-md px-3 py-2"
            value={insightTitle || insightId}
            readOnly
            placeholder="Abrí Copilot desde un insight concreto"
          />
          <div className="text-xs text-slate-500">
            {insightId
              ? `ID del insight: ${insightId}`
              : "Seleccioná un insight desde AI Insights para pedir explicación, motivo o siguientes pasos."}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={mode === "explain" ? "primary" : "secondary"}
            disabled={loading || !insightId}
            onClick={() => handleSubmit("explain")}
          >
            {loading && mode === "explain" ? "Consultando..." : "Explicacion"}
          </Button>
          <Button
            size="sm"
            variant={mode === "why" ? "primary" : "secondary"}
            disabled={loading || !insightId}
            onClick={() => handleSubmit("why")}
          >
            {loading && mode === "why" ? "Consultando..." : "Por que importa"}
          </Button>
          <Button
            size="sm"
            variant={mode === "next-steps" ? "primary" : "secondary"}
            disabled={loading || !insightId}
            onClick={() => handleSubmit("next-steps")}
          >
            {loading && mode === "next-steps"
              ? "Consultando..."
              : "Siguientes pasos"}
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>

      {response && (
        <CopilotResponsePanel
          answer={response.explanation.human_readable}
          data={{
            request_id: response.request_id,
            insight_id: response.insight_id,
            mode: response.mode,
            output_kind: response.output_kind,
            routed_agent: response.routed_agent,
            routing_source: response.routing_source,
            proposal: response.proposal,
          }}
          sources={{
            audit_focused: response.explanation.audit_focused,
            what_to_watch_next: response.explanation.what_to_watch_next,
          }}
          warnings={[]}
          relatedInsightsCount={1}
          relatedInsights={[
            {
              id: response.insight_id,
              title: insightTitle || response.insight_id,
            },
          ]}
          relatedInsightsAction={
            <Link
              className="text-sm text-blue-600 hover:underline"
              to="/admin/ai-insights"
            >
              Ver insights
            </Link>
          }
          emptyRelatedInsightsMessage="No hay insight cargado."
          renderRelatedInsight={(item) => {
            return (
              <Link
                key={item.id}
                className="rounded-md border px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                to="/admin/ai-insights"
              >
                {item.title}
              </Link>
            );
          }}
        />
      )}
    </div>
  );
};

export default AICopilot;
