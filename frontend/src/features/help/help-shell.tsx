import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Bee3lyLogo } from '@/components/brand/bee3ly-logo';
import { PrefsControls } from '@/components/preferences';
import { paths } from '@/routes/paths';

export function HelpShell({ children }: { children: ReactNode }) {
  return (
    <main className="bg-page min-h-dvh">
      <header className="border-border bg-surface/80 sticky top-0 z-10 border-b backdrop-blur-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-5 py-4">
          <Link to={paths.help} className="inline-flex items-center gap-2">
            <Bee3lyLogo markClassName="h-9 w-9" />
          </Link>
          <PrefsControls />
        </div>
      </header>
      <div className="mx-auto max-w-3xl px-5 py-8 pb-16">{children}</div>
    </main>
  );
}
