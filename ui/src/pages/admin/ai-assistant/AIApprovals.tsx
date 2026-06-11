import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, Clock3, Eye, RefreshCw, ShieldCheck, X } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { HttpError } from "@devpablocristo/core-http/fetch";

import {
  approveAiApproval,
  getAiApproval,
  getAiApprovalEvidence,
  listAiApprovals,
  rejectAiApproval,
} from "@/api/aiClient";
import EvidenceDrawer from "@/components/ai/EvidenceDrawer";
import type { NexusEvidenceView } from "@/components/ai/EvidenceDrawer";
import { BaseModal } from "@/components/Modal/BaseModal";
import { useAiFeature } from "@/hooks/useAiFeatures";
import { usePollingQuery } from "@/hooks/usePollingQuery";
import { toastError, toastInfo, toastSuccess } from "@/lib/toast";
import { useAuth } from "@/pages/login/context/useAuth";
import { useSelection } from "@/pages/login/context/useSelection";
import type { NexusApprovalItem } from "@/types/aiChat";
import { currentUserSubject, decisionErrorInfo, isRequestedBySubject } from "./approvalDecisions";

const POLL_INTERVAL_MS = 60000;

type ApprovalsTab = "pending" | "history";

type DecisionAction = "approve" | "reject";

const TABS: Array<{ key: ApprovalsTab; label: string }> = [
  { key: "pending", label: "Pendientes" },
  { key: "history", label: "Históricas" },
];

const statusClass = (status: string): string => {
  switch (status) {
    case "approved":
    case "allowed":
    case "executed":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "pending_approval":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "rejected":
    case "denied":
    case "failed":
    case "expired":
      return "bg-red-50 text-red-700 border-red-200";
    default:
      return "bg-gray-50 text-gray-700 border-gray-200";
  }
};

