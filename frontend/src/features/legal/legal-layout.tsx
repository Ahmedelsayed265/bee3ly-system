import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bee3lyLogo } from '@/components/brand/bee3ly-logo';
import { PrefsControls } from '@/components/preferences';
import { useLocale } from '@/features/i18n/locale-context';
import { paths } from '@/routes/paths';

export function LegalLayout({
  title,
  lastUpdated,
  children,
}: {
  title: string;
  lastUpdated: string;
  children: ReactNode;
}) {
  const { t } = useLocale();

  return (
    <main className="bg-page min-h-dvh">
      <header className="border-border bg-surface/80 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-5 py-4">
          <Link to={paths.home} className="inline-flex items-center gap-2">
            <Bee3lyLogo markClassName="h-9 w-9" />
          </Link>
          <PrefsControls />
        </div>
      </header>

      <article className="mx-auto max-w-7xl px-5 py-10 pb-16">
        <h1 className="font-display text-ink text-3xl font-bold tracking-tight">
          {title}
        </h1>
        <p className="text-muted mt-2 text-sm">
          {t('legalLastUpdated')}: {lastUpdated}
        </p>
        <div className="mt-8 space-y-8">{children}</div>
        <footer className="border-border text-muted mt-12 border-t pt-8 text-sm">
          <Link
            to={paths.login}
            className="text-brand font-semibold hover:underline"
          >
            {t('legalBackToLogin')}
          </Link>
          <span className="mx-2">·</span>
          <Link
            to={paths.privacyPolicy}
            className="text-brand font-semibold hover:underline"
          >
            {t('navPrivacyPolicy')}
          </Link>
          <span className="mx-2">·</span>
          <Link
            to={paths.terms}
            className="text-brand font-semibold hover:underline"
          >
            {t('navTermsConditions')}
          </Link>
          <span className="mx-2">·</span>
          <Link
            to={paths.contact}
            className="text-brand font-semibold hover:underline"
          >
            {t('contactUs')}
          </Link>
        </footer>
      </article>
    </main>
  );
}
