import { Injectable, Logger } from '@nestjs/common';
import { InboundMessageService } from '../../channels/inbound-message.service';
import type { InboundMessageEvent } from '../../channels/channel.types';
import { PrismaService } from '../../prisma/prisma.service';

type TikTokWebhookPayload = {
  client_key?: string;
  event?: string;
  create_time?: number;
  user_openid?: string;
  content?: string;
};

type TikTokMessageContent = {
  from?: string;
  from_user?: { id?: string; role?: string };
  to_user?: { role?: string };
  unique_identifier?: string;
  conversation_id?: string;
  message_id?: string;
  timestamp?: number;
  type?: string;
  text?: { body?: string };
};

@Injectable()
export class TikTokWebhookService {
  private readonly logger = new Logger(TikTokWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inbound: InboundMessageService,
  ) {}

  async handle(body: Record<string, unknown>) {
    const payload = body as TikTokWebhookPayload;
    const event = payload.event ?? '';
    if (
      event !== 'im_receive_msg' &&
      event !== 'im_receive_msg_eu' &&
      event !== 'im_send_msg'
    ) {
      this.logger.debug(`Ignoring TikTok webhook event=${event || 'unknown'}`);
      return { success: true };
    }

    if (event === 'im_receive_msg_eu') {
      this.logger.warn(
        'TikTok EU privacy webhook received — fetch message content via Business Messaging API if needed',
      );
      return { success: true };
    }

    if (event === 'im_send_msg') {
      return { success: true };
    }

    const businessOpenId = payload.user_openid?.trim();
    if (!businessOpenId || !payload.content) {
      return { success: true };
    }

    let content: TikTokMessageContent;
    try {
      content = JSON.parse(payload.content) as TikTokMessageContent;
    } catch {
      this.logger.warn('TikTok webhook content is not valid JSON');
      return { success: true };
    }

    if (content.from_user?.role === 'business_account') {
      return { success: true };
    }

    const text = content.text?.body?.trim() ?? '';
    if (content.type && content.type !== 'text') {
      this.logger.log(
        `Ignoring TikTok message type=${content.type} message_id=${content.message_id ?? '-'}`,
      );
      return { success: true };
    }
    if (!text) {
      return { success: true };
    }

    const senderId =
      content.from_user?.id?.trim() ||
      content.unique_identifier?.trim() ||
      content.from?.trim();
    const conversationId = content.conversation_id?.trim();
    if (!senderId || !conversationId) {
      return { success: true };
    }

    const externalEventId =
      content.message_id ??
      `${businessOpenId}:${senderId}:${content.timestamp ?? Date.now()}`;
    const claimed = await this.claimEvent(externalEventId, body);
    if (!claimed) {
      return { success: true };
    }

    const inbound: InboundMessageEvent = {
      provider: 'TIKTOK',
      channel: 'TIKTOK',
      externalAccountId: businessOpenId,
      externalSenderId: senderId,
      externalMessageId: content.message_id,
      senderName: content.from?.trim() || undefined,
      text,
      timestamp: content.timestamp,
      tiktokConversationId: conversationId,
      raw: body,
    };

    try {
      await this.inbound.ingest(inbound);
      await this.markEvent(externalEventId, 'PROCESSED');
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await this.markEvent(externalEventId, 'ERROR', msg);
      this.logger.warn(`TikTok inbound ingest failed: ${msg}`);
    }

    return { success: true };
  }

  private async claimEvent(externalEventId: string, payload: unknown) {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          provider: 'TIKTOK',
          externalEventId,
          payload: payload as object,
          status: 'RECEIVED',
        },
      });
      return true;
    } catch {
      return false;
    }
  }

  private async markEvent(
    externalEventId: string,
    status: string,
    error?: string,
  ) {
    await this.prisma.webhookEvent.updateMany({
      where: { provider: 'TIKTOK', externalEventId },
      data: {
        status,
        error: error ?? null,
        processedAt: status === 'PROCESSED' ? new Date() : undefined,
      },
    });
  }
}
