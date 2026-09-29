import { Bot, Check, UserRound, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import { ChatFormattedText } from '@/lib/chat-formatted-text';
import { cn } from '@/lib/utils';

type MessageBubbleProps = {
  role: string;
  content: string;
  customerName?: string | null;
  quickReplies?: Array<{ title: string; payload: string }>;
  attachments?: Array<{ type: string; url: string }>;
  paymentConfirmOnImage?: boolean;
  onConfirmPayment?: () => void;
  isConfirmPaymentPending?: boolean;
};

export function MessageBubble({
  role,
  content,
  customerName,
  quickReplies,
  attachments = [],
  paymentConfirmOnImage = false,
  onConfirmPayment,
  isConfirmPaymentPending = false,
}: MessageBubbleProps) {
  const { t } = useLocale();
  const images = attachments.filter((a) => a.type === 'image' && a.url);
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
        {images.length ? (
          <div className="flex flex-col gap-2">
            {images.map((item) => (
              <div
                key={item.url}
                className="relative inline-block max-w-full overflow-hidden rounded-xl"
              >
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block"
                >
                  <img
                    src={item.url}
                    alt=""
                    className="max-h-72 max-w-full object-contain"
                  />
                </a>
                {paymentConfirmOnImage && onConfirmPayment ? (
                  <div className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/55 via-black/15 to-transparent backdrop-blur-[1px]">
                    <div className="pointer-events-auto flex justify-center p-3">
                      <Button
                        type="button"
                        size="sm"
                        className="text-brand h-9 gap-1.5 rounded-full border border-white/40 bg-white/85 px-4 text-xs font-bold shadow-lg backdrop-blur-md hover:bg-white"
                        disabled={isConfirmPaymentPending}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onConfirmPayment();
                        }}
                      >
                        <Check className="size-3.5" strokeWidth={3} />
                        {t('confirmPaymentReceipt')}
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
        {content.trim() ? (
          <ChatFormattedText
            text={content}
            className={images.length ? 'mt-2' : undefined}
          />
        ) : images.length ? (
          <p className="text-[11px] opacity-80">{t('inboxAttachmentImage')}</p>
        ) : null}
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
