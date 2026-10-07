import type { RefObject } from 'react';
import { Bot, ChevronLeft, Trash2, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ChannelMark } from '@/components/brand/channel-icons';
import { MessageBubble } from '@/features/inbox/components/message-bubble';
import { MessageComposer } from '@/features/inbox/components/message-composer';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import {
  customerMessageDisplayText,
  messageAttachments,
} from '@/features/inbox/message-display';
import { latestPaymentReceiptMessageId } from '@/features/inbox/payment-receipt';
import { InboxThreadSkeleton } from '@/components/ui/skeleton-blocks';
import type { QuickReply, ReplyContext } from '@/features/inbox/reply-kit';
import { cn } from '@/lib/utils';

type Message = {
  id: string;
  role: string;
  content: string;
  meta?: {
    quickReplies?: QuickReply[];
    attachments?: Array<{ type: string; url: string }>;
    hiddenFromInbox?: boolean;
  } | null;
};

type Conversation = {
  customer: { name: string | null; phone: string | null };
  channel: string;
  campaign?: { id: string; name: string } | null;
  handoffReason?: string | null;
};

type ConversationThreadProps = {
  conversation: Conversation | undefined;
  messages: Message[];
  isLoading?: boolean;
  selectedId: string | null;
  isHumanMode: boolean;
  paymentReviewPending?: boolean;
  isModePending: boolean;
  isConfirmPaymentPending?: boolean;
  onConfirmPayment?: () => void;
  draft: string;
  isSending: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  replyContext: ReplyContext;
  onDraftChange: (value: string) => void;
  onSend: (content: string, quickReplies?: QuickReply[]) => void;
  onSetMode: (mode: 'AI' | 'HUMAN') => void;
  onDeleteRequest: () => void;
  onBack?: () => void;
  className?: string;
};

function channelLabel(t: (key: MessageKey) => string, channel: string) {
  const key = `channel_${channel}` as MessageKey;
  const translated = t(key);
  return translated === key ? channel : translated;
}

export function ConversationThread({
  conversation,
  messages,
  isLoading = false,
  selectedId,
  isHumanMode,
  paymentReviewPending = false,
  isModePending,
  isConfirmPaymentPending = false,
  onConfirmPayment,
  draft,
  isSending,
  messagesEndRef,
  replyContext,
  onDraftChange,
  onSend,
  onSetMode,
  onDeleteRequest,
  onBack,
  className,
}: ConversationThreadProps) {
  const { t } = useLocale();
  const receiptMessageId = paymentReviewPending
    ? latestPaymentReceiptMessageId(messages)
    : null;

  if (isLoading) {
    return <InboxThreadSkeleton />;
  }

  return (
    <div
      className={cn(
        'border-border bg-surface flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border',
        className,
      )}
    >
      {conversation ? (
        <>
          <div className="border-border flex shrink-0 items-center gap-2 border-b px-3 py-2 lg:hidden">
            {onBack ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9 w-9 shrink-0 p-0"
                aria-label={t('back')}
                onClick={onBack}
              >
                <ChevronLeft className="h-4 w-4 rtl:rotate-180" />
              </Button>
            ) : null}
            <div className="min-w-0 flex-1">
              <p className="text-ink flex items-center gap-1.5 truncate text-sm font-semibold">
                <ChannelMark
                  channel={conversation.channel}
                  className="shrink-0"
                />
                <span className="truncate">
                  {conversation.customer.name ?? t('unknownCustomer')}
                </span>
              </p>
              <p className="text-muted truncate text-[10px]">
                {channelLabel(t, conversation.channel)}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              {isHumanMode ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  aria-label={t('returnToAi')}
                  onClick={() => onSetMode('AI')}
                  disabled={isModePending}
                >
                  <Bot className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-9 w-9 p-0"
                  aria-label={t('takeOver')}
                  onClick={() => onSetMode('HUMAN')}
                  disabled={isModePending}
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="text-muted hover:text-danger hover:border-danger/40 h-9 w-9 p-0"
                aria-label={t('deleteConversation')}
                onClick={onDeleteRequest}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="border-border hidden shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 lg:flex">
            <div className="min-w-0">
              <p className="text-ink flex items-center gap-1.5 text-sm font-semibold">
                <ChannelMark channel={conversation.channel} />
                {conversation.customer.name ?? t('unknownCustomer')}
              </p>
              <p className="text-muted text-[11px]">
                {channelLabel(t, conversation.channel)}
                {conversation.campaign
                  ? ` · ${conversation.campaign.name}`
                  : ''}
                {conversation.handoffReason
                  ? ` · ${conversation.handoffReason}`
                  : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {isHumanMode ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSetMode('AI')}
                  disabled={isModePending}
                >
                  {t('returnToAi')}
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onSetMode('HUMAN')}
                  disabled={isModePending}
                >
                  {t('takeOver')}
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={onDeleteRequest}>
                {t('deleteConversation')}
              </Button>
            </div>
          </div>
        </>
      ) : null}

      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-3 py-4 pb-6 sm:px-4 sm:pb-8">
        {messages
          .filter(
            (m) => m.role !== 'SYSTEM' && m.meta?.hiddenFromInbox !== true,
          )
          .map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={
              m.role === 'CUSTOMER'
                ? customerMessageDisplayText(m.content)
                : m.content
            }
            customerName={conversation?.customer.name}
            quickReplies={m.meta?.quickReplies}
            attachments={messageAttachments(m.meta)}
            paymentConfirmOnImage={
              paymentReviewPending && m.id === receiptMessageId
            }
            onConfirmPayment={onConfirmPayment}
            isConfirmPaymentPending={isConfirmPaymentPending}
          />
        ))}
        {!selectedId ? (
          <p className="text-muted text-sm">{t('inboxEmptyHint')}</p>
        ) : null}
        <div ref={messagesEndRef} />
      </div>

      <MessageComposer
        draft={draft}
        isHumanMode={isHumanMode}
        isPending={isSending}
        replyContext={replyContext}
        onDraftChange={onDraftChange}
        onSend={onSend}
      />
    </div>
  );
}
