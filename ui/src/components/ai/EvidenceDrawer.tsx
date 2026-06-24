import { BadgeCheck, Clock3, Download, ShieldAlert, ShieldCheck } from "lucide-react";

import Drawer from "@/components/Drawer/Drawer";
import type {
  NexusApprovalItem,
  PontiChatPendingConfirmation,
  PontiChatToolCall,
} from "@/types/aiChat";

const toolName = (tool: unknown): string => {
  if (typeof tool === "string") return tool;
  if (typeof tool !== "object" || tool === null || Array.isArray(tool)) return "tool";
  const record = tool as Record<string, unknown>;
  return String(record.name ?? record.tool ?? record.capability_id ?? "tool");
};

const pendingLabel = (item: PontiChatPendingConfirmation): string => {
  if (typeof item === "string") return item;
  return String(item.message ?? item.status ?? item.action_type ?? "Aprobación pendiente");
};

const compactDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

export const EvidenceList = ({
  tools,
  evidence,
}: {
  tools?: PontiChatToolCall[];
  evidence?: Record<string, unknown>;
}) => {
  const items = Array.isArray(evidence?.items) ? evidence.items : [];
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {(tools ?? []).map((tool, index) => (
          <span key={`${index}-${toolName(tool)}`} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700">
            {toolName(tool)}
          </span>
        ))}
      </div>
      {items.length > 0 && (
        <div className="rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700">
          {items.slice(0, 4).map((item, index) => (
            <pre key={index} className="mb-2 max-h-24 overflow-auto whitespace-pre-wrap font-mono last:mb-0">
              {JSON.stringify(item, null, 2)}
            </pre>
          ))}
        </div>
      )}
    </div>
  );
};

/** Pack de gobernanza Nexus para el drawer (decisión, riesgo, cadena, verificación). */
export type NexusEvidenceView = {
  approval?: NexusApprovalItem | null;
  pack?: Record<string, unknown> | null;
  verified?: boolean | null;
  loading?: boolean;
  error?: string;
};

const bindingHashFrom = (pack?: Record<string, unknown> | null): string | null => {
  const value = pack?.binding_hash;
  return typeof value === "string" && value.trim() !== "" ? value : null;
};

const downloadNexusEvidence = (view: NexusEvidenceView): void => {
  const payload = {
    pack: view.pack ?? null,
    verified: view.verified ?? false,
    approval: view.approval ?? null,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const suffix = view.approval?.request_id?.slice(0, 8) ?? "pack";
  anchor.href = url;
  anchor.download = `nexus-evidence-${suffix}.json`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

const NexusEvidenceSection = ({ view }: { view: NexusEvidenceView }) => {
  const approval = view.approval ?? null;
  const bindingHash = bindingHashFrom(view.pack);
  const decisions = approval?.decisions ?? [];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-xs font-semibold uppercase text-gray-500">Nexus</p>
        {view.verified ? (
          <span className="inline-flex items-center gap-1 rounded border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
            <BadgeCheck className="h-3.5 w-3.5" aria-hidden />
            Evidencia verificada
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700">
            <ShieldAlert className="h-3.5 w-3.5" aria-hidden />
            Evidencia no verificada
          </span>
        )}
        {(view.pack || approval) && (
          <button
            type="button"
            className="ml-auto inline-flex items-center gap-1 rounded-md border border-gray-300 px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => downloadNexusEvidence(view)}
          >
            <Download className="h-3.5 w-3.5" aria-hidden />
            Descargar JSON
          </button>
        )}
      </div>

      {view.loading && <p className="text-sm text-gray-500">Cargando evidencia Nexus…</p>}
      {view.error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-2 py-1.5 text-xs text-red-700">{view.error}</p>
      )}

      {approval && (
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          <span className="rounded bg-gray-100 px-2 py-1">decisión {approval.status}</span>
          <span className="rounded bg-gray-100 px-2 py-1">riesgo {approval.risk_level}</span>
          {bindingHash && (
            <span className="max-w-full truncate rounded bg-gray-100 px-2 py-1 font-mono" title={bindingHash}>
              hash {bindingHash.slice(0, 16)}…
            </span>
          )}
        </div>
      )}
      {!approval && bindingHash && (
        <p className="truncate text-xs text-gray-600">
          <span className="rounded bg-gray-100 px-2 py-1 font-mono" title={bindingHash}>
            hash {bindingHash.slice(0, 16)}…
          </span>
        </p>
      )}

      {decisions.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase text-gray-500">Cadena de aprobación</p>
          <div className="space-y-1.5">
            {decisions.map((decision, index) => (
              <div key={`${index}-${decision.approver_id}`} className="rounded-md border border-gray-200 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">{decision.approver_id}</span>
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-gray-600">{decision.action}</span>
                </div>
                {decision.note && <p className="mt-1 text-gray-600">{decision.note}</p>}
                <p className="mt-1 text-[11px] text-gray-500">{compactDate(decision.decided_at)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {view.pack ? (
        <pre className="max-h-56 overflow-auto whitespace-pre-wrap rounded-md border border-gray-200 bg-gray-50 p-2 font-mono text-xs text-gray-700">
          {JSON.stringify(view.pack, null, 2)}
        </pre>
      ) : (
        !view.loading &&
        !view.error &&
        !approval && <p className="text-sm text-gray-500">Sin datos de gobernanza Nexus para esta evidencia.</p>
      )}
    </div>
  );
};

export type EvidenceDrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  tools?: PontiChatToolCall[];
  evidence?: Record<string, unknown>;
  axisRunId?: string | null;
  axisTaskId?: string | null;
  nexusEvidence?: NexusEvidenceView | null;
  pendingConfirmations?: PontiChatPendingConfirmation[];
};

const EvidenceDrawer = ({
  open,
  onClose,
  title,
  tools,
  evidence,
  axisRunId,
  axisTaskId,
  nexusEvidence,
  pendingConfirmations,
}: EvidenceDrawerProps) => (
  <Drawer open={open} onClose={onClose} maxWidth="max-w-xl">
    <div className="space-y-4">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <ShieldCheck className="h-4 w-4 text-primary-700" aria-hidden />
          Evidencia
        </h2>
        {title && <p className="mt-1 text-sm text-gray-600">{title}</p>}
      </div>

      {(axisRunId || axisTaskId) && (
        <div className="flex flex-wrap gap-2 text-xs text-gray-600">
          {axisRunId && <span className="rounded bg-gray-100 px-2 py-1">run {axisRunId.slice(0, 8)}</span>}
          {axisTaskId && <span className="rounded bg-gray-100 px-2 py-1">task {axisTaskId.slice(0, 8)}</span>}
        </div>
      )}

      <EvidenceList tools={tools} evidence={evidence} />

      {(pendingConfirmations ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-gray-500">Pendientes</p>
          {(pendingConfirmations ?? []).map((item, index) => (
            <div key={index} className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <Clock3 className="mr-1 inline h-4 w-4" aria-hidden />
              {pendingLabel(item)}
            </div>
          ))}
        </div>
      )}

      <NexusEvidenceSection view={nexusEvidence ?? {}} />
    </div>
  </Drawer>
);

export default EvidenceDrawer;
