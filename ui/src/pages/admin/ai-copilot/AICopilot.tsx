import { useState } from "react";

import Button from "../../../components/Button/Button";
import { askAICopilot, AskResponse } from "../../../restclient/aiClient";
import { useSelection } from "../../login/context/SelectionContext";

const AICopilot: React.FC = () => {
  const { projectId, project } = useSelection();
  const [question, setQuestion] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<AskResponse | null>(null);

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
      <div>
        <h2 className="text-xl font-semibold">AI Copilot</h2>
        <p className="text-sm text-slate-500">
          Consultas read-only por proyecto con auditoria y fuentes.
        </p>
      </div>

      <div className="text-sm text-slate-600">
        Proyecto actual: {project?.name ?? "No seleccionado"}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-2 md:col-span-2">
          <label className="text-sm font-medium">Pregunta</label>
          <input
            className="border rounded-md px-3 py-2"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Necesito el resumen del proyecto"
          />
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
        </div>
      )}
    </div>
  );
};

export default AICopilot;
