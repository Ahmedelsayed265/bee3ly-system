import { useLocale } from '@/features/i18n/locale-context';
import { Construction } from 'lucide-react';
import type { MessageKey } from '@/features/i18n/messages';

export function PlaceholderPage({ titleKey }: { titleKey: MessageKey }) {
  const { t } = useLocale();

  return (
    <div className="border-border bg-surface flex min-h-[50vh] flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-16 text-center">
      <Construction className="text-brand mb-3 h-8 w-8" />
      <h1 className="text-ink text-xl font-bold">{t(titleKey)}</h1>
      <p className="text-muted mt-2 max-w-sm text-sm">{t('comingSoon')}</p>
    </div>
  );
}