const riskClass = (risk: string): string => {
  switch (risk) {
    case "critical":
    case "high":
      return "bg-red-50 text-red-700 border-red-200";
    case "medium":
      return "bg-amber-50 text-amber-700 border-amber-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

const isPendingStatus = (status: string): boolean =>
  status === "pending_approval" || status === "pending";

const compactDate = (value?: string): string => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("es-AR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
};

const expiresLabel = (expiresAt: string | undefined, now: number): string | null => {
  if (!expiresAt) return null;
  const ts = new Date(expiresAt).getTime();
  if (Number.isNaN(ts)) return null;
  const diffMs = ts - now;
  if (diffMs <= 0) return "Expirada";
  const minutes = Math.floor(diffMs / 60000);
  if (minutes >= 60) return `Expira en ${Math.floor(minutes / 60)} h ${minutes % 60} min`;
  if (minutes >= 1) return `Expira en ${minutes} min`;
  return `Expira en ${Math.max(1, Math.floor(diffMs / 1000))} s`;
};

/** 404/501 del BE = módulo de gobernanza no deployado aún. */
const isGovernanceUnavailable = (err: unknown): boolean =>
  err instanceof HttpError && (err.status === 404 || err.status === 501);

type ApprovalsResult = { items: NexusApprovalItem[]; unavailable: boolean };

const ApprovalDetail = ({
  item,
  now,
  ownRequest,
  deciding,
  onShowEvidence,
  onDecide,
}: {
  item: NexusApprovalItem | null;
  now: number;
  ownRequest: boolean;
  deciding: boolean;
  onShowEvidence: (item: NexusApprovalItem) => void;
  onDecide: (item: NexusApprovalItem, action: DecisionAction) => void;
}) => {
  if (!item) {
    return (
      <aside className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-500 lg:w-96">
        Seleccioná una aprobación.
      </aside>
    );
  }

  const expires = expiresLabel(item.expires_at, now);
  const expired = expires === "Expirada";
  const canDecide = isPendingStatus(item.status);
  return (
    <aside className="rounded-lg border border-gray-200 bg-white p-4 lg:w-96">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-gray-500">{item.action_type}</p>
          <h2 className="mt-1 text-base font-semibold text-gray-900">{item.reason || item.request_id}</h2>
        </div>
        <span
          className={`rounded border px-2 py-0.5 text-xs font-semibold ${statusClass(expired && canDecide ? "expired" : item.status)}`}
        >
          {expired && canDecide ? "expirada" : item.status}
        </span>
      </div>

      <div className="space-y-3 text-sm text-gray-700">
        <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
          <span className="rounded bg-gray-100 px-2 py-1">req {item.request_id.slice(0, 8)}</span>
          <span className={`rounded border px-2 py-1 ${riskClass(item.risk_level)}`}>riesgo {item.risk_level}</span>
          <span className="rounded bg-gray-100 px-2 py-1">por {item.requested_by}</span>
          <span className="rounded bg-gray-100 px-2 py-1">{compactDate(item.created_at)}</span>
        </div>

        {expires && (
          <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
            <Clock3 className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {expires}
          </p>
        )}

        {(item.required_approvals ?? 0) > 0 && (
          <p className="text-xs text-gray-600">
            Aprobaciones: {item.current_approvals ?? 0} / {item.required_approvals}
          </p>
        )}

        <div>
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase text-gray-500">
            <ShieldCheck className="h-4 w-4" aria-hidden />
            Decisiones
          </p>
          <div className="space-y-2">
            {item.decisions.map((decision, index) => (
              <div key={`${index}-${decision.approver_id}`} className="rounded-md border border-gray-200 p-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">{decision.approver_id}</span>
                  <span className={`rounded border px-1.5 py-0.5 ${statusClass(decision.action)}`}>
                    {decision.action}
                  </span>
                </div>
                {decision.note && <p className="mt-1 text-gray-600">{decision.note}</p>}
                <p className="mt-1 text-[11px] text-gray-500">{compactDate(decision.decided_at)}</p>
              </div>
            ))}
            {item.decisions.length === 0 && <p className="text-xs text-gray-500">Sin decisiones registradas.</p>}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-1">
          {canDecide && (
            <>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md bg-primary-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-primary-800 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deciding || expired || ownRequest}
                title={
                  ownRequest
                    ? "Segregación de funciones: no podés aprobar una solicitud creada por vos."
                    : expired
                      ? "La solicitud expiró."
                      : undefined
                }
                onClick={() => onDecide(item, "approve")}
              >
                <Check className="h-3.5 w-3.5" aria-hidden />
                Aprobar
              </button>
              <button
                type="button"
                className="inline-flex items-center gap-1 rounded-md border border-red-300 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={deciding || expired}
                title={expired ? "La solicitud expiró." : undefined}
                onClick={() => onDecide(item, "reject")}
              >
                <X className="h-3.5 w-3.5" aria-hidden />
                Rechazar
              </button>
            </>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-md border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            onClick={() => onShowEvidence(item)}
          >
            <Eye className="h-3.5 w-3.5" aria-hidden />
            Ver evidencia
          </button>
        </div>

        {canDecide && ownRequest && (
          <p className="rounded-md bg-gray-50 p-2 text-xs text-gray-500">
            Segregación de funciones: otra persona debe aprobar esta solicitud.
          </p>
        )}
      </div>
    </aside>
  );
};

const DecisionModal = ({
  decision,
  note,
  submitting,
  onNoteChange,
  onConfirm,
  onClose,
}: {
  decision: { item: NexusApprovalItem; action: DecisionAction } | null;
  note: string;
  submitting: boolean;
  onNoteChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}) => {
  if (!decision) return null;
  const { item, action } = decision;
  const approve = action === "approve";
  return (
    <BaseModal
      isOpen
      isSaving={submitting}
      onClose={onClose}
      title={approve ? "Aprobar solicitud" : "Rechazar solicitud"}
      icon={<ShieldCheck className="mx-auto mb-4 h-12 w-12 text-slate-800" aria-hidden />}
      primaryButtonText={submitting ? "Enviando…" : approve ? "Aprobar" : "Rechazar"}
      primaryButtonColor={
        approve
          ? "bg-primary-700 hover:bg-primary-800 focus:ring-primary-300"
          : "bg-red-600 hover:bg-red-800 focus:ring-red-300"
      }
      onPrimaryAction={onConfirm}
    >
      <div className="space-y-3 text-left">
        <div className="rounded-md border border-gray-200 bg-gray-50 p-3 text-xs text-gray-700">
          <p>
            <span className="font-semibold">Acción:</span> {item.action_type}
          </p>
          {item.reason && (
            <p className="mt-1">
              <span className="font-semibold">Motivo:</span> {item.reason}
            </p>
          )}
          {item.params && Object.keys(item.params).length > 0 && (
            <pre className="mt-2 max-h-32 overflow-auto whitespace-pre-wrap font-mono text-[11px]">
              {JSON.stringify(item.params, null, 2)}
            </pre>
          )}
        </div>
        <label className="block text-xs font-medium text-gray-700">
          Nota (opcional)
          <textarea
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none"
            rows={2}
            value={note}
            disabled={submitting}
            onChange={(event) => onNoteChange(event.target.value)}
          />
        </label>
      </div>
    </BaseModal>
  );
};

const AIApprovals = () => {
  const enabled = useAiFeature("approvals_inbox");
  const { projectId } = useSelection();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const headers = useMemo(() => (projectId ? { projectId: String(projectId) } : null), [projectId]);
  const subject = useMemo(() => currentUserSubject(user), [user]);

  const [tab, setTab] = useState<ApprovalsTab>("pending");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  /** Item traído por deep-link (?request_id=) cuando no está en la página actual. */
  const [deepLinkItem, setDeepLinkItem] = useState<NexusApprovalItem | null>(null);
  const [evidenceItem, setEvidenceItem] = useState<NexusApprovalItem | null>(null);
  const [evidenceView, setEvidenceView] = useState<NexusEvidenceView | null>(null);
  const [decision, setDecision] = useState<{ item: NexusApprovalItem; action: DecisionAction } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionSubmitting, setDecisionSubmitting] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const requestIdParamHandledRef = useRef(false);
  const evidenceRequestRef = useRef<string | null>(null);

  const fetchApprovals = useCallback(async (): Promise<ApprovalsResult> => {
    if (!headers) return { items: [], unavailable: false };
    try {
      const res = await listAiApprovals(headers, { status: tab, limit: 50 });
      return { items: res.items ?? [], unavailable: false };
    } catch (err) {
      if (isGovernanceUnavailable(err)) {
        return { items: [], unavailable: true };
      }
      throw err;
    }
  }, [headers, tab]);

  const { data, error, loading, refresh } = usePollingQuery(fetchApprovals, {
    intervalMs: POLL_INTERVAL_MS,
    enabled: enabled && Boolean(headers),
  });

  const items = useMemo(() => data?.items ?? [], [data]);
  const unavailable = data?.unavailable ?? false;
  const selected =
    items.find((item) => item.request_id === selectedId) ??
    (deepLinkItem && deepLinkItem.request_id === selectedId ? deepLinkItem : null) ??
    items[0] ??
    null;
  const ownRequest = isRequestedBySubject(selected?.requested_by, subject);

  // Tick de 30 s para los countdown de expires_at.
  useEffect(() => {
    if (tab !== "pending") return;
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [tab]);

  // Deep-link ?request_id= (PendingConfirmationsPanel / chip Nexus): auto-seleccionar.
  useEffect(() => {
    const requestId = searchParams.get("request_id");
    if (!requestId || requestIdParamHandledRef.current || !headers || data === null) return;
    requestIdParamHandledRef.current = true;
    if (items.some((item) => item.request_id === requestId)) {
      setSelectedId(requestId);
      return;
    }
    void getAiApproval(requestId, headers)
      .then((item) => {
        setDeepLinkItem(item);
        setSelectedId(item.request_id);
        setTab(isPendingStatus(item.status) ? "pending" : "history");
      })
      .catch(() => {
        /* request inexistente o sin acceso: se ignora el deep-link */
      });
  }, [searchParams, headers, data, items]);

  const switchTab = (next: ApprovalsTab) => {
    if (next === tab) return;
    setTab(next);
    setSelectedId(null);
  };

  const showEvidence = useCallback(
    (item: NexusApprovalItem) => {
      setEvidenceItem(item);
      evidenceRequestRef.current = item.request_id;
      if (!headers) {
        setEvidenceView({ approval: item, error: "Seleccioná un proyecto para ver la evidencia." });
        return;
      }
      setEvidenceView({ approval: item, loading: true });
      void getAiApprovalEvidence(item.request_id, headers)
        .then((res) => {
          if (evidenceRequestRef.current !== item.request_id) return;
          setEvidenceView({ approval: item, pack: res.pack ?? null, verified: res.verified ?? false });
        })
        .catch((err: unknown) => {
          if (evidenceRequestRef.current !== item.request_id) return;
          const message =
            err instanceof Error && err.message.trim() ? err.message : "No se pudo cargar la evidencia Nexus.";
          setEvidenceView({ approval: item, error: message });
        });
    },
    [headers]
  );

  const closeEvidence = () => {
    evidenceRequestRef.current = null;
    setEvidenceItem(null);
    setEvidenceView(null);
  };

  const openDecision = (item: NexusApprovalItem, action: DecisionAction) => {
    setDecision({ item, action });
    setDecisionNote("");
  };

  const submitDecision = async () => {
    if (!decision || !headers || decisionSubmitting) return;
    const { item, action } = decision;
    const note = decisionNote.trim();
    const payload = note ? { note } : {};
    setDecisionSubmitting(true);
    try {
      if (action === "approve") {
        await approveAiApproval(item.request_id, payload, headers);
      } else {
        await rejectAiApproval(item.request_id, payload, headers);
      }
      // Un 200 NO es estado terminal (multi-approver / callback async):
      // refetcheamos el item y confiamos en su status, nunca lo marcamos local.
      setDecision(null);
      setDecisionNote("");
      try {
        const updated = await getAiApproval(item.request_id, headers);
        setDeepLinkItem((current) => (current?.request_id === updated.request_id ? updated : current));
        if (isPendingStatus(updated.status) && (updated.required_approvals ?? 0) > 0) {
          toastInfo(
            `Decisión registrada: ${updated.current_approvals ?? 0}/${updated.required_approvals} aprobaciones.`
          );
        } else {
          toastSuccess(action === "approve" ? "Solicitud aprobada." : "Solicitud rechazada.");
        }
      } catch {
        toastSuccess("Decisión registrada.");
      }
      await refresh();
    } catch (err) {
      const info = decisionErrorInfo(err);
      toastError(info.message);
      if (info.refresh) {
        // Expirada / resuelta en Nexus: cerrar el modal y refrescar el inbox.
        setDecision(null);
        await refresh();
      }
    } finally {
      setDecisionSubmitting(false);
    }
  };

  if (!enabled) {
    return (
      <div className="px-6 py-4">
        <p className="rounded-md border border-gray-200 bg-white px-3 py-4 text-sm text-gray-500">
          El inbox de aprobaciones IA no está habilitado en este entorno.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-semibold text-gray-900">Aprobaciones IA</h1>
        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden />
          Nexus
        </span>
        <button
          type="button"
          className="ml-auto inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          disabled={!headers || loading}
          onClick={() => void refresh()}
        >
          <RefreshCw className="h-4 w-4" aria-hidden />
          Actualizar
        </button>
      </div>

      {!headers && (
        <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Seleccioná un proyecto para ver las aprobaciones.
        </p>
      )}
      {error && <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === item.key
                ? "border-primary-700 text-primary-700"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
            onClick={() => switchTab(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {unavailable ? (
        <div className="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-500">
          Backend sin gobernanza activa: el módulo de aprobaciones aún no está deployado.
        </div>
      ) : (
        <div className="flex flex-col gap-4 xl:flex-row">
          <main className="min-w-0 flex-1 space-y-2">
            {items.map((item) => {
              const expires = tab === "pending" ? expiresLabel(item.expires_at, now) : null;
              return (
                <button
                  key={item.request_id}
                  type="button"
                  className={`w-full rounded-lg border bg-white p-3 text-left shadow-sm transition hover:border-primary-300 ${
                    selected?.request_id === item.request_id ? "border-primary-400" : "border-gray-200"
                  }`}
                  onClick={() => setSelectedId(item.request_id)}
                >
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${riskClass(item.risk_level)}`}>
                      {item.risk_level}
                    </span>
                    <span className={`rounded border px-2 py-0.5 text-[11px] ${statusClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <h3 className="line-clamp-2 text-sm font-semibold text-gray-900">{item.action_type}</h3>
                  <p className="mt-1 line-clamp-2 text-xs text-gray-600">{item.reason}</p>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500">
                    <span>{item.requested_by}</span>
                    <span>{expires ?? compactDate(item.created_at)}</span>
                  </div>
                </button>
              );
            })}
            {!loading && items.length === 0 && (
              <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-8 text-center text-sm text-gray-500">
                {tab === "pending" ? "Sin aprobaciones pendientes." : "Sin historial de aprobaciones."}
              </div>
            )}
          </main>

          <ApprovalDetail
            item={selected}
            now={now}
            ownRequest={ownRequest}
            deciding={decisionSubmitting}
            onShowEvidence={showEvidence}
            onDecide={openDecision}
          />
        </div>
      )}

      <EvidenceDrawer
        open={evidenceItem !== null}
        onClose={closeEvidence}
        title={evidenceItem ? `${evidenceItem.action_type} · ${evidenceItem.request_id.slice(0, 8)}` : undefined}
        evidence={evidenceItem?.params ? { items: [evidenceItem.params] } : undefined}
        nexusEvidence={evidenceView}
      />

      <DecisionModal
        decision={decision}
        note={decisionNote}
        submitting={decisionSubmitting}
        onNoteChange={setDecisionNote}
        onConfirm={() => void submitDecision()}
        onClose={() => {
          if (decisionSubmitting) return;
          setDecision(null);
          setDecisionNote("");
        }}
      />
    </div>
  );
};

export default AIApprovals;
