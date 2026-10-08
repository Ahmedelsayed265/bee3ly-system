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
      className="text-brand text-xs font-semibold underline"
    >
      {t(labelKey)}
    </a>
  );
}
