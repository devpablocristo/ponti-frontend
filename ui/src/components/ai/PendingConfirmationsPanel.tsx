import { useState } from "react";
import { Check, Clock3, ExternalLink, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAiFeature } from "@/hooks/useAiFeatures";
import { isRecord } from "@/pages/admin/ai-assistant/aiAssistantEvidence";
import type { PontiChatPendingConfirmation } from "@/types/aiChat";

/**
 * Shape normalizado de un pending_confirmation. El BE (Axis/ponti-ai) no
 * garantiza el contrato, así que todos los campos son opcionales y se
 * resuelven defensivamente.
 */
export type NormalizedPendingConfirmation = {
  id: string | null;
  message: string;
  capabilityId: string | null;
  approvalRequired: boolean;
  nexusRequestId: string | null;
};

const stringField = (record: Record<string, unknown>, keys: string[]): string | null => {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
  }
  return null;
};

export const normalizePendingConfirmation = (
  item: PontiChatPendingConfirmation
): NormalizedPendingConfirmation => {
  if (typeof item === "string") {
    return {
      id: null,
      message: item,
      capabilityId: null,
      approvalRequired: false,
      nexusRequestId: null,
    };
  }
  if (!isRecord(item)) {
    return { id: null, message: "Acción pendiente", capabilityId: null, approvalRequired: false, nexusRequestId: null };
  }
  const id = stringField(item, ["id", "action_id", "confirmation_id"]);
  const capabilityId = stringField(item, ["capability_id", "capability"]);
  const nexusRequestId = stringField(item, ["nexus_request_id", "request_id"]);
  const message =
    stringField(item, ["message", "description", "reason", "summary", "action_type"]) ??
    capabilityId ??
    "Acción pendiente de confirmación";
  return {
    id,
    message,
    capabilityId,
    approvalRequired: item.approval_required === true || Boolean(nexusRequestId),
    nexusRequestId,
  };
};

type ItemState = "idle" | "confirming" | "sent" | "dismissed";

const PassiveList = ({ items }: { items: PontiChatPendingConfirmation[] }) => (
  <ul className="space-y-1">
    {items.map((item, index) => (
      <li
        key={index}
        className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800"
      >
        Pendiente: {normalizePendingConfirmation(item).message}
      </li>
    ))}
  </ul>
);

export type PendingConfirmationsPanelProps = {
  items: PontiChatPendingConfirmation[];
  /** Envía el turno {message:"", confirmed_actions:[id], chat_id} vía useAiChatSession. */
  onConfirm?: (id: string) => Promise<boolean>;
  disabled?: boolean;
};

/**
 * Confirmaciones accionables en el chat (flag chat_confirmations):
 * - sin aprobación: Confirmar / Descartar (guard anti doble envío);
 * - con aprobación Nexus: deep-link al inbox de aprobaciones.
 * Con el flag apagado cae al render pasivo previo (lista ámbar).
 */
const PendingConfirmationsPanel = ({ items, onConfirm, disabled = false }: PendingConfirmationsPanelProps) => {
  const enabled = useAiFeature("chat_confirmations");
  const navigate = useNavigate();
  const [states, setStates] = useState<Record<string, ItemState>>({});

  if (items.length === 0) return null;
  if (!enabled || !onConfirm) {
    return <PassiveList items={items} />;
  }

  const stateFor = (key: string): ItemState => states[key] ?? "idle";
  const setStateFor = (key: string, state: ItemState) =>
    setStates((prev) => ({ ...prev, [key]: state }));

  const handleConfirm = async (key: string, id: string) => {
    // Guard anti doble click: solo se envía desde idle.
    if (stateFor(key) !== "idle") return;
    setStateFor(key, "confirming");
    try {
      const ok = await onConfirm(id);
      setStateFor(key, ok ? "sent" : "idle");
    } catch {
      setStateFor(key, "idle");
    }
  };

  return (
    <ul className="space-y-1">
      {items.map((raw, index) => {
        const item = normalizePendingConfirmation(raw);
        const key = item.id ?? `${index}-${item.message}`;
        const state = stateFor(key);

        if (state === "dismissed") {
          return (
            <li key={key} className="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-xs text-gray-500">
              Descartada: {item.message}
            </li>
          );
        }
        if (state === "sent") {
          return (
            <li key={key} className="rounded border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
              Confirmada: {item.message}
            </li>
          );
        }

        return (
          <li key={key} className="rounded border border-amber-200 bg-amber-50 px-2 py-1.5 text-xs text-amber-800">
            <div className="flex items-start gap-2">
              <Clock3 className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
              <div className="min-w-0 flex-1">
                <p>{item.message}</p>
                {item.capabilityId && <p className="mt-0.5 text-[11px] text-amber-700">{item.capabilityId}</p>}
              </div>
            </div>
            <div className="mt-1.5 flex flex-wrap gap-1.5 pl-5">
              {item.approvalRequired ? (
                <button
                  type="button"
                  className="inline-flex items-center gap-1 rounded border border-indigo-300 bg-white px-2 py-1 text-[11px] font-medium text-indigo-700 hover:bg-indigo-50"
                  onClick={() =>
                    navigate(
                      item.nexusRequestId
                        ? `/admin/ai/approvals?request_id=${encodeURIComponent(item.nexusRequestId)}`
                        : "/admin/ai/approvals"
                    )
                  }
                >
                  <ExternalLink className="h-3 w-3" aria-hidden />
                  Ver en Aprobaciones
                </button>
              ) : item.id ? (
                <>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded bg-primary-700 px-2 py-1 text-[11px] font-medium text-white hover:bg-primary-800 disabled:opacity-60"
                    disabled={disabled || state !== "idle"}
                    onClick={() => void handleConfirm(key, item.id as string)}
                  >
                    <Check className="h-3 w-3" aria-hidden />
                    {state === "confirming" ? "Confirmando…" : "Confirmar"}
                  </button>
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded border border-gray-300 bg-white px-2 py-1 text-[11px] font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                    disabled={state !== "idle"}
                    onClick={() => setStateFor(key, "dismissed")}
                  >
                    <X className="h-3 w-3" aria-hidden />
                    Descartar
                  </button>
                </>
              ) : (
                /* Sin id confirmable ni aprobación: solo informativo. */ null
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
};

export default PendingConfirmationsPanel;
