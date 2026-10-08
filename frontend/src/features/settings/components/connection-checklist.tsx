import { Button } from '@/components/ui/button';
import { useLocale } from '@/features/i18n/locale-context';
import type { MessageKey } from '@/features/i18n/messages';

export type ChecklistState = 'connected' | 'missing' | 'reconnect';

type Row = {
  key: string;
  labelKey: MessageKey;
  state: ChecklistState;
  onAction?: () => void;
  actionLabel?: string;
  actionDisabled?: boolean;
};

const STATE_KEY: Record<ChecklistState, MessageKey> = {
  connected: 'linkStatusOk',
  missing: 'linkStatusMissing',
  reconnect: 'linkStatusReconnect',
};

export function ConnectionChecklist({ rows }: { rows: Row[] }) {
  const { t } = useLocale();
  return (
    <section
      className="border-border bg-surface rounded-2xl border p-4"
      aria-labelledby="link-status-title"
    >
      <h2 id="link-status-title" className="text-ink text-base font-bold">
        {t('linkStatusTitle')}
      </h2>
      <ul className="mt-3 space-y-3">
        {rows.map((row) => (
          <li
            key={row.key}
            className="flex flex-wrap items-center justify-between gap-2"
          >
            <div>
              <p className="text-ink text-sm font-semibold">
                {t(row.labelKey)}
              </p>
              <p className="text-muted text-xs">
                {row.state === 'connected' ? '✓' : '✗'}{' '}
                {t(STATE_KEY[row.state])}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {row.state !== 'connected' && row.onAction ? (
                <Button
                  size="sm"
                  disabled={row.actionDisabled}
                  onClick={row.onAction}
                >
                  {row.actionLabel}
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
