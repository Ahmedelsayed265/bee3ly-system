import { Bot, UserRound, Zap } from 'lucide-react';
import { useLocale } from '@/features/i18n/locale-context';
import { cn } from '@/lib/utils';

type MessageBubbleProps = {
  role: string;
  content: string;
  customerName?: string | null;
  quickReplies?: Array<{ title: string; payload: string }>;
};

export function MessageBubble({
  role,
  content,
  customerName,
  quickReplies,
}: MessageBubbleProps) {
  const { t } = useLocale();
  const isCustomer = role === 'CUSTOMER';
  const isHuman = role === 'HUMAN';
  const speaker = isCustomer
    ? (customerName ?? t('speakerCustomer'))
    : isHuman
      ? t('speakerYou')
      : t('speakerAi');

  return (
    <div
      className={cn(
        'flex max-w-[85%] flex-col gap-1.5',
        isCustomer ? 'ms-auto items-end' : 'items-start',
      )}
    >
      <div
        className={cn(
          'flex items-center gap-1.5',
          isCustomer ? 'flex-row-reverse' : 'flex-row',
        )}
      >
        <span
          className={cn(
            'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full',
            isCustomer
              ? 'bg-brand text-white'
              : isHuman
                ? 'bg-trust text-white'
                : 'bg-lavender text-ink',
          )}
        >
          {isCustomer ? (
            <UserRound className="h-3.5 w-3.5" />
          ) : isHuman ? (
            <Zap className="h-3.5 w-3.5" />
          ) : (
            <Bot className="h-3.5 w-3.5" />
          )}
        </span>
        <span className="text-muted text-[11px] font-medium">{speaker}</span>
      </div>
      <div
        className={cn(
          'w-fit rounded-2xl px-3 py-2 text-sm',
          isCustomer
            ? 'bg-brand rounded-se-md text-white'
            : isHuman
              ? 'border-trust/25 bg-trust/10 text-ink rounded-ss-md border'
              : 'bg-lavender text-ink rounded-ss-md',
        )}
      >
        <p className="whitespace-pre-wrap">{content}</p>
        {quickReplies?.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {quickReplies.map((item) => (
              <span
                key={item.payload}
                className="border-brand/30 text-brand rounded-full border bg-white/70 px-2.5 py-1 text-[11px] font-semibold"
              >
                {item.title}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
