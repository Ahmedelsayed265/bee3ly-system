import type { ReactNode } from 'react'
import { PrefsControls } from '@/components/preferences'

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle: string
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <main className="auth-scroll relative flex min-h-dvh flex-col overflow-y-auto overflow-x-hidden bg-auth-bg px-5 py-5 sm:px-10 sm:py-6">
      <div
        className="pointer-events-none absolute -start-28 top-[-40px] h-64 w-64 rounded-[40%] bg-brand/15 blur-3xl dark:bg-brand/10"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -end-20 bottom-0 h-72 w-72 rounded-[45%] bg-trust/15 blur-3xl"
        aria-hidden
      />

      <div className="relative z-10 mb-4 flex shrink-0 items-center justify-end">
        <PrefsControls />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-[460px] flex-1 flex-col justify-center py-4">
        <div className="mb-8 text-center">
          <h2 className="font-display text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[30px]">
            {title}
          </h2>
          <p className="mt-2 text-[14px] text-muted">{subtitle}</p>
        </div>

        {children}

        {footer ? (
          <p className="mt-6 text-center text-sm text-muted">{footer}</p>
        ) : null}
      </div>
    </main>
  )
}
