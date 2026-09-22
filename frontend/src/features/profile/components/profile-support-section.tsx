import { HelpCircle, MessageCircle } from 'lucide-react';
import type { MessageKey } from '@/features/i18n/messages';

export const SUPPORT_EMAIL = 'support@bee3ly.com';

type ProfileSupportSectionProps = {
  t: (key: MessageKey) => string;
};

export function ProfileSupportSection({ t }: ProfileSupportSectionProps) {
  return (
    <section className="border-border bg-surface space-y-4 rounded-2xl border p-5 xl:col-span-2">
      <div>
        <h2 className="text-ink font-semibold">{t('supportSection')}</h2>
        <p className="text-muted mt-1 text-sm">{t('supportIntro')}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <a
          href="https://bee3ly.com/help"
          target="_blank"
          rel="noreferrer"
          className="border-border bg-page hover:border-brand/30 hover:bg-lavender flex items-start gap-3 rounded-xl border p-4 transition-colors"
        >
          <span className="bg-brand/10 text-brand inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <HelpCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="text-ink block text-sm font-semibold">
              {t('helpCenter')}
            </span>
            <span className="text-muted mt-0.5 block text-xs leading-5">
              {t('helpCenterHint')}
            </span>
          </span>
        </a>
        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="border-border bg-page hover:border-brand/30 hover:bg-lavender flex items-start gap-3 rounded-xl border p-4 transition-colors"
        >
          <span className="bg-brand/10 text-brand inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl">
            <MessageCircle className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="text-ink block text-sm font-semibold">
              {t('contactUs')}
            </span>
            <span className="text-muted mt-0.5 block text-xs leading-5">
              {t('contactUsHint')}
            </span>
            <span className="text-brand mt-1 block text-xs font-medium">
              {SUPPORT_EMAIL}
            </span>
          </span>
        </a>
      </div>
    </section>
  );
}
