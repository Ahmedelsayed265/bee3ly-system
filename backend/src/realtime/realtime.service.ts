import { Injectable } from '@nestjs/common';
import type { Server } from 'socket.io';
import { REALTIME_EVENTS } from './realtime.events';

@Injectable()
export class RealtimeService {
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  emitToBusiness(businessId: string, event: string, payload: unknown) {
    this.server?.to(`business:${businessId}`).emit(event, payload);
  }

  notifyConversationUpdated(businessId: string, conversationId: string) {
    this.emitToBusiness(businessId, REALTIME_EVENTS.CONVERSATION_UPDATED, {
      conversationId,
    });
  }

  notifyNotificationCreated(
    businessId: string,
    notification: {
      id: string;
      businessId: string;
      type: string;
      title: string;
      body: string;
      data: unknown;
      readAt: Date | null;
      createdAt: Date;
    },
  ) {
    this.emitToBusiness(businessId, REALTIME_EVENTS.NOTIFICATION_CREATED, {
      notification,
    });
  }
}
