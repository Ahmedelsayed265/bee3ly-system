import type { ReactNode } from 'react';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';
import type { SocialAccount } from '@/features/settings/types';
import { cn } from '@/lib/utils';

function statusLabel(status: string | undefined, t: (k: MessageKey) => string) {
  switch (status) {
    case 'CONNECTED':
      return t('connectionConnected');
    case 'SIMULATION':
      return t('connectionSimulation');
    case 'CONNECTING':
      return t('connectionConnecting');
    case 'REAUTH_REQUIRED':
      return t('connectionReauth');
    case 'ERROR':
      return t('connectionError');
    default:
      return t('connectionDisconnected');
  }
}

function statusTone(status: string | undefined) {
  switch (status) {
    case 'CONNECTED':
      return 'bg-trust/15 text-trust';
    case 'CONNECTING':
      return 'bg-brand/10 text-brand';
    case 'ERROR':
    case 'REAUTH_REQUIRED':
      return 'bg-danger/10 text-danger';
    default:
      return 'bg-lavender text-muted';
  }
}

type ChannelCardProps = {
  icon: ReactNode;
  iconClassName: string;
  title: string;
  description: string;
  account?: SocialAccount | null;
  action: ReactNode;
  footer?: ReactNode;
};

export function ChannelCard({
  icon,
  iconClassName,
  title,
  description,
  account,
  action,
  footer,
}: ChannelCardProps) {
  const { t } = useLocale();
  const connected =
    account?.status === 'CONNECTED' || account?.status === 'CONNECTING';

  return (
    <article className="border-border bg-surface flex h-full flex-col gap-4 rounded-2xl border p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              'inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
              iconClassName,
            )}
          >
            {icon}
          </span>
          <div className="min-w-0">
            <h3 className="text-ink text-sm font-bold">{title}</h3>
            <p className="text-muted mt-0.5 text-xs leading-5">{description}</p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold',
            statusTone(account?.status),
          )}
        >
          {account ? statusLabel(account.status, t) : t('channelNotLinked')}
        </span>
      </div>

      {connected && account?.displayName ? (
        <div className="bg-page rounded-xl px-3 py-2.5 text-sm">
          <p className="text-ink font-semibold">{account.displayName}</p>
          {account.webhookSubscribedAt ? (
            <p className="text-trust mt-0.5 text-[11px]">webhook</p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2">{action}</div>
      {footer}
    </article>
  );
}
