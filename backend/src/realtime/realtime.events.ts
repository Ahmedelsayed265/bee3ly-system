export const REALTIME_EVENTS = {
  CONVERSATION_UPDATED: 'conversation:updated',
  NOTIFICATION_CREATED: 'notification:created',
} as const;

export type ConversationUpdatedPayload = {
  conversationId: string;
};

export type NotificationCreatedPayload = {
  notification: {
    id: string;
    businessId: string;
    type: string;
    title: string;
    body: string;
    data: unknown;
    readAt: Date | null;
    createdAt: Date;
  };
};
