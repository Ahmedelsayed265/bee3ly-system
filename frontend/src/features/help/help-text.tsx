import { ExternalLink } from 'lucide-react';
import type { Locale } from '@/features/i18n/messages';

const URL_PATTERN = /https?:\/\/[^\s)]+/g;

const KNOWN_LINKS: Array<{
  match: string;
  ar: string;
  en: string;
}> = [
  {
    match: 'pages/create',
    ar: 'إنشاء صفحة فيسبوك',
    en: 'Create a Facebook Page',
  },
  {
    match: 'business.facebook.com/settings',
    ar: 'إعدادات الأعمال',
    en: 'Business settings',
  },
  {
    match: 'adsmanager.facebook.com',
    ar: 'مدير الإعلانات',
    en: 'Ads Manager',
  },
  {
    match: 'customaudiences/tos',
    ar: 'شروط قوائم العملاء',
    en: 'Customer list terms',
  },
];

function linkLabel(href: string, locale: Locale) {
  const known = KNOWN_LINKS.find((item) => href.includes(item.match));
  if (known) return locale === 'en' ? known.en : known.ar;
  try {
    return new URL(href).host;
  } catch {
    return href;
  }
}

export function HelpText({ text, locale }: { text: string; locale: Locale }) {
  const parts = text.split(URL_PATTERN);
  const urls = text.match(URL_PATTERN) ?? [];
  let urlIndex = 0;

  return (
    <>
      {parts.map((part, index) => {
        const url = index < parts.length - 1 ? urls[urlIndex++] : null;
        return (
          <span key={`${index}-${part.slice(0, 12)}`}>
            {part}
            {url ? <HelpExternalLink href={url} locale={locale} /> : null}
          </span>
        );
      })}
    </>
  );
}

export function HelpExternalLink({
  href,
  locale,
}: {
  href: string;
  locale: Locale;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="bg-brand/15 text-brand decoration-brand mx-1 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-middle font-semibold underline underline-offset-2"
    >
      <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
      {linkLabel(href, locale)}
    </a>
  );
}
