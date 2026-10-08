import { ExternalLink } from 'lucide-react';
import type { MessageKey } from '@/features/i18n/messages';
import { useLocale } from '@/features/i18n/locale-context';

export function HelpLink({
  slug,
  labelKey = 'helpStuck',
}: {
  slug: string;
  labelKey?: MessageKey;
}) {
  const { t } = useLocale();
  return (
    <a
      href={`/help/${slug}`}
      target="_blank"
      rel="noreferrer"
      className="bg-brand/15 text-brand decoration-brand inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs font-semibold underline underline-offset-2"
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {t(labelKey)}
    </a>
  );
}
