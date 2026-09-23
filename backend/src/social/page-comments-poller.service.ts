import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SchedulerRegistry } from '@nestjs/schedule';
import { MessageRole, SocialConnectionStatus, SocialPlatform } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RealtimeService } from '../realtime/realtime.service';
import { MetaGraphClient } from './meta/meta-graph.client';
import { MetaOauthService } from './meta/meta-oauth.service';
import { PageCommentsService } from './page-comments.service';

/**
 * Temporary Dev-mode fallback: Meta often does not deliver live `feed`
 * webhooks while the App is Unpublished. Poll Graph for new comments and
 * persist via the same PageCommentsService path as webhooks.
 *
 * Interval: META_COMMENT_POLL_INTERVAL_MS (default 120000 = 2 minutes)
 * Disable: META_COMMENT_POLLING_ENABLED=false
 */
@Injectable()
export class PageCommentsPollerService implements OnModuleInit {
  private readonly logger = new Logger(PageCommentsPollerService.name);
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly graph: MetaGraphClient,
    private readonly oauth: MetaOauthService,
    private readonly pageComments: PageCommentsService,
    private readonly realtime: RealtimeService,
    private readonly scheduler: SchedulerRegistry,
  ) {}

  onModuleInit() {
    if (!this.enabled()) {
      this.logger.log('Comment polling disabled (META_COMMENT_POLLING_ENABLED)');
      return;
    }
    const ms = this.pollIntervalMs();
    const timer = setInterval(() => {
      void this.syncFacebookComments();
    }, ms);
    this.scheduler.addInterval('page-comments-poll', timer);
    this.logger.log(`Comment polling every ${ms}ms`);
    // Kick once shortly after boot so reconnects don't wait a full interval.
    setTimeout(() => void this.syncFacebookComments(), 5_000);
  }

  private enabled() {
    const raw = this.config.get<string>('META_COMMENT_POLLING_ENABLED', 'true');
    return raw !== 'false' && raw !== '0';
  }

  private pollIntervalMs() {
    const raw = Number(
      this.config.get<string>('META_COMMENT_POLL_INTERVAL_MS', '6000'),
    );
    if (!Number.isFinite(raw) || raw < 10_000) return 120_000;
    return Math.floor(raw);
  }

  private fixedReply(
    businessName?: string | null,
    businessReply?: string | null,
  ) {
    const fromBusiness = businessReply?.trim();
    if (fromBusiness) return fromBusiness;
    const fromEnv = this.config.get<string>('META_COMMENT_FIXED_REPLY')?.trim();
    if (fromEnv) return fromEnv;
    const shop = businessName?.trim() || 'المتجر';
    return `أهلاً بيك! تعليقك وصل لـ ${shop}. هنبعتلك التفاصيل في رسالة خاصة قريب 💬`;
  }

  async syncFacebookComments() {
    if (!this.enabled()) return;
    if (this.running) {
      this.logger.debug('Comment poll skipped — previous run still in progress');
      return;
    }
    this.running = true;
    try {
      await this.pollAllConnectedPages();
      await this.pollInstagramAccounts();
    } catch (e) {
      const err = e instanceof Error ? e.message : 'unknown';
      this.logger.warn(`Comment poll failed: ${err}`);
    } finally {
      this.running = false;
    }
  }

  async pollAllConnectedPages() {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        platform: SocialPlatform.FACEBOOK,
        status: SocialConnectionStatus.CONNECTED,
        accessTokenEnc: { not: null },
      },
      include: {
        business: {
          select: {
            name: true,
            aiAgent: { select: { commentFixedReply: true } },
          },
        },
      },
    });

    let imported = 0;
    let replied = 0;
    let conversations = 0;
    let privateReplies = 0;

    for (const account of accounts) {
      if (!account.accessTokenEnc || !account.externalId) continue;

      const meta =
        account.metadata &&
        typeof account.metadata === 'object' &&
        !Array.isArray(account.metadata)
          ? (account.metadata as Record<string, unknown>)
          : {};

      if (meta.skipCommentPolling === true) continue;
      if (!account.capabilities?.includes('feed')) {
        this.logger.debug(
          `Skip comment poll pageId=${account.externalId} (no feed capability)`,
        );
        continue;
      }

      let token: string;
      try {
        token = this.oauth.decrypt(account.accessTokenEnc);
      } catch (e) {
        this.logger.warn(
          `Decrypt failed for socialAccount=${account.id}: ${
            e instanceof Error ? e.message : 'unknown'
          }`,
        );
        continue;
      }

      const result = await this.graph.listRecentPageComments(
        account.externalId,
        token,
      );
      if (!result.ok) {
        if (
          result.error.includes('pages_read_engagement') ||
          result.error.includes('(#10)')
        ) {
          await this.prisma.socialAccount.update({
            where: { id: account.id },
            data: {
              metadata: {
                ...meta,
                skipCommentPolling: true,
                skipCommentPollingReason: 'missing_pages_read_engagement',
              },
            },
          });
          this.logger.warn(
            `Comment poll disabled for pageId=${account.externalId} — reconnect with pages_read_engagement`,
          );
        }
        continue;
      }

      const replyText = this.fixedReply(
        account.business?.name,
        account.business?.aiAgent?.commentFixedReply,
      );

      for (const comment of result.comments) {
        let row = await this.prisma.pageComment.findUnique({
          where: { commentId: comment.commentId },
        });
        const isNew = !row;

        if (!row) {
          row = await this.pageComments.createFromWebhook({
            pageId: comment.pageId,
            commentId: comment.commentId,
            postId: comment.postId,
            fromUserId: comment.fromUserId,
            fromName: comment.fromName,
            message: comment.message,
            commentedAt: comment.commentedAt,
            rawPayload: {
              source: 'polling',
              comment: comment.raw,
            },
          });
          if (row) {
            imported += 1;
            this.logger.log(
              `New Facebook comment received (poll): ${row.commentId}`,
            );
          }
        }
        if (!row) continue;

        // 1) Inbox conversation
        if (!row.conversationId) {
          const conv =
            await this.pageComments.ensureConversationFromComment(row.commentId);
          if (conv) {
            conversations += 1;
            row = (await this.prisma.pageComment.findUnique({
              where: { id: row.id },
            }))!;
          }
        }

        // 2) Public comment reply
        if (!row.publicRepliedAt) {
          const reply = await this.graph.replyToComment(
            row.commentId,
            token,
            replyText,
          );
          if (reply.ok) {
            row = await this.prisma.pageComment.update({
              where: { id: row.id },
              data: {
                publicReplyId: reply.replyId,
                publicRepliedAt: new Date(),
              },
            });
            replied += 1;
            this.logger.log(
              `Fixed public reply sent commentId=${row.commentId} replyId=${reply.replyId}`,
            );
          }
        }

        // 3) Private Reply → Messenger thread + seed AI message in Bee3ly inbox
        if (!row.privateRepliedAt) {
          const priv = await this.graph.sendPrivateReplyToComment(
            token,
            row.commentId,
            replyText,
          );
          if (priv.sent) {
            row = await this.prisma.pageComment.update({
              where: { id: row.id },
              data: { privateRepliedAt: new Date() },
            });
            privateReplies += 1;
            this.logger.log(
              `Private reply sent commentId=${row.commentId} messageId=${priv.messageId}`,
            );

            if (row.conversationId) {
              await this.prisma.message.create({
                data: {
                  conversationId: row.conversationId,
                  role: MessageRole.AI,
                  content: replyText,
                  meta: {
                    source: 'page_comment_private_reply',
                    pageCommentId: row.commentId,
                    metaMessageId: priv.messageId,
                  },
                },
              });
              await this.prisma.conversation.update({
                where: { id: row.conversationId },
                data: { lastMessageAt: new Date() },
              });
              this.realtime.notifyConversationUpdated(
                row.businessId,
                row.conversationId,
              );
            }
          } else if (isNew) {
            this.logger.warn(
              `Private reply skipped/failed commentId=${row.commentId}`,
            );
          }
        }
      }

      await this.prisma.socialAccount.update({
        where: { id: account.id },
        data: {
          metadata: {
            ...meta,
            skipCommentPolling: false,
            lastCommentsSyncedAt: new Date().toISOString(),
          },
        },
      });
    }

    if (imported || replied || conversations || privateReplies) {
      this.logger.log(
        `Comment poll imported=${imported} conversations=${conversations} replied=${replied} privateReplies=${privateReplies}`,
      );
    }
    return {
      imported,
      conversations,
      replied,
      privateReplies,
      pages: accounts.length,
    };
  }

  /** Same Dev-mode fallback for Instagram comments when webhooks do not arrive. */
  private async pollInstagramAccounts() {
    const accounts = await this.prisma.socialAccount.findMany({
      where: {
        platform: SocialPlatform.INSTAGRAM,
        status: SocialConnectionStatus.CONNECTED,
        accessTokenEnc: { not: null },
      },
    });

    for (const account of accounts) {
      if (!account.accessTokenEnc || !account.externalId) continue;
      let token: string;
      try {
        token = this.oauth.decrypt(account.accessTokenEnc);
      } catch (e) {
        this.logger.warn(
          `Decrypt failed for instagram=${account.id}: ${
            e instanceof Error ? e.message : 'unknown'
          }`,
        );
        continue;
      }

      const result = await this.graph.listRecentInstagramComments(
        account.externalId,
        token,
      );
      if (!result.ok) continue;

      for (const comment of result.comments) {
        const existing = await this.prisma.pageComment.findUnique({
          where: { commentId: comment.commentId },
        });
        if (existing?.publicRepliedAt && existing.privateRepliedAt) continue;

        const row = await this.pageComments.handleInstagramComment({
          pageId: account.externalId,
          commentId: comment.commentId,
          postId: comment.postId,
          fromUserId: comment.fromUserId,
          fromName: comment.fromName,
          message: comment.message,
          commentedAt: comment.commentedAt,
          rawPayload: { source: 'polling', comment: comment.raw },
        });
        if (row && !existing) {
          this.logger.log(
            `New Instagram comment received (poll): ${row.commentId}`,
          );
        }
      }
    }
  }
}
