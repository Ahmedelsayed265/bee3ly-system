import type { RefObject } from 'react';
import { Button } from '@/components/ui/button';
import { MessageBubble } from '@/features/inbox/components/message-bubble';
import { MessageComposer } from '@/features/inbox/components/message-composer';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

type Message = {
  id: string;
  role: string;
  content: string;
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
  selectedId: string | null;
  isHumanMode: boolean;
  isModePending: boolean;
  draft: string;
  isSending: boolean;
  messagesEndRef: RefObject<HTMLDivElement | null>;
  onDraftChange: (value: string) => void;
  onSend: (content: string) => void;
  onSetMode: (mode: 'AI' | 'HUMAN') => void;
  onDeleteRequest: () => void;
};

function channelLabel(t: (key: MessageKey) => string, channel: string) {
  const key = `channel_${channel}` as MessageKey;
  const translated = t(key);
  return translated === key ? channel : translated;
}

export function ConversationThread({
  conversation,
  messages,
  selectedId,
  isHumanMode,
  isModePending,
  draft,
  isSending,
  messagesEndRef,
  onDraftChange,
  onSend,
  onSetMode,
  onDeleteRequest,
}: ConversationThreadProps) {
  const { t } = useLocale();

  return (
    <div className="border-border bg-surface flex min-h-0 flex-col overflow-hidden rounded-2xl border">
      {conversation ? (
        <div className="border-border flex shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3">
          <div>
            <p className="text-ink text-sm font-semibold">
              {conversation.customer.name ?? t('unknownCustomer')}
            </p>
            <p className="text-muted text-[11px]">
              {channelLabel(t, conversation.channel)}
              {conversation.campaign ? ` · ${conversation.campaign.name}` : ''}
              {conversation.handoffReason
                ? ` · ${conversation.handoffReason}`
                : ''}
            </p>
          </div>
          <div className="flex gap-2">
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
      ) : null}

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((m) => (
          <MessageBubble
            key={m.id}
            role={m.role}
            content={m.content}
            customerName={conversation?.customer.name}
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
        onDraftChange={onDraftChange}
        onSend={onSend}
      />
    </div>
  );
}
