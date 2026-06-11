import { ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";

import { getAiApprovalsSummary } from "@/api/aiClient";
import { useAiFeature, useAiFeatures } from "@/hooks/useAiFeatures";
import { usePollingQuery } from "@/hooks/usePollingQuery";
import { useSelection } from "@/pages/login/context/useSelection";

export function ApprovalsBadge() {
  const enabled = useAiFeature("approvals_inbox");
  const { config } = useAiFeatures();
  const { projectId } = useSelection();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const headers = useMemo(() => (projectId ? { projectId: String(projectId) } : null), [projectId]);

  // Memoizada: el cambio de proyecto cambia la identidad de fn y fuerza un refetch inmediato.
  const fetchSummary = useCallback(() => {
    if (!headers) return Promise.reject(new Error("Proyecto no seleccionado"));
    return getAiApprovalsSummary(headers);
  }, [headers]);

  const { data: summary } = usePollingQuery(fetchSummary, {
    intervalMs: config.badge_poll_ms,
    enabled: enabled && Boolean(headers),
  });

  useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const count = summary?.pending_count ?? 0;
  const expiringSoon = summary?.expiring_soon_count ?? 0;

  useEffect(() => {
    if (count === 0) setOpen(false);
  }, [count]);

  if (!enabled || !projectId || count === 0) return null;

  return (
    <div ref={rootRef} className="relative hidden sm:block">
      <button
        type="button"
        className="inline-flex h-9 items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 text-xs font-semibold text-indigo-800 shadow-sm transition hover:bg-indigo-100"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        title="Aprobaciones IA pendientes"
      >
        <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
        <span>{count} aprobaciones</span>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-xl border border-indigo-200 bg-white p-3 text-sm text-slate-700 shadow-lg">
          <p className="font-semibold text-slate-900">Aprobaciones IA pendientes</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">
            Acciones de agentes esperando revisión humana (gobernanza Nexus).
          </p>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-indigo-50 px-2 py-1.5 text-xs text-indigo-900">
              <span>Pendientes</span>
              <span className="shrink-0 font-semibold">{count}</span>
            </div>
            {expiringSoon > 0 && (
              <div className="flex items-center justify-between gap-3 rounded-lg bg-amber-50 px-2 py-1.5 text-xs text-amber-900">
                <span>Expiran en menos de 15 min</span>
                <span className="shrink-0 font-semibold">{expiringSoon}</span>
              </div>
            )}
          </div>

          <Link
            to="/admin/ai/approvals"
            className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-indigo-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-indigo-700"
            onClick={() => setOpen(false)}
          >
            Revisar aprobaciones
          </Link>
        </div>
      ) : null}
    </div>
  );
}
