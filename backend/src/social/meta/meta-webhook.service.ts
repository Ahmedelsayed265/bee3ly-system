import { createHmac, timingSafeEqual } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { InboundMessageService } from '../../channels/inbound-message.service';
import type { InboundMessageEvent } from '../../channels/channel.types';

@Injectable()
export class MetaWebhookService {
  private readonly logger = new Logger(MetaWebhookService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly inbound: InboundMessageService,
  ) {}

  verify(mode?: string, token?: string, challenge?: string) {
    const verifyToken = this.config.get<string>(
      'META_WEBHOOK_VERIFY_TOKEN',
      'bee3ly-verify',
    );
    if (mode === 'subscribe' && token === verifyToken) {
      return challenge ?? '';
    }
    throw new BadRequestException('Webhook verification failed');
  }

  verifySignature(rawBody: Buffer | string, signatureHeader?: string) {
    const appSecret = this.config.get<string>('META_APP_SECRET');
    // In local/dev without secret, skip (but log)
    if (!appSecret) {
      this.logger.warn('META_APP_SECRET missing — skipping signature check');
      return;
    }
    if (!signatureHeader?.startsWith('sha256=')) {
      throw new UnauthorizedException('Missing X-Hub-Signature-256');
    }
    const expected = createHmac('sha256', appSecret)
      .update(typeof rawBody === 'string' ? rawBody : rawBody)
      .digest('hex');
    const provided = signatureHeader.slice('sha256='.length);
    const a = Buffer.from(expected);
    const b = Buffer.from(provided);
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
  }

  async handle(body: Record<string, unknown>, rawBody?: Buffer | string) {
    // Signature should be verified by controller when raw body available
    void rawBody;

    const objectType = String(body.object ?? '');
    const entry = (body.entry as Array<Record<string, unknown>> | undefined) ?? [];

    for (const item of entry) {
      const pageId = String(item.id ?? '');
      const messaging =
        (item.messaging as Array<Record<string, unknown>> | undefined) ?? [];

      for (const event of messaging) {
        const sender = event.sender as { id?: string } | undefined;
        const recipient = event.recipient as { id?: string } | undefined;
        const message = event.message as
          | { mid?: string; text?: string; is_echo?: boolean }
          | undefined;
        if (!sender?.id || !recipient?.id || !message?.text || message.is_echo) {
          continue;
        }

        const externalEventId =
          message.mid ??
          `${pageId}:${sender.id}:${event.timestamp ?? Date.now()}:${message.text.slice(0, 24)}`;

        const created = await this.claimEvent('META', externalEventId, event);
        if (!created) {
          this.logger.debug(`Duplicate webhook event ${externalEventId}`);
          continue;
        }

        const channel =
          objectType === 'instagram' || recipient.id.startsWith('ig_')
            ? 'INSTAGRAM'
            : 'FACEBOOK';

        const inbound: InboundMessageEvent = {
          provider: 'META',
          channel,
          externalAccountId: recipient.id,
          externalSenderId: sender.id,
          externalMessageId: message.mid,
          text: message.text,
          timestamp: Number(event.timestamp ?? Date.now()),
          raw: event,
        };

        try {
          await this.inbound.ingest(inbound);
          await this.markEvent(externalEventId, 'PROCESSED');
        } catch (e) {
          const err = e instanceof Error ? e.message : 'unknown';
          await this.markEvent(externalEventId, 'ERROR', err);
          this.logger.warn(`Inbound ingest failed: ${err}`);
        }
      }

      // Comments — architecture hook only (App Review often required)
      const changes =
        (item.changes as Array<Record<string, unknown>> | undefined) ?? [];
      for (const change of changes) {
        if (change.field !== 'feed') continue;
        this.logger.debug(
          `Feed change received (comment→DM deferred): ${JSON.stringify(change).slice(0, 200)}`,
        );
      }
    }

    return { success: true };
  }

  private async claimEvent(
    provider: string,
    externalEventId: string,
    payload: unknown,
  ) {
    try {
      await this.prisma.webhookEvent.create({
        data: {
          provider,
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
      where: { provider: 'META', externalEventId },
      data: {
        status,
        error: error ?? null,
        processedAt: status === 'PROCESSED' ? new Date() : undefined,
      },
    });
  }
}
