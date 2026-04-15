/** Handoff de notificación → chat (sessionStorage bridge). */

export const NOTIFICATION_CHAT_HANDOFF_KEY = "ponti.notificationChatHandoff";

export type NotificationChatHandoff = {
  title: string;
  body: string;
  entityType: string;
  entityId: string;
  source: "in_app_notification";
  suggestedMessage: string;
};
