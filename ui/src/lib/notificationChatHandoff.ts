/** Handoff de notificación → chat (sessionStorage bridge). */

export const NOTIFICATION_CHAT_HANDOFF_KEY = "ponti.notificationChatHandoff";

export type NotificationChatHandoff = {
  notificationId: string;
  insightId: string;
  title: string;
  summary: string;
  entityType: string;
  entityId: string;
  severity: number;
  source: "in_app_notification";
  suggestedMessage?: string;
};

export type PontiChatHandoff = {
  source: "in_app_notification" | "direct";
  notification_id?: string | null;
  insight_id?: string | null;
  insight_scope?: string | null;
  period?: string | null;
};

/** Construye el payload de handoff para enviar al backend. */
export function buildChatRequestHandoff(h: NotificationChatHandoff): PontiChatHandoff {
  return {
    source: h.source,
    notification_id: h.notificationId,
    insight_id: h.insightId,
    insight_scope: `${h.entityType}:${h.entityId}`,
  };
}

/** Arma el primer mensaje al asistente desde la notificación. */
export function buildHandoffUserMessage(h: NotificationChatHandoff): string {
  if (h.suggestedMessage) {
    return h.suggestedMessage;
  }
  return `Necesito entender este insight: ${h.title}\n\n${h.summary}`;
}
