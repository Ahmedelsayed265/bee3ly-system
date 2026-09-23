import { ChannelMark } from '@/components/brand/channel-icons';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import { cn } from '@/lib/utils';

type ConversationSummary = {
  id: string;
  channel: string;
  needsHuman: boolean;
  mode?: string;
  conversionStage?: string;
  customer: { name: string | null; phone: string | null };
  messages: Array<{ content: string; role: string; intent?: string | null }>;
  leads?: Array<{ status: string; intent: string | null }>;
};

type ConversationListProps = {
  conversations: ConversationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

function labelOrRaw(
  t: (key: MessageKey) => string,
  prefix: string,
  value: string | undefined | null,
  fallback: MessageKey,
) {
  if (!value) return t(fallback);
  const key = `${prefix}${value}` as MessageKey;
  const translated = t(key);
  return translated === key ? value : translated;
}

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
}: ConversationListProps) {
  const { t } = useLocale();

  return (
    <div className="border-border bg-surface flex min-h-0 flex-col overflow-hidden rounded-2xl border">
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">
        {conversations.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full rounded-xl px-3 py-2.5 text-start transition',
              selectedId === c.id
                ? 'bg-brand/10 text-ink'
                : 'hover:bg-lavender text-muted',
            )}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-ink flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold">
                <ChannelMark channel={c.channel} className="shrink-0" />
                <span className="truncate">
                  {c.customer.name ?? t('unknownCustomer')}
                </span>
              </p>
              <span className="text-muted text-[10px] font-semibold">
                {c.mode === 'HUMAN' || c.needsHuman
                  ? t('modeYou')
                  : t('modeAi')}
              </span>
            </div>
            <p className="truncate text-[11px]">
              {c.messages[0]?.content ??
                labelOrRaw(t, 'channel_', c.channel, 'channel_FACEBOOK')}
            </p>
            <p className="text-muted mt-0.5 truncate text-[10px]">
              {labelOrRaw(t, 'stage_', c.conversionStage, 'stage_NEW')}
              {c.leads?.[0]?.status
                ? ` · ${labelOrRaw(t, 'leadStatus_', c.leads[0].status, 'leadStatus_NEW')}`
                : ''}
            </p>
          </button>
        ))}
        {conversations.length === 0 ? (
          <p className="text-muted p-3 text-sm">{t('noConversations')}</p>
        ) : null}
      </div>
    </div>
  );
}
