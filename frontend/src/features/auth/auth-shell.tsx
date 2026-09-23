import type { ReactNode } from 'react';
import { PrefsControls } from '@/components/preferences';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="auth-scroll bg-auth-bg relative flex min-h-dvh flex-col overflow-x-hidden overflow-y-auto px-5 py-5 sm:px-10 sm:py-6">
      <div
        className="bg-brand/[0.06] dark:bg-brand/10 pointer-events-none absolute -start-28 top-[-40px] h-64 w-64 rounded-[40%] blur-3xl"
        aria-hidden
      />
      <div
        className="bg-lavender/40 dark:bg-trust/10 pointer-events-none absolute -end-20 bottom-0 h-72 w-72 rounded-[45%] blur-3xl"
        aria-hidden
      />

      <div className="md:absolute relative z-10 mb-4 flex shrink-0 items-center justify-end">
        <PrefsControls />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-128 flex-1 flex-col justify-center py-4">
        <div className="border-border/60 dark:border-border dark:bg-surface rounded-2xl border bg-white px-6 py-8 shadow-[0_18px_50px_-28px_rgba(15,23,42,0.18)] sm:px-8 sm:py-9">
          <div className="mb-8 text-center">
            <h2 className="font-display text-ink text-[26px] leading-tight font-bold tracking-tight sm:text-[30px]">
              {title}
            </h2>
            <p className="text-muted mt-2 text-[14px]">{subtitle}</p>
          </div>

          {children}

          {footer ? (
            <p className="text-muted mt-6 text-center text-sm">{footer}</p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
